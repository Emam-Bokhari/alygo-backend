import { Model, Types } from "mongoose";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IEvent {
  eventName: string;
  description?: string;
  timezone: string; // IANA timezone identifier (e.g., "Asia/Dhaka")
  startDateTime: Date; // UTC timestamp
  endDateTime: Date; // UTC timestamp
  serviceAreaId?: Types.ObjectId;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  coverageRadiusKm?: number;
  status: STATUS;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type EventModel = ISoftDeleteModel<IEvent>;
