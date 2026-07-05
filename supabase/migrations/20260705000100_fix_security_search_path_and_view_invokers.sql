-- Fix Supabase security advisor warnings:
-- 1) Set explicit search_path on functions flagged as mutable.
-- 2) Convert eligibility reporting views to security_invoker so caller/RLS rules apply.

alter function public.set_modules_updated_at()
  set search_path = public, pg_temp;

alter function public.set_service_catalog_updated_at()
  set search_path = public, pg_temp;

alter function public.set_utilities_updated_at()
  set search_path = public, pg_temp;

alter function public.therassistant_ar_bucket(integer)
  set search_path = public, pg_temp;

alter view public.appointment_eligibility_status
  set (security_invoker = true);

alter view public.eligibility_with_staleness
  set (security_invoker = true);

alter view public.kpi_eligibility_summary
  set (security_invoker = true);
