"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurgeRule = void 0;
const mongoose_1 = require("mongoose");
const surgeRule_constant_1 = require("./surgeRule.constant");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const surgeRuleSchema = new mongoose_1.Schema(
  {
    ruleName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    ruleType: {
      type: String,
      enum: Object.values(surgeRule_constant_1.SURGE_RULE_TYPE),
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
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
    },
    createdBy: {
      type: mongoose_1.Schema.Types.ObjectId,
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
surgeRuleSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.SurgeRule = (0, mongoose_1.model)("SurgeRule", surgeRuleSchema);
