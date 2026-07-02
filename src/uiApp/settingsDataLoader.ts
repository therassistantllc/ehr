import { createTherassistantSupabaseClient } from "../index";

export type PracticeSettingRow = {
  id: string;
  legalName: string;
  dbaName: string | null;
  practiceType: string;
  status: string;
  npi: string | null;
  billingEmail: string | null;
};

export type ProviderSettingRow = {
  id: string;
  displayName: string;
  providerType: string;
  credentialDisplay: string | null;
  status: string;
  email: string | null;
};

export type PayerSettingRow = {
  id: string;
  payerName: string;
  payerId: string;
  payerCategory: string | null;
  archivedAt: string | null;
};

export type PayerProfileSettingRow = {
  id: string;
  payerName: string;
  availityPayerId: string;
  payerType: string | null;
  contractStatus: string | null;
  isActive: boolean;
};

export type SystemSettingRow = {
  id: string;
  settingKey: string;
  settingScope: string;
  isSensitive: boolean;
  description: string | null;
};

export type SettingsDetailSnapshot = {
  practices: PracticeSettingRow[];
  providers: ProviderSettingRow[];
  payers: PayerSettingRow[];
  payerProfiles: PayerProfileSettingRow[];
  systemSettings: SystemSettingRow[];
  message: string;
};

const emptySettingsDetail: SettingsDetailSnapshot = {
  practices: [],
  providers: [],
  payers: [],
  payerProfiles: [],
  systemSettings: [],
  message: "No settings detail loaded.",
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

export async function loadSettingsDetail(tenantId: string | null | undefined): Promise<SettingsDetailSnapshot> {
  if (!tenantId) {
    return { ...emptySettingsDetail, message: "No tenant selected for settings detail." };
  }

  try {
    const db = createBrowserDb();

    const [practicesResult, providersResult, payersResult, payerProfilesResult, systemSettingsResult] = await Promise.all([
      db.from("practices").select("id, legal_name, dba_name, practice_type, status, npi, billing_email").eq("tenant_id", tenantId).is("archived_at", null).order("legal_name", { ascending: true }).limit(8),
      db.from("providers").select("id, display_name, provider_type, credential_display, status, email").eq("tenant_id", tenantId).is("archived_at", null).order("display_name", { ascending: true }).limit(8),
      db.from("payers").select("id, payer_name, payer_id, payer_category, archived_at").eq("tenant_id", tenantId).order("payer_name", { ascending: true }).limit(12),
      db.from("payer_profiles").select("id, payer_name, availity_payer_id, payer_type, contract_status, is_active").eq("tenant_id", tenantId).is("archived_at", null).order("payer_name", { ascending: true }).limit(8),
      db.from("system_settings").select("id, setting_key, setting_scope, is_sensitive, description").eq("tenant_id", tenantId).order("setting_key", { ascending: true }).limit(12),
    ]);

    const firstError = practicesResult.error ?? providersResult.error ?? payersResult.error ?? payerProfilesResult.error ?? systemSettingsResult.error;
    if (firstError) throw firstError;

    return {
      practices: (practicesResult.data ?? []).map((row) => ({
        id: row.id,
        legalName: row.legal_name,
        dbaName: row.dba_name,
        practiceType: row.practice_type,
        status: row.status,
        npi: row.npi,
        billingEmail: row.billing_email,
      })),
      providers: (providersResult.data ?? []).map((row) => ({
        id: row.id,
        displayName: row.display_name,
        providerType: row.provider_type,
        credentialDisplay: row.credential_display,
        status: row.status,
        email: row.email,
      })),
      payers: (payersResult.data ?? []).map((row) => ({
        id: row.id,
        payerName: row.payer_name,
        payerId: row.payer_id,
        payerCategory: row.payer_category,
        archivedAt: row.archived_at,
      })),
      payerProfiles: (payerProfilesResult.data ?? []).map((row) => ({
        id: row.id,
        payerName: row.payer_name,
        availityPayerId: row.availity_payer_id,
        payerType: row.payer_type,
        contractStatus: row.contract_status,
        isActive: row.is_active,
      })),
      systemSettings: (systemSettingsResult.data ?? []).map((row) => ({
        id: row.id,
        settingKey: row.setting_key,
        settingScope: row.setting_scope,
        isSensitive: row.is_sensitive,
        description: row.description,
      })),
      message: "Loaded live settings detail.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settings detail load error.";
    return { ...emptySettingsDetail, message: `Settings detail unavailable. ${message}` };
  }
}
