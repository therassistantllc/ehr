import {
  WorkqueueQueryService,
  createTherassistantSupabaseClient,
  type RcmDashboardSnapshot,
  type ServiceContext,
} from "../index";
import { mockDashboardSnapshot } from "./mockDashboardData";

export type DashboardDataMode = "supabase" | "mock";

export type LoadedDashboardData = {
  snapshot: RcmDashboardSnapshot;
  mode: DashboardDataMode;
  message: string;
};

const requiredEnvKeys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_THERASSISTANT_TENANT_ID"] as const;

function envValue(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function serviceContext(): ServiceContext {
  const tenantId = envValue("VITE_THERASSISTANT_TENANT_ID");

  if (!tenantId) {
    throw new Error("Missing tenant id configuration.");
  }

  return {
    tenantId,
    actorUserId: envValue("VITE_THERASSISTANT_ACTOR_USER_ID") ?? null,
  };
}

function missingEnvKeys(): string[] {
  return requiredEnvKeys.filter((key) => !envValue(key));
}

export async function loadDashboardData(): Promise<LoadedDashboardData> {
  const missing = missingEnvKeys();

  if (missing.length > 0) {
    return {
      snapshot: mockDashboardSnapshot,
      mode: "mock",
      message: `Using mock data. Missing ${missing.join(", ")}.`,
    };
  }

  try {
    const db = createTherassistantSupabaseClient({
      supabaseUrl: envValue("VITE_SUPABASE_URL"),
      supabaseAnonKey: envValue("VITE_SUPABASE_ANON_KEY"),
    });

    const service = new WorkqueueQueryService(db, serviceContext());
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
