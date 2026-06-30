import { mockDashboardSnapshot } from "./mockDashboardData";
import type { RcmDashboardSnapshot } from "../index";

export type DashboardDataMode = "supabase" | "mock";

export type LoadedDashboardData = {
  snapshot: RcmDashboardSnapshot;
  mode: DashboardDataMode;
  message: string;
};

export async function loadDashboardData(): Promise<LoadedDashboardData> {
  return {
    snapshot: mockDashboardSnapshot,
    mode: "mock",
    message: "Using mock data until Supabase configuration is loaded.",
  };
}
