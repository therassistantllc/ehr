import { createTherassistantSupabaseClient } from "../index";

export type AuthMode = "session" | "development" | "mock";

export type TenantOption = {
  id: string;
  name: string;
  legalName: string | null;
  status: string | null;
  timezone: string | null;
};

export type SettingsSummary = {
  practices: number;
  providers: number;
  payers: number;
  payerProfiles: number;
  systemSettings: number;
};

export type AppUserContext = {
  authMode: AuthMode;
  userId: string | null;
  email: string | null;
  roles: string[];
  permissions: string[];
  selectedTenantId: string | null;
  selectedTenantName: string | null;
  tenants: TenantOption[];
  settingsSummary: SettingsSummary;
  message: string;
};

const emptySummary: SettingsSummary = {
  practices: 0,
  providers: 0,
  payers: 0,
  payerProfiles: 0,
  systemSettings: 0,
};

function envValue(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function createBrowserDb() {
  const supabaseUrl = envValue("VITE_SUPABASE_URL");
  const supabaseAnonKey = envValue("VITE_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase browser configuration.");
  return createTherassistantSupabaseClient({ supabaseUrl, supabaseAnonKey });
}

function toTenantOption(row: Record<string, unknown>): TenantOption {
  return {
    id: String(row.id),
    name: String(row.name ?? row.legal_name ?? row.id ?? "Unknown tenant"),
    legalName: typeof row.legal_name === "string" ? row.legal_name : null,
    status: typeof row.status === "string" ? row.status : null,
    timezone: typeof row.timezone === "string" ? row.timezone : null,
  };
}

async function countRows(db: ReturnType<typeof createBrowserDb>, table: string, tenantId: string): Promise<number> {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  if (error) return 0;
  return count ?? 0;
}

async function loadSettingsSummary(db: ReturnType<typeof createBrowserDb>, tenantId: string): Promise<SettingsSummary> {
  const [practices, providers, payers, payerProfiles, systemSettings] = await Promise.all([
    countRows(db, "practices", tenantId),
    countRows(db, "providers", tenantId),
    countRows(db, "payers", tenantId),
    countRows(db, "payer_profiles", tenantId),
    countRows(db, "system_settings", tenantId),
  ]);
  return { practices, providers, payers, payerProfiles, systemSettings };
}

async function loadTenantsForUser(db: ReturnType<typeof createBrowserDb>, userId: string): Promise<TenantOption[]> {
  const { data: memberships, error } = await db.from("tenant_users").select("tenant_id").eq("user_id", userId);
  if (error || !memberships || memberships.length === 0) return [];
  const tenantIds = Array.from(new Set(memberships.map((row: { tenant_id: string }) => row.tenant_id).filter(Boolean)));
  if (tenantIds.length === 0) return [];
  const { data: tenants, error: tenantError } = await db.from("tenants").select("id, name, legal_name, status, timezone").in("id", tenantIds);
  if (tenantError || !tenants) return [];
  return (tenants as Record<string, unknown>[]).map(toTenantOption);
}

async function loadDevelopmentTenant(db: ReturnType<typeof createBrowserDb>): Promise<TenantOption[]> {
  const tenantId = envValue("VITE_THERASSISTANT_TENANT_ID");
  if (!tenantId) return [];
  const { data, error } = await db.from("tenants").select("id, name, legal_name, status, timezone").eq("id", tenantId).maybeSingle();
  if (error || !data) return [{ id: tenantId, name: tenantId, legalName: null, status: null, timezone: null }];
  return [toTenantOption(data as Record<string, unknown>)];
}

export async function loadAppUserContext(preferredTenantId?: string | null): Promise<AppUserContext> {
  try {
    const db = createBrowserDb();
    const { data: authData } = await db.auth.getUser();
    const userId = authData.user?.id ?? null;
    const email = authData.user?.email ?? null;
    const tenants = userId ? await loadTenantsForUser(db, userId) : await loadDevelopmentTenant(db);
    const selectedTenant = tenants.find((tenant) => tenant.id === preferredTenantId) ?? tenants[0] ?? null;
    const settingsSummary = selectedTenant ? await loadSettingsSummary(db, selectedTenant.id) : emptySummary;
    return {
      authMode: userId ? "session" : "development",
      userId,
      email,
      roles: [],
      permissions: [],
      selectedTenantId: selectedTenant?.id ?? null,
      selectedTenantName: selectedTenant?.name ?? null,
      tenants,
      settingsSummary,
      message: userId ? "Loaded authenticated user context." : "Using development tenant context. Supabase session is not active.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown app context load error.";
    return {
      authMode: "mock",
      userId: null,
      email: null,
      roles: [],
      permissions: [],
      selectedTenantId: null,
      selectedTenantName: null,
      tenants: [],
      settingsSummary: emptySummary,
      message: `Using mock context. ${message}`,
    };
  }
}
