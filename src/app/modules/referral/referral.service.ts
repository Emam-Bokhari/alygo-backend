import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { USER_ROLES } from "../../../enums/user";
import { User } from "../user/user.model";
import { Referral } from "./referral.model";
import { REFERRAL_STATUS, REWARD_STATUS } from "./referral.interface";
import { Ride } from "../ride/ride.model";
import {
  RIDE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
} from "../ride/ride.constant";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { WalletService } from "../wallet/wallet.service";
import { Transaction } from "../transaction/transaction.model";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import QueryBuilder from "../../builder/queryBuilder";
import { PointsService } from "../tier/points.service";

/**
 * Generate a unique-ish referral code.
 */
const generateReferralCode = (name: string, role: string): string => {
  const cleanName = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  const namePart = cleanName.slice(0, 4).padEnd(3, "X");
  const randomPart = crypto.randomInt(100, 999).toString();
  const prefix = role === USER_ROLES.DRIVER ? "DRV" : "ALY";
  return `${prefix}${namePart}${randomPart}`;
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

  while (!isUnique && attempts < 15) {
    code = generateReferralCode(user.name, user.role);
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

  // Find referee user
  const referee = await User.findById(refereeId);
  if (!referee) return;

  // Ensure referee has not been referred before
  const existingReferral = await Referral.findOne({ refereeId });
  if (existingReferral) return;

  // Find referrer
  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) return; // Invalid code, ignore

  // Self referral check
  if (referrer._id.toString() === refereeId.toString()) return;

  // Circular referral check
  if (
    referrer.referredById &&
    referrer.referredById.toString() === refereeId.toString()
  )
    return;

  // Enforce program matching
  if (
    referrer.role === USER_ROLES.DRIVER &&
    referee.role === USER_ROLES.DRIVER
  ) {
    const config = await getSystemConfig();
    if (!config.referral?.driver?.enabled) return;

    referee.referredById = referrer._id;
    await referee.save();

    const referral = await Referral.create({
      referrerId: referrer._id,
      refereeId: referee._id,
      referredDriverId: referee._id,
      referralCode: cleanCode,
      referrerRole: "driver",
      referralType: "DRIVER",
      status: REFERRAL_STATUS.ACTIVE,
      qualificationProgress: 0,
      qualificationTarget: config.referral.driver.requiredCompletedTrips || 10,
      rewardAmount: config.referral.driver.rewardAmount || 100,
      rewardCurrency: config.referral.driver.rewardCurrency || "USD",
      rewardStatus: REWARD_STATUS.PENDING,
      joinedAt: new Date(),
      auditLogs: [
        {
          action: "REFERRAL_CREATED",
          details: { message: "Driver referral created and linked." },
          timestamp: new Date(),
        },
      ],
    });

    // Realtime events
    const socketIo = (global as any).io;
    if (socketIo) {
      socketIo.emit(`driver-referral-progress::${referrer._id}`, {
        refereeId: referee._id,
        progress: 0,
        target: referral.qualificationTarget,
        status: REFERRAL_STATUS.ACTIVE,
      });
      socketIo.emit("referral-updated", {
        referralId: referral._id,
        type: "DRIVER",
      });
    }

    // Push notification to Referrer Driver
    await sendNotifications({
      title: "New Driver Joined",
      text: `${referee.name} has joined using your referral code.`,
      receiver: referrer._id,
      type: NOTIFICATION_TYPE.DRIVER,
      referenceId: referral._id,
      referenceModel: "Referral" as any,
    });
  } else if (
    referrer.role === USER_ROLES.USER &&
    referee.role === USER_ROLES.USER
  ) {
    const config = await getSystemConfig();
    if (!config.referral?.passenger?.enabled) return;

    referee.referredById = referrer._id;
    await referee.save();

    const referral = await Referral.create({
      referrerId: referrer._id,
      refereeId: referee._id,
      referredUserId: referee._id,
      referralCode: cleanCode,
      referrerRole: "user",
      referralType: "USER",
      status: REFERRAL_STATUS.PENDING,
      qualificationProgress: 0,
      qualificationTarget:
        config.referral.passenger.requiredCompletedTrips || 1,
      rewardAmount: config.referral.passenger.rewardAmount || 20,
      rewardCurrency: config.referral.passenger.rewardCurrency || "USD",
      rewardStatus: REWARD_STATUS.PENDING,
      joinedAt: new Date(),
      auditLogs: [
        {
          action: "REFERRAL_CREATED",
          details: { message: "Passenger referral created and linked." },
          timestamp: new Date(),
        },
      ],
    });

    // Realtime events
    const socketIo = (global as any).io;
    if (socketIo) {
      socketIo.emit(`referral-progress::${referrer._id}`, {
        refereeId: referee._id,
        progress: 0,
        target: referral.qualificationTarget,
        status: REFERRAL_STATUS.PENDING,
      });
      socketIo.emit("referral-updated", {
        referralId: referral._id,
        type: "USER",
      });
    }

    // Push notification to Referrer Passenger
    await sendNotifications({
      title: "Friend Joined",
      text: `${referee.name} has signed up using your referral code.`,
      receiver: referrer._id,
      type: NOTIFICATION_TYPE.USER,
      referenceId: referral._id,
      referenceModel: "Referral" as any,
    });
  }
};

