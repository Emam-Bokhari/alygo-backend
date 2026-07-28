import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IAiConversation {
  _id?: Types.ObjectId;
  driverId: Types.ObjectId;
  title: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AiConversationModel = ISoftDeleteModel<IAiConversation>;
