import { Model } from "mongoose";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IServiceCategory {
  name: string;
  description?: string;
  image?: string;
  status: STATUS;
  supportsReservation?: boolean;
  minimumAdvanceBookingMinutes?: number;
  maximumAdvanceBookingDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceCategoryModel = ISoftDeleteModel<IServiceCategory>;
