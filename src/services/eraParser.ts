import type { ParsedEraAdjustment, ParsedEraClaim, ParsedEraFile, ParsedEraPayment, ParsedEraServiceLine } from "./eraPostingTypes";

function money(value: unknown): number {
  const n = Number(String(value ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function text(value: unknown): string | null {
  const out = String(value ?? "").trim();
  return out ? out : null;
}

function dateOnly(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function splitSegments(content: string): string[][] {
  return content
    .replace(/\r|\n/g, "")
    .split("~")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.split("*"));
}

function parseCas(elements: string[]): ParsedEraAdjustment[] {
  const groupCode = text(elements[1]);
  const adjustments: ParsedEraAdjustment[] = [];
  for (let index = 2; index < elements.length; index += 3) {
    const reasonCode = text(elements[index]);
    if (!reasonCode) continue;
    adjustments.push({
      groupCode,
      reasonCode,
      amount: money(elements[index + 1]),
      quantity: elements[index + 2] ? Number(elements[index + 2]) : null,
    });
  }
  return adjustments;
}

function defaultPayment(): ParsedEraPayment {
  return { paymentAmount: 0, paymentMethod: "eft", traceNumber: null, checkNumber: null, paymentDate: null };
}

export function parseEra835(content: string): ParsedEraFile {
  const segments = splitSegments(content);
  const payment = defaultPayment();
  const claims: ParsedEraClaim[] = [];
  let currentClaim: ParsedEraClaim | null = null;
  let currentLine: ParsedEraServiceLine | null = null;

  for (const elements of segments) {
    const tag = elements[0];
    if (tag === "BPR") {
      payment.paymentAmount = money(elements[2]);
      payment.paymentMethod = text(elements[4]) ?? "eft";
      payment.paymentDate = dateOnly(elements[16] ?? elements[15]);
    }
    if (tag === "TRN") {
      payment.traceNumber = text(elements[2]);
      payment.checkNumber = text(elements[2]);
    }
    if (tag === "CLP") {
      if (currentClaim) claims.push(currentClaim);
      currentLine = null;
      currentClaim = {
        patientAccountNumber: text(elements[1]),
        statusCode: text(elements[2]),
        totalChargeAmount: money(elements[3]),
        paidAmount: money(elements[4]),
        patientResponsibilityAmount: money(elements[5]),
        payerClaimControlNumber: text(elements[7]),
        adjustments: [],
        serviceLines: [],
      };
    }
    if (tag === "CAS" && currentClaim) {
      const adjustments = parseCas(elements);
      if (currentLine) currentLine.adjustments.push(...adjustments);
      else currentClaim.adjustments.push(...adjustments);
    }
    if (tag === "SVC" && currentClaim) {
      const codeParts = String(elements[1] ?? "").split(":");
      currentLine = {
        procedureCode: text(codeParts[1] ?? codeParts[0]),
        chargeAmount: money(elements[2]),
        paidAmount: money(elements[3]),
        units: elements[5] ? Number(elements[5]) : null,
        serviceDate: null,
        adjustments: [],
      };
      currentClaim.serviceLines.push(currentLine);
    }
    if (tag === "DTM" && currentLine && elements[1] === "472") {
      currentLine.serviceDate = dateOnly(elements[2]);
    }
  }
  if (currentClaim) claims.push(currentClaim);
  return { payment, claims };
}
