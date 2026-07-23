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

const tierHistorySchema = new Schema<ITierHistory>(
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

export const TierHistory = model<ITierHistory>(
  "TierHistory",
  tierHistorySchema,
);
