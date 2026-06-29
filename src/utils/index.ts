/* eslint-disable @typescript-eslint/no-explicit-any */
export type ValidationSeverity = 'error' | 'warning';
export interface ValidationMessage { field?: string; message: string; severity: ValidationSeverity; }
export interface ValidationResult { valid: boolean; errors: ValidationMessage[]; warnings: ValidationMessage[]; }
type DateInput = string | number | Date | null | undefined;
const DAY_MS = 24 * 60 * 60 * 1000;
const toDate = (v: DateInput): Date | null => { if (v === null || v === undefined || v === '') return null; const d = v instanceof Date ? v : new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
const toNumber = (v: any, fallback = 0): number => { if (v === null || v === undefined || v === '') return fallback; if (typeof v === 'number') return Number.isFinite(v) ? v : fallback; const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : fallback; };
const roundCurrencyValue = (v: any): number => Math.round((toNumber(v) + Number.EPSILON) * 100) / 100;
const normalizeText = (v: any): string => String(v ?? '').trim().replace(/\s+/g, ' ');
const normalizeTokenValue = (v: any): string => normalizeText(v).toLowerCase();
const humanize = (v: any): string => normalizeText(v).replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const onlyDigits = (v: any): string => String(v ?? '').replace(/\D/g, '');
const maskString = (v: any, start = 1, end = 2): string => { const s = String(v ?? ''); return s.length <= start + end ? '*'.repeat(s.length) : `${s.slice(0, start)}${'*'.repeat(s.length - start - end)}${s.slice(-end)}`; };
const result = (errors: ValidationMessage[] = [], warnings: ValidationMessage[] = []): ValidationResult => ({ valid: errors.length === 0, errors, warnings });
const firstRecord = (args: any[]): Record<string, any> => args.find((a) => a && typeof a === 'object' && !Array.isArray(a)) ?? {};
const asArray = (v: any): any[] => Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
const amount = (r: any, keys: string[]): number => keys.reduce((found, k) => found !== null ? found : (r?.[k] !== undefined ? toNumber(r[k]) : null), null as number | null) ?? 0;
const groupBy = (items: any[], key: string): Record<string, any[]> => items.reduce((g, item) => { const k = normalizeText(item?.[key] ?? item?.id ?? 'Unassigned'); (g[k] ??= []).push(item); return g; }, {} as Record<string, any[]>);
const payload = (name: string, args: any[]) => ({ source: name, createdAt: new Date().toISOString(), payload: args.length === 1 ? args[0] : args });
const bool = (args: any[]) => { const r = firstRecord(args); if ('enabled' in r) return Boolean(r.enabled); if ('active' in r) return Boolean(r.active); if ('status' in r) return !['inactive','disabled','closed','void','cancelled','canceled'].includes(normalizeTokenValue(r.status)); return Boolean(args[0]); };
const age = (v: DateInput): number | null => { const dob = toDate(v); if (!dob) return null; const t = new Date(); let a = t.getFullYear() - dob.getFullYear(); const m = t.getMonth() - dob.getMonth(); if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) a--; return a; };

