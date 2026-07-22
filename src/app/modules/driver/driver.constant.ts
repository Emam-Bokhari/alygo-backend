export enum VERIFICATION_STATUS {
  PENDING = "pending",
  PROCESSING = "processing",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

export enum CLASSIFICATION {
  INDIVIDUAL = "individual",
  SOLE_PROPRIETOR = "sole_proprietorship",
  LLC = "llc",
  PARTNERSHIP = "partnership",
  CORPORATION = "corporation",
  NON_PROFIT = "nonprofit",
  OTHER = "other",
}

export enum TAX_ID_TYPE {
  SSN = "ssn",
  ITIN = "itin",
  TIN = "tin",
  EIN = "ein",
}

export enum DOCUMENT_TYPE {
  SSN_CARD = "ssn_card",
  ITIN_LETTER = "itin_letter",
  EIN_LETTER = "ein_letter",
  W9 = "w9",
  W8BEN = "w8ben",
  OTHER = "other",
}

export enum EXTRACTION_STATUS {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum DRIVER_AVAILABILITY_STATUS {
  ONLINE = "online",
  OFFLINE = "offline",
  ON_TRIP = "on_trip",
  BREAK = "break",
}

export enum DRIVER_BLOCK_REASON {
  DAILY_LIMIT = "daily_limit",
  CONTINUOUS_LIMIT = "continuous_limit",
  BREAK_REQUIRED = "break_required",
  MANUAL_BLOCK = "manual_block",
}
