"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurgeRuleService = void 0;
const surgeRule_model_1 = require("./surgeRule.model");
const status_1 = require("../../../constants/status");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
// create surge rule
const createSurgeRule = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    payload.createdBy = user.id;
    const result = yield surgeRule_model_1.SurgeRule.create(payload);
    return result;
});
// get all surge rules with pagination
const getAllSurgeRules = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const surgeRuleQuery = new queryBuilder_1.default(surgeRule_model_1.SurgeRule.find(), query)
        .search(["ruleName"])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield surgeRuleQuery.modelQuery;
    const meta = yield surgeRuleQuery.countTotal();
    return {
        meta,
        data: result,
    };
});
// get active surge rules with pagination
const getActiveSurgeRules = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const surgeRuleQuery = new queryBuilder_1.default(surgeRule_model_1.SurgeRule.find({ status: status_1.STATUS.ACTIVE }), query)
        .search(["ruleName"])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield surgeRuleQuery.modelQuery;
    const meta = yield surgeRuleQuery.countTotal();
    return {
        meta,
        data: result,
    };
});
// get surge rule by id
const getSurgeRuleById = (surgeRuleId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield surgeRule_model_1.SurgeRule.findById(surgeRuleId);
    return result;
});
// update surge rule
const updateSurgeRule = (surgeRuleId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield surgeRule_model_1.SurgeRule.findByIdAndUpdate(surgeRuleId, { $set: payload }, { new: true });
    return result;
});
// update surge rule status with validation
const updateSurgeRuleStatus = (surgeRuleId, status) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate status
    if (!Object.values(status_1.STATUS).includes(status)) {
        throw new Error("Invalid status value");
    }
    const result = yield surgeRule_model_1.SurgeRule.findByIdAndUpdate(surgeRuleId, { $set: { status } }, { new: true });
    return result;
});
// delete surge rule
const deleteSurgeRule = (surgeRuleId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield surgeRule_model_1.SurgeRule.softDeleteById(surgeRuleId);
    return result;
});
exports.SurgeRuleService = {
    createSurgeRule,
    getAllSurgeRules,
    getActiveSurgeRules,
    getSurgeRuleById,
    updateSurgeRule,
    updateSurgeRuleStatus,
    deleteSurgeRule,
};
