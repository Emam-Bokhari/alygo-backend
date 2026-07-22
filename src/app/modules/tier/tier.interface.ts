import { Model } from "mongoose";
import { STATUS } from "../../../enums/user";
import { SUPPORT_LEVEL } from "./tier.constant";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IDestinationFilterConfig {
  enabled: boolean;
  dailyLimit: number;
}

export interface IPriorityDispatchConfig {
  enabled: boolean;
  boostMultiplier: number;
}

export interface IReservationAccessConfig {
  enabled: boolean;
  maxAdvanceHours: number;
}

export interface IPremiumRideAccessConfig {
  enabled: boolean;
  allowedCategories: string[]; // List of ride category names or IDs
}

export interface IAirportQueuePriorityConfig {
  enabled: boolean;
  priorityPosition: number;
}

export interface IBonusMultiplierConfig {
  enabled: boolean;
  multiplierValue: number; // e.g. 1.2 for 1.2x
}

export interface IVIPSupportConfig {
  enabled: boolean;
  supportLevel: SUPPORT_LEVEL;
}

export interface ITierBenefits {
  destinationFilter: IDestinationFilterConfig;
  priorityDispatch: IPriorityDispatchConfig;
  reservationAccess: IReservationAccessConfig;
  premiumRideAccess: IPremiumRideAccessConfig;
  airportQueuePriority: IAirportQueuePriorityConfig;
  bonusMultiplier: IBonusMultiplierConfig;
  vipSupport: IVIPSupportConfig;
}

export interface ITierRequirements {
  tripsRequired: number;
  ratingRequired: number;
  acceptanceRateRequired: number; // e.g. 80 for 80%
}

export interface ITier {
  name: string;
  code: string; // e.g. "J", "PG", "E", "PL", "D"
  level: number; // e.g. 1, 2, 3, 4, 5
  requirements: ITierRequirements;
  benefits: ITierBenefits;
  status: STATUS;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TierModel = ISoftDeleteModel<ITier>;
