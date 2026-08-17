import { ISoftDeleteModel } from "../../../types/softDelete";
import { Types } from "mongoose";

export interface IAiAuditLog {
  _id?: Types.ObjectId;
  action: string; 
  performedBy?: Types.ObjectId;
  userType: "admin" | "driver" | "system";
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type AiAuditLogModel = ISoftDeleteModel<IAiAuditLog>;
