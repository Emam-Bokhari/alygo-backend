import { model, Schema } from "mongoose";
import { IAiAuditLog, AiAuditLogModel } from "./aiAuditLog.interface";

const aiAuditLogSchema = new Schema<IAiAuditLog, AiAuditLogModel>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    userType: {
      type: String,
      required: true,
      enum: ["admin", "driver", "system"],
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      required: false,
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

export const AiAuditLog = model<IAiAuditLog, AiAuditLogModel>(
  "AiAuditLog",
  aiAuditLogSchema,
);
