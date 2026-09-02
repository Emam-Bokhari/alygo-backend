import { Types } from "mongoose";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import { Ride } from "../ride/ride.model";
import { Wallet } from "../wallet/wallet.model";
import { Payout } from "../payout/payout.model";
import { CancellationPolicy } from "../cancellationPolicy/cancellationPolicy.model";
import { FareConfiguration } from "../fareConfiguration/fareConfiguration.model";
import { Tier } from "../tier/tier.model";
import { DriverPointHistory } from "../tier/driverPointHistory.model";
import { TierHistory } from "../tier/tierHistory.model";
import { DriverDutyPolicy } from "../driverDutyPolicy/driverDutyPolicy.model";
import { Faq } from "../faq/faq.model";
import { EmergencyHelpline } from "../emergencyHelpline/emergencyHelpline.model";
import { LostFound } from "../lostAndFound/lostAndFound.model";
import { PeakHour } from "../peakHour/peakHour.model";
import { SurgeRule } from "../surgeRule/surgeRule.model";
import { RideCategory } from "../rideCategory/rideCategory.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { ServiceCategory } from "../serviceCategory/serviceCategory.model";
import { Transaction } from "../transaction/transaction.model";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { PAYMENT_STATUS } from "../ride/ride.constant";
import {
  IFunctionDeclaration,
  IToolExecutionContext,
  IToolExecutionResult,
} from "./aiTools.interface";

// =========================================================================
// 1. TOOL DECLARATIONS FOR GEMINI / LLM FUNCTION CALLING
// =========================================================================

export const AI_SUPPORT_TOOL_DECLARATIONS: IFunctionDeclaration[] = [
  {
    name: "get_driver_profile",
    description:
      "Get profile information of the authenticated driver, including approval status, account status, vehicle details, rating, and verified documents.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_driver_earnings_and_wallet",
    description:
      "Get the driver's available wallet balance, all-time total earnings, today's earnings, this week's earnings, this month's earnings, pending balance, and completed trips count.",
    parameters: {
      type: "OBJECT",
      properties: {
        timeframe: {
          type: "STRING",
          description:
            "Timeframe for earnings: 'today', 'week', 'month', or 'all'. Defaults to 'all'.",
          enum: ["today", "week", "month", "all"],
        },
      },
    },
  },
  {
    name: "get_driver_recent_rides",
    description:
      "Get the driver's recent ride history with pickup/destination addresses, ride status (completed, cancelled), total fare, date/time, and cancellation reason if cancelled.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: {
          type: "NUMBER",
          description:
            "Number of recent rides to fetch (1 to 10). Defaults to 5.",
        },
        status: {
          type: "STRING",
          description:
            "Optional filter by status: 'completed', 'cancelled', 'in_progress', or 'all'.",
          enum: ["completed", "cancelled", "in_progress", "all"],
        },
      },
    },
  },
  {
    name: "get_cancellation_policies",
    description:
      "Get platform cancellation policy details including driver cancellation fees, passenger cancellation compensation, cancellation time limits, and fee waivers.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_fare_and_surge_rates",
    description:
      "Get current fare configuration (base fare, per km rate, per minute rate, waiting fee, minimum fare) and active peak hours or surge pricing rules.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_driver_tier_and_points",
    description:
      "Get the driver's current reward tier status, total accumulated points, points required for next tier, and active tier benefits (e.g. priority dispatch, destination filters, bonus multipliers).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_driver_duty_policy",
    description:
      "Get platform driver duty and fatigue management policies, including maximum daily driving hours, continuous driving limits, and mandatory rest break requirements.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_platform_faqs",
    description:
      "Search and retrieve frequently asked questions (FAQs) and standard answers on the Alygo platform.",
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: {
          type: "STRING",
          description:
            "Optional search keyword to match specific FAQ topics.",
        },
      },
    },
  },
  {
    name: "get_emergency_helpline_and_support",
    description:
      "Get emergency helpline phone numbers, SMS text lines, and official support contact information for drivers.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_lost_and_found_info",
    description:
      "Get active lost and found reports related to the driver's trips, and platform guidelines on handling items left behind by passengers.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
];

