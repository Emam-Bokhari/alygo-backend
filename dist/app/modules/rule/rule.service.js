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
exports.RuleServices = void 0;
const http_status_codes_1 = require("http-status-codes");
const rule_model_1 = require("./rule.model");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const upsertRule = (type, content) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield rule_model_1.Rule.findOneAndUpdate({ type }, { content, type }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const isNew = (_a = result.isNew) !== null && _a !== void 0 ? _a : true;
    const message = isNew
        ? `${type} created successfully`
        : `${type} updated successfully`;
    return { message, result };
});
const getRuleByType = (type) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield rule_model_1.Rule.findOne({ type });
    if (!result) {
        return {};
    }
    return result;
});
const updateRule = (type, content) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield rule_model_1.Rule.findOneAndUpdate({ type }, { content }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, `${type} not found`);
    }
    return { message: `${type} updated successfully`, result };
});
const deleteRule = (type) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield rule_model_1.Rule.findOneAndUpdate({ type }, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, `${type} not found`);
    }
    return result;
});
exports.RuleServices = {
    upsertRule,
    getRuleByType,
    updateRule,
    deleteRule,
};
