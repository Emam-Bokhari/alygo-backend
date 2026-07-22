import { Types } from "mongoose";
import { CANCELLATION_REASON_USER_TYPE } from "./cancellationReason.constant";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface ICancellationReason {
  reasonName: string;

  description?: string;

  userType: CANCELLATION_REASON_USER_TYPE;

  sortOrder: number;

  status: STATUS;

  createdAt: Date;

  updatedAt: Date;
}

export type CancellationReasonModel = ISoftDeleteModel<ICancellationReason>;
