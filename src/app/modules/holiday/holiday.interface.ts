import { Model, Types } from "mongoose";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IHoliday {
  holidayName: string;
  timezone: string; // IANA timezone identifier (e.g., "Asia/Dhaka")
  startDate: Date; // UTC timestamp
  endDate: Date; // UTC timestamp
  description?: string;
  status: STATUS;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type HolidayModel = ISoftDeleteModel<IHoliday>;
