import { model, Schema } from "mongoose";
import { ISurgeRule, SurgeRuleModel } from "./surgeRule.interface";
import { SURGE_RULE_TYPE } from "./surgeRule.constant";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const surgeRuleSchema = new Schema<ISurgeRule, SurgeRuleModel>(
  {
    ruleName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    ruleType: {
      type: String,
      enum: Object.values(SURGE_RULE_TYPE),
      required: true,
      index: true,
    },
    demandThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    supplyThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    minMultiplier: {
      type: Number,
      required: true,
      min: 1,
      default: 1.0,
    },
    maxMultiplier: {
      type: Number,
      required: true,
      min: 1,
      default: 1.0,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  },
);

surgeRuleSchema.plugin(softDeletePlugin);

export const SurgeRule = model<ISurgeRule, SurgeRuleModel>(
  "SurgeRule",
  surgeRuleSchema,
);