/**
 * Handle Driver completed rides updating and qualification checks.
 */
const handleDriverRideCompletion = async (driverUserId: string) => {
  const referral = await Referral.findOne({
    referredDriverId: driverUserId,
    referralType: "DRIVER",
    status: { $in: [REFERRAL_STATUS.ACTIVE, REFERRAL_STATUS.PENDING] },
  });

  if (!referral) return;

  const config = await getSystemConfig();
  if (!config.referral?.driver?.enabled) return;

  const expiryDate = new Date(
    referral.joinedAt.getTime() +
      config.referral.driver.qualificationDays * 24 * 60 * 60 * 1000,
  );

  if (new Date() > expiryDate) {
    referral.status = REFERRAL_STATUS.EXPIRED;
    referral.auditLogs.push({
      action: "EXPIRED",
      details: { message: "Driver qualification period has expired." },
      timestamp: new Date(),
    });
    await referral.save();
    return;
  }

  // Count verified completed rides by referee driver within qualification window
  const ridesCompleted = await Ride.countDocuments({
    driverId: driverUserId,
    status: RIDE_STATUS.COMPLETED,
    completedAt: { $gte: referral.joinedAt, $lte: expiryDate },
  });

  referral.qualificationProgress = ridesCompleted;

  referral.auditLogs.push({
    action: "RIDE_COMPLETED",
    details: {
      message: `Referee driver completed ride. Progress: ${ridesCompleted}/${referral.qualificationTarget}`,
    },
    timestamp: new Date(),
  });

  const socketIo = (global as any).io;
  if (socketIo) {
    socketIo.emit(`driver-referral-progress::${referral.referrerId}`, {
      refereeId: referral.refereeId,
      progress: ridesCompleted,
      target: referral.qualificationTarget,
      status: referral.status,
    });
  }

  // Notify referrer of progress update
  await sendNotifications({
    title: "Referral Progress Updated",
    text: `Your referred driver completed a ride. Progress: ${ridesCompleted}/${referral.qualificationTarget}.`,
    receiver: referral.referrerId,
    type: NOTIFICATION_TYPE.DRIVER,
  });

  if (ridesCompleted >= referral.qualificationTarget) {
    referral.status = REFERRAL_STATUS.COMPLETED;
    referral.completedAt = new Date();
    referral.qualificationCompletedAt = new Date();

    // Award points to the referrer driver
    PointsService.awardPoints(
      referral.referrerId,
      "referral_completed",
      "referral",
      referral._id,
      { notes: `Successful Driver Referral of referee ${referral.refereeId}` }
    ).catch((err) => console.error("Error awarding referral points:", err));

    referral.auditLogs.push({
      action: "QUALIFICATION_COMPLETED",
      details: { message: "Driver satisfied completed ride requirements." },
      timestamp: new Date(),
    });

    if (socketIo) {
      socketIo.emit(`driver-referral-qualified::${referral.referrerId}`, {
        refereeId: referral.refereeId,
        rewardAmount: referral.rewardAmount,
      });
      socketIo.emit("referral-updated", {
        referralId: referral._id,
        type: "DRIVER",
      });
    }

    await sendNotifications({
      title: "Reward Qualified",
      text: "Referred driver successfully completed the required ride count.",
      receiver: referral.referrerId,
      type: NOTIFICATION_TYPE.DRIVER,
    });

    // Award wallet payout
    if (config.referral.driver.autoRewardEnabled && !referral.rewardPaid) {
      const paidRewardsCount = await Referral.countDocuments({
        referrerId: referral.referrerId,
        referralType: "DRIVER",
        rewardPaid: true,
      });

      if (paidRewardsCount < config.referral.driver.maximumRewardsPerDriver) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const wallet = await WalletService.getOrCreateWallet(
            referral.referrerId,
            session,
          );
          wallet.balance = parseFloat(
            (wallet.balance + referral.rewardAmount).toFixed(2),
          );
          await wallet.save({ session });

          const uniqueTxnRef = `TXN-REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

          const [transaction] = await Transaction.create(
            [
              {
                transactionId: uniqueTxnRef,
                userId: referral.referrerId,
                walletId: wallet._id,
                amount: referral.rewardAmount,
                currency: referral.rewardCurrency,
                paymentMethod: PAYMENT_METHOD.WALLET,
                paymentStatus: PAYMENT_STATUS.PAID,
                transactionType: TRANSACTION_TYPE.DRIVER_REFERRAL_REWARD,
                description: `Referral Reward payout for successfully inviting a qualified driver.`,
              },
            ],
            { session },
          );

          referral.rewardPaid = true;
          referral.rewardPaidAt = new Date();
          referral.rewardStatus = REWARD_STATUS.PAID;
          referral.rewardTransactionId = transaction._id;
          referral.auditLogs.push({
            action: "REWARD_PAID",
            actor: referral.referrerId,
            actorRole: "driver",
            details: {
              transactionId: transaction._id,
              amount: referral.rewardAmount,
            },
            timestamp: new Date(),
          });

          await referral.save({ session });
          await session.commitTransaction();
          session.endSession();

          // Sockets & notifications
          if (socketIo) {
            socketIo.emit(`wallet-updated::${referral.referrerId}`, {
              balance: wallet.balance,
            });
            socketIo.emit(`driver-referral-paid::${referral.referrerId}`, {
              amount: referral.rewardAmount,
              transactionId: transaction._id,
            });
          }

          await sendNotifications({
            title: "Referral Reward Paid",
            text: `Your referral reward of ${referral.rewardAmount} ${referral.rewardCurrency} has been credited to your wallet.`,
            receiver: referral.referrerId,
            type: NOTIFICATION_TYPE.DRIVER,
          });

          // Admin notification
          await sendNotifications({
            title: "Referral Payout Processed",
            text: `Driver referral reward of ${referral.rewardAmount} paid to referrer ${referral.referrerId}.`,
            type: NOTIFICATION_TYPE.ADMIN,
          });
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          console.error(
            "Failed to process driver referral wallet credit:",
            error,
          );
        }
      } else {
        referral.auditLogs.push({
          action: "LIMIT_EXCEEDED",
          details: {
            message: "Referrer driver has reached maximum reward payout cap.",
          },
          timestamp: new Date(),
        });
      }
    }
  }

  await referral.save();
};

/**
 * Handle Passenger completed actions and qualification checks.
 */
const checkAndProcessPassengerReferral = async (passengerUserId: string) => {
  const referral = await Referral.findOne({
    referredUserId: passengerUserId,
    referralType: "USER",
    status: { $in: [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.ACTIVE] },
  });

  if (!referral) return;

  const config = await getSystemConfig();
  if (!config.referral?.passenger?.enabled) return;

  const expiryDate = new Date(
    referral.joinedAt.getTime() +
      config.referral.passenger.qualificationDays * 24 * 60 * 60 * 1000,
  );

  if (new Date() > expiryDate) {
    referral.status = REFERRAL_STATUS.EXPIRED;
    referral.auditLogs.push({
      action: "EXPIRED",
      details: { message: "Passenger qualification window expired." },
      timestamp: new Date(),
    });
    await referral.save();
    return;
  }

  let qualified = false;
  const qType = config.referral.passenger.qualificationType;

  if (qType === "rides") {
    const tripCount = await Ride.countDocuments({
      userId: passengerUserId,
      status: RIDE_STATUS.COMPLETED,
      completedAt: { $gte: referral.joinedAt, $lte: expiryDate },
    });
    referral.qualificationProgress = tripCount;
    qualified = tripCount >= referral.qualificationTarget;
  } else if (qType === "topup") {
    const topupsResult = await Transaction.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(passengerUserId),
          transactionType: TRANSACTION_TYPE.WALLET_TOPUP,
          paymentStatus: PAYMENT_STATUS.PAID,
          createdAt: { $gte: referral.joinedAt, $lte: expiryDate },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalTopup = topupsResult[0]?.total || 0;
    referral.qualificationProgress = totalTopup;
    qualified =
      totalTopup >=
      (config.referral.passenger.minimumWalletTopup || referral.rewardAmount);
  } else if (qType === "booking") {
    const bookingsResult = await Transaction.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(passengerUserId),
          transactionType: TRANSACTION_TYPE.BOOKING_PAYMENT,
          paymentStatus: PAYMENT_STATUS.PAID,
          createdAt: { $gte: referral.joinedAt, $lte: expiryDate },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalBooking = bookingsResult[0]?.total || 0;
    referral.qualificationProgress = totalBooking;
    qualified =
      totalBooking >= (config.referral.passenger.minimumBookingAmount || 1);
  }

  referral.auditLogs.push({
    action: "QUALIFICATION_EVALUATED",
    details: {
      message: `Evaluated Passenger conditions. Progress: ${referral.qualificationProgress}/${referral.qualificationTarget}`,
    },
    timestamp: new Date(),
  });

  const socketIo = (global as any).io;
  if (socketIo) {
    socketIo.emit(`referral-progress::${referral.referrerId}`, {
      refereeId: referral.refereeId,
      progress: referral.qualificationProgress,
      target: referral.qualificationTarget,
      status: referral.status,
    });
  }

  // Notify progress
  await sendNotifications({
    title: "Friend Referral Progress",
    text: `Your referred friend is participating. Progress: ${referral.qualificationProgress}/${referral.qualificationTarget}.`,
    receiver: referral.referrerId,
    type: NOTIFICATION_TYPE.USER,
  });

  if (qualified) {
    referral.status = REFERRAL_STATUS.COMPLETED;
    referral.completedAt = new Date();
    referral.qualificationCompletedAt = new Date();
    referral.auditLogs.push({
      action: "QUALIFICATION_COMPLETED",
      details: {
        message: "Passenger satisfied referral conditions successfully.",
      },
      timestamp: new Date(),
    });

    if (socketIo) {
      socketIo.emit(`referral-qualified::${referral.referrerId}`, {
        refereeId: referral.refereeId,
        rewardAmount: referral.rewardAmount,
      });
      socketIo.emit("referral-updated", {
        referralId: referral._id,
        type: "USER",
      });
    }

    await sendNotifications({
      title: "Reward Qualified",
      text: "Your referred friend successfully completed the conditions.",
      receiver: referral.referrerId,
      type: NOTIFICATION_TYPE.USER,
    });

    // Payout rewards
    if (config.referral.passenger.autoRewardEnabled && !referral.rewardPaid) {
      const paidCount = await Referral.countDocuments({
        referrerId: referral.referrerId,
        referralType: "USER",
        rewardPaid: true,
      });

      const allowed =
        config.referral.passenger.allowMultipleRewards || paidCount === 0;

      if (
        allowed &&
        paidCount < config.referral.passenger.maximumRewardsPerUser
      ) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const wallet = await WalletService.getOrCreateWallet(
            referral.referrerId,
            session,
          );
          wallet.balance = parseFloat(
            (wallet.balance + referral.rewardAmount).toFixed(2),
          );
          await wallet.save({ session });

          const uniqueTxnRef = `TXN-REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

          const [transaction] = await Transaction.create(
            [
              {
                transactionId: uniqueTxnRef,
                userId: referral.referrerId,
                walletId: wallet._id,
                amount: referral.rewardAmount,
                currency: referral.rewardCurrency,
                paymentMethod: PAYMENT_METHOD.WALLET,
                paymentStatus: PAYMENT_STATUS.PAID,
                transactionType: TRANSACTION_TYPE.USER_REFERRAL_REWARD,
                description: `Referral Bonus payout for successfully inviting a qualified passenger.`,
              },
            ],
            { session },
          );

          referral.rewardPaid = true;
          referral.rewardPaidAt = new Date();
          referral.rewardStatus = REWARD_STATUS.PAID;
          referral.rewardTransactionId = transaction._id;
          referral.auditLogs.push({
            action: "REWARD_PAID",
            actor: referral.referrerId,
            actorRole: "user",
            details: {
              transactionId: transaction._id,
              amount: referral.rewardAmount,
            },
            timestamp: new Date(),
          });

          await referral.save({ session });
          await session.commitTransaction();
          session.endSession();

          // Sockets & notifications
          if (socketIo) {
            socketIo.emit(`wallet-updated::${referral.referrerId}`, {
              balance: wallet.balance,
            });
            socketIo.emit(`referral-reward::${referral.referrerId}`, {
              amount: referral.rewardAmount,
              transactionId: transaction._id,
            });
          }

          await sendNotifications({
            title: "Referral Reward Paid",
            text: `Your referral bonus of ${referral.rewardAmount} ${referral.rewardCurrency} has been credited to your wallet.`,
            receiver: referral.referrerId,
            type: NOTIFICATION_TYPE.USER,
          });

          // Admin notification
          await sendNotifications({
            title: "Referral Reward Issued",
            text: `Passenger referral reward of ${referral.rewardAmount} paid to referrer ${referral.referrerId}.`,
            type: NOTIFICATION_TYPE.ADMIN,
          });
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          console.error(
            "Failed to process passenger referral wallet credit:",
            error,
          );
        }
      } else {
        referral.auditLogs.push({
          action: "LIMIT_EXCEEDED",
          details: {
            message: "Referrer user has reached passenger payout limits.",
          },
          timestamp: new Date(),
        });
      }
    }
  }

  await referral.save();
};

