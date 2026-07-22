import { model, Schema } from "mongoose";
import {
  IReportIssueCategory,
  ReportIssueCategoryModel,
} from "./reportIssueCategory.interface";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const reportIssueCategorySchema = new Schema<
  IReportIssueCategory,
  ReportIssueCategoryModel
>(
  {
    issueName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    estimatedResponseTimeInMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 60, // default 60 minutes
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
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

reportIssueCategorySchema.index({ status: 1 });

reportIssueCategorySchema.plugin(softDeletePlugin);

export const ReportIssueCategory = model<
  IReportIssueCategory,
  ReportIssueCategoryModel
>("ReportIssueCategory", reportIssueCategorySchema);