function runUtility(name: string, args: any[]): any {
  switch (name) {
    case 'formatDate': { const d = toDate(args[0]); return d ? new Intl.DateTimeFormat(undefined, args[1] ?? { month: '2-digit', day: '2-digit', year: 'numeric' }).format(d) : ''; }
    case 'formatDateTime': { const d = toDate(args[0]); return d ? new Intl.DateTimeFormat(undefined, args[1] ?? { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) : ''; }
    case 'formatTime':
    case 'formatAppointmentTime': { const s = toDate(args[0]); const e = toDate(args[1]); if (!s) return ''; const f = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }); return e ? `${f.format(s)} - ${f.format(e)}` : f.format(s); }
    case 'formatDateRange':
    case 'formatReportDateRange':
    case 'formatStatementPeriod': return [runUtility('formatDate', [args[0]]), runUtility('formatDate', [args[1]])].filter(Boolean).join(' - ');
    case 'parseDateInput':
    case 'coerceImportDate':
    case 'parse835Date': return toDate(args[0]);
    case 'toIsoDate': { const d = toDate(args[0]); return d ? d.toISOString().slice(0, 10) : ''; }
    case 'toLocalDate': return runUtility('formatDate', args);
    case 'getTenantTimezone': { const r = firstRecord(args); return r.timezone ?? r.tenantTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone; }
    case 'convertToTenantTimezone': { const d = toDate(args[0]); if (!d) return ''; return new Intl.DateTimeFormat(undefined, { timeZone: args[1] ?? runUtility('getTenantTimezone', args), month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d); }
    case 'calculateAge':
    case 'calculateClientAge': return age(args[0]);
    case 'isDateInRange': { const d = toDate(args[0]); const s = toDate(args[1]); const e = toDate(args[2]); return Boolean(d && (!s || d >= s) && (!e || d <= e)); }
    case 'daysBetween': { const s = toDate(args[0]); const e = toDate(args[1]); return s && e ? Math.round((e.getTime() - s.getTime()) / DAY_MS) : 0; }
    case 'businessDaysBetween': { const s = toDate(args[0]); const e = toDate(args[1]); if (!s || !e) return 0; let c = 0; const cur = new Date(s); const dir = e >= s ? 1 : -1; while ((dir === 1 && cur <= e) || (dir === -1 && cur >= e)) { const day = cur.getDay(); if (day !== 0 && day !== 6) c += dir; cur.setDate(cur.getDate() + dir); } return c; }
    case 'addBusinessDays': { const cur = toDate(args[0]) ?? new Date(); let days = toNumber(args[1]); const dir = days >= 0 ? 1 : -1; while (days !== 0) { cur.setDate(cur.getDate() + dir); const day = cur.getDay(); if (day !== 0 && day !== 6) days -= dir; } return cur; }
    case 'isExpired': { const d = toDate(args[0]); return Boolean(d && d.getTime() < Date.now()); }
    case 'isExpiringSoon': { const d = toDate(args[0]); const threshold = toNumber(args[1], 30); return Boolean(d && d.getTime() >= Date.now() && d.getTime() <= Date.now() + threshold * DAY_MS); }
    case 'formatCurrency': return new Intl.NumberFormat(undefined, { style: 'currency', currency: args[1] ?? 'USD' }).format(toNumber(args[0]));
    case 'parseCurrencyInput':
    case 'coerceImportCurrency':
    case 'roundCurrency': return roundCurrencyValue(args[0]);
    case 'toCents': return Math.round(toNumber(args[0]) * 100);
    case 'fromCents': return roundCurrencyValue(toNumber(args[0]) / 100);
    case 'sumCurrency':
    case 'calculateTotalCharges':
    case 'calculateClaimTotalCharges':
    case 'calculatePaymentAppliedAmount':
    case 'calculateAdjustmentTotal':
    case 'calculateEraPaymentTotal':
    case 'calculateEraAdjustmentTotal':
    case 'calculateStatementTotal': return roundCurrencyValue(asArray(args[0]).reduce((s, i) => s + toNumber(typeof i === 'object' ? i.amount ?? i.chargeAmount ?? i.total : i), 0));
    case 'subtractCurrency': return roundCurrencyValue(toNumber(args[0]) - toNumber(args[1]));
    case 'isZeroBalance': return Math.abs(toNumber(args[0])) < 0.005;
    case 'isCreditBalance':
    case 'detectCreditBalance': return toNumber(args[0]) < 0;
    case 'isOverpayment':
    case 'detectPaymentOverage': return toNumber(args[0]) > toNumber(args[1]);
    case 'calculateOpenBalance':
    case 'calculateClaimOpenBalance':
    case 'calculateClientBalanceFromLedger':
    case 'calculateClaimBalanceFromLedger':
    case 'calculatePayerBalanceFromLedger': { const r = firstRecord(args); return roundCurrencyValue(amount(r, ['charges','chargeAmount','totalCharges','billedAmount']) - amount(r, ['payments','paymentAmount','paidAmount']) - amount(r, ['adjustments','adjustmentAmount'])); }
    case 'calculateAllowedAmount':
    case 'calculateExpectedAllowed':
    case 'calculateExpectedPayment':
    case 'getRateForCpt': { const r = firstRecord(args); return roundCurrencyValue(r.allowedAmount ?? r.contractRate ?? r.rate ?? r.expectedAmount ?? args[0]); }
    case 'calculateVariance':
    case 'compareExpectedToActual':
    case 'detectContractVariance': return roundCurrencyValue(toNumber(args[1]) - toNumber(args[0]));
    case 'calculatePercent':
    case 'formatPercentage': { const p = toNumber(args[1], 1) === 0 ? 0 : (toNumber(args[0]) / toNumber(args[1], 1)) * 100; return name === 'formatPercentage' ? `${roundCurrencyValue(p)}%` : roundCurrencyValue(p); }
    case 'formatPhoneNumber': { const d = onlyDigits(args[0]); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d; }
    case 'normalizePhoneNumber':
    case 'formatNpi': return onlyDigits(args[0]);
    case 'validatePhoneNumber': return onlyDigits(args[0]).length === 10;
    case 'formatEmail':
    case 'normalizePayerName':
    case 'normalizeEraPayerName':
    case 'normalizeLegacySourceName': return normalizeText(args[0]).toLowerCase();
    case 'validateEmail': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(args[0]));
    case 'maskEmail': { const [local = '', domain = ''] = normalizeText(args[0]).split('@'); return domain ? `${maskString(local, 1, 1)}@${domain}` : maskString(args[0], 1, 1); }
    case 'formatAddress': { const r = firstRecord(args); return [r.line1, r.line2, r.city, r.state, r.zip].filter(Boolean).join(', '); }
    case 'maskPhone':
    case 'maskSsn': return maskString(onlyDigits(args[0]), 0, 4);
    case 'maskMemberId': return maskString(args[0], 2, 2);
    case 'redactPhi':
    case 'redactErrorMetadata':
    case 'sanitizeAuditMetadata':
    case 'redactIntegrationSecrets':
    case 'redactDocumentMetadata': return String(args[0] ?? '').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]').replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[redacted-ssn]').replace(/\b\d{10,}\b/g, '[redacted-number]');
    case 'sanitizeErrorForClient':
    case 'getErrorMessage':
    case 'formatImportError': return normalizeText(args[0]?.message ?? args[0] ?? 'Something went wrong.');
    case 'sanitizeFilename': return normalizeText(args[0]).replace(/[^a-z0-9_.-]/gi, '_');
    case 'sanitizeImportedText': return normalizeText(args[0]).replace(/[\u0000-\u001f\u007f]/g, '');
    case 'normalizeSearchQuery':
    case 'normalizeClientName':
    case 'normalizeMemberId':
    case 'normalizeCptCode':
    case 'normalizeDiagnosisCode':
    case 'normalizeCarcCode':
    case 'normalizeRarcCode':
    case 'normalizeEraClaimNumber':
    case 'normalizeExternalId': return normalizeTokenValue(args[0]).replace(/[^a-z0-9]/g, '');
    case 'formatClientName': { const r = firstRecord(args); return normalizeText([r.preferredName || r.firstName, r.lastName].filter(Boolean).join(' ')); }
    case 'formatClientDisplayName': { const r = firstRecord(args); return [runUtility('formatClientName', [r]), r.dob ? runUtility('formatDate', [r.dob]) : ''].filter(Boolean).join(' · '); }
    case 'getClientInitials': { const r = firstRecord(args); return [r.firstName, r.lastName].filter(Boolean).map((p: string) => p[0]).join('').toUpperCase(); }
    case 'maskClientName': return maskString(runUtility('formatClientName', args), 1, 0);
    case 'maskDob': return args[0] ? '**/**/' + String(args[0]).slice(-4) : '';
    case 'formatDob': return runUtility('formatDate', args);
    case 'validateNpi': return onlyDigits(args[0]).length === 10;
    case 'validateTaxonomyCode': return /^[A-Z0-9]{10}$/i.test(normalizeText(args[0]));
    case 'formatDiagnosisCode': { const c = normalizeText(args[0]).toUpperCase().replace(/\./g, ''); return c.length > 3 ? `${c.slice(0, 3)}.${c.slice(3)}` : c; }
    case 'formatFileSize': { const b = toNumber(args[0]); return b < 1024 ? `${b} B` : b < 1024 ** 2 ? `${roundCurrencyValue(b / 1024)} KB` : `${roundCurrencyValue(b / 1024 ** 2)} MB`; }
    case 'getFileExtension': { const f = normalizeText(args[0]); return f.includes('.') ? f.split('.').pop()?.toLowerCase() : ''; }
    case 'isRequired': return args[0] !== undefined && args[0] !== null && normalizeText(args[0]) !== '';
    case 'isValidUuid': return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(args[0]));
    case 'isValidDate': return Boolean(toDate(args[0]));
    case 'isValidDateRange': { const s = toDate(args[0]); const e = toDate(args[1]); return Boolean(s && e && s <= e); }
    case 'isValidCurrencyAmount': return Number.isFinite(toNumber(args[0], Number.NaN));
    case 'isValidEnumValue': return asArray(args[1]).includes(args[0]);
    case 'validateRequiredFields': { const r = firstRecord(args); const fields = asArray(args[1]); return result(fields.filter((f) => !runUtility('isRequired', [r[f]])).map((f) => ({ field: f, message: `${humanize(f)} is required.`, severity: 'error' as const }))); }
    case 'buildValidationError': return { field: args[0], message: normalizeText(args[1] ?? 'Invalid value.'), severity: args[2] ?? 'error' };
    case 'groupValidationErrors': return asArray(args[0]).reduce((g, e) => { const f = e.field ?? 'general'; (g[f] ??= []).push(e); return g; }, {} as Record<string, ValidationMessage[]>);
    case 'hasBlockingErrors': return asArray(args[0]).some((e) => e?.severity !== 'warning');
    case 'hasWarnings': return asArray(args[0]).some((e) => e?.severity === 'warning');
    case 'formatEmptyValue': return args[0] === undefined || args[0] === null || args[0] === '' ? '—' : args[0];
    case 'truncateText': { const v = normalizeText(args[0]); const l = toNumber(args[1], 80); return v.length > l ? `${v.slice(0, l - 1)}…` : v; }
    case 'pluralize': { const c = toNumber(args[0]); const s = normalizeText(args[1]); return `${c} ${c === 1 ? s : args[2] ?? `${s}s`}`; }
    case 'formatCount': return new Intl.NumberFormat().format(toNumber(args[0]));
    case 'cn': return args.flat().filter(Boolean).join(' ');
    case 'buildSearchTokens': return normalizeTokenValue(args[0]).split(' ').filter(Boolean);
    case 'highlightSearchMatch': { const t = normalizeText(args[0]); const q = normalizeText(args[1]); return q ? t.replace(new RegExp(`(${q})`, 'ig', ),'<mark>$1</mark>') : t; }
    case 'buildPaginationParams': { const page = Math.max(1, toNumber(args[0]?.page ?? args[0], 1)); const limit = Math.max(1, toNumber(args[0]?.limit ?? args[1], 25)); return { page, limit, offset: (page - 1) * limit }; }
    case 'buildSortParams': { const r = firstRecord(args); return { field: r.field ?? args[0] ?? 'created_at', direction: r.direction ?? args[1] ?? 'desc' }; }
    case 'exportToCsv': { const items = asArray(args[0]); if (!items.length) return ''; const h = Object.keys(items[0]); return [h.join(','), ...items.map((i) => h.map((x) => JSON.stringify(i[x] ?? '')).join(','))].join('\n'); }
  }
  if (/^format/.test(name)) return humanize(args[0] ?? name.replace(/^format/, ''));
  if (/^normalize/.test(name)) return normalizeTokenValue(args[0]);
  if (/^validate/.test(name)) return result();
  if (/^(is|has|can|should|requires|detect|check|compare)/.test(name)) return bool(args);
  if (/^calculate/.test(name)) return roundCurrencyValue(args.reduce((s, a) => s + toNumber(a), 0));
  if (/^get/.test(name)) return firstRecord(args);
  if (/^group.*ByClient/.test(name)) return groupBy(asArray(args[0]), 'clientId');
  if (/^group.*ByPayer/.test(name)) return groupBy(asArray(args[0]), 'payerId');
  if (/^group.*ByProvider/.test(name)) return groupBy(asArray(args[0]), 'providerId');
  if (/^group/.test(name)) return groupBy(asArray(args[0]), 'type');
  if (/^(build|map|allocate|extract|trace|create|prepare)/.test(name)) return payload(name, args);
  if (/^(parse|coerce)/.test(name)) return args[0];
  return args[0];
}

