import { model, Schema } from "mongoose";
import { ITripReport, TripReportModel } from "./tripReport.interface";
import { TRIP_REPORT_STATUS } from "./tripReport.constant";

const tripReportSchema = new Schema<ITripReport, TripReportModel>(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    rideId: {
      type: Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "ReportIssueCategory",
      required: true,
      index: true,
    },
    providedSummaryDetails: {
      type: String,
      trim: true,
      default: "",
    },
    estimatedResponseTimeInMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 60,
    },
    status: {
      type: String,
      enum: Object.values(TRIP_REPORT_STATUS),
      default: TRIP_REPORT_STATUS.OPEN,
      index: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: "",
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
    rideSnapshot: {
      rideCategory: {
        type: String,
        required: true,
      },
      pickupAddress: {
        type: String,
        required: true,
      },
      destinationAddress: {
        type: String,
        required: true,
      },
      driverId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      driverName: {
        type: String,
        required: true,
      },
      vehicleName: {
        type: String,
        required: true,
      },
      vehicleNumber: {
        type: String,
        required: true,
      },
      completedAt: {
        type: Date,
        required: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  },
);

// Unique index on rideId to ensure only one report per ride
tripReportSchema.index({ rideId: 1 }, { unique: true });

export const TripReport = model<ITripReport, TripReportModel>(
  "TripReport",
  tripReportSchema,
);
