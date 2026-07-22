export enum PAYOUT_STATUS {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REJECTED = "rejected",
}

export enum PAYOUT_METHOD {
  STRIPE = "stripe",
  BANK_TRANSFER = "bank_transfer",
}
