import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { USER_ROLES } from "../../../enums/user";
import { User } from "../user/user.model";
import { Referral } from "./referral.model";
import { REFERRAL_STATUS, REWARD_STATUS } from "./referral.interface";
import { REFERRAL_CONSTANTS, REFERRAL_RULES } from "./referral.constant";
import { Ride } from "../ride/ride.model";
import { RIDE_STATUS } from "../ride/ride.constant";

/**
 * Generate a unique-ish referral code based on user's name.
 */
const generateReferralCode = (name: string): string => {
  const cleanName = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  const namePart = cleanName.slice(0, 5).padEnd(4, "X");
  const randomPart = crypto.randomInt(1000, 9999).toString();
  return `${namePart}${randomPart}`;
};

/**
 * Retrieve or lazily generate a referral code for a user.
 */
const getOrCreateReferralCode = async (userId: string): Promise<string> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (user.referralCode) {
    return user.referralCode;
  }

  let code = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    code = generateReferralCode(user.name);
    const existing = await User.findOne({ referralCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to generate unique referral code",
    );
  }

  user.referralCode = code;
  await user.save();
  return code;
};

/**
 * Handles referral linkage during signup.
 */
const handleReferralSignup = async (
  refereeId: string,
  referralCode: string,
) => {
  const cleanCode = referralCode.trim().toUpperCase();

  // Ensure referee has not been referred before
  const existingReferral = await Referral.findOne({ refereeId });
  if (existingReferral) {
    return;
  }

  // Find referrer
  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) {
    return; // Invalid code, do nothing
  }

  // Link referee to referrer in User model
  await User.findByIdAndUpdate(refereeId, { referredById: referrer._id });

  const referrerRole = referrer.role === USER_ROLES.DRIVER ? "driver" : "user";
  const initialStatus =
    referrer.role === USER_ROLES.DRIVER
      ? REFERRAL_STATUS.IN_PROGRESS
      : REFERRAL_STATUS.JOINED;
  const rewardAmount =
    referrer.role === USER_ROLES.DRIVER
      ? REFERRAL_CONSTANTS.DRIVER_REFERRAL_REWARD
      : REFERRAL_CONSTANTS.USER_REFERRAL_REWARD;

  await Referral.create({
    referrerId: referrer._id,
    refereeId,
    referralCode: cleanCode,
    referrerRole,
    status: initialStatus,
    ridesCompleted: 0,
    rewardAmount,
    rewardStatus: REWARD_STATUS.PENDING,
    joinedAt: new Date(),
  });
};

/**
 * Sync driver referee completed rides within the 30 days window and update status.
 */
const updateDriverReferralProgress = async (refereeId: string) => {
  const referral = await Referral.findOne({
    refereeId,
    referrerRole: "driver",
    status: REFERRAL_STATUS.IN_PROGRESS,
  });

  if (!referral) return;

  const joinedAt = referral.joinedAt;
  const expiryDate = new Date(
    joinedAt.getTime() +
      REFERRAL_CONSTANTS.DRIVER_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  );

  // Count rides completed by referee driver
  const ridesCompleted = await Ride.countDocuments({
    driverId: refereeId,
    status: RIDE_STATUS.COMPLETED,
    completedAt: { $gte: joinedAt, $lte: expiryDate },
  });

  referral.ridesCompleted = ridesCompleted;

  if (ridesCompleted >= REFERRAL_CONSTANTS.DRIVER_REQUIRED_RIDES) {
    referral.status = REFERRAL_STATUS.COMPLETED;
    referral.completedAt = new Date();
  }

  await referral.save();
};

/**
 * Retrieve referral info, stats, and list of referred friends for passenger.
 */
