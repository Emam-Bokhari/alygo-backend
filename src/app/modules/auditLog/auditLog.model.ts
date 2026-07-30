import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { Schema, model } from "mongoose";
import { IAuditLog, AuditLogModel } from "./auditLog.interface";

const auditLogSchema = new Schema<IAuditLog, AuditLogModel>(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

auditLogSchema.plugin(softDeletePlugin);

export const AuditLog = model<IAuditLog, AuditLogModel>("AuditLog", auditLogSchema);