/**
 * Get dynamic referral program rules configured in System Config.
 */
const getRules = async (role: string) => {
  const config = await getSystemConfig();
  const lowerRole = role ? role.toLowerCase() : "user";

  if (lowerRole === "driver") {
    const dConf = config.referral?.driver;
    return {
      enabled: dConf?.enabled ?? true,
      rewardAmount: dConf?.rewardAmount ?? 100,
      currency: dConf?.rewardCurrency ?? "USD",
      requiredCompletedRides: dConf?.requiredCompletedTrips ?? 10,
      qualificationPeriod: `${dConf?.qualificationDays ?? 30} days`,
      payoutDelay: `${dConf?.payoutDelayHours ?? 0} hours`,
      rewardPayoutInformation:
        "Payout is directly processed into your connected Stripe wallet account.",
      shareInstructions:
        dConf?.shareInstructions ||
        "Send your unique referral code or link to experienced drivers in your community.",
      termsAndConditions:
        dConf?.termsAndConditions ||
        "The referred driver must register with your code and complete the trips within validity period.",
      generalNotes:
        dConf?.generalNotes ||
        "Referred drivers must satisfy standard verification protocols.",
    };
  } else {
    // default to user rules
    const pConf = config.referral?.passenger;
    return {
      enabled: pConf?.enabled ?? true,
      rewardAmount: pConf?.rewardAmount ?? 20,
      currency: pConf?.rewardCurrency ?? "USD",
      qualificationRequirements: `Satisfy qualification via ${pConf?.qualificationType ?? "rides"}.`,
      requiredCompletedTrips: pConf?.requiredCompletedTrips ?? 1,
      qualificationPeriod: `${pConf?.qualificationDays ?? 30} days`,
      maximumRewards: `${pConf?.maximumRewardsPerUser ?? 5} rewards`,
      shareInstructions:
        pConf?.shareInstructions ||
        "Share your unique referral code or link with friends who aren't on the platform yet.",
      rewardTerms:
        pConf?.rewardTerms ||
        "Once they sign up and complete their qualification rules, you receive the balance.",
      generalNotes:
        pConf?.generalNotes ||
        "Referral credits can be spent on ride bookings.",
    };
  }
};

