import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Driver } from "../driver/driver.model";
import { Tier } from "./tier.model";
import { PointRule } from "./pointRule.model";
import { DriverPointHistory } from "./driverPointHistory.model";
import { DestinationFilter } from "./destinationFilter.model";
import QueryBuilder from "../../../app/builder/queryBuilder";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { Types } from "mongoose";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { DateTime } from "luxon";

/**
 * Helper to get the daily reset threshold date based on configuration
 */
export const getDailyResetThreshold = async (
  timezone?: string,
): Promise<Date> => {
  const config = await getSystemConfig();
  const resetTimeStr = config.driverRewards?.dailyQuotaResetTime || "00:00";
  const configuredTimezone =
    timezone || config.driverRewards?.timezone || "Asia/Dhaka";
  const [hours, minutes] = resetTimeStr.split(":").map(Number);

  let nowInZone = DateTime.now().setZone(configuredTimezone);
  if (!nowInZone.isValid) {
    nowInZone = DateTime.now().setZone("Asia/Dhaka");
  }

  let resetTimeInZone = nowInZone.set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });

  if (nowInZone < resetTimeInZone) {
    resetTimeInZone = resetTimeInZone.minus({ days: 1 });
  }

  return resetTimeInZone.toJSDate();
};

/**
 * Driver Dashboard API - GET /driver/tier/dashboard
 */
const getDriverTierDashboard = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user.id;

    // 1. Fetch driver profile with populated currentTier and nextTier
    let driver = await Driver.findOne({ userId: driverUserId })
      .populate("currentTier")
      .populate("nextTier");

    // In case tier fields are not initialized yet, let's fix them
    if (driver && !driver.currentTier) {
      const defaultTier = await Tier.findOne({ level: 1 });
      if (defaultTier) {
        driver.currentTier = defaultTier._id as any;
        await driver.save();
        driver = await Driver.findOne({ userId: driverUserId })
          .populate("currentTier")
          .populate("nextTier");
      }
    }

    if (!driver) {
      return sendResponse(res, {
        statusCode: StatusCodes.NOT_FOUND,
        success: false,
        message: "Driver profile not found",
      });
    }

    const currentTier: any = driver.currentTier;
    const nextTier: any = driver.nextTier;
    const currentPoints = driver.currentPoints || 0;
    const lifetimePoints = driver.lifetimePoints || 0;

    // 2. Fetch all active tiers (Level Milestones)
    const activeTiers = await Tier.find({ status: "active" as any }).sort({
      level: 1,
    });
    const levelMilestones = activeTiers.map((t) => {
      const isUnlocked = currentTier
        ? currentPoints >= t.requirements.pointsRequired
        : false;
      return {
        tierId: t._id,
        name: t.name,
        level: t.level,
        pointsRequired: t.requirements.pointsRequired,
        isUnlocked,
      };
    });

    // 3. Calculate remaining points for next tier
    const remainingPoints = nextTier
      ? Math.max(0, nextTier.requirements.pointsRequired - currentPoints)
      : 0;

    // Get driver's service area for timezone-aware date calculations
    const systemConfig = await getSystemConfig();
    const defaultTimezone =
      systemConfig.driverRewards?.timezone || "Asia/Dhaka";
    let driverTimezone = defaultTimezone;
    if (driver?.serviceAreaId) {
      const serviceArea = await ServiceArea.findById(driver.serviceAreaId);
      driverTimezone = serviceArea?.timezone || defaultTimezone;
    }

    // 4. Calculate today's points
    const todayStart = await getDailyResetThreshold(driverTimezone);
    const todaysPointsHistory = await DriverPointHistory.find({
      driverId: driverUserId,
      createdAt: { $gte: todayStart },
      points: { $gt: 0 },
    });
    const todaysPoints = todaysPointsHistory.reduce(
      (sum, h) => sum + h.points,
      0,
    );

    // 5. Get recent point history
    const recentPointHistory = await DriverPointHistory.find({
      driverId: driverUserId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // 6. Calculate destination filters remaining quota
    let dailyLimit = 0;
    if (currentTier?.benefits?.destinationFilter?.enabled) {
      dailyLimit = currentTier.benefits.destinationFilter.dailyLimit || 0;
    }
    const filtersActivatedToday = await DestinationFilter.countDocuments({
      driverId: driverUserId,
      activatedAt: { $gte: todayStart },
    });
    const destinationFiltersRemaining = Math.max(
      0,
      dailyLimit - filtersActivatedToday,
    );

    // 7. Get active filter if exists
    const activeFilter = await DestinationFilter.findOne({
      driverId: driverUserId,
      status: "ACTIVE",
    });

    const dashboardData = {
      currentTier: currentTier
        ? {
            _id: currentTier._id,
            name: currentTier.name,
            code: currentTier.code,
            level: currentTier.level,
            requirements: currentTier.requirements,
          }
        : null,
      currentPoints,
      nextTier: nextTier
        ? {
            _id: nextTier._id,
            name: nextTier.name,
            level: nextTier.level,
            pointsRequired: nextTier.requirements.pointsRequired,
          }
        : null,
      progressPercentage: driver.progressPercentage || 0,
      levelMilestones,
      remainingPoints,
      currentBenefits: currentTier?.benefits || null,
      destinationFiltersRemaining,
      activeFilter,
      todaysPoints,
      lifetimePoints,
      recentPointHistory,
    };

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver reward dashboard retrieved successfully",
      data: dashboardData,
    });
  },
);

