export interface PreSessionValidationInput {
  responseStatus?: string;
  distressRating?: number | string | null;
  alertFlag?: boolean;
  alertDetails?: string;
  selectedGoalId?: string;
  selectedGoalLabel?: string;
  goalUpdateRequested?: boolean;
  goalUpdateText?: string;
}

export interface PreSessionValidationMessage {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PreSessionValidationResult {
  valid: boolean;
  errors: PreSessionValidationMessage[];
  warnings: PreSessionValidationMessage[];
}

const hasText = (value: unknown): boolean => String(value ?? '').trim().length > 0;
const message = (field: string, text: string, severity: 'error' | 'warning'): PreSessionValidationMessage => ({ field, message: text, severity });

export function validatePreSessionResponse(input: PreSessionValidationInput = {}): PreSessionValidationResult {
  const errors: PreSessionValidationMessage[] = [];
  const warnings: PreSessionValidationMessage[] = [];
  const distress = Number(input.distressRating);

  if (!hasText(input.responseStatus)) errors.push(message('responseStatus', 'Response status is required.', 'error'));
  if (input.distressRating !== undefined && input.distressRating !== null && (!Number.isFinite(distress) || distress < 0 || distress > 10)) {
    errors.push(message('distressRating', 'Distress rating must be a number from 0 to 10.', 'error'));
  }
  if (input.alertFlag && !hasText(input.alertDetails)) warnings.push(message('alertDetails', 'Add details for provider review.', 'warning'));
  if (input.goalUpdateRequested && !hasText(input.goalUpdateText)) warnings.push(message('goalUpdateText', 'Add the requested goal update text.', 'warning'));
  if (hasText(input.goalUpdateText) && !hasText(input.selectedGoalId) && !hasText(input.selectedGoalLabel)) {
    warnings.push(message('selectedGoal', 'Connect the update to a treatment goal when possible.', 'warning'));
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function hasPreSessionBlockingErrors(input: PreSessionValidationInput = {}): boolean {
  return validatePreSessionResponse(input).errors.length > 0;
}