/**
 * Get Passenger Referral Dashboard stats, share details, QR.
 */
const getUserReferralDashboard = async (userId: string) => {
  const referralCode = await getOrCreateReferralCode(userId);
  const config = await getSystemConfig();
  const pConf = config.referral?.passenger;

  const referrals = await Referral.find({
    referrerId: userId,
    referralType: "USER",
  });

  const totalInvited = referrals.length;
  const active = referrals.filter(
    (r) =>
      r.status === REFERRAL_STATUS.PENDING ||
      r.status === REFERRAL_STATUS.ACTIVE,
  ).length;
  const completed = referrals.filter(
    (r) => r.status === REFERRAL_STATUS.COMPLETED,
  ).length;

  const totalEarned = referrals
    .filter((r) => r.rewardPaid)
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const baseClientUrl = config.client_url || "https://alygo.com";
  const shareLink = `${baseClientUrl}/signup?ref=${referralCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}`;

  return {
    reward: pConf?.rewardAmount ?? 20,
    referralCode,
    shareLink,
    qrCodeUrl,
    statistics: {
      totalInvited,
      active,
      completed,
      totalEarned,
    },
  };
};

/**
 * Get Driver Referral Dashboard stats, share details, QR.
 */
const getDriverReferralDashboard = async (userId: string) => {
  const referralCode = await getOrCreateReferralCode(userId);
  const config = await getSystemConfig();

  const referrals = await Referral.find({
    referrerId: userId,
    referralType: "DRIVER",
  });

  const totalInvited = referrals.length;
  const active = referrals.filter(
    (r) =>
      r.status === REFERRAL_STATUS.ACTIVE ||
      r.status === REFERRAL_STATUS.PENDING,
  ).length;
  const completed = referrals.filter(
    (r) => r.status === REFERRAL_STATUS.COMPLETED,
  ).length;

  const pendingRewards = referrals
    .filter((r) => r.status === REFERRAL_STATUS.COMPLETED && !r.rewardPaid)
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const totalEarned = referrals
    .filter((r) => r.rewardPaid)
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const baseClientUrl = config.client_url || "https://alygo.com";
  const shareLink = `${baseClientUrl}/signup?ref=${referralCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}`;

  return {
    referralCode,
    shareLink,
    qrCodeUrl,
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
 * Get referred friends history for Passenger.
 */
const getUserHistory = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const baseQuery = Referral.find({
    referrerId: userId,
    referralType: "USER",
  }).populate("refereeId", "name profileImage verified createdAt");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["referralCode"])
    .filter()
    .sort()
    .paginate();

  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  const data = result.map((ref: any) => ({
    id: ref._id,
    friend: {
      name: ref.refereeId?.name || "Unknown Friend",
      profileImage: ref.refereeId?.profileImage || "",
    },
    joinedDate: ref.refereeId?.createdAt || ref.joinedAt,
    reward: ref.rewardAmount,
    status: ref.status,
  }));

  return { data, meta };
};

