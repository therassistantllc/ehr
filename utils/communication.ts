import { scaffoldUtility } from "./_scaffold";

export const formatPhoneNumber = (...args: unknown[]) => scaffoldUtility("formatPhoneNumber", args);
export const normalizePhoneNumber = (...args: unknown[]) => scaffoldUtility("normalizePhoneNumber", args);
export const validatePhoneNumber = (...args: unknown[]) => scaffoldUtility("validatePhoneNumber", args);
export const formatEmail = (...args: unknown[]) => scaffoldUtility("formatEmail", args);
export const validateEmail = (...args: unknown[]) => scaffoldUtility("validateEmail", args);
export const maskEmail = (...args: unknown[]) => scaffoldUtility("maskEmail", args);
export const formatAddress = (...args: unknown[]) => scaffoldUtility("formatAddress", args);
export const validateAddressFields = (...args: unknown[]) => scaffoldUtility("validateAddressFields", args);
export const getPreferredContactMethod = (...args: unknown[]) => scaffoldUtility("getPreferredContactMethod", args);
export const formatCommunicationDirection = (...args: unknown[]) => scaffoldUtility("formatCommunicationDirection", args);
export const formatCommunicationType = (...args: unknown[]) => scaffoldUtility("formatCommunicationType", args);
