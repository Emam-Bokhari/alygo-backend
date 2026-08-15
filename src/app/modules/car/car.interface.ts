import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { VEHICLE_TYPE } from "../../../enums/vehicle";

export interface ICar {
  _id: Types.ObjectId;

  driverId: Types.ObjectId;

  brand: string;
  model: string;
  year: number;

  carType: VEHICLE_TYPE;

  seatNumber: number;

  licensePlate: string;

  vin?: string;

  vehicleLicense?: string;
  vehicleLicenseExpirationDate?: Date;
  personalAutoInsurance?: string;
  personalAutoInsuranceNumber?: string;
  personalAutoInsuranceExpirationDate?: Date;
  color?: string;
  vehicleRegistration?: string;
  vehicleRegistrationNumber?: string;
  vehicleRegistrationExpirationDate?: Date;
  commercialInsurance?: string;
  commercialInsuranceNumber?: string;
  commercialInsuranceExpirationDate?: Date;
  vehicleInspection?: string;
  vehicleInspectionNumber?: string;
  vehicleInspectionExpirationDate?: Date;
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
