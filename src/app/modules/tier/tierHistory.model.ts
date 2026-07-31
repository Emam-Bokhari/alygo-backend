import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { model, Schema, Types } from "mongoose";

export interface ITierHistory {
  driverId: Types.ObjectId;
  oldTierId?: Types.ObjectId | null;
  newTierId: Types.ObjectId;
  points: number;
  reason: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TierHistoryModel = ISoftDeleteModel<ITierHistory>;

const tierHistorySchema = new Schema<ITierHistory, TierHistoryModel>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    oldTierId: {
      type: Schema.Types.ObjectId,
      ref: "Tier",
      default: null,
    },
    newTierId: {
      type: Schema.Types.ObjectId,
      ref: "Tier",
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

tierHistorySchema.plugin(softDeletePlugin);

export const TierHistory = model<ITierHistory, TierHistoryModel>(
  "TierHistory",
  tierHistorySchema,
);
