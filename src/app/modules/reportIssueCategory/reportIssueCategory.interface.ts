import { Model, Types } from "mongoose";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IReportIssueCategory {
  issueName: string;
  description?: string;
  estimatedResponseTimeInMinutes: number; // in minutes (e.g., 60, 1440)
  status: STATUS;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportIssueCategoryModel = ISoftDeleteModel<IReportIssueCategory>;
