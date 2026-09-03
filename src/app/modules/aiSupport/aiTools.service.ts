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
      "Get profile information of the authenticated driver, including approval status, account status, vehicle details (brand, model, plate, color, seats), rating, review count, reward points, and verified documents.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_driver_earnings_and_wallet",
    description:
      "Get the driver's available wallet balance, all-time total earnings, today's earnings, this week's earnings, this month's earnings, pending balance, completed trips count, currency, and payout requests.",
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
      "Get the driver's recent ride history with pickup/destination addresses, ride status (completed, cancelled, etc.), total fare charged to passenger, driver's net earning, breakdown of base fare, distance fare, time fare, commission, payment method, payment status, cancellation details, and date/time.",
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
      "Get platform cancellation policy rules for both passengers and drivers, including cancellation fees, platform share, driver compensation, after-acceptance fees, and excessive cancellation thresholds.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_fare_and_surge_rates",
    description:
      "Get current fare configuration (base fare, per km rate, per minute rate, waiting fee, minimum fare) and active peak hours or surge pricing rules with multipliers.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_driver_tier_and_points",
    description:
      "Get the driver's current reward tier status, current points, lifetime points, progress percentage, next tier requirements, and active tier benefits (e.g. priority dispatch, destination filters, bonus multipliers).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "get_driver_duty_policy",
    description:
      "Get platform driver duty and fatigue management policies (maximum driving hours per day, continuous driving limit, break duration in minutes, break after hours, minimum rest hours).",
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
      "Get lost and found item reports related to the driver's trips, report numbers, item descriptions, return status, delivery fee, and return guidelines.",
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
  const userObjectId = new Types.ObjectId(driverId);
  const user = await User.findById(userObjectId).select(
    "name email phone profileImage status role createdAt",
  );

  if (!user) {
    return { error: "Driver user account not found in database." };
  }

  const driver = await Driver.findOne({
    $or: [{ userId: userObjectId }, { _id: userObjectId }],
  }).select(
    "driverAvailabilityStatus approvalStatus verificationStatus averageRating totalRatings totalReviews currentPoints lifetimePoints isStripeOnboarded drivingLicenseNumber documentsStatus",
  );

  let car = null;
  if (driver) {
    car = await Car.findOne({
      $or: [{ driverId: driver._id }, { driverId: user._id }],
    }).select("brand model year carType licensePlate color seatNumber");
  }

  const completedTripsCount = await Ride.countDocuments({
    $or: [
      { driverId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
    ],
    status: "completed",
  });

  return {
    driverName: user.name,
    email: user.email,
    phone: user.phone,
    accountStatus: user.status,
    availabilityStatus: driver?.driverAvailabilityStatus || "offline",
    approvalStatus: driver?.approvalStatus || "pending",
    rating: driver?.averageRating ?? 5.0,
    totalRatings: driver?.totalRatings ?? 0,
    totalReviews: driver?.totalReviews ?? 0,
    currentPoints: driver?.currentPoints ?? 0,
    lifetimePoints: driver?.lifetimePoints ?? 0,
    completedTripsCount,
    stripeOnboarded: driver?.isStripeOnboarded ?? false,
    licenseNumber: driver?.drivingLicenseNumber || "Not provided",
    vehicle: car
      ? {
          brand: car.brand,
          model: car.model,
          year: car.year,
          carType: car.carType,
          licensePlate: car.licensePlate,
          color: (car as any).color || "N/A",
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
  const driver = await Driver.findOne({
    $or: [{ userId: userObjectId }, { _id: userObjectId }],
  });

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
    $or: [
      { driverId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
    ],
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
    stripeConnected: driver ? !!(driver.isStripeOnboarded) : false,
    canWithdraw: availableBalance > 0 && !!(driver?.isStripeOnboarded),
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
  const driver = await Driver.findOne({
    $or: [{ userId: userObjectId }, { _id: userObjectId }],
  });

  const query: any = {
    $or: [
      { driverId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
    ],
  };

  if (args?.status && args.status !== "all") {
    if (args.status === "in_progress") {
      query.status = { $in: ["accepted", "driver_arrived", "in_progress"] };
    } else {
      query.status = args.status;
    }
  }

  const rides = await Ride.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "status pickup stops destination routeInfo fare rideCategory cancellation payment requestedAt acceptedAt arrivedAt startedAt completedAt createdAt rideType",
    );

  if (rides.length === 0) {
    return {
      message: "No rides found for this driver matching the criteria.",
      totalFound: 0,
      rides: [],
    };
  }

  const formattedRides = rides.map((r: any) => {
    const totalFare = parseFloat(
      (r.fare?.total ?? r.fare?.subtotal ?? 0).toFixed(2),
    );
    const driverEarning = parseFloat(
      (r.fare?.driverEarning ?? 0).toFixed(2),
    );
    const baseFare = parseFloat((r.fare?.baseFare ?? 0).toFixed(2));
    const distanceFare = parseFloat((r.fare?.distanceFare ?? 0).toFixed(2));
    const timeFare = parseFloat((r.fare?.timeFare ?? 0).toFixed(2));
    const commission = parseFloat((r.fare?.commission ?? 0).toFixed(2));
    const discount = parseFloat((r.fare?.discount ?? 0).toFixed(2));
    const cancellationFee = parseFloat(
      (
        r.cancellation?.cancellationFee ??
        r.fare?.cancellationFee ??
        0
      ).toFixed(2),
    );
    const driverCompensation = parseFloat(
      (r.cancellation?.driverCompensation ?? 0).toFixed(2),
    );

    return {
      rideId: r._id,
      status: r.status,
      rideType: r.rideType || "on_demand",
      category: r.rideCategory?.name || "Standard",
      pickupLocation: r.pickup?.address || "Pickup address",
      destinationLocation: r.destination?.address || "Destination address",
      stops: r.stops?.map((s: any) => s.address) || [],
      distanceKm: r.routeInfo?.totalDistanceKm ?? 0,
      durationMinutes: r.routeInfo?.totalDurationMinutes ?? 0,
      totalFare,
      driverEarning,
      fareBreakdown: {
        totalFare,
        driverEarning,
        baseFare,
        distanceFare,
        timeFare,
        commission,
        discount,
        cancellationFee,
        driverCompensation,
      },
      payment: {
        method: r.payment?.method || "cash",
        status: r.payment?.status || "pending",
        paidAt: r.payment?.paidAt || null,
      },
      cancellation: r.cancellation
        ? {
            cancelledBy: r.cancellation.cancelledBy || null,
            cancellationReason: r.cancellation.cancellationReasonName || null,
            cancellationFee,
            driverCompensation,
            cancelledAt: r.cancellation.cancelledAt || null,
          }
        : null,
      date: r.createdAt ? new Date(r.createdAt).toLocaleString() : null,
      completedAt: r.completedAt
        ? new Date(r.completedAt).toLocaleString()
        : null,
    };
  });

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
        driverRepeatedCancellationWarning:
          "Excessive cancellations may impact tier points and rating.",
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
        afterAccept: p.driver?.afterAccept,
        excessiveCancellation: p.driver?.excessiveCancellation,
        excessiveCancellationThreshold: p.driver?.excessiveCancellationThreshold,
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
    .limit(10);

  const peakHours = await PeakHour.find().limit(10);
  const surgeRules = await SurgeRule.find().limit(10);

  return {
    fareConfigurations: fareConfigs.map((fc: any) => ({
      categoryName: fc.rideCategoryId?.name || "Standard",
      baseFare: fc.baseFare,
      perKmFare: fc.perKmFare,
      perMinuteFare: fc.perMinuteFare,
      waitingFeePerMinute: fc.waitingFeePerMinute,
      minimumFare: fc.minimumFare,
      status: fc.status,
    })),
    peakHours: peakHours.map((ph: any) => ({
      name: ph.name,
      startTime: ph.startTime,
      endTime: ph.endTime,
      timezone: ph.timezone,
      applicableDays: ph.applicableDays,
      status: ph.status,
    })),
    surgeRules: surgeRules.map((sr: any) => ({
      ruleName: sr.ruleName,
      ruleType: sr.ruleType,
      minMultiplier: sr.minMultiplier,
      maxMultiplier: sr.maxMultiplier,
      demandThreshold: sr.demandThreshold,
      supplyThreshold: sr.supplyThreshold,
      status: sr.status,
    })),
  };
};

const getDriverTierAndPoints = async (driverId: string) => {
  const userObjectId = new Types.ObjectId(driverId);
  const driver = await Driver.findOne({
    $or: [{ userId: userObjectId }, { _id: userObjectId }],
  })
    .populate("currentTier")
    .populate("nextTier");

  // Latest point history
  const latestPointDoc = await DriverPointHistory.findOne({
    $or: [
      { driverId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
    ],
  }).sort({ createdAt: -1 });

  const currentPoints =
    driver?.currentPoints ??
    latestPointDoc?.balanceAfter ??
    latestPointDoc?.newBalance ??
    0;
  const lifetimePoints = driver?.lifetimePoints ?? currentPoints;

  const allTiers = await Tier.find().sort({ level: 1 });
  let currentTierObj = (driver?.currentTier as any) || allTiers[0];
  let nextTierObj = driver?.nextTier as any;

  if (!nextTierObj && allTiers.length > 0 && currentTierObj) {
    const currentIndex = allTiers.findIndex(
      (t: any) => t._id.toString() === currentTierObj._id?.toString(),
    );
    if (currentIndex !== -1 && currentIndex < allTiers.length - 1) {
      nextTierObj = allTiers[currentIndex + 1];
    }
  }

  const nextTierPointsRequired =
    nextTierObj?.requirements?.pointsRequired || 0;

  return {
    currentTierName: currentTierObj?.name || "Standard Driver",
    currentLevel: currentTierObj?.level || 1,
    currentPoints,
    lifetimePoints,
    progressPercentage: driver?.progressPercentage || 0,
    tierBenefits: currentTierObj?.benefits,
    tierRequirements: currentTierObj?.requirements,
    nextTier: nextTierObj
      ? {
          name: nextTierObj.name,
          level: nextTierObj.level,
          pointsRequired: nextTierPointsRequired,
          pointsNeeded: Math.max(0, nextTierPointsRequired - currentPoints),
          benefits: nextTierObj.benefits,
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
        maxContinuousDrivingHours: 6,
        breakAfterHours: 4,
        breakDurationMinutes: 30,
        minimumRestHours: 8,
        notes:
          "Drivers are required to take mandatory rest periods to prevent fatigue.",
      },
    };
  }

  return {
    policies: policies.map((p: any) => ({
      name: p.name,
      scopeType: p.scopeType,
      maxDrivingHoursPerDay: p.maxDrivingHoursPerDay,
      maxContinuousDrivingHours: p.maxContinuousDrivingHours,
      breakAfterHours: p.breakAfterHours,
      breakDurationMinutes: p.breakDurationMinutes,
      maxTripsPerDay: p.maxTripsPerDay,
      minimumRestHours: p.minimumRestHours,
      status: p.status,
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
  const driver = await Driver.findOne({
    $or: [{ userId: userObjectId }, { _id: userObjectId }],
  });

  // Find recent rides by this driver
  const driverRides = await Ride.find({
    $or: [
      { driverId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("_id");

  const rideIds = driverRides.map((r) => r._id);

  const lostReports = await LostFound.find({
    $or: [
      { driverId: userObjectId },
      ...(driver ? [{ driverId: driver._id }] : []),
      { rideId: { $in: rideIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate({
      path: "rideId",
      model: Ride,
      select: "pickup destination createdAt fare",
    });

  return {
    activeReportsCount: lostReports.length,
    reports: lostReports.map((lr: any) => ({
      reportId: lr._id,
      reportNumber: lr.reportNumber,
      itemName: lr.itemName,
      itemDescription: lr.itemDescription,
      reportStatus: lr.reportStatus,
      foundStatus: lr.foundStatus,
      recoveryMethod: lr.recoveryMethod,
      deliveryFee: lr.deliveryFee,
      rideDate: lr.rideId?.createdAt,
      pickupLocation: lr.rideId?.pickup?.address,
      destinationLocation: lr.rideId?.destination?.address,
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