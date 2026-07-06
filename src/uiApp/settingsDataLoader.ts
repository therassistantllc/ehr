import { createBrowserSupabaseClient } from "./runtime";

type SettingsRow = {
  id: string;
  name: string | null;
  status: string | null;
  description: string | null;
  external_id: string | null;
  data: Record<string, unknown> | null;
  deleted_at: string | null;
  first_name?: string | null;
  last_name?: string | null;
  npi?: string | null;
  taxonomy?: string | null;
};

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

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function dataValue(row: SettingsRow, ...keys: string[]): string | null {
  const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : {};
  for (const key of keys) {
    const value = stringValue(data[key]);
    if (value) return value;
  }
  return null;
}

function commonSelect(extraColumns = ""): string {
  const baseColumns = "id, name, status, description, external_id, data, deleted_at";
  return extraColumns ? `${baseColumns}, ${extraColumns}` : baseColumns;
}

function rowName(row: SettingsRow, fallback: string): string {
  return stringValue(row.name) ?? dataValue(row, "displayName", "legalName", "payerName", "settingKey") ?? fallback;
}

function toPractice(row: SettingsRow): PracticeSettingRow {
  return {
    id: row.id,
    legalName: rowName(row, "Unnamed practice"),
    dbaName: dataValue(row, "dbaName", "dba_name"),
    practiceType: dataValue(row, "practiceType", "practice_type") ?? "practice",
    status: row.status ?? "unknown",
    npi: dataValue(row, "npi", "billingNpi", "billing_npi"),
    billingEmail: dataValue(row, "billingEmail", "billing_email", "email"),
  };
}

function toProvider(row: SettingsRow): ProviderSettingRow {
  const firstLast = [stringValue(row.first_name), stringValue(row.last_name)].filter(Boolean).join(" ");
  return {
    id: row.id,
    displayName: rowName(row, firstLast || "Unnamed provider"),
    providerType: dataValue(row, "providerType", "provider_type") ?? stringValue(row.taxonomy) ?? "provider",
    credentialDisplay: dataValue(row, "credentialDisplay", "credential_display", "credentials"),
    status: row.status ?? "unknown",
    email: dataValue(row, "email"),
  };
}

function toPayer(row: SettingsRow): PayerSettingRow {
  return {
    id: row.id,
    payerName: rowName(row, "Unnamed payer"),
    payerId: stringValue(row.external_id) ?? dataValue(row, "payerId", "payer_id") ?? row.id,
    payerCategory: dataValue(row, "payerCategory", "payer_category", "category"),
    archivedAt: row.deleted_at,
  };
}

function toPayerProfile(row: SettingsRow): PayerProfileSettingRow {
  return {
    id: row.id,
    payerName: rowName(row, "Unnamed payer profile"),
    availityPayerId: dataValue(row, "availityPayerId", "availity_payer_id") ?? stringValue(row.external_id) ?? "",
    payerType: dataValue(row, "payerType", "payer_type"),
    contractStatus: dataValue(row, "contractStatus", "contract_status") ?? row.status,
    isActive: !["inactive", "archived", "deleted"].includes(String(row.status ?? "active").toLowerCase()) && !row.deleted_at,
  };
}

function toSystemSetting(row: SettingsRow): SystemSettingRow {
  return {
    id: row.id,
    settingKey: rowName(row, "Unnamed setting"),
    settingScope: dataValue(row, "settingScope", "setting_scope") ?? "tenant",
    isSensitive: Boolean(row.data?.isSensitive ?? row.data?.is_sensitive),
    description: row.description,
  };
}

export async function loadSettingsDetail(tenantId: string | null | undefined): Promise<SettingsDetailSnapshot> {
  if (!tenantId) {
    return { ...emptySettingsDetail, message: "No tenant selected for settings detail." };
  }

  try {
    const db = createBrowserSupabaseClient();

    const [practicesResult, providersResult, payersResult, payerProfilesResult, systemSettingsResult] = await Promise.all([
      db.from("practices").select(commonSelect()).eq("tenant_id", tenantId).is("deleted_at", null).order("name", { ascending: true }).limit(8),
      db.from("providers").select(commonSelect("first_name, last_name, npi, taxonomy")).eq("tenant_id", tenantId).is("deleted_at", null).order("name", { ascending: true }).limit(8),
      db.from("payers").select(commonSelect()).eq("tenant_id", tenantId).is("deleted_at", null).order("name", { ascending: true }).limit(12),
      db.from("payer_profiles").select(commonSelect()).eq("tenant_id", tenantId).is("deleted_at", null).order("name", { ascending: true }).limit(8),
      db.from("system_settings").select(commonSelect()).eq("tenant_id", tenantId).is("deleted_at", null).order("name", { ascending: true }).limit(12),
    ]);

    const firstError = practicesResult.error ?? providersResult.error ?? payersResult.error ?? payerProfilesResult.error ?? systemSettingsResult.error;
    if (firstError) throw firstError;

    return {
      practices: ((practicesResult.data ?? []) as SettingsRow[]).map(toPractice),
      providers: ((providersResult.data ?? []) as SettingsRow[]).map(toProvider),
      payers: ((payersResult.data ?? []) as SettingsRow[]).map(toPayer),
      payerProfiles: ((payerProfilesResult.data ?? []) as SettingsRow[]).map(toPayerProfile),
      systemSettings: ((systemSettingsResult.data ?? []) as SettingsRow[]).map(toSystemSetting),
      message: "Loaded live settings detail.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settings detail load error.";
    return { ...emptySettingsDetail, message: `Settings detail unavailable. ${message}` };
  }
}
