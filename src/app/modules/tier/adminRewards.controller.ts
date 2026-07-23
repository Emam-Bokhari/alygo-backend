import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Driver } from "../driver/driver.model";
import { Tier } from "./tier.model";
import { PointRule } from "./pointRule.model";
import { DriverPointHistory } from "./driverPointHistory.model";
import { DestinationFilter } from "./destinationFilter.model";
import { TierHistory } from "./tierHistory.model";
import { PointsService } from "./points.service";
import QueryBuilder from "../../../app/builder/queryBuilder";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { getDailyResetThreshold } from "./points.controller";

/**
 * Admin Rewards Dashboard stats - GET /admin/rewards/dashboard
 */
const getAdminRewardsDashboard = catchAsync(async (req: Request, res: Response) => {
  // 1. Distribution of drivers across tiers
  const activeTiers = await Tier.find({ status: "active" as any });
  const distribution = [];
  
  for (const tier of activeTiers) {
    const count = await Driver.countDocuments({ currentTier: tier._id });
    distribution.push({
      tierId: tier._id,
      name: tier.name,
      level: tier.level,
      driverCount: count,
    });
  }

  // 2. Points statistics
  const totalAwardedHistory = await DriverPointHistory.aggregate([
    { $match: { points: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$points" } } }
  ]);
  const totalAwarded = totalAwardedHistory[0]?.total || 0;

  const totalDeductedHistory = await DriverPointHistory.aggregate([
    { $match: { points: { $lt: 0 } } },
    { $group: { _id: null, total: { $sum: "$points" } } }
  ]);
  const totalDeducted = Math.abs(totalDeductedHistory[0]?.total || 0);

  const driverStats = await Driver.aggregate([
    {
      $group: {
        _id: null,
        avgPoints: { $avg: "$currentPoints" },
        maxPoints: { $max: "$currentPoints" },
      }
    }
  ]);
  const averagePoints = Math.round(driverStats[0]?.avgPoints || 0);
  const maxPoints = driverStats[0]?.maxPoints || 0;

  // 3. Destination Filter usage
  const todayStart = await getDailyResetThreshold();
  const filtersActivatedToday = await DestinationFilter.countDocuments({
    activatedAt: { $gte: todayStart }
  });
  const activeFilters = await DestinationFilter.countDocuments({ status: "ACTIVE" });
  const completedFilters = await DestinationFilter.countDocuments({ status: "COMPLETED" });
  const cancelledFilters = await DestinationFilter.countDocuments({ status: "CANCELLED" });
  const expiredFilters = await DestinationFilter.countDocuments({ status: "EXPIRED" });

  // 4. Rankings: Top 10 / Lowest 10
  const topDrivers = await Driver.find({})
    .populate("currentTier", "name level")
    .populate("userId", "name email phone profileImage")
    .sort({ currentPoints: -1 })
    .limit(10);

  const lowestDrivers = await Driver.find({})
    .populate("currentTier", "name level")
    .populate("userId", "name email phone profileImage")
    .sort({ currentPoints: 1 })
    .limit(10);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin rewards dashboard stats retrieved successfully",
    data: {
      distribution,
      pointsStats: {
        totalAwarded,
        totalDeducted,
        averagePoints,
        maxPoints,
      },
      filterUsage: {
        activatedToday: filtersActivatedToday,
        activeCount: activeFilters,
        completedCount: completedFilters,
        cancelledCount: cancelledFilters,
        expiredCount: expiredFilters,
      },
      rankings: {
        topDrivers,
        lowestDrivers,
      }
    }
  });
});

/**
 * Export Driver Rewards Data as CSV - GET /admin/rewards/export
 */
const exportRewardsCSV = catchAsync(async (req: Request, res: Response) => {
  const drivers = await Driver.find({})
    .populate("currentTier", "name level")
    .populate("userId", "name email phone");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=driver_rewards_report.csv");

  let csvContent = "Name,Email,Phone,Current Tier,Current Points,Lifetime Points\n";

  for (const d of drivers) {
    const user: any = d.userId;
    const tier: any = d.currentTier;
    const name = user?.name ? `"${user.name.replace(/"/g, '""')}"` : "N/A";
    const email = user?.email || "N/A";
    const phone = user?.phone || "N/A";
    const tierName = tier?.name || "N/A";
    const currentPoints = d.currentPoints || 0;
    const lifetimePoints = d.lifetimePoints || 0;

    csvContent += `${name},${email},${phone},${tierName},${currentPoints},${lifetimePoints}\n`;
  }

  res.status(StatusCodes.OK).send(csvContent);
});

