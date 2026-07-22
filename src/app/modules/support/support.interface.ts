import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export type TSupport = {
  userId: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type SupportModel = ISoftDeleteModel<TSupport>;
