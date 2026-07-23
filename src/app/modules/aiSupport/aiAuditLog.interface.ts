import { Model, Types } from "mongoose";

export interface IAiAuditLog {
  _id?: Types.ObjectId;
  action: string; // e.g. "KNOWLEDGE_CREATED", "KNOWLEDGE_UPDATED", "KNOWLEDGE_DELETED", "AI_CONFIG_CHANGED", "DRIVER_ASKED_QUESTION", "DRIVER_FEEDBACK", "RESPONSE_REGENERATED"
  performedBy?: Types.ObjectId;
  userType: "admin" | "driver" | "system";
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type AiAuditLogModel = Model<IAiAuditLog>;
