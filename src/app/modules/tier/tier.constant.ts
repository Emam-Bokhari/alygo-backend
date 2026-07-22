import { ITierBenefits } from "./tier.interface";

export enum SUPPORT_LEVEL {
  BASIC = "basic",
  PREMIUM = "premium",
  VIP = "vip",
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
