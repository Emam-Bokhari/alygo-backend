import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IDriverMatchingConfig {
  initialSearchRadiusKm: number;
  radiusExpansionDistanceKm: number;
  driverVisibilityDurationSeconds: number;
  rideRequestLifetimeSeconds: number;
  maxSearchRadiusKm: number;
}

export interface ITrackingConfig {
  minLocationUpdateIntervalSeconds: number;
  minMovementDistanceMeters: number;
  maxGpsAccuracyToleranceMeters: number;
  arrivalRadiusMeters: number;
  etaRefreshIntervalSeconds: number;
  averageSpeedKmh: number;
  enableSocketOptimization: boolean;
}

export interface IReservationConfig {
  enabled: boolean;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  driverVisibleBeforeMinutes: number;
  driverAssignmentTimeoutMinutes: number;
  reminder24h: boolean;
  reminder1h: boolean;
  reminder30m: boolean;
  reminder15m: boolean;
}

export interface ILostFoundConfig {
  enabled: boolean;
  reportWindowDays: number;
  maxFiles: number;
  maxFileSizeMb: number;
  defaultDeliveryFee: number;
  returnConfirmationHours: number;
  autoCloseDays: number;
}

export interface IPassengerReferralConfig {
  enabled: boolean;
  rewardAmount: number;
  rewardCurrency: string;
  qualificationType: string;
  requiredCompletedTrips: number;
  qualificationDays: number;
  allowMultipleRewards: boolean;
  maximumRewardsPerUser: number;
  autoRewardEnabled: boolean;
  shareInstructions?: string;
  rewardTerms?: string;
  generalNotes?: string;
}

export interface IDriverReferralConfig {
  enabled: boolean;
  rewardAmount: number;
  rewardCurrency: string;
  requiredCompletedTrips: number;
  qualificationDays: number;
  payoutDelayHours: number;
  autoRewardEnabled: boolean;
  maximumRewardsPerDriver: number;
  shareInstructions?: string;
  termsAndConditions?: string;
  generalNotes?: string;
}

export interface IReferralConfig {
  passenger: IPassengerReferralConfig;
  driver: IDriverReferralConfig;
}

export interface IDriverRewardsConfig {
  enabled: boolean;
  tierPromotion: boolean;
  autoDowngrade: boolean;
  dailyQuotaResetTime: string; // e.g. "00:00"
  destinationFilterRadiusDefault: number;
}

export interface ISystemConfiguration {
  _id?: Types.ObjectId;
  driverMatching: IDriverMatchingConfig;
  tracking: ITrackingConfig;
  reservation?: IReservationConfig;
  lostFound?: ILostFoundConfig;
  referral?: IReferralConfig;
  driverRewards?: IDriverRewardsConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SystemConfigurationModel = ISoftDeleteModel<ISystemConfiguration>;
