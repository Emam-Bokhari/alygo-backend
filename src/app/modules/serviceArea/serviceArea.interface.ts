import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { SERVICE_AREA_TYPE } from "./serviceArea.constant";
import { STATUS } from "../../../constants/status";

export interface IServiceArea {
  _id: Types.ObjectId;

  country?: string;
  state?: string;
  city?: string;
  zone?: string;
  airport?: string;

  countryId?: Types.ObjectId;
  stateId?: Types.ObjectId;
  cityId?: Types.ObjectId;

  type: SERVICE_AREA_TYPE;

  maxDrivers?: number;

  // GeoJSON location for coordinate-based matching
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };

  // Coverage radius in kilometers for this service area
  coverageRadiusKm?: number;

  // IANA timezone identifier for this service area (e.g., "Asia/Dhaka")
  timezone?: string;

  status: STATUS;
}

export type ServiceAreaModel = ISoftDeleteModel<IServiceArea>;
