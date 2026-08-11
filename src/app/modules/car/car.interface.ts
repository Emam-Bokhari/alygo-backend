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
  personalAutoInsuranceNumber?: string;
  color?: string;
  vehicleRegistration?: string;
  vehicleRegistrationNumber?: string;
  commercialInsurance?: string;
  commercialInsuranceNumber?: string;
  vehicleInspection?: string;
  vehicleInspectionNumber?: string;
  insuranceHub: {
    fileUrl: string;
    fileName?: string;
    uploadedAt?: Date;
    provider?: string;
    policyNumber?: string;
    policyHolder?: string;
    coverageType?: string;
    vehicleBound?: string;
    effectiveDate?: Date;
    expirationDate?: Date;
    liabilityLimits?: string;
    collisionDeductible?: string;
    comprehensive?: string;
  }[];
}

export type CarModel = ISoftDeleteModel<ICar>;
