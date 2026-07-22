import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface ICar {
  _id: Types.ObjectId;

  driverId: Types.ObjectId;

  brand: string;
  model: string;
  year: number;

  carType: string;

  seatNumber: number;

  licensePlate: string;

  vin?: string;

  vehicleLicense?: string;
  personalAutoInsurance?: string;
  insuranceHub: {
    fileUrl: string;
    fileName?: string;
    uploadedAt?: Date;
    extractedData?: Record<string, unknown>;
  }[];
  isVerified: boolean;
  verifiedAt?: Date;
}

export type CarModel = ISoftDeleteModel<ICar>;