// =========================================================================
// 2. CONCRETE DATABASE TOOL IMPLEMENTATIONS
// =========================================================================

const getDriverProfile = async (driverId: string) => {
  const user = await User.findById(driverId).select(
    "name email phone profileImage status role createdAt",
  );

  if (!user) {
    return { error: "Driver user account not found in database." };
  }

  const driver = await Driver.findOne({ userId: driverId }).select(
    "driverAvailabilityStatus approvalStatus verificationStatus rating totalRidesCompleted isStripeOnboarded drivingLicenseNumber",
  );

  let car = null;
  if (driver) {
    car = await Car.findOne({
      $or: [{ driverId: driver._id }, { driverId: user._id }],
    }).select("brand model year carType licensePlate color seatNumber");
  }

  return {
    driverName: user.name,
    email: user.email,
    phone: user.phone,
    accountStatus: user.status,
    availabilityStatus: driver?.driverAvailabilityStatus || "offline",
    approvalStatus: driver?.approvalStatus || "pending",
    stripeOnboarded: driver?.isStripeOnboarded ?? false,
    vehicle: car
      ? {
          brand: car.brand,
          model: car.model,
          year: car.year,
          carType: car.carType,
          licensePlate: car.licensePlate,
          color: (car as any).color,
          seats: car.seatNumber,
        }
      : "No vehicle registered",
  };
};

