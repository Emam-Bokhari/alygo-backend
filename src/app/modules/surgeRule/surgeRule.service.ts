import { JwtPayload } from "jsonwebtoken";
import { ISurgeRule } from "./surgeRule.interface";
import { SurgeRule } from "./surgeRule.model";
import { STATUS } from "../../../constants/status";
import QueryBuilder from "../../builder/queryBuilder";

// create surge rule
const createSurgeRule = async (
  user: JwtPayload,
  payload: ISurgeRule,
): Promise<ISurgeRule> => {
  payload.createdBy = user.id;
  const result = await SurgeRule.create(payload);
  return result;
};

// get all surge rules with pagination
const getAllSurgeRules = async (query: Record<string, unknown>) => {
  const surgeRuleQuery = new QueryBuilder(SurgeRule.find(), query)
    .search(["ruleName"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await surgeRuleQuery.modelQuery;
  const meta = await surgeRuleQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

// get active surge rules with pagination
const getActiveSurgeRules = async (query: Record<string, unknown>) => {
  const surgeRuleQuery = new QueryBuilder(
    SurgeRule.find({ status: STATUS.ACTIVE }),
    query,
  )
    .search(["ruleName"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await surgeRuleQuery.modelQuery;
  const meta = await surgeRuleQuery.countTotal();

  return {
    meta,
    data: result,
  };
};

// get surge rule by id
const getSurgeRuleById = async (
  surgeRuleId: string,
): Promise<ISurgeRule | null> => {
  const result = await SurgeRule.findById(surgeRuleId);
  return result;
};

// update surge rule
const updateSurgeRule = async (
  surgeRuleId: string,
  payload: Partial<ISurgeRule>,
): Promise<ISurgeRule | null> => {
  const result = await SurgeRule.findByIdAndUpdate(
    surgeRuleId,
    { $set: payload },
    { new: true },
  );
  return result;
};

// update surge rule status with validation
const updateSurgeRuleStatus = async (
  surgeRuleId: string,
  status: STATUS,
): Promise<ISurgeRule | null> => {
  // Validate status
  if (!Object.values(STATUS).includes(status)) {
    throw new Error("Invalid status value");
  }

  const result = await SurgeRule.findByIdAndUpdate(
    surgeRuleId,
    { $set: { status } },
    { new: true },
  );
  return result;
};

// delete surge rule
const deleteSurgeRule = async (
  surgeRuleId: string,
): Promise<ISurgeRule | null> => {
  const result = await SurgeRule.softDeleteById(surgeRuleId);
  return result;
};

export const SurgeRuleService = {
  createSurgeRule,
  getAllSurgeRules,
  getActiveSurgeRules,
  getSurgeRuleById,
  updateSurgeRule,
  updateSurgeRuleStatus,
  deleteSurgeRule,
};