const getUserReferralInfo = async (userId: string) => {
  const referralCode = await getOrCreateReferralCode(userId);

  const referrals = await Referral.find({
    referrerId: userId,
    referrerRole: "user",
  }).populate("refereeId", "name profileImage verified createdAt");

  const totalReferrals = referrals.length;
  // Joined is counted as verified referee users
  const totalJoin = referrals.filter(
    (ref: any) => ref.refereeId?.verified,
  ).length;
  const currentDiscount = totalJoin * REFERRAL_CONSTANTS.USER_REFERRAL_REWARD;

  const referralList = referrals.map((ref: any) => ({
    name: ref.refereeId?.name || "Unknown Friend",
    profileImage: ref.refereeId?.profileImage || "",
    joiningDate: ref.refereeId?.createdAt || ref.joinedAt,
    amount: REFERRAL_CONSTANTS.USER_REFERRAL_REWARD,
  }));

  return {
    referralCode,
    currentDiscount,
    totalReferrals,
    totalJoin,
    referralList,
  };
};

/**
 * Retrieve summary referral stats for driver.
 */
const getDriverReferralInfo = async (userId: string) => {
  const referralCode = await getOrCreateReferralCode(userId);

  // Sync progress for all active driver referrals
  const activeReferrals = await Referral.find({
    referrerId: userId,
    referrerRole: "driver",
    status: REFERRAL_STATUS.IN_PROGRESS,
  });

  for (const ref of activeReferrals) {
    await updateDriverReferralProgress(ref.refereeId.toString());
  }

  const referrals = await Referral.find({
    referrerId: userId,
    referrerRole: "driver",
  });

  const totalInvited = referrals.length;
  const active = referrals.filter(
    (r) => r.status === REFERRAL_STATUS.IN_PROGRESS,
  ).length;
  const completed = referrals.filter(
    (r) => r.status === REFERRAL_STATUS.COMPLETED,
  ).length;

  const pendingRewards = referrals
    .filter(
      (r) =>
        r.status === REFERRAL_STATUS.COMPLETED &&
        r.rewardStatus === REWARD_STATUS.PENDING,
    )
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const totalEarned = referrals
    .filter(
      (r) =>
        r.status === REFERRAL_STATUS.COMPLETED &&
        r.rewardStatus === REWARD_STATUS.PAID,
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
};

/**
 * Get detailed ride completion progress of referred drivers.
 */
const getDriverReferralProgress = async (userId: string) => {
  // Sync first
  const activeReferrals = await Referral.find({
    referrerId: userId,
    referrerRole: "driver",
    status: REFERRAL_STATUS.IN_PROGRESS,
  });

  for (const ref of activeReferrals) {
    await updateDriverReferralProgress(ref.refereeId.toString());
  }

  const referrals = await Referral.find({
    referrerId: userId,
    referrerRole: "driver",
  }).populate("refereeId", "name profileImage");

  return referrals.map((ref: any) => ({
    name: ref.refereeId?.name || "Unknown Driver",
    profileImage: ref.refereeId?.profileImage || "",
    ridesCompleted: ref.ridesCompleted,
    requiredRides: REFERRAL_CONSTANTS.DRIVER_REQUIRED_RIDES,
    status: ref.status,
    amount: ref.status === REFERRAL_STATUS.COMPLETED ? ref.rewardAmount : 0,
  }));
};

/**
 * Get payout history for driver referrals.
 */
const getDriverPayoutHistory = async (userId: string) => {
  const referrals = await Referral.find({
    referrerId: userId,
    referrerRole: "driver",
    status: REFERRAL_STATUS.COMPLETED,
  }).populate("refereeId", "name profileImage");

  return referrals.map((ref: any) => ({
    id: ref._id,
    refereeName: ref.refereeId?.name || "Unknown Driver",
    amount: ref.rewardAmount,
    date: ref.completedAt || ref.updatedAt,
    status: ref.rewardStatus,
  }));
};

/**
 * Verify referral code and return referrer's basic info.
 */
const verifyReferralCode = async (code: string) => {
  const cleanCode = code.trim().toUpperCase();
  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Invalid referral code");
  }

  return {
    isValid: true,
    referrerName: referrer.name,
    referrerRole: referrer.role,
  };
};

export const ReferralService = {
  getOrCreateReferralCode,
  handleReferralSignup,
  updateDriverReferralProgress,
  getUserReferralInfo,
  getDriverReferralInfo,
  getDriverReferralProgress,
  getDriverPayoutHistory,
  verifyReferralCode,
};
