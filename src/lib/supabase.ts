import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TherassistantRecord = {
  id: string;
  tenant_id?: string | null;
  name?: string | null;
  status?: string | null;
  description?: string | null;
  external_id?: string | null;
  data?: Record<string, Json>;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  [key: string]: unknown;
};

// The Supabase schema is still being implemented through migrations, so this
// intentionally stays broad. Once the generated Supabase Database type exists,
// replace this alias with SupabaseClient<Database>.
export type TherassistantSupabaseClient = SupabaseClient<any, any, any>;

function readEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }

  return undefined;
}

export function createTherassistantSupabaseClient(options?: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  useServiceRole?: boolean;
}): TherassistantSupabaseClient {
  const supabaseUrl = options?.supabaseUrl ?? readEnv("SUPABASE_URL") ?? readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = options?.useServiceRole
    ? options.supabaseServiceRoleKey ?? readEnv("SUPABASE_SERVICE_ROLE_KEY")
    : options?.supabaseAnonKey ?? readEnv("SUPABASE_ANON_KEY") ?? readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!key) {
    throw new Error("Missing Supabase key. Set SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: !options?.useServiceRole,
      autoRefreshToken: !options?.useServiceRole,
    },
  }) as TherassistantSupabaseClient;
}

export function assertUuid(value: string, label = "id"): string {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(value)) {
    throw new Error(`Invalid ${label}: expected UUID.`);
  }

  return value;
}

export function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}
