import { Types } from "mongoose";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { VEHICLE_TYPE } from "../../../enums/vehicle";

interface IVehicleRequirement {
  vehicleType: VEHICLE_TYPE;
  minimumSeats: number;
  luggageCapacity?: number;
}

export interface IRideCategory {
  serviceCategoryId?: Types.ObjectId;

  name: string;

  description?: string;

  commissionRate: number; // %

  // Driver Requirement
  minimumDriverRating: number;

  // Vehicle Rules
  vehicleRequirements: IVehicleRequirement;

  status: STATUS;

  supportsReservation?: boolean;

  reservationFee?: number;

  createdBy?: Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}

export type RideCategoryModel = ISoftDeleteModel<IRideCategory>;
