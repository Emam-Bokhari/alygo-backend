export enum REPORT_STATUS {
  REPORTED = "reported",
  UNDER_REVIEW = "under_review",
  FOUND = "found",
  NOT_FOUND = "not_found",
  WAITING_PAYMENT = "waiting_payment",
  PAYMENT_COMPLETED = "payment_completed",
  RETURN_SCHEDULED = "return_scheduled",
  RETURN_IN_PROGRESS = "return_in_progress",
  RETURN_COMPLETED = "return_completed",
  RECEIVED = "received",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

export enum RECOVERY_METHOD {
  PASSENGER_PICKUP = "passenger_pickup",
  DRIVER_DELIVERY = "driver_delivery",
}

export enum FOUND_STATUS {
  PENDING = "pending",
  FOUND = "found",
  NOT_FOUND = "not_found",
}

export enum PAYMENT_STATUS {
  NOT_REQUIRED = "not_required",
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum ITEM_NOT_FOUND_REASON {
  NOT_IN_VEHICLE = "not_in_vehicle",
  ALREADY_TAKEN = "already_taken",
  OTHER = "other",
}
