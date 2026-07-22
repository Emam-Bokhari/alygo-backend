import { Model, Types } from "mongoose";
import { TRIP_REPORT_STATUS } from "./tripReport.constant";

export interface ITripReport {
  ticketId: string; // e.g. TRP-20260719-000001
  rideId: Types.ObjectId;
  reporterId: Types.ObjectId;
  issueId: Types.ObjectId; // ref: ReportIssueCategory

  providedSummaryDetails?: string;
  estimatedResponseTimeInMinutes: number; // snapshotted from ReportIssueCategory
  status: TRIP_REPORT_STATUS;

  resolutionNotes?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;

  rideSnapshot: {
    rideCategory: string;
    pickupAddress: string;
    destinationAddress: string;

    driverId: Types.ObjectId;
    driverName: string;
    vehicleName: string;
    vehicleNumber: string;

    completedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

export type TripReportModel = Model<ITripReport>;