const getDriverEarningsAndWallet = async (
  driverId: string,
  args?: { timeframe?: "today" | "week" | "month" | "all" },
) => {
  const userObjectId = new Types.ObjectId(driverId);
  const driver = await Driver.findOne({ userId: userObjectId });

  // 1. Available Wallet Balance
  const wallet = await Wallet.findOne({ userId: userObjectId });
  const availableBalance = wallet ? wallet.balance : 0;
  const currency = wallet ? wallet.currency : "USD";

  // Match query for driver credit transactions (same as /driver/wallet summary)
  const baseEarningsQuery: any = {
    paymentStatus: PAYMENT_STATUS.PAID,
    transactionType: {
      $in: [
        TRANSACTION_TYPE.BOOKING_PAYMENT,
        TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
        TRANSACTION_TYPE.DRIVER_APPRECIATION,
        TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
        TRANSACTION_TYPE.DRIVER_REFERRAL_REWARD,
      ],
    },
    $or: [
      { userId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
    ],
  };

  // 2. All-Time Total Earnings
  const totalEarningsResult = await Transaction.aggregate([
    { $match: baseEarningsQuery },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalEarnings =
    totalEarningsResult.length > 0
      ? parseFloat(totalEarningsResult[0].total.toFixed(2))
      : 0;

  // 3. Timeframe-specific earnings
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Today Earnings
  const todayResult = await Transaction.aggregate([
    { $match: { ...baseEarningsQuery, createdAt: { $gte: todayStart } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const todayEarnings =
    todayResult.length > 0
      ? parseFloat(todayResult[0].total.toFixed(2))
      : 0;

  // This Week Earnings
  const weekResult = await Transaction.aggregate([
    { $match: { ...baseEarningsQuery, createdAt: { $gte: weekStart } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const thisWeekEarnings =
    weekResult.length > 0
      ? parseFloat(weekResult[0].total.toFixed(2))
      : 0;

  // This Month Earnings
  const monthResult = await Transaction.aggregate([
    { $match: { ...baseEarningsQuery, createdAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const thisMonthEarnings =
    monthResult.length > 0
      ? parseFloat(monthResult[0].total.toFixed(2))
      : 0;

  // 4. Pending Balance (Sum of pending credit transactions)
  const pendingQuery: any = {
    paymentStatus: PAYMENT_STATUS.PENDING,
    transactionType: {
      $in: [
        TRANSACTION_TYPE.BOOKING_PAYMENT,
        TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
        TRANSACTION_TYPE.DRIVER_APPRECIATION,
        TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
        TRANSACTION_TYPE.DRIVER_REFERRAL_REWARD,
      ],
    },
    $or: [
      { userId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
    ],
  };
  const pendingResult = await Transaction.aggregate([
    { $match: pendingQuery },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const pendingBalance =
    pendingResult.length > 0
      ? parseFloat(pendingResult[0].total.toFixed(2))
      : 0;

  // 5. Total Completed Trips Count
  const completedTripsCount = await Ride.countDocuments({
    driverId: userObjectId,
    status: "completed",
  });

  // 6. Pending Payout Requests
  const pendingPayouts = await Payout.find({
    userId: userObjectId,
    status: "pending",
  }).select("payoutId amount currency createdAt");

  return {
    availableBalance: parseFloat(availableBalance.toFixed(2)),
    totalEarnings,
    todayEarnings,
    thisWeekEarnings,
    thisMonthEarnings,
    pendingBalance,
    currency,
    completedTripsCount,
    pendingPayoutRequests: pendingPayouts.map((p) => ({
      payoutId: p.payoutId,
      amount: p.amount,
      currency: p.currency,
      requestedAt: p.createdAt,
    })),
  };
};

const getDriverRecentRides = async (
  driverId: string,
  args?: { limit?: number; status?: string },
) => {
  const limit = Math.min(Math.max(args?.limit || 5, 1), 10);
  const userObjectId = new Types.ObjectId(driverId);

  const query: any = { driverId: userObjectId };
  if (args?.status && args.status !== "all") {
    query.status = args.status;
  }

  const rides = await Ride.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "status pickup destination fare rideCategory cancelledBy cancellationReason paymentStatus createdAt",
    );

  if (rides.length === 0) {
    return {
      message: "No rides found for this driver matching the criteria.",
      totalFound: 0,
      rides: [],
    };
  }

  const formattedRides = rides.map((r: any) => ({
    rideId: r._id,
    status: r.status,
    pickupLocation: r.pickup?.address || "Pickup address",
    destinationLocation: r.destination?.address || "Destination address",
    category: r.rideCategory?.name || "Standard",
    fare:
      r.fare?.driverEarnings ??
      r.fare?.totalFare ??
      r.driverEarnings ??
      0,
    paymentStatus: r.paymentStatus,
    cancelledBy: r.cancelledBy || null,
    cancellationReason: r.cancellationReason || null,
    date: r.createdAt ? new Date(r.createdAt).toLocaleString() : null,
  }));

  return {
    totalFound: rides.length,
    rides: formattedRides,
  };
};

const getCancellationPolicies = async () => {
  const policies = await CancellationPolicy.find();

  if (!policies || policies.length === 0) {
    return {
      note: "Standard platform cancellation policy applies.",
      defaultPolicy: {
        passengerGracePeriodMinutes: 2,
        passengerCancellationFeeAfterDriverAcceptance: "$5.00",
        driverCancellationFeeWithoutPenalty: "Allowed before reaching pickup if emergency",
        driverRepeatedCancellationWarning: "Excessive cancellations may impact tier points and rating.",
      },
    };
  }

  return {
    policies: policies.map((p: any) => ({
      passengerRules: {
        beforeDriverAccepted: p.passenger?.beforeDriverAccepted,
        afterDriverAccepted: p.passenger?.afterDriverAccepted,
        afterDriverArrived: p.passenger?.afterDriverArrived,
      },
      driverRules: {
        beforePickup: p.driver?.beforePickup,
        afterArrival: p.driver?.afterArrival,
      },
    })),
  };
};

const getFareAndSurgeRates = async () => {
  if (!RideCategory) {
    // dummy check to ensure module is evaluated
  }
  const fareConfigs = await FareConfiguration.find()
    .populate({ path: "rideCategoryId", model: RideCategory })
    .limit(5);

  const peakHours = await PeakHour.find().limit(5);
  const surgeRules = await SurgeRule.find().limit(5);

  return {
    fareConfigurations: fareConfigs.map((fc: any) => ({
      categoryName: fc.rideCategoryId?.name || "Standard",
      baseFare: fc.baseFare,
      perKmFare: fc.perKmFare,
      perMinuteFare: fc.perMinuteFare,
      waitingFeePerMinute: fc.waitingFeePerMinute,
      minimumFare: fc.minimumFare,
    })),
    peakHours: peakHours.map((ph: any) => ({
      name: ph.name,
      startTime: ph.startTime,
      endTime: ph.endTime,
      multiplier: ph.multiplier,
      days: ph.days,
    })),
    surgeRules: surgeRules.map((sr: any) => ({
      name: sr.name,
      surgeMultiplier: sr.surgeMultiplier,
      isActive: sr.isActive,
    })),
  };
};

const getDriverTierAndPoints = async (driverId: string) => {
  const userObjectId = new Types.ObjectId(driverId);

  // Latest point history
  const latestPointDoc = await DriverPointHistory.findOne({
    driverId: userObjectId,
  }).sort({ createdAt: -1 });

  const currentPoints = latestPointDoc?.balanceAfter ?? latestPointDoc?.newBalance ?? 0;

  // Latest tier
  const tierHistory = await TierHistory.findOne({ driverId: userObjectId })
    .sort({ createdAt: -1 })
    .populate({ path: "newTierId", model: Tier });

  const allTiers = await Tier.find().sort({ level: 1 });

  const currentTierObj = (tierHistory?.newTierId as any) || allTiers[0];

  // Next tier calculation
  let nextTier = null;
  if (allTiers.length > 0 && currentTierObj) {
    const currentIndex = allTiers.findIndex(
      (t: any) => t._id.toString() === currentTierObj._id?.toString(),
    );
    if (currentIndex !== -1 && currentIndex < allTiers.length - 1) {
      nextTier = allTiers[currentIndex + 1];
    }
  }

  const nextTierPointsRequired = nextTier?.requirements?.pointsRequired || 0;

  return {
    currentTierName: currentTierObj?.name || "Standard Driver",
    currentLevel: currentTierObj?.level || 1,
    currentPoints,
    tierBenefits: currentTierObj?.benefits,
    nextTier: nextTier
      ? {
          name: nextTier.name,
          level: nextTier.level,
          pointsRequired: nextTierPointsRequired,
          pointsNeeded: Math.max(0, nextTierPointsRequired - currentPoints),
        }
      : "You have reached the highest tier!",
  };
};

const getDriverDutyPolicy = async () => {
  const policies = await DriverDutyPolicy.find().limit(5);

  if (policies.length === 0) {
    return {
      dutyPolicy: {
        maxDrivingHoursPerDay: 12,
        continuousDrivingLimitHours: 6,
        mandatoryRestBreakMinutes: 30,
        notes: "Drivers are required to take mandatory rest periods to prevent fatigue.",
      },
    };
  }

  return {
    policies: policies.map((p: any) => ({
      name: p.name,
      scope: p.scopeType,
      maxDrivingHoursPerDay: p.maxDrivingHoursPerDay,
      maxContinuousDrivingHours: p.maxContinuousDrivingHours,
      mandatoryRestBreakMinutes: p.mandatoryRestBreakMinutes,
    })),
  };
};

const getPlatformFaqs = async (args?: { keyword?: string }) => {
  let query: any = {};
  if (args?.keyword && args.keyword.trim().length > 0) {
    query = {
      $or: [
        { question: { $regex: args.keyword.trim(), $options: "i" } },
        { answer: { $regex: args.keyword.trim(), $options: "i" } },
      ],
    };
  }

  const faqs = await Faq.find(query).limit(10).select("question answer");

  return {
    totalFaqs: faqs.length,
    faqs: faqs.map((f: any) => ({
      question: f.question,
      answer: f.answer,
    })),
  };
};

const getEmergencyHelplineAndSupport = async () => {
  const helplines = await EmergencyHelpline.find().limit(5);

  return {
    emergencyHelplines: helplines.map((h: any) => ({
      callNumber: h.callNumber,
      textNumber: h.textNumber,
    })),
    supportChannels: {
      email: "support@alygo.com",
      inAppSupport: "24/7 AI Driver Support Assistant",
      safetyInstructions:
        "In case of immediate danger or life-threatening emergency, call local emergency services (911) immediately.",
    },
  };
};

const getLostAndFoundInfo = async (driverId: string) => {
  const userObjectId = new Types.ObjectId(driverId);

  // Find recent rides by this driver
  const driverRides = await Ride.find({ driverId: userObjectId })
    .sort({ createdAt: -1 })
    .limit(30)
    .select("_id");

  const rideIds = driverRides.map((r) => r._id);

  const lostReports = await LostFound.find({
    rideId: { $in: rideIds },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({ path: "rideId", model: Ride, select: "pickup destination createdAt" });

  return {
    activeReportsCount: lostReports.length,
    reports: lostReports.map((lr: any) => ({
      reportId: lr._id,
      itemDescription: lr.itemDescription || lr.title,
      reportStatus: lr.status || lr.reportStatus,
      rideDate: lr.rideId?.createdAt,
    })),
    guidelines:
      "If a passenger left an item in your vehicle, safely store the item and notify support or respond through the Lost & Found section of your app to arrange a safe return.",
  };
};

// =========================================================================
// 3. MAIN TOOL DISPATCHER
// =========================================================================

export const executeAiDatabaseTool = async (
  toolName: string,
  args: Record<string, any>,
  context: IToolExecutionContext,
): Promise<IToolExecutionResult> => {
  try {
    let data: any = null;

    switch (toolName) {
      case "get_driver_profile":
        data = await getDriverProfile(context.driverId);
        break;

      case "get_driver_earnings_and_wallet":
        data = await getDriverEarningsAndWallet(context.driverId, args);
        break;

      case "get_driver_recent_rides":
        data = await getDriverRecentRides(context.driverId, args);
        break;

      case "get_cancellation_policies":
        data = await getCancellationPolicies();
        break;

      case "get_fare_and_surge_rates":
        data = await getFareAndSurgeRates();
        break;

      case "get_driver_tier_and_points":
        data = await getDriverTierAndPoints(context.driverId);
        break;

      case "get_driver_duty_policy":
        data = await getDriverDutyPolicy();
        break;

      case "get_platform_faqs":
        data = await getPlatformFaqs(args);
        break;

      case "get_emergency_helpline_and_support":
        data = await getEmergencyHelplineAndSupport();
        break;

      case "get_lost_and_found_info":
        data = await getLostAndFoundInfo(context.driverId);
        break;

      default:
        return {
          toolName,
          success: false,
          data: null,
          error: `Tool '${toolName}' is not recognized or not supported.`,
        };
    }

    return {
      toolName,
      success: true,
      data,
    };
  } catch (error: any) {
    console.error(`[AI Database Tool Error] (${toolName}):`, error);
    return {
      toolName,
      success: false,
      data: null,
      error: error.message || "Failed to query database for tool.",
    };
  }
};

export const AiToolsService = {
  declarations: AI_SUPPORT_TOOL_DECLARATIONS,
  executeTool: executeAiDatabaseTool,
  getDriverProfile,
  getDriverEarningsAndWallet,
  getDriverRecentRides,
  getCancellationPolicies,
  getFareAndSurgeRates,
  getDriverTierAndPoints,
  getDriverDutyPolicy,
  getPlatformFaqs,
  getEmergencyHelplineAndSupport,
  getLostAndFoundInfo,
};
