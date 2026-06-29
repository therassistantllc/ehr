export interface PreSessionResponse {
  responseStatus?: string;
  focusText?: string;
  selectedGoalId?: string;
  selectedGoalLabel?: string;
  distressRating?: number | string | null;
  alertFlag?: boolean | string | null;
  alertDetails?: string;
  goalUpdateRequested?: boolean;
  goalUpdateText?: string;
  [key: string]: unknown;
}

export interface PreSessionDashboardFields {
  responseStatus: string;
  focusText: string;
  selectedGoalId?: string;
  selectedGoalLabel?: string;
  distressRating: number | null;
  alertFlag: boolean;
  alertDetails: string;
  goalUpdateRequested: boolean;
  goalUpdateText: string;
}

const normalizeText = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, ' ');
const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  return ['yes', 'true', 'y', '1'].includes(normalizeText(value).toLowerCase());
};

export function mapPreSessionResponseToDashboardFields(response: PreSessionResponse = {}): PreSessionDashboardFields {
  const distress = Number(response.distressRating);
  const selectedGoalId = response.selectedGoalId ? String(response.selectedGoalId) : null;
  const selectedGoalLabel = response.selectedGoalLabel ? normalizeText(response.selectedGoalLabel) : null;

  return {
    responseStatus: normalizeText(response.responseStatus || 'not_started'),
    focusText: normalizeText(response.focusText),
    ...(selectedGoalId ? { selectedGoalId } : {}),
    ...(selectedGoalLabel ? { selectedGoalLabel } : {}),
    distressRating: Number.isFinite(distress) ? distress : null,
    alertFlag: normalizeBoolean(response.alertFlag) || Boolean(normalizeText(response.alertDetails)),
    alertDetails: normalizeText(response.alertDetails),
    goalUpdateRequested: normalizeBoolean(response.goalUpdateRequested) || Boolean(normalizeText(response.goalUpdateText)),
    goalUpdateText: normalizeText(response.goalUpdateText),
  };
}

export function getSelectedGoalSummary(response: PreSessionResponse = {}): string {
  const fields = mapPreSessionResponseToDashboardFields(response);
  return [fields.selectedGoalLabel, fields.goalUpdateText].filter(Boolean).join(' — ');
}

export function getPreSessionAlertFlags(response: PreSessionResponse = {}): string[] {
  const fields = mapPreSessionResponseToDashboardFields(response);
  return fields.alertFlag ? [fields.alertDetails || 'Pre-session response needs provider review.'] : [];
}

export function mapPreSessionGoalUpdates(response: PreSessionResponse = {}) {
  const fields = mapPreSessionResponseToDashboardFields(response);
  return {
    requested: fields.goalUpdateRequested,
    selectedGoalId: fields.selectedGoalId,
    selectedGoalLabel: fields.selectedGoalLabel,
    proposedUpdate: fields.goalUpdateText,
  };
}
