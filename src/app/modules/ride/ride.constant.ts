export enum RIDE_STATUS {
  SEARCHING_DRIVER = "searching_driver",
  DRIVER_ACCEPTED = "driver_accepted",
  WAITING_USER_APPROVAL = "waiting_user_approval",
  DRIVER_ON_THE_WAY = "driver_on_the_way",
  DRIVER_ARRIVED = "driver_arrived",
  STARTED = "started",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  CANCELLED_BY_USER = "cancelled_by_user",
  CANCELLED_BY_DRIVER = "cancelled_by_driver",
  EXPIRED = "expired",
}

export enum DRIVER_MATCHING_STATUS {
  SENT = "sent",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export enum VERIFICATION_METHOD {
  OTP = "otp",
  PHONE_LAST_4_DIGITS = "phone_last_4_digits",
}

export enum PAYMENT_METHOD {
  STRIPE = "stripe",
  WALLET = "wallet",
  APPLE_PAY = "apple_pay",
  GOOGLE_PAY = "google_pay",
  CARD = "card",
}

export enum PAYMENT_STATUS {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum CANCELLED_BY {
  USER = "user",
  DRIVER = "driver",
  ADMIN = "admin",
}

export enum RIDE_TYPE {
  INSTANT = "instant",
  SCHEDULED = "scheduled",
}
