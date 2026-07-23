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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_1 = require("../../../enums/user");
const user_model_1 = require("./user.model");
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const unlinkFile_1 = __importDefault(require("../../../shared/unlinkFile"));
const jwtHelper_1 = require("../../../helpers/jwtHelper");
const config_1 = __importDefault(require("../../../config"));
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const generateOTP_1 = __importDefault(require("../../../util/generateOTP"));
const emailTemplate_1 = require("../../../shared/emailTemplate");
const emailHelper_1 = require("../../../helpers/emailHelper");
const bcrypt_1 = __importDefault(require("bcrypt"));
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const referral_service_1 = require("../referral/referral.service");
// --- ADMIN SERVICES ---
const createAdminToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    delete payload.phone;
    const isExistAdmin = yield user_model_1.User.findOne({ email: payload.email });
    if (isExistAdmin) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.CONFLICT, "This Email already taken");
    }
    const adminPayload = Object.assign(Object.assign({}, payload), { verified: true, status: user_1.STATUS.ACTIVE, role: user_1.USER_ROLES.ADMIN });
    const createAdmin = yield user_model_1.User.create(adminPayload);
    return createAdmin;
});
const getAdminFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = user_model_1.User.find({
        role: { $in: [user_1.USER_ROLES.ADMIN] },
        status: user_1.STATUS.ACTIVE,
        verified: true,
    }).select("name email role profileImage createdAt updatedAt status");
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["name", "email"])
        .sort()
        .fields()
        .paginate();
    const admins = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    return {
        data: admins,
        meta,
    };
});
const updateAdminStatusByIdToDB = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (![user_1.STATUS.ACTIVE, user_1.STATUS.INACTIVE].includes(status)) {
        throw new ApiErrors_1.default(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
    }
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.ADMIN,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "No admin is found by this user ID");
    }
    const result = yield user_model_1.User.findByIdAndUpdate(id, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to change status by this user ID");
    }
    return result;
});
const deleteAdminFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistAdmin = yield user_model_1.User.softDeleteById(id);
    if (!isExistAdmin) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to delete Admin");
    }
    return isExistAdmin;
});
// --- USER SERVICES ---
const createUserToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistUser = yield user_model_1.User.findOne({ email: payload.email });
    if (isExistUser) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.CONFLICT, "This Email already taken");
    }
    const { referredByCode } = payload, userData = __rest(payload, ["referredByCode"]);
    const createUser = yield user_model_1.User.create(userData);
    if (!createUser) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to create user");
    }
    // Pre-generate unique referral code for the user
    yield referral_service_1.ReferralService.getOrCreateReferralCode(createUser._id.toString());
    // Link referral if referredByCode is passed
    if (referredByCode) {
        yield referral_service_1.ReferralService.handleReferralSignup(createUser._id.toString(), referredByCode);
    }
    //send email
    const otp = (0, generateOTP_1.default)();
    const values = {
        name: createUser.name,
        otp: Number(otp),
        email: createUser.email,
    };
    const createAccountTemplate = emailTemplate_1.emailTemplate.createAccount(values);
    emailHelper_1.emailHelper.sendEmail(createAccountTemplate);
    //save to DB
    const authentication = {
        oneTimeCode: otp,
        expireAt: new Date(Date.now() + 3 * 60000),
    };
    yield user_model_1.User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication } });
    const createToken = jwtHelper_1.jwtHelper.createToken({
        id: createUser._id,
        email: createUser.email,
        role: createUser.role,
    }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
    const result = {
        token: createToken,
        user: createUser,
    };
    // notify admin
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id name");
    if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "New User Signup",
            text: `New user signed up successfully`,
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
            referenceId: result.user._id.toString(),
            referenceModel: "User",
        });
    }
    return result;
});
const updateProfileToDB = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = user;
    const isExistUser = yield user_model_1.User.isExistUserById(id);
    if (!isExistUser) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    //unlink file here
    if (payload.profileImage && isExistUser.profileImage) {
        (0, unlinkFile_1.default)(isExistUser.profileImage);
    }
    const updateDoc = yield user_model_1.User.findOneAndUpdate({ _id: id }, payload, {
        new: true,
    });
    return updateDoc;
});
const getUserByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.USER,
    });
    if (!result)
        throw new ApiErrors_1.default(404, "No user is found in the database by this ID");
    return result;
});
const updateUserStatusByIdToDB = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (![user_1.STATUS.ACTIVE, user_1.STATUS.INACTIVE].includes(status)) {
        throw new ApiErrors_1.default(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
    }
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.USER,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "No user is found by this user ID");
    }
    const result = yield user_model_1.User.findByIdAndUpdate(id, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to change status by this user ID");
    }
    return result;
});
const deleteUserByIdFromD = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findOne({
        _id: id,
        role: user_1.USER_ROLES.USER,
    });
    if (!user) {
        throw new ApiErrors_1.default(404, "User doest not exist in the database");
    }
    const result = yield user_model_1.User.findByIdAndDelete(id);
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to delete user by this ID");
    }
    return result;
});
const deleteProfileFromDB = (id, password) => __awaiter(void 0, void 0, void 0, function* () {
    // user exists?
    const user = yield user_model_1.User.findById(id).select("+password");
    if (!user) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }
    // check password
    const isPasswordMatch = yield bcrypt_1.default.compare(password, user.password);
    if (!isPasswordMatch) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, "Password is incorrect!");
    }
    // delete user
    const result = yield user_model_1.User.findByIdAndDelete(id);
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to delete this user");
    }
    return result;
});
const createHostToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    return {};
});
const ghostLoginAsHost = (user, hostId) => __awaiter(void 0, void 0, void 0, function* () {
    return {};
});
const deleteHostByIdFromD = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return {};
});
const getTotalUsersAndHostsFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return {};
});
const switchProfileToDB = (userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    return {};
});
exports.UserService = {
    createUserToDB,
    getAdminFromDB,
    deleteAdminFromDB,
    getUserByIdFromDB,
    updateProfileToDB,
    createAdminToDB,
    updateUserStatusByIdToDB,
    updateAdminStatusByIdToDB,
    deleteUserByIdFromD,
    deleteProfileFromDB,
    createHostToDB,
    ghostLoginAsHost,
    deleteHostByIdFromD,
    getTotalUsersAndHostsFromDB,
    switchProfileToDB,
};
