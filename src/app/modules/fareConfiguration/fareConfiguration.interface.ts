import { Model, Types } from "mongoose";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IFareConfiguration {
  serviceAreaId?: Types.ObjectId; // Optional: If we want zoning. If not, applies globally.
  serviceCategoryId?: Types.ObjectId; // e.g. "Airport Transfer" or "City Ride"
  rideCategoryId: Types.ObjectId; // e.g. "Alygo Standard" or "Alygo XL"

  baseFare: number; // Start price (e.g. $5.00)
  perKmFare: number; // Charge per kilometer/mile (e.g. $1.50)
  perMinuteFare: number; // Charge per minute of trip duration (e.g. $0.20)
  waitingFeePerMinute: number; // Charge per minute of waiting time (e.g. $0.30)
  minimumFare: number; // Minimum trip price (e.g. $7.00)

  status: STATUS;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type FareConfigurationModel = ISoftDeleteModel<IFareConfiguration>;