/**
 * Get referred drivers progress list.
 */
const getDriverProgressList = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const baseQuery = Referral.find({
    referrerId: userId,
    referralType: "DRIVER",
  }).populate("refereeId", "name profileImage verified createdAt");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["referralCode"])
    .filter()
    .sort()
    .paginate();

  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  const data = result.map((ref: any) => ({
    id: ref._id,
    driver: {
      name: ref.refereeId?.name || "Unknown Driver",
      profileImage: ref.refereeId?.profileImage || "",
    },
    joinedDate: ref.refereeId?.createdAt || ref.joinedAt,
    rideProgress: ref.qualificationProgress,
    requiredRideCount: ref.qualificationTarget,
    earnedReward:
      ref.status === REFERRAL_STATUS.COMPLETED ? ref.rewardAmount : 0,
    status: ref.status,
  }));

  return { data, meta };
};

/**
 * Get referral rewards payout logs history.
 */
const getRewardPayoutHistory = async (
  userId: string,
  role: string,
  query: Record<string, unknown>,
) => {
  const referralType =
    role.toUpperCase() === USER_ROLES.DRIVER ? "DRIVER" : "USER";

  const baseQuery = Referral.find({
    referrerId: userId,
    referralType,
    rewardPaid: true,
  }).populate("refereeId", "name profileImage");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .paginate();

  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  const data = result.map((ref: any) => ({
    id: ref._id,
    refereeName: ref.refereeId?.name || "Unknown Referee",
    amount: ref.rewardAmount,
    currency: ref.rewardCurrency,
    date: ref.rewardPaidAt || ref.updatedAt,
    transactionId: ref.rewardTransactionId,
    status: ref.rewardStatus,
  }));

  return { data, meta };
};

/**
 * Verify referral code and return referrer info.
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
  handleDriverRideCompletion,
  checkAndProcessPassengerReferral,
  getRules,
  getUserReferralDashboard,
  getDriverReferralDashboard,
  getUserHistory,
  getDriverProgressList,
  getRewardPayoutHistory,
  verifyReferralCode,
};
