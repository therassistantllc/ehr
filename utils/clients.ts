import { scaffoldUtility } from "./_scaffold";

export const formatClientName = (...args: unknown[]) => scaffoldUtility("formatClientName", args);
export const formatClientDisplayName = (...args: unknown[]) => scaffoldUtility("formatClientDisplayName", args);
export const normalizeClientName = (...args: unknown[]) => scaffoldUtility("normalizeClientName", args);
export const getClientInitials = (...args: unknown[]) => scaffoldUtility("getClientInitials", args);
export const maskClientName = (...args: unknown[]) => scaffoldUtility("maskClientName", args);
export const maskDob = (...args: unknown[]) => scaffoldUtility("maskDob", args);
export const formatDob = (...args: unknown[]) => scaffoldUtility("formatDob", args);
export const calculateClientAge = (...args: unknown[]) => scaffoldUtility("calculateClientAge", args);
export const detectPossibleDuplicateClient = (...args: unknown[]) => scaffoldUtility("detectPossibleDuplicateClient", args);
export const compareClientIdentity = (...args: unknown[]) => scaffoldUtility("compareClientIdentity", args);
export const getClientRegistrationCompleteness = (...args: unknown[]) => scaffoldUtility("getClientRegistrationCompleteness", args);
export const getClientBillingReadiness = (...args: unknown[]) => scaffoldUtility("getClientBillingReadiness", args);