/**
 * Driver Point History API - GET /driver/points/history
 */
const getDriverPointsHistory = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user.id;
    const { eventType, startDate, endDate } = req.query;

    const filterQuery: any = { driverId: driverUserId };

    if (eventType) {
      filterQuery.eventType = eventType;
    }

    if (startDate || endDate) {
      filterQuery.createdAt = {};
      if (startDate) {
        filterQuery.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filterQuery.createdAt.$lte = new Date(endDate as string);
      }
    }

    const searchableFields = ["notes", "eventType", "source"];

    const historyQuery = new QueryBuilder(
      DriverPointHistory.find(filterQuery),
      req.query,
    )
      .search(searchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();

    const data = await historyQuery.modelQuery;
    const meta = await historyQuery.countTotal();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver point history retrieved successfully",
      data,
      meta,
    });
  },
);

/**
 * Driver Point Rules API - GET /driver/points/rules
 */
const getDriverPointRules = catchAsync(async (req: Request, res: Response) => {
  const rules = await PointRule.find({ status: "active" as any }).sort({
    points: -1,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active point rules retrieved successfully",
    data: rules,
  });
});

/**
 * Tier Benefits API - GET /driver/tier/benefits
 */
const getDriverTierBenefits = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user.id;

    const driver = await Driver.findOne({ userId: driverUserId }).populate(
      "currentTier",
    );
    if (!driver) {
      return sendResponse(res, {
        statusCode: StatusCodes.NOT_FOUND,
        success: false,
        message: "Driver profile not found",
      });
    }

    const currentTier: any = driver.currentTier;
    const activeTiers = await Tier.find({ status: "active" as any }).sort({
      level: 1,
    });

    const benefitsData = activeTiers.map((tier) => {
      const isUnlocked = currentTier
        ? (driver.currentPoints || 0) >= tier.requirements.pointsRequired
        : false;
      return {
        tierId: tier._id,
        name: tier.name,
        level: tier.level,
        requirements: tier.requirements,
        benefits: tier.benefits,
        isUnlocked,
      };
    });

    const remainingPoints = driver.nextTier
      ? await Tier.findById(driver.nextTier).then((t) =>
          t
            ? Math.max(
                0,
                t.requirements.pointsRequired - (driver.currentPoints || 0),
              )
            : 0,
        )
      : 0;

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Tier benefits list retrieved successfully",
      data: {
        currentTier: currentTier
          ? {
              _id: currentTier._id,
              name: currentTier.name,
              level: currentTier.level,
            }
          : null,
        currentPoints: driver.currentPoints || 0,
        remainingPoints,
        benefits: benefitsData,
      },
    });
  },
);

export const PointsController = {
  getDriverTierDashboard,
  getDriverPointsHistory,
  getDriverPointRules,
  getDriverTierBenefits,
};
