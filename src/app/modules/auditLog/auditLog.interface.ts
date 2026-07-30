import { Types } from "mongoose";

export type IAuditLog = {
  action: string;
  performedBy?: Types.ObjectId;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
