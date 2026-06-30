import {
  WorkqueueQueryService,
  createTherassistantSupabaseClient,
  type RcmDashboardSnapshot,
  type ServiceContext,
} from "../index";
import { mockDashboardSnapshot } from "./mockDashboardData";

export type DashboardDataMode = "supabase" | "mock";

export type DashboardLoadOptions = {
  tenantId?: string | null;
  actorUserId?: string | null;
};

export type LoadedDashboardData = {
  snapshot: RcmDashboardSnapshot;
  mode: DashboardDataMode;
  message: string;
};

const requiredEnvKeys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

function envValue(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function serviceContext(options: DashboardLoadOptions = {}): ServiceContext {
  const tenantId = options.tenantId ?? envValue("VITE_THERASSISTANT_TENANT_ID");

  if (!tenantId) {
    throw new Error("Missing tenant id configuration.");
  }

  return {
    tenantId,
    actorUserId: options.actorUserId ?? envValue("VITE_THERASSISTANT_ACTOR_USER_ID") ?? null,
  };
}

function missingEnvKeys(): string[] {
  return requiredEnvKeys.filter((key) => !envValue(key));
}

function createDashboardService(options: DashboardLoadOptions = {}): WorkqueueQueryService {
  const supabaseUrl = envValue("VITE_SUPABASE_URL");
  const supabaseAnonKey = envValue("VITE_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase dashboard configuration.");
  }

  const db = createTherassistantSupabaseClient({ supabaseUrl, supabaseAnonKey });
  return new WorkqueueQueryService(db, serviceContext(options));
}

export async function loadDashboardData(options: DashboardLoadOptions = {}): Promise<LoadedDashboardData> {
  const missing = missingEnvKeys();

  if (missing.length > 0) {
    return {
      snapshot: mockDashboardSnapshot,
      mode: "mock",
      message: `Using mock data. Missing ${missing.join(", ")}.`,
    };
  }

  try {
    const service = createDashboardService(options);
    const snapshot = await service.getDashboardSnapshot();

    return {
      snapshot,
      mode: "supabase",
      message: "Loaded live dashboard data.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard load error.";

    return {
      snapshot: mockDashboardSnapshot,
      mode: "mock",
      message: `Using mock data. ${message}`,
    };
  }
}

export async function resolveDashboardWorkqueueItem(workqueueItemId: string, note: string, options: DashboardLoadOptions = {}): Promise<void> {
  const service = createDashboardService(options);
  await service.resolveWorkqueueItem(workqueueItemId, note);
}