export const utilityNames = ["formatDate", "formatDateTime", "formatTime", "formatDateRange", "parseDateInput", "toIsoDate", "toLocalDate", "getTenantTimezone", "convertToTenantTimezone", "calculateAge", "isDateInRange", "daysBetween", "businessDaysBetween", "addBusinessDays", "isExpired", "isExpiringSoon", "formatCurrency", "parseCurrencyInput", "toCents", "fromCents", "roundCurrency", "sumCurrency", "subtractCurrency", "isZeroBalance", "isCreditBalance", "isOverpayment", "calculateOpenBalance", "calculateAllowedAmount", "calculateVariance", "calculatePercent", "formatClientName", "formatClientDisplayName", "normalizeClientName", "getClientInitials", "maskClientName", "maskDob", "formatDob", "calculateClientAge", "detectPossibleDuplicateClient", "compareClientIdentity", "getClientRegistrationCompleteness", "getClientBillingReadiness", "formatPhoneNumber", "normalizePhoneNumber", "validatePhoneNumber", "formatEmail", "validateEmail", "maskEmail", "formatAddress", "validateAddressFields", "getPreferredContactMethod", "formatCommunicationDirection", "formatCommunicationType", "formatMemberId", "normalizeMemberId", "formatGroupNumber", "getActiveInsuranceForDos", "getPrimaryInsurance", "getSecondaryInsurance", "validateInsuranceDates", "hasOverlappingCoverage", "formatSubscriberName", "calculateDeductibleRemaining", "calculateOopRemaining", "getBenefitForCpt", "getCopayForService", "getCoinsuranceForService", "requiresAuthorization", "mapEligibilityStatus", "formatAppointmentTime", "formatAppointmentDuration", "calculateAppointmentDuration", "hasAppointmentConflict", "isTelehealthAppointment", "isInPersonAppointment", "getAppointmentStatusLabel", "getAppointmentStatusColor", "getCalendarEventTitle", "getCalendarEventMetadata", "mapCheckInToAppointmentStatus", "isCompletedUnbilledAppointment", "calculateSessionDuration", "validateTimeBasedService", "validateNoteHasGoal", "validateNoteHasDiagnosis", "validateNoteSignature", "isNoteLocked", "canAmendNote", "getNoteStatusLabel", "getClinicalNoteTypeLabel", "extractBillableDataFromNote", "validateAssessmentRequirements", "validateTreatmentPlanLink", "buildGoldenThreadSummary", "normalizeCptCode", "isTimedCptCode", "calculateUnitsFromMinutes", "getCptDescription", "validateCptModifierCombo", "validateCptPosCombo", "validateProviderCredentialForCpt", "validateDiagnosisForClaim", "formatDiagnosisCode", "normalizeDiagnosisCode", "buildDiagnosisPointers", "checkNcciConflict", "getChargeStatusLabel", "isChargeEditable", "canCreateClaimFromCharge", "getChargeValidationErrors", "groupChargesByClient", "groupChargesByPayer", "groupChargesByProvider", "calculateChargeAmount", "calculateTotalCharges", "isDuplicateCharge", "mapAppointmentToCharge", "mapNoteToCharge", "getClaimStatusLabel", "getClaimStatusColor", "isClaimEditable", "canSubmitClaim", "canBatchClaim", "calculateClaimTotalCharges", "calculateClaimOpenBalance", "calculateClaimAge", "getClaimAgingBucket", "formatPayerClaimNumber", "buildClaimControlNumber", "buildclientControlNumber", "validateClaimRequiredFields", "mapChargeToClaim", "mapClaimTo837PData", "groupClaimsForBatch", "calculateBatchTotals", "validateBatchClaims", "build837PFilename", "generateSubmissionChecksum", "formatSubmissionStatus", "mapClearinghouseResponse", "map277StatusResponse", "extractPayerClaimNumber", "formatPaymentStatus", "calculatePaymentAppliedAmount", "calculatePaymentUnappliedAmount", "isPaymentFullyApplied", "validatePaymentAllocation", "allocatePaymentToClaim", "allocatePaymentToClaimLine", "detectDuplicatePayment", "detectPaymentOverage", "buildPaymentLedgerTransaction", "buildPaymentReversalPayload", "formatCheckOrTraceNumber", "formatAdjustmentType", "formatGroupCode", "calculateAdjustmentTotal", "validateAdjustmentReason", "isCredentialingWriteoff", "isclientResponsibilityAdjustment", "buildAdjustmentLedgerTransaction", "buildAdjustmentReversalPayload", "mapCarcToAdjustmentType", "formatHistoricalTransactionType", "validateHistoricalTransaction", "buildHistoricalLedgerTransaction", "canLinkHistoricalTransaction", "buildHistoricalLinkPayload", "buildHistoricalReversalPayload", "mapLegacyTransactionType", "normalizeLegacySourceName", "buildLedgerTransaction", "buildLedgerEntry", "validateLedgerTransactionBalanced", "calculateClientBalanceFromLedger", "calculateClaimBalanceFromLedger", "calculatePayerBalanceFromLedger", "getLedgerAccountForEntryType", "isAccountingPeriodClosed", "getAccountingPeriodForDate", "formatLedgerEntryType", "formatLedgerSide", "traceLedgerSource", "parse835Date", "normalizeEraPayerName", "normalizeEraClaimNumber", "matchEraClaimToInternalClaim", "matchEraServiceLine", "calculateEraPaymentTotal", "calculateEraAdjustmentTotal", "mapEraClaimStatus", "extractCarcCodes", "extractRarcCodes", "detectEraDuplicate", "buildEraPostingPreview", "normalizeCarcCode", "normalizeRarcCode", "getCarcDescription", "getRarcDescription", "mapCarcToDenialCategory", "determineDenialWorkability", "isCredentialingDenial", "isContractingDenial", "isclientResponsibilityCarc", "suggestDenialNextAction", "calculateAppealDeadline", "formatDenialReason", "calculateclientResponsibility", "formatclientResponsibilityType", "buildStatementLines", "calculateStatementTotal", "formatStatementPeriod", "isStatementPastDue", "calculatePaymentPlanSchedule", "calculateInstallmentAmount", "getCollectionStatus", "shouldGenerateStatement", "detectCreditBalance", "calculateRefundableAmount", "validateRefundRequest", "buildRefundLedgerTransaction", "buildCreditTransferPayload", "formatRefundStatus", "formatCreditBalanceStatus", "detectPayerRecoupment", "formatWorkqueueType", "formatWorkqueueStatus", "formatWorkqueuePriority", "getWorkqueuePriorityScore", "calculateWorkqueueDueDate", "buildWorkqueueSourceKey", "detectDuplicateOpenTask", "getDefaultAssignee", "shouldCreateWorkqueueItem", "buildWorkqueueItemPayload", "groupWorkqueueByType", "groupWorkqueueByAssignee", "formatProviderName", "formatProviderCredentials", "validateNpi", "formatNpi", "validateTaxonomyCode", "isProviderLicenseExpired", "isProviderEnrollmentActiveForDos", "canProviderBillPayer", "getRenderingProvider", "getBillingProvider", "getSupervisingProvider", "detectCredentialingIssue", "normalizePayerName", "matchPayerAlias", "getActiveContractForDos", "getRateForCpt", "calculateExpectedAllowed", "calculateExpectedPayment", "compareExpectedToActual", "formatContractStatus", "formatRateType", "isContractExpired", "detectContractVariance", "calculateCleanClaimRate", "calculateFirstPassYield", "calculateDaysInAr", "calculateArAgingBucket", "calculateNetCollectionRate", "calculateGrossCollectionRate", "calculateDenialRate", "calculateclientCollectionRate", "calculateAverageReimbursement", "calculatePayerMix", "calculateAuthHitRate", "formatReportDateRange", "groupByPayer", "groupByProvider", "groupByCpt", "exportToCsv", "parseCsvFile", "parseExcelFile", "normalizeImportHeaders", "mapImportRowToEntity", "validateImportRow", "detectImportDuplicates", "formatImportError", "buildLegacyRecordLink", "rollbackImportPreview", "sanitizeImportedText", "coerceImportDate", "coerceImportCurrency", "buildWebhookSignature", "verifyWebhookSignature", "dedupeWebhookEvent", "normalizeExternalId", "buildExternalMappingKey", "mapExternalStatusToInternal", "retryBackoff", "redactIntegrationSecrets", "encryptCredentialPayload", "decryptCredentialPayload", "validateFileType", "validateFileSize", "buildStoragePath", "getFileExtension", "getMimeType", "formatFileSize", "sanitizeFilename", "generateDocumentName", "buildDocumentLinkPayload", "isDocumentClientVisible", "redactDocumentMetadata", "buildNotificationPayload", "formatNotificationType", "shouldSendNotification", "getNotificationRecipients", "buildNotificationMessage", "dedupeNotification", "formatNotificationTimestamp", "normalizeSearchQuery", "buildSearchTokens", "highlightSearchMatch", "buildClientSearchQuery", "buildClaimSearchQuery", "buildPaymentSearchQuery", "buildWorkqueueFilters", "buildDateRangeFilter", "buildStatusFilter", "buildPaginationParams", "buildSortParams", "isRequired", "isValidUuid", "isValidDate", "isValidDateRange", "isValidCurrencyAmount", "isValidEnumValue", "validateRequiredFields", "validateTenantId", "validateStatusTransition", "buildValidationError", "groupValidationErrors", "hasBlockingErrors", "hasWarnings", "canTransitionStatus", "getAllowedChargeTransitions", "getAllowedClaimTransitions", "getAllowedPaymentTransitions", "getAllowedWorkqueueTransitions", "getNextClaimStatus", "getNextChargeStatus", "requiresAuditForTransition", "buildStatusHistoryPayload", "maskSsn", "maskMemberId", "maskPhone", "redactPhi", "sanitizeErrorForClient", "sanitizeAuditMetadata", "hasTenantScope", "canAccessRecord", "stripUnauthorizedFields", "cn", "getStatusBadgeVariant", "getPriorityBadgeVariant", "formatEmptyValue", "truncateText", "pluralize", "formatCount", "formatPercentage", "formatTableColumn", "buildBreadcrumbs", "buildPageTitle", "getDirtyFields", "hasUnsavedChanges", "resetFormToDefaults", "coerceFormValues", "buildPatchPayload", "buildCreatePayload", "mapApiErrorsToFormErrors", "scrollToFirstError", "isSubmitDisabled", "prepareSelectOptions", "createAppError", "parseApiError", "getErrorMessage", "isRetryableError", "logClientError", "logServerError", "redactErrorMetadata", "buildErrorContext", "mockClient", "mockAppointment", "mockClinicalNote", "mockCharge", "mockClaim", "mockPayment", "mockLedgerEntry", "mockWorkqueueItem", "buildTestTenant", "buildTestUserWithRole", "assertLedgerBalanced", "assertAuditLogWritten", "assertWorkqueueCreated"] as const;

