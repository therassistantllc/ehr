import { createBrowserSupabaseClient, envValue } from "./runtime";

export type AuthMode = "session" | "development" | "mock";

type BrowserDb = ReturnType<typeof createBrowserSupabaseClient>;

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

function toTenantOption(row: Record<string, unknown>): TenantOption {
  return {
    id: String(row.id),
    name: String(row.display_name ?? row.name ?? row.legal_name ?? row.id ?? "Unknown tenant"),
    legalName: typeof row.legal_name === "string" ? row.legal_name : null,
    status: typeof row.status === "string" ? row.status : null,
    timezone: typeof row.timezone === "string" ? row.timezone : null,
  };
}

async function countRows(db: BrowserDb, table: string, tenantId: string): Promise<number> {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null);
  if (error) return 0;
  return count ?? 0;
}

async function loadSettingsSummary(db: BrowserDb, tenantId: string): Promise<SettingsSummary> {
  const [practices, providers, payers, payerProfiles, systemSettings] = await Promise.all([
    countRows(db, "practices", tenantId),
    countRows(db, "providers", tenantId),
    countRows(db, "payers", tenantId),
    countRows(db, "payer_profiles", tenantId),
    countRows(db, "system_settings", tenantId),
  ]);
  return { practices, providers, payers, payerProfiles, systemSettings };
}

async function loadTenantRowsByIds(db: BrowserDb, tenantIds: string[]): Promise<TenantOption[]> {
  const uniqueTenantIds = Array.from(new Set(tenantIds.filter(Boolean)));
  if (uniqueTenantIds.length === 0) return [];

  const { data: tenants, error } = await db
    .from("tenants")
    .select("id, name, display_name, legal_name, status, timezone")
    .in("id", uniqueTenantIds)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error || !tenants) return [];
  return (tenants as Record<string, unknown>[]).map(toTenantOption);
}

function extractRoleNames(row: Record<string, unknown>): string[] {
  const roles = new Set<string>();

  if (typeof row.role_name === "string" && row.role_name.trim()) roles.add(row.role_name.trim());

  const data = row.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const role = (data as Record<string, unknown>).role;
    const dataRoles = (data as Record<string, unknown>).roles;
    if (typeof role === "string" && role.trim()) roles.add(role.trim());
    if (Array.isArray(dataRoles)) dataRoles.forEach((entry) => roles.add(String(entry)));
  }

  return Array.from(roles).filter(Boolean);
}

async function loadUserRoles(db: BrowserDb, userId: string, tenantId: string): Promise<string[]> {
  const { data, error } = await db
    .from("tenant_users")
    .select("role_name, data")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error || !data) return [];
  return Array.from(new Set((data as Record<string, unknown>[]).flatMap(extractRoleNames)));
}

async function loadTenantsForUser(db: BrowserDb, userId: string): Promise<TenantOption[]> {
  const { data: memberships, error } = await db.from("tenant_users").select("tenant_id").eq("user_id", userId).is("deleted_at", null);
  if (error || !memberships || memberships.length === 0) return [];
  const tenantIds = memberships.map((row: { tenant_id: string }) => row.tenant_id);
  return loadTenantRowsByIds(db, tenantIds);
}

async function loadDevelopmentTenants(db: BrowserDb): Promise<TenantOption[]> {
  const fallbackTenantId = envValue("VITE_THERASSISTANT_TENANT_ID");
  const { data, error } = await db
    .from("tenants")
    .select("id, name, display_name, legal_name, status, timezone")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const tenants = error || !data ? [] : (data as Record<string, unknown>[]).map(toTenantOption);

  if (fallbackTenantId && !tenants.some((tenant) => tenant.id === fallbackTenantId)) {
    tenants.unshift({ id: fallbackTenantId, name: fallbackTenantId, legalName: null, status: null, timezone: null });
  }

  return tenants;
}

function selectTenant(tenants: TenantOption[], preferredTenantId?: string | null): TenantOption | null {
  const envTenantId = envValue("VITE_THERASSISTANT_TENANT_ID");
  return tenants.find((tenant) => tenant.id === preferredTenantId)
    ?? tenants.find((tenant) => tenant.id === envTenantId)
    ?? tenants[0]
    ?? null;
}

export async function loadAppUserContext(preferredTenantId?: string | null): Promise<AppUserContext> {
  try {
    const db = createBrowserSupabaseClient();
    const { data: authData } = await db.auth.getUser();
    const userId = authData.user?.id ?? envValue("VITE_THERASSISTANT_ACTOR_USER_ID") ?? null;
    const email = authData.user?.email ?? null;
    const tenants = authData.user?.id ? await loadTenantsForUser(db, authData.user.id) : await loadDevelopmentTenants(db);
    const selectedTenant = selectTenant(tenants, preferredTenantId);
    const roles = authData.user?.id && selectedTenant ? await loadUserRoles(db, authData.user.id, selectedTenant.id) : [];
    const settingsSummary = selectedTenant ? await loadSettingsSummary(db, selectedTenant.id) : emptySummary;
    return {
      authMode: authData.user?.id ? "session" : "development",
      userId,
      email,
      roles,
      permissions: [],
      selectedTenantId: selectedTenant?.id ?? null,
      selectedTenantName: selectedTenant?.name ?? null,
      tenants,
      settingsSummary,
      message: authData.user?.id ? "Loaded authenticated user context." : "Using development tenant context. Supabase session is not active.",
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
