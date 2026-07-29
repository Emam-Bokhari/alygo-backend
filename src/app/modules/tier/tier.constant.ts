import { ITierBenefits } from "./tier.interface";

export enum SUPPORT_LEVEL {
  BASIC = "basic",
  PREMIUM = "premium",
  VIP = "vip",
}

export enum POINT_EVENT_TYPE {
  RIDE_COMPLETED = "ride_completed",
  FIVE_STAR_RATING = "five_star_rating",
  AIRPORT_RIDE = "airport_ride",
  SCHEDULED_RIDE = "scheduled_ride",
  PEAK_HOUR_RIDE = "peak_hour_ride",
  REFERRAL_COMPLETED = "referral_completed",
  ACCEPTED_RIDE_CANCELLED = "accepted_ride_cancelled",
  POLICY_VIOLATION = "policy_violation",
  ADMIN_OVERRIDE = "admin_override",
}


export const DEFAULT_TIER_BENEFITS: ITierBenefits = {
  destinationFilter: {
    enabled: false,
    dailyLimit: 0,
  },
  priorityDispatch: {
    enabled: false,
    boostMultiplier: 1.0,
  },
  reservationAccess: {
    enabled: false,
    maxAdvanceHours: 0,
  },
  premiumRideAccess: {
    enabled: false,
    allowedCategories: [],
  },
  airportQueuePriority: {
    enabled: false,
    priorityPosition: 0,
  },
  bonusMultiplier: {
    enabled: false,
    multiplierValue: 1.0,
  },
  vipSupport: {
    enabled: false,
    supportLevel: SUPPORT_LEVEL.BASIC,
  },
};
