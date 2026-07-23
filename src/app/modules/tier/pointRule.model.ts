import { model, Schema } from "mongoose";
import { STATUS } from "../../../enums/user";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IPointRule {
  name: string;
  eventType: string; // e.g. "ride_completed"
  points: number;
  actionType: "earning" | "deduction";
  status: STATUS;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PointRuleModel = ISoftDeleteModel<IPointRule>;

const pointRuleSchema = new Schema<IPointRule, PointRuleModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    points: {
      type: Number,
      required: true,
    },
    actionType: {
      type: String,
      enum: ["earning", "deduction"],
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

pointRuleSchema.plugin(softDeletePlugin);

export const PointRule = model<IPointRule, PointRuleModel>("PointRule", pointRuleSchema);
