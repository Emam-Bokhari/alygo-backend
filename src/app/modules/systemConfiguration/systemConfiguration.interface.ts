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

export interface ISystemConfiguration {
  _id?: Types.ObjectId;
  driverMatching: IDriverMatchingConfig;
  tracking: ITrackingConfig;
  reservation?: IReservationConfig;
  lostFound?: ILostFoundConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SystemConfigurationModel = ISoftDeleteModel<ISystemConfiguration>;
