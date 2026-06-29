-- Follow-up fix for the eligibility / charge / claims implementation.
-- Ensures charges carry payer_id and claim creation can derive payer from the selected policy.

select public.therassistant_add_column_if_missing('charges', 'payer_id', 'uuid null');

create index if not exists idx_charges_payer on public.charges(payer_id) where deleted_at is null;

create or replace function public.get_copay_or_copayers(
  p_clients_id uuid,
  p_service_date date,
  p_cpt_code text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select e.*
    from public.eligibility_checks e
    where e.client_id = p_clients_id
      and e.service_date <= p_service_date
      and (p_cpt_code is null or e.cpt_code is null or e.cpt_code = p_cpt_code)
      and e.deleted_at is null
    order by e.service_date desc, e.checked_at desc
    limit 1
  ), active_policy as (
    select p.*
    from public.client_case_policies p
    where p.client_id = p_clients_id
      and p.deleted_at is null
      and coalesce(p.status, 'active') not in ('inactive', 'terminated', 'deleted')
      and (p.effective_date is null or p.effective_date <= p_service_date)
      and (p.termination_date is null or p.termination_date >= p_service_date)
    order by p.priority
    limit 1
  )
  select jsonb_build_object(
    'clientId', p_clients_id,
    'serviceDate', p_service_date,
    'cptCode', p_cpt_code,
    'policyId', coalesce((select policy_id from latest), (select id from active_policy)),
    'eligibilityCheckId', (select id from latest),
    'payerId', coalesce((select payer_id from latest), (select payer_id from active_policy)),
    'eligibilityStatus', coalesce((select eligibility_status from latest), (select status from active_policy)),
    'copayAmount', coalesce((select copay_amount from latest), (select copay_amount from active_policy), 0),
    'coinsurancePercent', coalesce((select coinsurance_percent from latest), (select coinsurance_percent from active_policy), 0),
    'deductibleRemaining', coalesce((select deductible_remaining from latest), (select deductible_remaining from active_policy), 0),
    'authorizationRequired', coalesce((select authorization_required from latest), (select authorization_required from active_policy), false)
  );
$$;

create or replace function public.create_claims_from_charge(p_charge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge public.charges%rowtype;
  v_validation jsonb;
  v_claim public.claims%rowtype;
  v_policy public.client_case_policies%rowtype;
  v_line jsonb;
  v_index integer := 0;
  v_total numeric := 0;
  v_payer_id uuid;
begin
  select * into v_charge from public.charges where id = p_charge_id and deleted_at is null;
  if v_charge.id is null then raise exception 'Charge % not found.', p_charge_id; end if;

  v_validation := public.validate_charge(p_charge_id);
  if not coalesce((v_validation->>'valid')::boolean, false) then
    raise exception 'Charge % is not valid.', p_charge_id using detail = v_validation::text;
  end if;

  if v_charge.insurance_policy_id is not null then
    select * into v_policy from public.client_case_policies where id = v_charge.insurance_policy_id and deleted_at is null;
  end if;

  v_payer_id := coalesce(v_charge.payer_id, v_policy.payer_id);

  for v_line in select * from jsonb_array_elements(coalesce(v_charge.service_lines, '[]'::jsonb)) loop
    v_total := v_total + coalesce(nullif(v_line->>'chargeAmount', '')::numeric, 0) * coalesce(nullif(v_line->>'units', '')::numeric, 1);
  end loop;

  if v_total = 0 then v_total := coalesce(v_charge.charge_amount, 0); end if;

  insert into public.claims (
    tenant_id, name, status, charge_id, client_id, provider_id, rendering_provider_id,
    payer_id, service_date, place_of_service, frequency_code, total_charge_amount,
    open_balance, payer_paid_amount, client_paid_amount, adjustment_amount, diagnosis_codes, data
  ) values (
    v_charge.tenant_id,
    concat('Claim ', v_charge.service_date::text),
    'draft',
    v_charge.id,
    v_charge.client_id,
    v_charge.provider_id,
    v_charge.provider_id,
    v_payer_id,
    v_charge.service_date,
    v_charge.place_of_service,
    '1',
    v_total,
    v_total,
    0,
    0,
    0,
    v_charge.diagnosis_codes,
    jsonb_build_object('sourceChargeId', v_charge.id, 'serviceLines', v_charge.service_lines)
  ) returning * into v_claim;

  for v_line in select * from jsonb_array_elements(coalesce(v_charge.service_lines, '[]'::jsonb)) loop
    v_index := v_index + 1;
    insert into public.claim_lines (
      tenant_id, name, status, claim_id, line_number, procedure_code, modifiers,
      diagnosis_pointers, service_date_from, service_date_to, units, unit_of_measure,
      charge_amount, place_of_service, rendering_provider_npi, authorization_number, data
    ) values (
      v_charge.tenant_id,
      v_line->>'procedureCode',
      'active',
      v_claim.id,
      v_index,
      v_line->>'procedureCode',
      coalesce(array(select jsonb_array_elements_text(coalesce(v_line->'modifiers', '[]'::jsonb))), array[]::text[]),
      coalesce(array(select jsonb_array_elements_text(coalesce(v_line->'diagnosisPointers', '[]'::jsonb))), array['1']::text[]),
      nullif(v_line->>'serviceDateFrom', '')::date,
      nullif(coalesce(v_line->>'serviceDateTo', v_line->>'serviceDateFrom'), '')::date,
      coalesce(nullif(v_line->>'units', '')::numeric, 1),
      'UN',
      coalesce(nullif(v_line->>'chargeAmount', '')::numeric, 0),
      coalesce(v_line->>'placeOfService', v_charge.place_of_service),
      v_line->>'renderingProviderNpi',
      v_line->>'authorizationNumber',
      v_line
    );
  end loop;

  insert into public.claim_diagnoses (tenant_id, name, status, claim_id, diagnosis_code, pointer, data)
  select v_charge.tenant_id, dx, 'active', v_claim.id, dx, ordinality::integer, '{}'::jsonb
  from unnest(v_charge.diagnosis_codes) with ordinality as t(dx, ordinality);

  update public.charges set status = 'claimed', claim_id = v_claim.id, payer_id = v_payer_id where id = v_charge.id;
  perform public.validate_claims(v_claim.id);
  perform public.write_audits_log('claims', v_claim.id, 'create', null, to_jsonb(v_claim), jsonb_build_object('tenant_id', v_claim.tenant_id, 'sourceChargeId', v_charge.id));
  return to_jsonb(v_claim);
end;
$$;
