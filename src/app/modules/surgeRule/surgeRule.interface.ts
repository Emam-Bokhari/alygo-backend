import { Model, Types } from "mongoose";
import { SURGE_RULE_TYPE } from "./surgeRule.constant";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface ISurgeRule {
  ruleName: string;
  ruleType: SURGE_RULE_TYPE;
  demandThreshold: number; // percentage (e.g. 80 for 80% demand)
  supplyThreshold: number; // percentage (e.g. 40 for 40% supply availability)
  minMultiplier: number; // e.g. 1.2
  maxMultiplier: number; // e.g. 3.5
  status: STATUS;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SurgeRuleModel = ISoftDeleteModel<ISurgeRule>;
