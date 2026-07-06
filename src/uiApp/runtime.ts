import { createTherassistantSupabaseClient, type TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import { WorkqueueQueryService } from "../services/workqueueQueryService";

export const REQUIRED_BROWSER_SUPABASE_ENV_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

export type BrowserRuntimeConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  defaultTenantId?: string;
  actorUserId?: string;
};

export type TenantScopedRuntimeOptions = {
  tenantId?: string | null;
  actorUserId?: string | null;
};

export function envValue(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function readBrowserRuntimeConfig(): BrowserRuntimeConfig {
  return {
    supabaseUrl: envValue("VITE_SUPABASE_URL"),
    supabaseAnonKey: envValue("VITE_SUPABASE_ANON_KEY"),
    defaultTenantId: envValue("VITE_THERASSISTANT_TENANT_ID"),
    actorUserId: envValue("VITE_THERASSISTANT_ACTOR_USER_ID"),
  };
}

export function missingRequiredBrowserConfigKeys(config = readBrowserRuntimeConfig()): string[] {
  return REQUIRED_BROWSER_SUPABASE_ENV_KEYS.filter((key) => {
    if (key === "VITE_SUPABASE_URL") return !config.supabaseUrl;
    if (key === "VITE_SUPABASE_ANON_KEY") return !config.supabaseAnonKey;
    return true;
  });
}

export function createBrowserSupabaseClient(config = readBrowserRuntimeConfig()): TherassistantSupabaseClient {
  const missing = missingRequiredBrowserConfigKeys(config);

  if (missing.length > 0 || !config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(`Missing Supabase browser configuration: ${missing.join(", ")}.`);
  }

  return createTherassistantSupabaseClient({
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
  });
}

export function resolveTenantId(options: TenantScopedRuntimeOptions = {}, config = readBrowserRuntimeConfig()): string | null {
  return options.tenantId ?? config.defaultTenantId ?? null;
}

export function createServiceContext(options: TenantScopedRuntimeOptions = {}, config = readBrowserRuntimeConfig()): ServiceContext {
  const tenantId = resolveTenantId(options, config);

  if (!tenantId) {
    throw new Error("Missing tenant id. Select a tenant or set VITE_THERASSISTANT_TENANT_ID.");
  }

  return {
    tenantId,
    actorUserId: options.actorUserId ?? config.actorUserId ?? null,
  };
}

export function createWorkqueueQueryService(options: TenantScopedRuntimeOptions = {}): WorkqueueQueryService {
  const config = readBrowserRuntimeConfig();
  return new WorkqueueQueryService(createBrowserSupabaseClient(config), createServiceContext(options, config));
}
