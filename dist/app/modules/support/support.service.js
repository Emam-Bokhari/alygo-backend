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
exports.SupportServices = void 0;
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../../config"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const emailHelper_1 = require("../../../helpers/emailHelper");
const user_model_1 = require("../user/user.model");
const support_model_1 = require("./support.model");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const emailTemplate_1 = require("../../../shared/emailTemplate");
const support = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.isExistUserById(id);
    console.log(user, payload, "USER, PAYLOAD");
    if (!user) {
        throw new ApiErrors_1.default(404, "No user is found in the database");
    }
    payload.userId = new mongoose_1.Types.ObjectId(id);
    payload.name = user.name || "Unknown";
    payload.email = user.email || "Unknown";
    const supportEntry = yield support_model_1.Support.create(payload);
    const emailPayload = emailTemplate_1.emailTemplate.supportNotification({
        to: config_1.default.support_receiver_email,
        name: payload.name || "Unknown",
        email: payload.email || "Unknown",
        subject: payload.subject,
        message: payload.message,
    });
    yield emailHelper_1.emailHelper.sendEmail(emailPayload);
    return supportEntry;
});
const getAllSupportsFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = support_model_1.Support.find().populate({
        path: "userId",
        select: "_id firstName lastName email phone role profileImage",
    });
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["name email subject userId"])
        .sort()
        .fields()
        .filter()
        .paginate();
    const supports = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    if (!supports || supports.length === 0) {
        throw new ApiErrors_1.default(404, "Supports data are not found in the database");
    }
    return {
        data: supports,
        meta,
    };
});
const getSupportByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const support = yield support_model_1.Support.findById(id).populate({
        path: "userId",
        select: "firstName lastName role profileImage email _id phone",
    });
    if (!support) {
        throw new ApiErrors_1.default(404, "No support is found by this ID");
    }
    return support;
});
const deleteSupportByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const support = yield support_model_1.Support.softDeleteById(id);
    if (!support) {
        throw new ApiErrors_1.default(400, "Failed to delete this support by this ID");
    }
    return support;
});
exports.SupportServices = {
    support,
    getAllSupportsFromDB,
    getSupportByIdFromDB,
    deleteSupportByIdFromDB,
};
