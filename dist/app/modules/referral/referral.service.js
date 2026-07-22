"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const user_1 = require("../../../enums/user");
const user_model_1 = require("../user/user.model");
const referral_model_1 = require("./referral.model");
const referral_interface_1 = require("./referral.interface");
const referral_constant_1 = require("./referral.constant");
const ride_model_1 = require("../ride/ride.model");
const ride_constant_1 = require("../ride/ride.constant");
/**
 * Generate a unique-ish referral code based on user's name.
 */
const generateReferralCode = (name) => {
  const cleanName = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  const namePart = cleanName.slice(0, 5).padEnd(4, "X");
  const randomPart = crypto_1.default.randomInt(1000, 9999).toString();
  return `${namePart}${randomPart}`;
};
/**
 * Retrieve or lazily generate a referral code for a user.
 */
const getOrCreateReferralCode = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "User not found",
      );
    }
    if (user.referralCode) {
      return user.referralCode;
    }
    let code = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      code = generateReferralCode(user.name);
      const existing = yield user_model_1.User.findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    if (!isUnique) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to generate unique referral code",
      );
    }
    user.referralCode = code;
    yield user.save();
    return code;
  });
/**
 * Handles referral linkage during signup.
 */
const handleReferralSignup = (refereeId, referralCode) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const cleanCode = referralCode.trim().toUpperCase();
    // Ensure referee has not been referred before
    const existingReferral = yield referral_model_1.Referral.findOne({
      refereeId,
    });
    if (existingReferral) {
      return;
    }
    // Find referrer
    const referrer = yield user_model_1.User.findOne({
      referralCode: cleanCode,
    });
    if (!referrer) {
      return; // Invalid code, do nothing
    }
    // Link referee to referrer in User model
    yield user_model_1.User.findByIdAndUpdate(refereeId, {
      referredById: referrer._id,
    });
    const referrerRole =
      referrer.role === user_1.USER_ROLES.DRIVER ? "driver" : "user";
    const initialStatus =
      referrer.role === user_1.USER_ROLES.DRIVER
        ? referral_interface_1.REFERRAL_STATUS.IN_PROGRESS
        : referral_interface_1.REFERRAL_STATUS.JOINED;
    const rewardAmount =
      referrer.role === user_1.USER_ROLES.DRIVER
        ? referral_constant_1.REFERRAL_CONSTANTS.DRIVER_REFERRAL_REWARD
        : referral_constant_1.REFERRAL_CONSTANTS.USER_REFERRAL_REWARD;
    yield referral_model_1.Referral.create({
      referrerId: referrer._id,
      refereeId,
      referralCode: cleanCode,
      referrerRole,
      status: initialStatus,
      ridesCompleted: 0,
      rewardAmount,
      rewardStatus: referral_interface_1.REWARD_STATUS.PENDING,
      joinedAt: new Date(),
    });
  });
/**
 * Sync driver referee completed rides within the 30 days window and update status.
 */
const updateDriverReferralProgress = (refereeId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const referral = yield referral_model_1.Referral.findOne({
      refereeId,
      referrerRole: "driver",
      status: referral_interface_1.REFERRAL_STATUS.IN_PROGRESS,
    });
    if (!referral) return;
    const joinedAt = referral.joinedAt;
    const expiryDate = new Date(
      joinedAt.getTime() +
        referral_constant_1.REFERRAL_CONSTANTS.DRIVER_VALIDITY_DAYS *
          24 *
          60 *
          60 *
          1000,
    );
    // Count rides completed by referee driver
    const ridesCompleted = yield ride_model_1.Ride.countDocuments({
      driverId: refereeId,
      status: ride_constant_1.RIDE_STATUS.COMPLETED,
      completedAt: { $gte: joinedAt, $lte: expiryDate },
    });
    referral.ridesCompleted = ridesCompleted;
    if (
      ridesCompleted >=
      referral_constant_1.REFERRAL_CONSTANTS.DRIVER_REQUIRED_RIDES
    ) {
      referral.status = referral_interface_1.REFERRAL_STATUS.COMPLETED;
      referral.completedAt = new Date();
    }
    yield referral.save();
  });
/**
 * Retrieve referral info, stats, and list of referred friends for passenger.
 */
const getUserReferralInfo = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const referralCode = yield getOrCreateReferralCode(userId);
    const referrals = yield referral_model_1.Referral.find({
      referrerId: userId,
      referrerRole: "user",
    }).populate("refereeId", "name profileImage verified createdAt");
    const totalReferrals = referrals.length;
    // Joined is counted as verified referee users
    const totalJoin = referrals.filter((ref) => {
      var _a;
      return (_a = ref.refereeId) === null || _a === void 0
        ? void 0
        : _a.verified;
    }).length;
    const currentDiscount =
      totalJoin * referral_constant_1.REFERRAL_CONSTANTS.USER_REFERRAL_REWARD;
    const referralList = referrals.map((ref) => {
      var _a, _b, _c;
      return {
        name:
          ((_a = ref.refereeId) === null || _a === void 0 ? void 0 : _a.name) ||
          "Unknown Friend",
        profileImage:
          ((_b = ref.refereeId) === null || _b === void 0
            ? void 0
            : _b.profileImage) || "",
        joiningDate:
          ((_c = ref.refereeId) === null || _c === void 0
            ? void 0
            : _c.createdAt) || ref.joinedAt,
        amount: referral_constant_1.REFERRAL_CONSTANTS.USER_REFERRAL_REWARD,
      };
    });
    return {
      referralCode,
      currentDiscount,
      totalReferrals,
      totalJoin,
      referralList,
    };
  });
