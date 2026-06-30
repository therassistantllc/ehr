import type { RcmDashboardSnapshot } from "../services/workqueueQueryService";
import { buildRcmDashboardViewModel, type DashboardCard, type RcmDashboardViewModel } from "./rcmDashboardAdapters";
import { buildRcmDashboardSpec, type UiDashboardSpec, type UiTableSpec } from "../ui/rcmDashboardComponents";
import { getActionScreenForRoute, type ActionScreenDefinition } from "../ui/workqueueActionScreens";

export type RcmDashboardUiModel = {
  dashboard: UiDashboardSpec;
  viewModel: RcmDashboardViewModel;
  primaryCards: DashboardCard[];
  warningCards: DashboardCard[];
  criticalCards: DashboardCard[];
  tables: UiTableSpec[];
  actionScreens: ActionScreenDefinition[];
};

function uniqueScreens(cards: DashboardCard[]): ActionScreenDefinition[] {
  const seen = new Set<string>();
  const screens: ActionScreenDefinition[] = [];

  for (const card of cards) {
    const screen = getActionScreenForRoute(card.routeKey);
    if (!screen || seen.has(screen.key)) continue;
    seen.add(screen.key);
    screens.push(screen);
  }

  return screens;
}

export function buildRcmDashboardUiModel(snapshot: RcmDashboardSnapshot): RcmDashboardUiModel {
  const viewModel = buildRcmDashboardViewModel(snapshot);
  const dashboard = buildRcmDashboardSpec({ metrics: viewModel.metrics, cards: viewModel.cards });

  return {
    dashboard,
    viewModel,
    primaryCards: viewModel.cards.filter((card) => card.severity === "normal"),
    warningCards: viewModel.cards.filter((card) => card.severity === "warning"),
    criticalCards: viewModel.cards.filter((card) => card.severity === "critical"),
    tables: [dashboard.workqueueTable, dashboard.chargeTable, dashboard.claimTable],
    actionScreens: uniqueScreens(viewModel.cards),
  };
}
