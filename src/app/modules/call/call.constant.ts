export enum CALL_STATUS {
  INITIATED = "initiated",
  RINGING = "ringing",
  ACCEPTED = "accepted",
  CONNECTED = "connected",
  ENDED = "ended",
  REJECTED = "rejected",
  MISSED = "missed",
  CANCELLED = "cancelled",
  FAILED = "failed",
  TIMEOUT = "timeout",
}

export enum CALL_TYPE {
  VOICE = "voice",
}

export enum COMMUNICATION_TYPE {
  REGULAR_RIDE = "regular_ride",
  SCHEDULED_RIDE = "scheduled_ride",
  LOST_FOUND = "lost_found",
  RESERVATION = "reservation",
  SUPPORT = "support",
  OTHER = "other",
}