/**
 * Retrieve summary referral stats for driver.
 */
const getDriverReferralInfo = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const referralCode = yield getOrCreateReferralCode(userId);
    // Sync progress for all active driver referrals
    const activeReferrals = yield referral_model_1.Referral.find({
      referrerId: userId,
      referrerRole: "driver",
      status: referral_interface_1.REFERRAL_STATUS.IN_PROGRESS,
    });
    for (const ref of activeReferrals) {
      yield updateDriverReferralProgress(ref.refereeId.toString());
    }
    const referrals = yield referral_model_1.Referral.find({
      referrerId: userId,
      referrerRole: "driver",
    });
    const totalInvited = referrals.length;
    const active = referrals.filter(
      (r) => r.status === referral_interface_1.REFERRAL_STATUS.IN_PROGRESS,
    ).length;
    const completed = referrals.filter(
      (r) => r.status === referral_interface_1.REFERRAL_STATUS.COMPLETED,
    ).length;
    const pendingRewards = referrals
      .filter(
        (r) =>
          r.status === referral_interface_1.REFERRAL_STATUS.COMPLETED &&
          r.rewardStatus === referral_interface_1.REWARD_STATUS.PENDING,
      )
      .reduce((sum, r) => sum + r.rewardAmount, 0);
    const totalEarned = referrals
      .filter(
        (r) =>
          r.status === referral_interface_1.REFERRAL_STATUS.COMPLETED &&
          r.rewardStatus === referral_interface_1.REWARD_STATUS.PAID,
      )
      .reduce((sum, r) => sum + r.rewardAmount, 0);
    return {
      referralCode,
      statistics: {
        totalInvited,
        active,
        completed,
        pendingRewards,
        totalEarned,
      },
    };
  });
/**
 * Get detailed ride completion progress of referred drivers.
 */
const getDriverReferralProgress = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Sync first
    const activeReferrals = yield referral_model_1.Referral.find({
      referrerId: userId,
      referrerRole: "driver",
      status: referral_interface_1.REFERRAL_STATUS.IN_PROGRESS,
    });
    for (const ref of activeReferrals) {
      yield updateDriverReferralProgress(ref.refereeId.toString());
    }
    const referrals = yield referral_model_1.Referral.find({
      referrerId: userId,
      referrerRole: "driver",
    }).populate("refereeId", "name profileImage");
    return referrals.map((ref) => {
      var _a, _b;
      return {
        name:
          ((_a = ref.refereeId) === null || _a === void 0 ? void 0 : _a.name) ||
          "Unknown Driver",
        profileImage:
          ((_b = ref.refereeId) === null || _b === void 0
            ? void 0
            : _b.profileImage) || "",
        ridesCompleted: ref.ridesCompleted,
        requiredRides:
          referral_constant_1.REFERRAL_CONSTANTS.DRIVER_REQUIRED_RIDES,
        status: ref.status,
        amount:
          ref.status === referral_interface_1.REFERRAL_STATUS.COMPLETED
            ? ref.rewardAmount
            : 0,
      };
    });
  });
/**
 * Get payout history for driver referrals.
 */
const getDriverPayoutHistory = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const referrals = yield referral_model_1.Referral.find({
      referrerId: userId,
      referrerRole: "driver",
      status: referral_interface_1.REFERRAL_STATUS.COMPLETED,
    }).populate("refereeId", "name profileImage");
    return referrals.map((ref) => {
      var _a;
      return {
        id: ref._id,
        refereeName:
          ((_a = ref.refereeId) === null || _a === void 0 ? void 0 : _a.name) ||
          "Unknown Driver",
        amount: ref.rewardAmount,
        date: ref.completedAt || ref.updatedAt,
        status: ref.rewardStatus,
      };
    });
  });
/**
 * Verify referral code and return referrer's basic info.
 */
const verifyReferralCode = (code) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const cleanCode = code.trim().toUpperCase();
    const referrer = yield user_model_1.User.findOne({
      referralCode: cleanCode,
    });
    if (!referrer) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Invalid referral code",
      );
    }
    return {
      isValid: true,
      referrerName: referrer.name,
      referrerRole: referrer.role,
    };
  });
exports.ReferralService = {
  getOrCreateReferralCode,
  handleReferralSignup,
  updateDriverReferralProgress,
  getUserReferralInfo,
  getDriverReferralInfo,
  getDriverReferralProgress,
  getDriverPayoutHistory,
  verifyReferralCode,
};
