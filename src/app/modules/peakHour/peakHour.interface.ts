import { Model, Types } from "mongoose";
import { STATUS } from "../../../constants/status";
import { DAYS } from "../../../constants/days";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IPeakHour {
  name: string;
  startTime: string; // HH:mm format (e.g., "08:00")
  endTime: string; // HH:mm format (e.g., "10:00")
  timezone: string; // IANA timezone identifier (e.g., "Asia/Dhaka")
  applicableDays: DAYS[];
  status: STATUS;
  createdAt: Date;
  updatedAt: Date;
}

export type PeakHourModel = ISoftDeleteModel<IPeakHour>;
