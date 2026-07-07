-- Hardens provider license access and removes direct REST/RPC execution
-- from high-confidence internal trigger-only SECURITY DEFINER functions.
--
-- This migration is intentionally guarded so it can run safely in environments
-- where the live RBAC helper migrations have not yet been synced into the repo.

do $$
begin
  if to_regclass('public.provider_licenses') is not null
     and to_regprocedure('public.user_has_permission(uuid, uuid, text)') is not null then

    execute 'alter table public.provider_licenses enable row level security';

    execute 'drop policy if exists provider_licenses_select_rbac on public.provider_licenses';
    execute 'drop policy if exists provider_licenses_insert_rbac on public.provider_licenses';
    execute 'drop policy if exists provider_licenses_update_rbac on public.provider_licenses';
    execute 'drop policy if exists provider_licenses_delete_rbac on public.provider_licenses';

    execute $policy$
      create policy provider_licenses_select_rbac
        on public.provider_licenses
        for select
        to authenticated
        using (
          public.user_has_permission((select auth.uid()), tenant_id, 'credentialing.read')
          or public.user_has_permission((select auth.uid()), tenant_id, 'credentialing.write')
        )
    $policy$;

    execute $policy$
      create policy provider_licenses_insert_rbac
        on public.provider_licenses
        for insert
        to authenticated
        with check (
          public.user_has_permission((select auth.uid()), tenant_id, 'credentialing.write')
        )
    $policy$;

    execute $policy$
      create policy provider_licenses_update_rbac
        on public.provider_licenses
        for update
        to authenticated
        using (
          public.user_has_permission((select auth.uid()), tenant_id, 'credentialing.write')
        )
        with check (
          public.user_has_permission((select auth.uid()), tenant_id, 'credentialing.write')
        )
    $policy$;

    execute $policy$
      create policy provider_licenses_delete_rbac
        on public.provider_licenses
        for delete
        to authenticated
        using (
          public.user_has_permission((select auth.uid()), tenant_id, 'credentialing.write')
        )
    $policy$;
  end if;
end;
$$;

do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'public.auto_create_session_from_completed_appointment()',
    'public.ensure_eligibility_check_for_appointment()',
    'public.professional_claims_record_status_history()',
    'public.queue_eligibility_check_for_appointment()',
    'public.sync_837p_batch_metadata_from_claims()',
    'public.sync_837p_settings_after_batch_link()',
    'public.sync_claim_service_line_from_encounter()',
    'public.sync_self_subscriber_from_client_after_client_update()',
    'public.sync_self_subscriber_from_client_for_policy()',
    'public.trg_fn_create_pre_session_response_for_appointment()',
    'public.trg_fn_create_safety_review_workqueue_item()',
    'public.trg_fn_log_pre_session_goal_update_change()',
    'public.trg_fn_prevent_duplicate_notifications()'
  ]
  loop
    if to_regprocedure(function_signature) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', function_signature);
      execute format('grant execute on function %s to service_role', function_signature);
    end if;
  end loop;
end;
$$;
