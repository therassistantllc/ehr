export interface PreSessionNoteImportInput {
  focusText?: string;
  selectedGoalLabel?: string;
  goalUpdateText?: string;
  alertDetails?: string;
  distressRating?: number | string | null;
}

const clean = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, ' ');

export function formatClinicalNoteImport(input: PreSessionNoteImportInput = {}): string {
  const lines = [
    ['Client-stated focus', input.focusText],
    ['Selected treatment goal', input.selectedGoalLabel],
    ['Goal/progress update', input.goalUpdateText],
    ['Distress rating', input.distressRating],
    ['Review flag details', input.alertDetails],
  ]
    .filter(([, value]) => clean(value))
    .map(([label, value]) => `${label}: ${clean(value)}`);

  return lines.join('\n');
}

export function formatFocusForNote(focusText?: string): string {
  return clean(focusText) ? `Client-stated focus: ${clean(focusText)}` : '';
}

export function formatGoalUpdateForNote(selectedGoalLabel?: string, goalUpdateText?: string): string {
  const goal = clean(selectedGoalLabel);
  const update = clean(goalUpdateText);
  if (!goal && !update) return '';
  return [`Selected treatment goal: ${goal}`, `Goal/progress update: ${update}`].filter((line) => !line.endsWith(': ')).join('\n');
}
