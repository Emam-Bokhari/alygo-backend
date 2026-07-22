import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IEmergencyContact {
  userId: Types.ObjectId; // The user who owns this contact
  name: string;
  phone: string;
  relationship?: string; // Spouse, Parent, Friend, etc.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type EmergencyContactModel = ISoftDeleteModel<IEmergencyContact>;
