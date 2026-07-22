import { Types } from "mongoose";
import { DRIVER_DUTY_POLICY_SCOPE_TYPE } from "./driverDutyPolicy.constant";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IDriverDutyPolicy {
  name: string;
  // Location Scope
  scopeType: DRIVER_DUTY_POLICY_SCOPE_TYPE;

  countryId?: Types.ObjectId;
  stateId?: Types.ObjectId;
  cityId?: Types.ObjectId;
  zoneId?: Types.ObjectId;
  airportId?: Types.ObjectId;
  // Driving Rules
  maxDrivingHoursPerDay: number;

  maxContinuousDrivingHours: number;

  breakAfterHours: number;

  breakDurationMinutes: number;

  // Trip Rules
  maxTripsPerDay?: number;

  minimumRestHours?: number;
  status: STATUS;

  createdAt: Date;

  updatedAt: Date;
}

export type DriverDutyPolicyModel = ISoftDeleteModel<IDriverDutyPolicy>;
