import { ServiceError } from "./serviceBase";
import type { PaymentAdjustmentInput } from "./paymentPostingTypes";

export function paymentDateOnly(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ServiceError("Invalid date.");
  return d.toISOString().slice(0, 10);
}

export function paymentMoney(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

export function paymentObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function paymentAdjustmentCategory(input: PaymentAdjustmentInput): string {
  if (input.category) return input.category;
  const carc = String(input.carcCode ?? "").trim();
  if (["45", "253"].includes(carc)) return "contractual";
  if (["147", "170", "171", "172", "206", "207", "208", "242", "243", "279"].includes(carc)) return "credentialing_contract";
  if (["1", "2", "3"].includes(carc)) return "patient_responsibility";
  return "other";
}
