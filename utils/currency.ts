import { scaffoldUtility } from "./_scaffold";

export const formatCurrency = (...args: unknown[]) => scaffoldUtility("formatCurrency", args);
export const parseCurrencyInput = (...args: unknown[]) => scaffoldUtility("parseCurrencyInput", args);
export const toCents = (...args: unknown[]) => scaffoldUtility("toCents", args);
export const fromCents = (...args: unknown[]) => scaffoldUtility("fromCents", args);
export const roundCurrency = (...args: unknown[]) => scaffoldUtility("roundCurrency", args);
export const sumCurrency = (...args: unknown[]) => scaffoldUtility("sumCurrency", args);
export const subtractCurrency = (...args: unknown[]) => scaffoldUtility("subtractCurrency", args);
export const isZeroBalance = (...args: unknown[]) => scaffoldUtility("isZeroBalance", args);
export const isCreditBalance = (...args: unknown[]) => scaffoldUtility("isCreditBalance", args);
export const isOverpayment = (...args: unknown[]) => scaffoldUtility("isOverpayment", args);
export const calculateOpenBalance = (...args: unknown[]) => scaffoldUtility("calculateOpenBalance", args);
export const calculateAllowedAmount = (...args: unknown[]) => scaffoldUtility("calculateAllowedAmount", args);
export const calculateVariance = (...args: unknown[]) => scaffoldUtility("calculateVariance", args);
export const calculatePercent = (...args: unknown[]) => scaffoldUtility("calculatePercent", args);
