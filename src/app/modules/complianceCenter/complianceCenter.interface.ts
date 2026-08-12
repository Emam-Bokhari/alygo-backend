import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";
import {
  FEE_STATUS,
  DOCUMENT_MONITORING_STATUS as DOCUMENT_MONITORING_STATUS_CONST,
  DOCUMENT_EXPIRATION_STATUS as DOCUMENT_EXPIRATION_STATUS_CONST,
} from "./complianceCenter.constant";

export interface IBackgroundCheckFee {
  _id?: Types.ObjectId;
  feeName: string;
  amount: number;
  applicableState?: string;
  serviceAreaId?: Types.ObjectId;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  status: (typeof FEE_STATUS)[keyof typeof FEE_STATUS];
  description?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BackgroundCheckFeeModel = ISoftDeleteModel<IBackgroundCheckFee>;

export type DOCUMENT_MONITORING_STATUS =
  (typeof DOCUMENT_MONITORING_STATUS_CONST)[keyof typeof DOCUMENT_MONITORING_STATUS_CONST];

export type DOCUMENT_EXPIRATION_STATUS =
  (typeof DOCUMENT_EXPIRATION_STATUS_CONST)[keyof typeof DOCUMENT_EXPIRATION_STATUS_CONST];

export interface IDriverDocument {
  id: string;
  ownerType: "driver" | "car";
  carId?: string;
  carInfo?: string;
  documentType: string;
  documentUrl?: string;
  documentNumber?: string;
  expirationDate?: Date | null;
  daysRemaining: number | null;
  status: DOCUMENT_MONITORING_STATUS;
}

export interface IDriverDocumentMonitoring {
  driverId: string;
  driverName: string;
  driverEmail?: string;
  driverPhone?: string;
  documents: IDriverDocument[];
}

export interface IDocumentMonitoringItem extends IDriverDocument {
  driverId: string;
  driverName: string;
  driverEmail?: string;
  driverPhone?: string;
}

export interface IDocumentMonitoringQuery {
  page?: number | string;
  limit?: number | string;
  searchTerm?: string;
  driverId?: string;
  documentType?: string;
  status?: string;
  expirationStatus?: DOCUMENT_EXPIRATION_STATUS;
}
