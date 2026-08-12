export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

export const FEE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const DOCUMENT_MONITORING_STATUS = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
  EXPIRING_SOON: "expiring_soon",
  EXPIRED: "expired",
  VERIFIED: "verified",
  FAILED: "failed",
} as const;

export const DOCUMENT_EXPIRATION_STATUS = {
  EXPIRED: "expired",
  EXPIRING_SOON: "expiring_soon",
  ACTIVE: "active",
} as const;

export const BACKGROUND_CHECK_FEE_SEARCHABLE_FIELDS = [
  "feeName",
  "applicableState",
];

export const DOCUMENT_MONITORING_SEARCHABLE_FIELDS = [
  "driverName",
  "driverEmail",
  "documentType",
  "carInfo",
];