/**
 * Manual override driver points balance - POST /admin/rewards/override-points
 */
const overrideDriverPoints = catchAsync(async (req: Request, res: Response) => {
  const { driverUserId, points, notes } = req.body;
  const adminUserId = req.user.id;

  if (!driverUserId || points === undefined) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "driverUserId and points are required");
  }

  const driver = await Driver.findOne({ userId: driverUserId });
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
  }

  const change = points - (driver.currentPoints || 0);

  // We can treat this override as an award or deduction
  if (change > 0) {
    await PointsService.awardPoints(
      driverUserId,
      "admin_override",
      "admin",
      undefined,
      { notes: notes || `Admin Manual override added ${change} points` }
    );
  } else if (change < 0) {
    await PointsService.deductPoints(
      driverUserId,
      "admin_override",
      "admin",
      undefined,
      { notes: notes || `Admin Manual override deducted ${Math.abs(change)} points` }
    );
  }

  // Set explicit override target
  driver.currentPoints = points;
  await driver.save();

  // Recheck progression and downgrades
  await PointsService.checkDriverTierProgression(driverUserId);
  await PointsService.checkDriverTierDowngrade(driverUserId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Driver points manual override to ${points} processed successfully`,
    data: driver,
  });
});

/**
 * Manual override driver Tier - POST /admin/rewards/override-tier
 */
const overrideDriverTier = catchAsync(async (req: Request, res: Response) => {
  const { driverUserId, tierId, reason } = req.body;

  if (!driverUserId || !tierId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "driverUserId and tierId are required");
  }

  const driver = await Driver.findOne({ userId: driverUserId });
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
  }

  const tier = await Tier.findById(tierId);
  if (!tier) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Target Tier not found");
  }

  const oldTierId = driver.currentTier;
  driver.currentTier = tier._id as any;
  driver.tierAchievedAt = new Date();

  // If points are below target tier requirements, automatically elevate points to match requirements
  if ((driver.currentPoints || 0) < tier.requirements.pointsRequired) {
    driver.currentPoints = tier.requirements.pointsRequired;
  }

  // Update next tier details
  const activeTiers = await Tier.find({ status: "active" as any }).sort({ level: 1 });
  const nextTier = activeTiers.find((t) => t.level === tier.level + 1) || null;
  driver.nextTier = nextTier ? nextTier._id : null;
  
  if (nextTier) {
    driver.progressPercentage = Math.min(
      99,
      Math.round(((driver.currentPoints || 0) / nextTier.requirements.pointsRequired) * 100),
    );
  } else {
    driver.progressPercentage = 100;
  }

  await driver.save();

  // Create log history
  await TierHistory.create({
    driverId: new Types.ObjectId(driverUserId),
    oldTierId: oldTierId || null,
    newTierId: tier._id,
    points: driver.currentPoints || 0,
    reason: reason || "Manual Admin Tier Override",
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Manual override to ${tier.name} Tier completed successfully`,
    data: driver,
  });
});

/**
 * CRUD Point Rules - POST /admin/rewards/point-rules
 */
const createPointRule = catchAsync(async (req: Request, res: Response) => {
  const result = await PointRule.create(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Point rule created successfully",
    data: result,
  });
});

/**
 * CRUD Point Rules - GET /admin/rewards/point-rules
 */
const getPointRules = catchAsync(async (req: Request, res: Response) => {
  const query = new QueryBuilder(PointRule.find({}), req.query)
    .search(["name", "eventType"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await query.modelQuery;
  const meta = await query.countTotal();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Point rules retrieved successfully",
    data,
    meta,
  });
});

/**
 * CRUD Point Rules - PATCH /admin/rewards/point-rules/:id
 */
const updatePointRule = catchAsync(async (req: Request, res: Response) => {
  const result = await PointRule.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Point rule not found");
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Point rule updated successfully",
    data: result,
  });
});

/**
 * CRUD Point Rules - DELETE /admin/rewards/point-rules/:id
 */
const deletePointRule = catchAsync(async (req: Request, res: Response) => {
  const result = await PointRule.findByIdAndDelete(req.params.id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Point rule not found");
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Point rule deleted successfully",
    data: result,
  });
});

export const AdminRewardsController = {
  getAdminRewardsDashboard,
  exportRewardsCSV,
  overrideDriverPoints,
  overrideDriverTier,
  createPointRule,
  getPointRules,
  updatePointRule,
  deletePointRule,
};
