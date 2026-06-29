import { scaffoldUtility } from "./_scaffold";

export const formatDate = (...args: unknown[]) => scaffoldUtility("formatDate", args);
export const formatDateTime = (...args: unknown[]) => scaffoldUtility("formatDateTime", args);
export const formatTime = (...args: unknown[]) => scaffoldUtility("formatTime", args);
export const formatDateRange = (...args: unknown[]) => scaffoldUtility("formatDateRange", args);
export const parseDateInput = (...args: unknown[]) => scaffoldUtility("parseDateInput", args);
export const toIsoDate = (...args: unknown[]) => scaffoldUtility("toIsoDate", args);
export const toLocalDate = (...args: unknown[]) => scaffoldUtility("toLocalDate", args);
export const getTenantTimezone = (...args: unknown[]) => scaffoldUtility("getTenantTimezone", args);
export const convertToTenantTimezone = (...args: unknown[]) => scaffoldUtility("convertToTenantTimezone", args);
export const calculateAge = (...args: unknown[]) => scaffoldUtility("calculateAge", args);
export const isDateInRange = (...args: unknown[]) => scaffoldUtility("isDateInRange", args);
export const daysBetween = (...args: unknown[]) => scaffoldUtility("daysBetween", args);
export const businessDaysBetween = (...args: unknown[]) => scaffoldUtility("businessDaysBetween", args);
export const addBusinessDays = (...args: unknown[]) => scaffoldUtility("addBusinessDays", args);
export const isExpired = (...args: unknown[]) => scaffoldUtility("isExpired", args);
export const isExpiringSoon = (...args: unknown[]) => scaffoldUtility("isExpiringSoon", args);