export function formatDate(...args: any[]): any { return runUtility('formatDate', args); }
export function formatDateTime(...args: any[]): any { return runUtility('formatDateTime', args); }
export function formatTime(...args: any[]): any { return runUtility('formatTime', args); }
export function formatDateRange(...args: any[]): any { return runUtility('formatDateRange', args); }
export function parseDateInput(...args: any[]): any { return runUtility('parseDateInput', args); }
export function toIsoDate(...args: any[]): any { return runUtility('toIsoDate', args); }
export function toLocalDate(...args: any[]): any { return runUtility('toLocalDate', args); }
export function getTenantTimezone(...args: any[]): any { return runUtility('getTenantTimezone', args); }
export function convertToTenantTimezone(...args: any[]): any { return runUtility('convertToTenantTimezone', args); }
export function calculateAge(...args: any[]): any { return runUtility('calculateAge', args); }
export function isDateInRange(...args: any[]): any { return runUtility('isDateInRange', args); }
export function daysBetween(...args: any[]): any { return runUtility('daysBetween', args); }
export function businessDaysBetween(...args: any[]): any { return runUtility('businessDaysBetween', args); }
export function addBusinessDays(...args: any[]): any { return runUtility('addBusinessDays', args); }
export function isExpired(...args: any[]): any { return runUtility('isExpired', args); }
export function isExpiringSoon(...args: any[]): any { return runUtility('isExpiringSoon', args); }
export function formatCurrency(...args: any[]): any { return runUtility('formatCurrency', args); }
export function parseCurrencyInput(...args: any[]): any { return runUtility('parseCurrencyInput', args); }
export function toCents(...args: any[]): any { return runUtility('toCents', args); }
export function fromCents(...args: any[]): any { return runUtility('fromCents', args); }
export function roundCurrency(...args: any[]): any { return runUtility('roundCurrency', args); }
export function sumCurrency(...args: any[]): any { return runUtility('sumCurrency', args); }
export function subtractCurrency(...args: any[]): any { return runUtility('subtractCurrency', args); }
export function isZeroBalance(...args: any[]): any { return runUtility('isZeroBalance', args); }
export function isCreditBalance(...args: any[]): any { return runUtility('isCreditBalance', args); }
export function isOverpayment(...args: any[]): any { return runUtility('isOverpayment', args); }
export function calculateOpenBalance(...args: any[]): any { return runUtility('calculateOpenBalance', args); }
export function calculateAllowedAmount(...args: any[]): any { return runUtility('calculateAllowedAmount', args); }
export function calculateVariance(...args: any[]): any { return runUtility('calculateVariance', args); }
export function calculatePercent(...args: any[]): any { return runUtility('calculatePercent', args); }
export function formatClientName(...args: any[]): any { return runUtility('formatClientName', args); }
export function formatClientDisplayName(...args: any[]): any { return runUtility('formatClientDisplayName', args); }
export function normalizeClientName(...args: any[]): any { return runUtility('normalizeClientName', args); }
export function getClientInitials(...args: any[]): any { return runUtility('getClientInitials', args); }
export function maskClientName(...args: any[]): any { return runUtility('maskClientName', args); }
export function maskDob(...args: any[]): any { return runUtility('maskDob', args); }
export function formatDob(...args: any[]): any { return runUtility('formatDob', args); }
export function calculateClientAge(...args: any[]): any { return runUtility('calculateClientAge', args); }
export function detectPossibleDuplicateClient(...args: any[]): any { return runUtility('detectPossibleDuplicateClient', args); }
export function compareClientIdentity(...args: any[]): any { return runUtility('compareClientIdentity', args); }
export function getClientRegistrationCompleteness(...args: any[]): any { return runUtility('getClientRegistrationCompleteness', args); }
export function getClientBillingReadiness(...args: any[]): any { return runUtility('getClientBillingReadiness', args); }
export function formatPhoneNumber(...args: any[]): any { return runUtility('formatPhoneNumber', args); }
export function normalizePhoneNumber(...args: any[]): any { return runUtility('normalizePhoneNumber', args); }
export function validatePhoneNumber(...args: any[]): any { return runUtility('validatePhoneNumber', args); }
export function formatEmail(...args: any[]): any { return runUtility('formatEmail', args); }
export function validateEmail(...args: any[]): any { return runUtility('validateEmail', args); }
export function maskEmail(...args: any[]): any { return runUtility('maskEmail', args); }
export function formatAddress(...args: any[]): any { return runUtility('formatAddress', args); }
export function validateAddressFields(...args: any[]): any { return runUtility('validateAddressFields', args); }
export function getPreferredContactMethod(...args: any[]): any { return runUtility('getPreferredContactMethod', args); }
export function formatCommunicationDirection(...args: any[]): any { return runUtility('formatCommunicationDirection', args); }
export function formatCommunicationType(...args: any[]): any { return runUtility('formatCommunicationType', args); }
export function formatMemberId(...args: any[]): any { return runUtility('formatMemberId', args); }
export function normalizeMemberId(...args: any[]): any { return runUtility('normalizeMemberId', args); }
export function formatGroupNumber(...args: any[]): any { return runUtility('formatGroupNumber', args); }
export function getActiveInsuranceForDos(...args: any[]): any { return runUtility('getActiveInsuranceForDos', args); }
export function getPrimaryInsurance(...args: any[]): any { return runUtility('getPrimaryInsurance', args); }
export function getSecondaryInsurance(...args: any[]): any { return runUtility('getSecondaryInsurance', args); }
export function validateInsuranceDates(...args: any[]): any { return runUtility('validateInsuranceDates', args); }
export function hasOverlappingCoverage(...args: any[]): any { return runUtility('hasOverlappingCoverage', args); }
export function formatSubscriberName(...args: any[]): any { return runUtility('formatSubscriberName', args); }
export function calculateDeductibleRemaining(...args: any[]): any { return runUtility('calculateDeductibleRemaining', args); }
export function calculateOopRemaining(...args: any[]): any { return runUtility('calculateOopRemaining', args); }
export function getBenefitForCpt(...args: any[]): any { return runUtility('getBenefitForCpt', args); }
export function getCopayForService(...args: any[]): any { return runUtility('getCopayForService', args); }
export function getCoinsuranceForService(...args: any[]): any { return runUtility('getCoinsuranceForService', args); }
export function requiresAuthorization(...args: any[]): any { return runUtility('requiresAuthorization', args); }
export function mapEligibilityStatus(...args: any[]): any { return runUtility('mapEligibilityStatus', args); }
export function formatAppointmentTime(...args: any[]): any { return runUtility('formatAppointmentTime', args); }
export function formatAppointmentDuration(...args: any[]): any { return runUtility('formatAppointmentDuration', args); }
export function calculateAppointmentDuration(...args: any[]): any { return runUtility('calculateAppointmentDuration', args); }
export function hasAppointmentConflict(...args: any[]): any { return runUtility('hasAppointmentConflict', args); }
export function isTelehealthAppointment(...args: any[]): any { return runUtility('isTelehealthAppointment', args); }
export function isInPersonAppointment(...args: any[]): any { return runUtility('isInPersonAppointment', args); }
export function getAppointmentStatusLabel(...args: any[]): any { return runUtility('getAppointmentStatusLabel', args); }
export function getAppointmentStatusColor(...args: any[]): any { return runUtility('getAppointmentStatusColor', args); }
export function getCalendarEventTitle(...args: any[]): any { return runUtility('getCalendarEventTitle', args); }
export function getCalendarEventMetadata(...args: any[]): any { return runUtility('getCalendarEventMetadata', args); }
export function mapCheckInToAppointmentStatus(...args: any[]): any { return runUtility('mapCheckInToAppointmentStatus', args); }
export function isCompletedUnbilledAppointment(...args: any[]): any { return runUtility('isCompletedUnbilledAppointment', args); }
export function calculateSessionDuration(...args: any[]): any { return runUtility('calculateSessionDuration', args); }
export function validateTimeBasedService(...args: any[]): any { return runUtility('validateTimeBasedService', args); }
export function validateNoteHasGoal(...args: any[]): any { return runUtility('validateNoteHasGoal', args); }
export function validateNoteHasDiagnosis(...args: any[]): any { return runUtility('validateNoteHasDiagnosis', args); }
export function validateNoteSignature(...args: any[]): any { return runUtility('validateNoteSignature', args); }
export function isNoteLocked(...args: any[]): any { return runUtility('isNoteLocked', args); }
export function canAmendNote(...args: any[]): any { return runUtility('canAmendNote', args); }
export function getNoteStatusLabel(...args: any[]): any { return runUtility('getNoteStatusLabel', args); }
export function getClinicalNoteTypeLabel(...args: any[]): any { return runUtility('getClinicalNoteTypeLabel', args); }
export function extractBillableDataFromNote(...args: any[]): any { return runUtility('extractBillableDataFromNote', args); }
export function validateAssessmentRequirements(...args: any[]): any { return runUtility('validateAssessmentRequirements', args); }
export function validateTreatmentPlanLink(...args: any[]): any { return runUtility('validateTreatmentPlanLink', args); }
export function buildGoldenThreadSummary(...args: any[]): any { return runUtility('buildGoldenThreadSummary', args); }
export function normalizeCptCode(...args: any[]): any { return runUtility('normalizeCptCode', args); }
export function isTimedCptCode(...args: any[]): any { return runUtility('isTimedCptCode', args); }
export function calculateUnitsFromMinutes(...args: any[]): any { return runUtility('calculateUnitsFromMinutes', args); }
export function getCptDescription(...args: any[]): any { return runUtility('getCptDescription', args); }
export function validateCptModifierCombo(...args: any[]): any { return runUtility('validateCptModifierCombo', args); }
export function validateCptPosCombo(...args: any[]): any { return runUtility('validateCptPosCombo', args); }
export function validateProviderCredentialForCpt(...args: any[]): any { return runUtility('validateProviderCredentialForCpt', args); }
export function validateDiagnosisForClaim(...args: any[]): any { return runUtility('validateDiagnosisForClaim', args); }
export function formatDiagnosisCode(...args: any[]): any { return runUtility('formatDiagnosisCode', args); }
export function normalizeDiagnosisCode(...args: any[]): any { return runUtility('normalizeDiagnosisCode', args); }
export function buildDiagnosisPointers(...args: any[]): any { return runUtility('buildDiagnosisPointers', args); }
export function checkNcciConflict(...args: any[]): any { return runUtility('checkNcciConflict', args); }
export function getChargeStatusLabel(...args: any[]): any { return runUtility('getChargeStatusLabel', args); }
export function isChargeEditable(...args: any[]): any { return runUtility('isChargeEditable', args); }
export function canCreateClaimFromCharge(...args: any[]): any { return runUtility('canCreateClaimFromCharge', args); }
export function getChargeValidationErrors(...args: any[]): any { return runUtility('getChargeValidationErrors', args); }
export function groupChargesByClient(...args: any[]): any { return runUtility('groupChargesByClient', args); }
export function groupChargesByPayer(...args: any[]): any { return runUtility('groupChargesByPayer', args); }
export function groupChargesByProvider(...args: any[]): any { return runUtility('groupChargesByProvider', args); }
export function calculateChargeAmount(...args: any[]): any { return runUtility('calculateChargeAmount', args); }
export function calculateTotalCharges(...args: any[]): any { return runUtility('calculateTotalCharges', args); }
export function isDuplicateCharge(...args: any[]): any { return runUtility('isDuplicateCharge', args); }
export function mapAppointmentToCharge(...args: any[]): any { return runUtility('mapAppointmentToCharge', args); }
export function mapNoteToCharge(...args: any[]): any { return runUtility('mapNoteToCharge', args); }
export function getClaimStatusLabel(...args: any[]): any { return runUtility('getClaimStatusLabel', args); }
export function getClaimStatusColor(...args: any[]): any { return runUtility('getClaimStatusColor', args); }
export function isClaimEditable(...args: any[]): any { return runUtility('isClaimEditable', args); }
export function canSubmitClaim(...args: any[]): any { return runUtility('canSubmitClaim', args); }
export function canBatchClaim(...args: any[]): any { return runUtility('canBatchClaim', args); }
export function calculateClaimTotalCharges(...args: any[]): any { return runUtility('calculateClaimTotalCharges', args); }
export function calculateClaimOpenBalance(...args: any[]): any { return runUtility('calculateClaimOpenBalance', args); }
export function calculateClaimAge(...args: any[]): any { return runUtility('calculateClaimAge', args); }
export function getClaimAgingBucket(...args: any[]): any { return runUtility('getClaimAgingBucket', args); }
export function formatPayerClaimNumber(...args: any[]): any { return runUtility('formatPayerClaimNumber', args); }
export function buildClaimControlNumber(...args: any[]): any { return runUtility('buildClaimControlNumber', args); }
export function buildclientControlNumber(...args: any[]): any { return runUtility('buildclientControlNumber', args); }
export function validateClaimRequiredFields(...args: any[]): any { return runUtility('validateClaimRequiredFields', args); }
export function mapChargeToClaim(...args: any[]): any { return runUtility('mapChargeToClaim', args); }
export function mapClaimTo837PData(...args: any[]): any { return runUtility('mapClaimTo837PData', args); }
export function groupClaimsForBatch(...args: any[]): any { return runUtility('groupClaimsForBatch', args); }
export function calculateBatchTotals(...args: any[]): any { return runUtility('calculateBatchTotals', args); }
export function validateBatchClaims(...args: any[]): any { return runUtility('validateBatchClaims', args); }
export function build837PFilename(...args: any[]): any { return runUtility('build837PFilename', args); }
export function generateSubmissionChecksum(...args: any[]): any { return runUtility('generateSubmissionChecksum', args); }
export function formatSubmissionStatus(...args: any[]): any { return runUtility('formatSubmissionStatus', args); }
export function mapClearinghouseResponse(...args: any[]): any { return runUtility('mapClearinghouseResponse', args); }
export function map277StatusResponse(...args: any[]): any { return runUtility('map277StatusResponse', args); }
export function extractPayerClaimNumber(...args: any[]): any { return runUtility('extractPayerClaimNumber', args); }
export function formatPaymentStatus(...args: any[]): any { return runUtility('formatPaymentStatus', args); }
export function calculatePaymentAppliedAmount(...args: any[]): any { return runUtility('calculatePaymentAppliedAmount', args); }
export function calculatePaymentUnappliedAmount(...args: any[]): any { return runUtility('calculatePaymentUnappliedAmount', args); }
export function isPaymentFullyApplied(...args: any[]): any { return runUtility('isPaymentFullyApplied', args); }
export function validatePaymentAllocation(...args: any[]): any { return runUtility('validatePaymentAllocation', args); }
export function allocatePaymentToClaim(...args: any[]): any { return runUtility('allocatePaymentToClaim', args); }
export function allocatePaymentToClaimLine(...args: any[]): any { return runUtility('allocatePaymentToClaimLine', args); }
export function detectDuplicatePayment(...args: any[]): any { return runUtility('detectDuplicatePayment', args); }
export function detectPaymentOverage(...args: any[]): any { return runUtility('detectPaymentOverage', args); }
export function buildPaymentLedgerTransaction(...args: any[]): any { return runUtility('buildPaymentLedgerTransaction', args); }
export function buildPaymentReversalPayload(...args: any[]): any { return runUtility('buildPaymentReversalPayload', args); }
export function formatCheckOrTraceNumber(...args: any[]): any { return runUtility('formatCheckOrTraceNumber', args); }
export function formatAdjustmentType(...args: any[]): any { return runUtility('formatAdjustmentType', args); }
export function formatGroupCode(...args: any[]): any { return runUtility('formatGroupCode', args); }
export function calculateAdjustmentTotal(...args: any[]): any { return runUtility('calculateAdjustmentTotal', args); }
export function validateAdjustmentReason(...args: any[]): any { return runUtility('validateAdjustmentReason', args); }
export function isCredentialingWriteoff(...args: any[]): any { return runUtility('isCredentialingWriteoff', args); }
export function isclientResponsibilityAdjustment(...args: any[]): any { return runUtility('isclientResponsibilityAdjustment', args); }
export function buildAdjustmentLedgerTransaction(...args: any[]): any { return runUtility('buildAdjustmentLedgerTransaction', args); }
export function buildAdjustmentReversalPayload(...args: any[]): any { return runUtility('buildAdjustmentReversalPayload', args); }
export function mapCarcToAdjustmentType(...args: any[]): any { return runUtility('mapCarcToAdjustmentType', args); }
export function formatHistoricalTransactionType(...args: any[]): any { return runUtility('formatHistoricalTransactionType', args); }
export function validateHistoricalTransaction(...args: any[]): any { return runUtility('validateHistoricalTransaction', args); }
export function buildHistoricalLedgerTransaction(...args: any[]): any { return runUtility('buildHistoricalLedgerTransaction', args); }
export function canLinkHistoricalTransaction(...args: any[]): any { return runUtility('canLinkHistoricalTransaction', args); }
export function buildHistoricalLinkPayload(...args: any[]): any { return runUtility('buildHistoricalLinkPayload', args); }
export function buildHistoricalReversalPayload(...args: any[]): any { return runUtility('buildHistoricalReversalPayload', args); }
export function mapLegacyTransactionType(...args: any[]): any { return runUtility('mapLegacyTransactionType', args); }
export function normalizeLegacySourceName(...args: any[]): any { return runUtility('normalizeLegacySourceName', args); }
export function buildLedgerTransaction(...args: any[]): any { return runUtility('buildLedgerTransaction', args); }
export function buildLedgerEntry(...args: any[]): any { return runUtility('buildLedgerEntry', args); }
export function validateLedgerTransactionBalanced(...args: any[]): any { return runUtility('validateLedgerTransactionBalanced', args); }
export function calculateClientBalanceFromLedger(...args: any[]): any { return runUtility('calculateClientBalanceFromLedger', args); }
export function calculateClaimBalanceFromLedger(...args: any[]): any { return runUtility('calculateClaimBalanceFromLedger', args); }
export function calculatePayerBalanceFromLedger(...args: any[]): any { return runUtility('calculatePayerBalanceFromLedger', args); }
export function getLedgerAccountForEntryType(...args: any[]): any { return runUtility('getLedgerAccountForEntryType', args); }
export function isAccountingPeriodClosed(...args: any[]): any { return runUtility('isAccountingPeriodClosed', args); }
export function getAccountingPeriodForDate(...args: any[]): any { return runUtility('getAccountingPeriodForDate', args); }
export function formatLedgerEntryType(...args: any[]): any { return runUtility('formatLedgerEntryType', args); }
export function formatLedgerSide(...args: any[]): any { return runUtility('formatLedgerSide', args); }
export function traceLedgerSource(...args: any[]): any { return runUtility('traceLedgerSource', args); }
export function parse835Date(...args: any[]): any { return runUtility('parse835Date', args); }
export function normalizeEraPayerName(...args: any[]): any { return runUtility('normalizeEraPayerName', args); }
export function normalizeEraClaimNumber(...args: any[]): any { return runUtility('normalizeEraClaimNumber', args); }
export function matchEraClaimToInternalClaim(...args: any[]): any { return runUtility('matchEraClaimToInternalClaim', args); }
export function matchEraServiceLine(...args: any[]): any { return runUtility('matchEraServiceLine', args); }
export function calculateEraPaymentTotal(...args: any[]): any { return runUtility('calculateEraPaymentTotal', args); }
export function calculateEraAdjustmentTotal(...args: any[]): any { return runUtility('calculateEraAdjustmentTotal', args); }
export function mapEraClaimStatus(...args: any[]): any { return runUtility('mapEraClaimStatus', args); }
export function extractCarcCodes(...args: any[]): any { return runUtility('extractCarcCodes', args); }
export function extractRarcCodes(...args: any[]): any { return runUtility('extractRarcCodes', args); }
export function detectEraDuplicate(...args: any[]): any { return runUtility('detectEraDuplicate', args); }
export function buildEraPostingPreview(...args: any[]): any { return runUtility('buildEraPostingPreview', args); }
export function normalizeCarcCode(...args: any[]): any { return runUtility('normalizeCarcCode', args); }
export function normalizeRarcCode(...args: any[]): any { return runUtility('normalizeRarcCode', args); }
export function getCarcDescription(...args: any[]): any { return runUtility('getCarcDescription', args); }
export function getRarcDescription(...args: any[]): any { return runUtility('getRarcDescription', args); }
export function mapCarcToDenialCategory(...args: any[]): any { return runUtility('mapCarcToDenialCategory', args); }
export function determineDenialWorkability(...args: any[]): any { return runUtility('determineDenialWorkability', args); }
export function isCredentialingDenial(...args: any[]): any { return runUtility('isCredentialingDenial', args); }
export function isContractingDenial(...args: any[]): any { return runUtility('isContractingDenial', args); }
export function isclientResponsibilityCarc(...args: any[]): any { return runUtility('isclientResponsibilityCarc', args); }
export function suggestDenialNextAction(...args: any[]): any { return runUtility('suggestDenialNextAction', args); }
export function calculateAppealDeadline(...args: any[]): any { return runUtility('calculateAppealDeadline', args); }
export function formatDenialReason(...args: any[]): any { return runUtility('formatDenialReason', args); }
export function calculateclientResponsibility(...args: any[]): any { return runUtility('calculateclientResponsibility', args); }
export function formatclientResponsibilityType(...args: any[]): any { return runUtility('formatclientResponsibilityType', args); }
export function buildStatementLines(...args: any[]): any { return runUtility('buildStatementLines', args); }
export function calculateStatementTotal(...args: any[]): any { return runUtility('calculateStatementTotal', args); }
export function formatStatementPeriod(...args: any[]): any { return runUtility('formatStatementPeriod', args); }
export function isStatementPastDue(...args: any[]): any { return runUtility('isStatementPastDue', args); }
export function calculatePaymentPlanSchedule(...args: any[]): any { return runUtility('calculatePaymentPlanSchedule', args); }
export function calculateInstallmentAmount(...args: any[]): any { return runUtility('calculateInstallmentAmount', args); }
export function getCollectionStatus(...args: any[]): any { return runUtility('getCollectionStatus', args); }
export function shouldGenerateStatement(...args: any[]): any { return runUtility('shouldGenerateStatement', args); }
export function detectCreditBalance(...args: any[]): any { return runUtility('detectCreditBalance', args); }
export function calculateRefundableAmount(...args: any[]): any { return runUtility('calculateRefundableAmount', args); }
export function validateRefundRequest(...args: any[]): any { return runUtility('validateRefundRequest', args); }
export function buildRefundLedgerTransaction(...args: any[]): any { return runUtility('buildRefundLedgerTransaction', args); }
export function buildCreditTransferPayload(...args: any[]): any { return runUtility('buildCreditTransferPayload', args); }
export function formatRefundStatus(...args: any[]): any { return runUtility('formatRefundStatus', args); }
export function formatCreditBalanceStatus(...args: any[]): any { return runUtility('formatCreditBalanceStatus', args); }
export function detectPayerRecoupment(...args: any[]): any { return runUtility('detectPayerRecoupment', args); }
export function formatWorkqueueType(...args: any[]): any { return runUtility('formatWorkqueueType', args); }
export function formatWorkqueueStatus(...args: any[]): any { return runUtility('formatWorkqueueStatus', args); }
export function formatWorkqueuePriority(...args: any[]): any { return runUtility('formatWorkqueuePriority', args); }
export function getWorkqueuePriorityScore(...args: any[]): any { return runUtility('getWorkqueuePriorityScore', args); }
export function calculateWorkqueueDueDate(...args: any[]): any { return runUtility('calculateWorkqueueDueDate', args); }
export function buildWorkqueueSourceKey(...args: any[]): any { return runUtility('buildWorkqueueSourceKey', args); }
export function detectDuplicateOpenTask(...args: any[]): any { return runUtility('detectDuplicateOpenTask', args); }
export function getDefaultAssignee(...args: any[]): any { return runUtility('getDefaultAssignee', args); }
export function shouldCreateWorkqueueItem(...args: any[]): any { return runUtility('shouldCreateWorkqueueItem', args); }
export function buildWorkqueueItemPayload(...args: any[]): any { return runUtility('buildWorkqueueItemPayload', args); }
export function groupWorkqueueByType(...args: any[]): any { return runUtility('groupWorkqueueByType', args); }
export function groupWorkqueueByAssignee(...args: any[]): any { return runUtility('groupWorkqueueByAssignee', args); }
export function formatProviderName(...args: any[]): any { return runUtility('formatProviderName', args); }
export function formatProviderCredentials(...args: any[]): any { return runUtility('formatProviderCredentials', args); }
export function validateNpi(...args: any[]): any { return runUtility('validateNpi', args); }
export function formatNpi(...args: any[]): any { return runUtility('formatNpi', args); }
export function validateTaxonomyCode(...args: any[]): any { return runUtility('validateTaxonomyCode', args); }
export function isProviderLicenseExpired(...args: any[]): any { return runUtility('isProviderLicenseExpired', args); }
export function isProviderEnrollmentActiveForDos(...args: any[]): any { return runUtility('isProviderEnrollmentActiveForDos', args); }
export function canProviderBillPayer(...args: any[]): any { return runUtility('canProviderBillPayer', args); }
export function getRenderingProvider(...args: any[]): any { return runUtility('getRenderingProvider', args); }
export function getBillingProvider(...args: any[]): any { return runUtility('getBillingProvider', args); }
export function getSupervisingProvider(...args: any[]): any { return runUtility('getSupervisingProvider', args); }
export function detectCredentialingIssue(...args: any[]): any { return runUtility('detectCredentialingIssue', args); }
export function normalizePayerName(...args: any[]): any { return runUtility('normalizePayerName', args); }
export function matchPayerAlias(...args: any[]): any { return runUtility('matchPayerAlias', args); }
export function getActiveContractForDos(...args: any[]): any { return runUtility('getActiveContractForDos', args); }
export function getRateForCpt(...args: any[]): any { return runUtility('getRateForCpt', args); }
export function calculateExpectedAllowed(...args: any[]): any { return runUtility('calculateExpectedAllowed', args); }
export function calculateExpectedPayment(...args: any[]): any { return runUtility('calculateExpectedPayment', args); }
export function compareExpectedToActual(...args: any[]): any { return runUtility('compareExpectedToActual', args); }
export function formatContractStatus(...args: any[]): any { return runUtility('formatContractStatus', args); }
export function formatRateType(...args: any[]): any { return runUtility('formatRateType', args); }
export function isContractExpired(...args: any[]): any { return runUtility('isContractExpired', args); }
export function detectContractVariance(...args: any[]): any { return runUtility('detectContractVariance', args); }
export function calculateCleanClaimRate(...args: any[]): any { return runUtility('calculateCleanClaimRate', args); }
export function calculateFirstPassYield(...args: any[]): any { return runUtility('calculateFirstPassYield', args); }
export function calculateDaysInAr(...args: any[]): any { return runUtility('calculateDaysInAr', args); }
export function calculateArAgingBucket(...args: any[]): any { return runUtility('calculateArAgingBucket', args); }
export function calculateNetCollectionRate(...args: any[]): any { return runUtility('calculateNetCollectionRate', args); }
export function calculateGrossCollectionRate(...args: any[]): any { return runUtility('calculateGrossCollectionRate', args); }
export function calculateDenialRate(...args: any[]): any { return runUtility('calculateDenialRate', args); }
export function calculateclientCollectionRate(...args: any[]): any { return runUtility('calculateclientCollectionRate', args); }
export function calculateAverageReimbursement(...args: any[]): any { return runUtility('calculateAverageReimbursement', args); }
export function calculatePayerMix(...args: any[]): any { return runUtility('calculatePayerMix', args); }
export function calculateAuthHitRate(...args: any[]): any { return runUtility('calculateAuthHitRate', args); }
export function formatReportDateRange(...args: any[]): any { return runUtility('formatReportDateRange', args); }
export function groupByPayer(...args: any[]): any { return runUtility('groupByPayer', args); }
export function groupByProvider(...args: any[]): any { return runUtility('groupByProvider', args); }
export function groupByCpt(...args: any[]): any { return runUtility('groupByCpt', args); }
export function exportToCsv(...args: any[]): any { return runUtility('exportToCsv', args); }
export function parseCsvFile(...args: any[]): any { return runUtility('parseCsvFile', args); }
export function parseExcelFile(...args: any[]): any { return runUtility('parseExcelFile', args); }
export function normalizeImportHeaders(...args: any[]): any { return runUtility('normalizeImportHeaders', args); }
export function mapImportRowToEntity(...args: any[]): any { return runUtility('mapImportRowToEntity', args); }
export function validateImportRow(...args: any[]): any { return runUtility('validateImportRow', args); }
export function detectImportDuplicates(...args: any[]): any { return runUtility('detectImportDuplicates', args); }
export function formatImportError(...args: any[]): any { return runUtility('formatImportError', args); }
export function buildLegacyRecordLink(...args: any[]): any { return runUtility('buildLegacyRecordLink', args); }
export function rollbackImportPreview(...args: any[]): any { return runUtility('rollbackImportPreview', args); }
export function sanitizeImportedText(...args: any[]): any { return runUtility('sanitizeImportedText', args); }
export function coerceImportDate(...args: any[]): any { return runUtility('coerceImportDate', args); }
export function coerceImportCurrency(...args: any[]): any { return runUtility('coerceImportCurrency', args); }
export function buildWebhookSignature(...args: any[]): any { return runUtility('buildWebhookSignature', args); }
export function verifyWebhookSignature(...args: any[]): any { return runUtility('verifyWebhookSignature', args); }
export function dedupeWebhookEvent(...args: any[]): any { return runUtility('dedupeWebhookEvent', args); }
export function normalizeExternalId(...args: any[]): any { return runUtility('normalizeExternalId', args); }
export function buildExternalMappingKey(...args: any[]): any { return runUtility('buildExternalMappingKey', args); }
export function mapExternalStatusToInternal(...args: any[]): any { return runUtility('mapExternalStatusToInternal', args); }
export function retryBackoff(...args: any[]): any { return runUtility('retryBackoff', args); }
export function redactIntegrationSecrets(...args: any[]): any { return runUtility('redactIntegrationSecrets', args); }
export function encryptCredentialPayload(...args: any[]): any { return runUtility('encryptCredentialPayload', args); }
export function decryptCredentialPayload(...args: any[]): any { return runUtility('decryptCredentialPayload', args); }
export function validateFileType(...args: any[]): any { return runUtility('validateFileType', args); }
export function validateFileSize(...args: any[]): any { return runUtility('validateFileSize', args); }
export function buildStoragePath(...args: any[]): any { return runUtility('buildStoragePath', args); }
export function getFileExtension(...args: any[]): any { return runUtility('getFileExtension', args); }
export function getMimeType(...args: any[]): any { return runUtility('getMimeType', args); }
export function formatFileSize(...args: any[]): any { return runUtility('formatFileSize', args); }
export function sanitizeFilename(...args: any[]): any { return runUtility('sanitizeFilename', args); }
export function generateDocumentName(...args: any[]): any { return runUtility('generateDocumentName', args); }
export function buildDocumentLinkPayload(...args: any[]): any { return runUtility('buildDocumentLinkPayload', args); }
export function isDocumentClientVisible(...args: any[]): any { return runUtility('isDocumentClientVisible', args); }
export function redactDocumentMetadata(...args: any[]): any { return runUtility('redactDocumentMetadata', args); }
export function buildNotificationPayload(...args: any[]): any { return runUtility('buildNotificationPayload', args); }
export function formatNotificationType(...args: any[]): any { return runUtility('formatNotificationType', args); }
export function shouldSendNotification(...args: any[]): any { return runUtility('shouldSendNotification', args); }
export function getNotificationRecipients(...args: any[]): any { return runUtility('getNotificationRecipients', args); }
export function buildNotificationMessage(...args: any[]): any { return runUtility('buildNotificationMessage', args); }
export function dedupeNotification(...args: any[]): any { return runUtility('dedupeNotification', args); }
export function formatNotificationTimestamp(...args: any[]): any { return runUtility('formatNotificationTimestamp', args); }
export function normalizeSearchQuery(...args: any[]): any { return runUtility('normalizeSearchQuery', args); }
export function buildSearchTokens(...args: any[]): any { return runUtility('buildSearchTokens', args); }
export function highlightSearchMatch(...args: any[]): any { return runUtility('highlightSearchMatch', args); }
export function buildClientSearchQuery(...args: any[]): any { return runUtility('buildClientSearchQuery', args); }
export function buildClaimSearchQuery(...args: any[]): any { return runUtility('buildClaimSearchQuery', args); }
export function buildPaymentSearchQuery(...args: any[]): any { return runUtility('buildPaymentSearchQuery', args); }
export function buildWorkqueueFilters(...args: any[]): any { return runUtility('buildWorkqueueFilters', args); }
export function buildDateRangeFilter(...args: any[]): any { return runUtility('buildDateRangeFilter', args); }
export function buildStatusFilter(...args: any[]): any { return runUtility('buildStatusFilter', args); }
export function buildPaginationParams(...args: any[]): any { return runUtility('buildPaginationParams', args); }
export function buildSortParams(...args: any[]): any { return runUtility('buildSortParams', args); }
export function isRequired(...args: any[]): any { return runUtility('isRequired', args); }
export function isValidUuid(...args: any[]): any { return runUtility('isValidUuid', args); }
export function isValidDate(...args: any[]): any { return runUtility('isValidDate', args); }
export function isValidDateRange(...args: any[]): any { return runUtility('isValidDateRange', args); }
export function isValidCurrencyAmount(...args: any[]): any { return runUtility('isValidCurrencyAmount', args); }
export function isValidEnumValue(...args: any[]): any { return runUtility('isValidEnumValue', args); }
export function validateRequiredFields(...args: any[]): any { return runUtility('validateRequiredFields', args); }
export function validateTenantId(...args: any[]): any { return runUtility('validateTenantId', args); }
export function validateStatusTransition(...args: any[]): any { return runUtility('validateStatusTransition', args); }
export function buildValidationError(...args: any[]): any { return runUtility('buildValidationError', args); }
export function groupValidationErrors(...args: any[]): any { return runUtility('groupValidationErrors', args); }
export function hasBlockingErrors(...args: any[]): any { return runUtility('hasBlockingErrors', args); }
export function hasWarnings(...args: any[]): any { return runUtility('hasWarnings', args); }
export function canTransitionStatus(...args: any[]): any { return runUtility('canTransitionStatus', args); }
export function getAllowedChargeTransitions(...args: any[]): any { return runUtility('getAllowedChargeTransitions', args); }
export function getAllowedClaimTransitions(...args: any[]): any { return runUtility('getAllowedClaimTransitions', args); }
export function getAllowedPaymentTransitions(...args: any[]): any { return runUtility('getAllowedPaymentTransitions', args); }
export function getAllowedWorkqueueTransitions(...args: any[]): any { return runUtility('getAllowedWorkqueueTransitions', args); }
export function getNextClaimStatus(...args: any[]): any { return runUtility('getNextClaimStatus', args); }
export function getNextChargeStatus(...args: any[]): any { return runUtility('getNextChargeStatus', args); }
export function requiresAuditForTransition(...args: any[]): any { return runUtility('requiresAuditForTransition', args); }
export function buildStatusHistoryPayload(...args: any[]): any { return runUtility('buildStatusHistoryPayload', args); }
export function maskSsn(...args: any[]): any { return runUtility('maskSsn', args); }
export function maskMemberId(...args: any[]): any { return runUtility('maskMemberId', args); }
export function maskPhone(...args: any[]): any { return runUtility('maskPhone', args); }
export function redactPhi(...args: any[]): any { return runUtility('redactPhi', args); }
export function sanitizeErrorForClient(...args: any[]): any { return runUtility('sanitizeErrorForClient', args); }
export function sanitizeAuditMetadata(...args: any[]): any { return runUtility('sanitizeAuditMetadata', args); }
export function hasTenantScope(...args: any[]): any { return runUtility('hasTenantScope', args); }
export function canAccessRecord(...args: any[]): any { return runUtility('canAccessRecord', args); }
export function stripUnauthorizedFields(...args: any[]): any { return runUtility('stripUnauthorizedFields', args); }
export function cn(...args: any[]): any { return runUtility('cn', args); }
export function getStatusBadgeVariant(...args: any[]): any { return runUtility('getStatusBadgeVariant', args); }
export function getPriorityBadgeVariant(...args: any[]): any { return runUtility('getPriorityBadgeVariant', args); }
export function formatEmptyValue(...args: any[]): any { return runUtility('formatEmptyValue', args); }
export function truncateText(...args: any[]): any { return runUtility('truncateText', args); }
export function pluralize(...args: any[]): any { return runUtility('pluralize', args); }
export function formatCount(...args: any[]): any { return runUtility('formatCount', args); }
export function formatPercentage(...args: any[]): any { return runUtility('formatPercentage', args); }
export function formatTableColumn(...args: any[]): any { return runUtility('formatTableColumn', args); }
export function buildBreadcrumbs(...args: any[]): any { return runUtility('buildBreadcrumbs', args); }
export function buildPageTitle(...args: any[]): any { return runUtility('buildPageTitle', args); }
export function getDirtyFields(...args: any[]): any { return runUtility('getDirtyFields', args); }
export function hasUnsavedChanges(...args: any[]): any { return runUtility('hasUnsavedChanges', args); }
export function resetFormToDefaults(...args: any[]): any { return runUtility('resetFormToDefaults', args); }
export function coerceFormValues(...args: any[]): any { return runUtility('coerceFormValues', args); }
export function buildPatchPayload(...args: any[]): any { return runUtility('buildPatchPayload', args); }
export function buildCreatePayload(...args: any[]): any { return runUtility('buildCreatePayload', args); }
export function mapApiErrorsToFormErrors(...args: any[]): any { return runUtility('mapApiErrorsToFormErrors', args); }
export function scrollToFirstError(...args: any[]): any { return runUtility('scrollToFirstError', args); }
export function isSubmitDisabled(...args: any[]): any { return runUtility('isSubmitDisabled', args); }
export function prepareSelectOptions(...args: any[]): any { return runUtility('prepareSelectOptions', args); }
export function createAppError(...args: any[]): any { return runUtility('createAppError', args); }
export function parseApiError(...args: any[]): any { return runUtility('parseApiError', args); }
export function getErrorMessage(...args: any[]): any { return runUtility('getErrorMessage', args); }
export function isRetryableError(...args: any[]): any { return runUtility('isRetryableError', args); }
export function logClientError(...args: any[]): any { return runUtility('logClientError', args); }
export function logServerError(...args: any[]): any { return runUtility('logServerError', args); }
export function redactErrorMetadata(...args: any[]): any { return runUtility('redactErrorMetadata', args); }
export function buildErrorContext(...args: any[]): any { return runUtility('buildErrorContext', args); }
export function mockClient(...args: any[]): any { return runUtility('mockClient', args); }
export function mockAppointment(...args: any[]): any { return runUtility('mockAppointment', args); }
export function mockClinicalNote(...args: any[]): any { return runUtility('mockClinicalNote', args); }
export function mockCharge(...args: any[]): any { return runUtility('mockCharge', args); }
export function mockClaim(...args: any[]): any { return runUtility('mockClaim', args); }
export function mockPayment(...args: any[]): any { return runUtility('mockPayment', args); }
export function mockLedgerEntry(...args: any[]): any { return runUtility('mockLedgerEntry', args); }
export function mockWorkqueueItem(...args: any[]): any { return runUtility('mockWorkqueueItem', args); }
export function buildTestTenant(...args: any[]): any { return runUtility('buildTestTenant', args); }
export function buildTestUserWithRole(...args: any[]): any { return runUtility('buildTestUserWithRole', args); }
export function assertLedgerBalanced(...args: any[]): any { return runUtility('assertLedgerBalanced', args); }
export function assertAuditLogWritten(...args: any[]): any { return runUtility('assertAuditLogWritten', args); }
export function assertWorkqueueCreated(...args: any[]): any { return runUtility('assertWorkqueueCreated', args); }
