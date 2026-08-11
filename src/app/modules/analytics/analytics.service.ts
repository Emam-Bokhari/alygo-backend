import { Types } from "mongoose";
import { DateTime } from "luxon";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Ride } from "../ride/ride.model";
import { Transaction } from "../transaction/transaction.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { DRIVER_STATUS, STATUS, USER_ROLES } from "../../../enums/user";
import { PAYMENT_STATUS, RIDE_STATUS, RIDE_TYPE } from "../ride/ride.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { getDayRangeInTimezone } from "../../../shared/timezoneHelper";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import config from "../../../config";
import {
  IAnalyticsQuery,
  IOverviewData,
  IDriverGrowthData,
  IPassengerGrowthData,
  IRevenueTrendData,
  IDemandByHourData,
} from "./analytics.interface";

const MONTH_ORDER: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Sept: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

const resolveAnalyticsTimezone = async (
  serviceAreaId?: string,
  timezone?: string,
): Promise<string> => {
  if (timezone) {
    return timezone;
  }
  if (serviceAreaId) {
    const serviceArea = await ServiceArea.findById(serviceAreaId);
    if (serviceArea?.timezone) {
      return serviceArea.timezone;
    }
  }
  const systemConfig = await getSystemConfig();
  return (
    systemConfig.driverRewards?.timezone ||
    config.driverRewards?.timezone ||
    (process.env.TIMEZONE as string) ||
    "Asia/Dhaka"
  );
};

const getDateRangeForFilter = async (
  filter?: string,
  startDate?: string,
  endDate?: string,
  timezone?: string,
): Promise<{ start: Date; end: Date } | null> => {
  if (!filter) return null;
  const tz = timezone || "UTC";
  const nowInTz = DateTime.now().setZone(tz);

  switch (filter) {
    case "today":
      return getDayRangeInTimezone("today", tz);
    case "yesterday":
      return getDayRangeInTimezone("yesterday", tz);
    case "last7days":
      return {
        start: nowInTz.minus({ days: 6 }).startOf("day").toUTC().toJSDate(),
        end: nowInTz.endOf("day").toUTC().toJSDate(),
      };
    case "last30days":
      return {
        start: nowInTz.minus({ days: 29 }).startOf("day").toUTC().toJSDate(),
        end: nowInTz.endOf("day").toUTC().toJSDate(),
      };
    case "thisMonth":
      return {
        start: nowInTz.startOf("month").toUTC().toJSDate(),
        end: nowInTz.endOf("month").toUTC().toJSDate(),
      };
    case "lastMonth":
      return {
        start: nowInTz.minus({ months: 1 }).startOf("month").toUTC().toJSDate(),
        end: nowInTz.minus({ months: 1 }).endOf("month").toUTC().toJSDate(),
      };
    case "thisYear":
      return {
        start: nowInTz.startOf("year").toUTC().toJSDate(),
        end: nowInTz.endOf("year").toUTC().toJSDate(),
      };
    case "custom":
      if (startDate && endDate) {
        const customStart = DateTime.fromISO(startDate, { zone: tz }).startOf("day");
        const customEnd = DateTime.fromISO(endDate, { zone: tz }).endOf("day");
        return {
          start: customStart.toUTC().toJSDate(),
          end: customEnd.toUTC().toJSDate(),
        };
      }
      return null;
    default:
      return null;
  }
};

const getOverviewFromDB = async (query: IAnalyticsQuery): Promise<IOverviewData> => {
  const tz = await resolveAnalyticsTimezone(query.serviceAreaId, query.timezone);
  const nowInTz = DateTime.now().setZone(tz);

  const { start: startOfToday, end: endOfToday } = getDayRangeInTimezone("today", tz);
  const startOfMonth = nowInTz.startOf("month").toUTC().toJSDate();
  const endOfMonth = nowInTz.endOf("month").toUTC().toJSDate();
  const startOfWeek = nowInTz.startOf("week").toUTC().toJSDate();
  const endOfWeek = nowInTz.endOf("week").toUTC().toJSDate();

  // Basic Match stage filters
  const driverMatch: any = { approvalStatus: DRIVER_STATUS.APPROVED };
  const userMatch: any = { role: USER_ROLES.USER, status: STATUS.ACTIVE };
  const rideMatch: any = {};
  const transactionMatch: any = { paymentStatus: PAYMENT_STATUS.PAID };

  if (query.serviceAreaId) {
    const areaId = new Types.ObjectId(query.serviceAreaId);
    driverMatch.serviceAreaId = areaId;
    rideMatch.serviceAreaId = areaId;
    transactionMatch.serviceAreaId = areaId; // transaction doesn't have serviceAreaId directly, but we can look it up if needed.
  }

  const [
    totalDriversResult,
    totalPassengers,
    activeTrips,
    scheduledRides,
    activeReservations,
    completedTripsToday,
    revenueThisMonthResult,
    matchingStats,
    completionStats,
    revenueTrendResult,
    demandTrendResult,
  ] = await Promise.all([
    // 1. Total Drivers (approved, active, non-deleted)
    Driver.aggregate([
      { $match: driverMatch },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": USER_ROLES.DRIVER,
          "user.status": STATUS.ACTIVE,
          "user.isDeleted": { $ne: true },
        },
      },
      { $count: "count" },
    ]),

    // 2. Total Passengers (active, non-deleted)
    User.countDocuments(userMatch),

    // 3. Active Trips (accepted, on the way, arrived, started)
    Ride.countDocuments({
      ...rideMatch,
      status: {
        $in: [
          RIDE_STATUS.DRIVER_ACCEPTED,
          RIDE_STATUS.DRIVER_ON_THE_WAY,
          RIDE_STATUS.DRIVER_ARRIVED,
          RIDE_STATUS.STARTED,
        ],
      },
    }),

    // 4. Scheduled Rides (future scheduled rides, not completed/cancelled/expired)
    Ride.countDocuments({
      ...rideMatch,
      rideType: RIDE_TYPE.SCHEDULED,
      scheduledAt: { $gt: new Date() },
      status: {
        $nin: [
          RIDE_STATUS.COMPLETED,
          RIDE_STATUS.CANCELLED,
          RIDE_STATUS.CANCELLED_BY_USER,
          RIDE_STATUS.CANCELLED_BY_DRIVER,
          RIDE_STATUS.EXPIRED,
        ],
      },
    }),

    // 5. Active Reservations (scheduled and reservationStatus = confirmed, future)
    Ride.countDocuments({
      ...rideMatch,
      rideType: RIDE_TYPE.SCHEDULED,
      reservationStatus: "confirmed",
      scheduledAt: { $gt: new Date() },
    }),

    // 6. Completed Trips Today
    Ride.countDocuments({
      ...rideMatch,
      status: RIDE_STATUS.COMPLETED,
      completedAt: { $gte: startOfToday, $lte: endOfToday },
    }),

    // 7. Revenue This Month
    Transaction.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $project: {
          revenue: {
            $cond: [
              { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
              { $ifNull: ["$commission", 0] },
              {
                $cond: [
                  { $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_FEE] },
                  "$amount",
                  {
                    $cond: [
                      { $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_COMPENSATION] },
                      { $subtract: [0, "$amount"] },
                      0,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$revenue" },
        },
      },
    ]),

    // 8. Acceptance Rate stats (for current month)
    Ride.aggregate([
      {
        $match: {
          ...rideMatch,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $project: { notifiedDrivers: "$driverMatching.notifiedDrivers" } },
      { $unwind: "$notifiedDrivers" },
      {
        $group: {
          _id: null,
          offered: { $sum: 1 },
          accepted: {
            $sum: {
              $cond: [{ $eq: ["$notifiedDrivers.status", "accepted"] }, 1, 0],
            },
          },
        },
      },
    ]),

    // 9. Completion & Cancellation Rates stats (for current month)
    Ride.aggregate([
      {
        $match: {
          ...rideMatch,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          completed: {
            $sum: { $cond: [{ $eq: ["$status", RIDE_STATUS.COMPLETED] }, 1, 0] },
          },
          cancelled: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      RIDE_STATUS.CANCELLED,
                      RIDE_STATUS.CANCELLED_BY_USER,
                      RIDE_STATUS.CANCELLED_BY_DRIVER,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // 11. Week's Revenue Trend
    Transaction.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
          createdAt: { $gte: startOfWeek, $lte: endOfWeek },
        },
      },
      {
        $project: {
          dayOfWeek: {
            $dateToString: {
              format: "%u", // 1 (Monday) to 7 (Sunday)
              date: "$createdAt",
              timezone: tz,
            },
          },
          revenue: {
            $cond: [
              { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
              { $ifNull: ["$commission", 0] },
              {
                $cond: [
                  { $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_FEE] },
                  "$amount",
                  {
                    $cond: [
                      { $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_COMPENSATION] },
                      { $subtract: [0, "$amount"] },
                      0,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$dayOfWeek",
          totalRevenue: { $sum: "$revenue" },
        },
      },
    ]),

    // 12. Demand Trend (today's hourly bucketed demand)
    Ride.aggregate([
      {
        $match: {
          ...rideMatch,
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $project: {
          hour: {
            $hour: {
              date: "$createdAt",
              timezone: tz,
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $gte: ["$hour", 0] }, { $lt: ["$hour", 6] }] },
              "12AM",
              {
                $cond: [
                  { $and: [{ $gte: ["$hour", 6] }, { $lt: ["$hour", 9] }] },
                  "6AM",
                  {
                    $cond: [
                      { $and: [{ $gte: ["$hour", 9] }, { $lt: ["$hour", 12] }] },
                      "9AM",
                      {
                        $cond: [
                          { $and: [{ $gte: ["$hour", 12] }, { $lt: ["$hour", 15] }] },
                          "12PM",
                          {
                            $cond: [
                              { $and: [{ $gte: ["$hour", 15] }, { $lt: ["$hour", 18] }] },
                              "3PM",
                              {
                                $cond: [
                                  { $and: [{ $gte: ["$hour", 18] }, { $lt: ["$hour", 21] }] },
                                  "6PM",
                                  "9PM",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Formulate Rates
  const offered = matchingStats[0]?.offered || 0;
  const accepted = matchingStats[0]?.accepted || 0;
  const acceptanceRate = offered > 0 ? parseFloat(((accepted / offered) * 100).toFixed(1)) : 100;

  const completed = completionStats[0]?.completed || 0;
  const cancelled = completionStats[0]?.cancelled || 0;
  const totalFinished = completed + cancelled;
  const completionRate = totalFinished > 0 ? parseFloat(((completed / totalFinished) * 100).toFixed(1)) : 100;
  const cancellationRate = totalFinished > 0 ? parseFloat(((cancelled / totalFinished) * 100).toFixed(1)) : 0;

  // Format Revenue Trend
  const revenueTrendMap: Record<string, number> = {
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0,
  };
  for (const item of revenueTrendResult) {
    if (item._id && revenueTrendMap[item._id] !== undefined) {
      revenueTrendMap[item._id] = parseFloat(item.totalRevenue.toFixed(2));
    }
  }
  const revenueTrend = [
    { day: "Mon", revenue: revenueTrendMap["1"] },
    { day: "Tue", revenue: revenueTrendMap["2"] },
    { day: "Wed", revenue: revenueTrendMap["3"] },
    { day: "Thu", revenue: revenueTrendMap["4"] },
    { day: "Fri", revenue: revenueTrendMap["5"] },
    { day: "Sat", revenue: revenueTrendMap["6"] },
    { day: "Sun", revenue: revenueTrendMap["7"] },
  ];

  // Format Demand Trend
  const demandTrendMap: Record<string, number> = {
    "6AM": 0, "9AM": 0, "12PM": 0, "3PM": 0, "6PM": 0, "9PM": 0, "12AM": 0,
  };
  for (const item of demandTrendResult) {
    if (item._id && demandTrendMap[item._id] !== undefined) {
      demandTrendMap[item._id] = item.count;
    }
  }
  const demandTrend = ["6AM", "9AM", "12PM", "3PM", "6PM", "9PM", "12AM"].map(
    (label) => ({
      time: label,
      demand: demandTrendMap[label],
    }),
  );

  return {
    totalDrivers: totalDriversResult[0]?.count || 0,
    totalPassengers,
    activeTrips,
    revenueThisMonth: parseFloat((revenueThisMonthResult[0]?.totalRevenue || 0).toFixed(2)),
    scheduledRides,
    completedTripsToday,
    acceptanceRate,
    completionRate,
    cancellationRate,
    activeReservations,
    revenueTrend,
    demandTrend,
  };
};

const getDriverGrowthFromDB = async (query: IAnalyticsQuery): Promise<IDriverGrowthData[]> => {
  const tz = await resolveAnalyticsTimezone(query.serviceAreaId, query.timezone);
  const nowInTz = DateTime.now().setZone(tz);

  let monthsCount = 12;
  if (query.filter === "6months") {
    monthsCount = 6;
  } else if (query.limit) {
    monthsCount = Number(query.limit);
  }

  const currentYear = nowInTz.year;
  const months: DateTime[] = [];
  if (monthsCount === 6) {
    for (let m = 1; m <= 6; m++) {
      months.push(DateTime.fromObject({ year: currentYear, month: m }).setZone(tz));
    }
  } else {
    for (let m = 1; m <= 12; m++) {
      months.push(DateTime.fromObject({ year: currentYear, month: m }).setZone(tz));
    }
  }

  const startDate = months[0].startOf("month").toUTC().toJSDate();
  const endDate = months[months.length - 1].endOf("month").toUTC().toJSDate();

  const driverMatch: any = { approvalStatus: DRIVER_STATUS.APPROVED };
  if (query.serviceAreaId) {
    driverMatch.serviceAreaId = new Types.ObjectId(query.serviceAreaId);
  }

  // Count initial drivers before the start window
  const initialDriversResult = await Driver.aggregate([
    { $match: driverMatch },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.role": USER_ROLES.DRIVER,
        "user.status": STATUS.ACTIVE,
        "user.isDeleted": { $ne: true },
        createdAt: { $lt: startDate },
      },
    },
    { $count: "count" },
  ]);
  const initialCount = initialDriversResult[0]?.count || 0;

  // Aggregate signups inside the window
  const monthlyDriversResult = await Driver.aggregate([
    { $match: driverMatch },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.role": USER_ROLES.DRIVER,
        "user.status": STATUS.ACTIVE,
        "user.isDeleted": { $ne: true },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        yearMonth: {
          $dateToString: {
            format: "%Y-%m",
            date: "$createdAt",
            timezone: tz,
          },
        },
      },
    },
    {
      $group: {
        _id: "$yearMonth",
        count: { $sum: 1 },
      },
    },
  ]);

  const monthlyCountMap: Record<string, number> = {};
  for (const item of monthlyDriversResult) {
    monthlyCountMap[item._id] = item.count;
  }

  let currentCumulative = initialCount;
  const result: IDriverGrowthData[] = [];

  for (const monthDate of months) {
    const key = monthDate.toFormat("yyyy-MM");
    const label = monthDate.toFormat("LLL");
    const count = monthlyCountMap[key] || 0;
    currentCumulative += count;
    result.push({
      month: label,
      period: monthDate.toFormat("MMMM yyyy"),
      count,
      cumulative: currentCumulative,
    });
  }

  result.sort((a, b) => {
    const orderA = MONTH_ORDER[a.month] || 0;
    const orderB = MONTH_ORDER[b.month] || 0;
    return orderA - orderB;
  });

  return result;
};

const getPassengerGrowthFromDB = async (query: IAnalyticsQuery): Promise<IPassengerGrowthData[]> => {
  const tz = await resolveAnalyticsTimezone(query.serviceAreaId, query.timezone);
  const nowInTz = DateTime.now().setZone(tz);

  let monthsCount = 12;
  if (query.filter === "6months") {
    monthsCount = 6;
  } else if (query.limit) {
    monthsCount = Number(query.limit);
  }

  const currentYear = nowInTz.year;
  const months: DateTime[] = [];
  if (monthsCount === 6) {
    for (let m = 1; m <= 6; m++) {
      months.push(DateTime.fromObject({ year: currentYear, month: m }).setZone(tz));
    }
  } else {
    for (let m = 1; m <= 12; m++) {
      months.push(DateTime.fromObject({ year: currentYear, month: m }).setZone(tz));
    }
  }

  const startDate = months[0].startOf("month").toUTC().toJSDate();
  const endDate = months[months.length - 1].endOf("month").toUTC().toJSDate();

  const passengerMatch: any = {
    role: USER_ROLES.USER,
    status: STATUS.ACTIVE,
    isDeleted: { $ne: true },
  };

  // Count initial passengers before window
  const initialPassengersResult = await User.aggregate([
    {
      $match: {
        ...passengerMatch,
        createdAt: { $lt: startDate },
      },
    },
    { $count: "count" },
  ]);
  const initialCount = initialPassengersResult[0]?.count || 0;

  // Aggregate monthly passenger signups
  const monthlyPassengersResult = await User.aggregate([
    {
      $match: {
        ...passengerMatch,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        yearMonth: {
          $dateToString: {
            format: "%Y-%m",
            date: "$createdAt",
            timezone: tz,
          },
        },
      },
    },
    {
      $group: {
        _id: "$yearMonth",
        count: { $sum: 1 },
      },
    },
  ]);

  const monthlyCountMap: Record<string, number> = {};
  for (const item of monthlyPassengersResult) {
    monthlyCountMap[item._id] = item.count;
  }

  let currentCumulative = initialCount;
  const result: IPassengerGrowthData[] = [];

  for (const monthDate of months) {
    const key = monthDate.toFormat("yyyy-MM");
    const label = monthDate.toFormat("LLL");
    const count = monthlyCountMap[key] || 0;
    currentCumulative += count;
    result.push({
      month: label,
      period: monthDate.toFormat("MMMM yyyy"),
      count,
      cumulative: currentCumulative,
    });
  }

  result.sort((a, b) => {
    const orderA = MONTH_ORDER[a.month] || 0;
    const orderB = MONTH_ORDER[b.month] || 0;
    return orderA - orderB;
  });

  return result;
};

const getRevenueTrendFromDB = async (query: IAnalyticsQuery): Promise<IRevenueTrendData[]> => {
  const tz = await resolveAnalyticsTimezone(query.serviceAreaId, query.timezone);
  const dateRange = await getDateRangeForFilter(query.filter, query.startDate, query.endDate, tz);

  const matchStage: any = { paymentStatus: PAYMENT_STATUS.PAID };
  if (dateRange) {
    matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
  }

  const groupBy = query.groupBy || "day";
  const format = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

  const transactions = await Transaction.aggregate([
    { $match: matchStage },
    {
      $project: {
        periodStr: {
          $dateToString: {
            format,
            date: "$createdAt",
            timezone: tz,
          },
        },
        revenue: {
          $cond: [
            { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
            { $ifNull: ["$commission", 0] },
            {
              $cond: [
                { $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_FEE] },
                "$amount",
                {
                  $cond: [
                    { $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_COMPENSATION] },
                    { $subtract: [0, "$amount"] },
                    0,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$periodStr",
        totalRevenue: { $sum: "$revenue" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  if (dateRange) {
    const startDt = DateTime.fromJSDate(dateRange.start).setZone(tz);
    const endDt = DateTime.fromJSDate(dateRange.end).setZone(tz);

    const resultList: IRevenueTrendData[] = [];
    const transactionMap = new Map<string, number>();
    for (const item of transactions) {
      transactionMap.set(item._id, parseFloat(item.totalRevenue.toFixed(2)));
    }

    let current = startDt;
    if (groupBy === "month") {
      while (current <= endDt || current.hasSame(endDt, "month")) {
        const key = current.toFormat("yyyy-MM");
        resultList.push({
          date: key,
          revenue: transactionMap.get(key) || 0,
        });
        current = current.plus({ months: 1 });
      }
    } else {
      while (current <= endDt || current.hasSame(endDt, "day")) {
        const key = current.toFormat("yyyy-MM-dd");
        resultList.push({
          date: key,
          revenue: transactionMap.get(key) || 0,
        });
        current = current.plus({ days: 1 });
      }
    }
    return resultList;
  }

  // No dateRange — derive range from aggregation results and fill gaps
  if (transactions.length === 0) return [];

  const transactionMap = new Map<string, number>();
  for (const item of transactions) {
    transactionMap.set(item._id, parseFloat(item.totalRevenue.toFixed(2)));
  }

  const sortedKeys = [...transactionMap.keys()].sort();
  const firstKey = sortedKeys[0];
  const lastKey = sortedKeys[sortedKeys.length - 1];

  const resultList: IRevenueTrendData[] = [];
  if (groupBy === "month") {
    let current = DateTime.fromFormat(firstKey, "yyyy-MM", { zone: tz });
    const last = DateTime.fromFormat(lastKey, "yyyy-MM", { zone: tz });
    while (current <= last || current.hasSame(last, "month")) {
      const key = current.toFormat("yyyy-MM");
      resultList.push({ date: key, revenue: transactionMap.get(key) || 0 });
      current = current.plus({ months: 1 });
    }
  } else {
    let current = DateTime.fromISO(firstKey, { zone: tz });
    const last = DateTime.fromISO(lastKey, { zone: tz });
    while (current <= last || current.hasSame(last, "day")) {
      const key = current.toFormat("yyyy-MM-dd");
      resultList.push({ date: key, revenue: transactionMap.get(key) || 0 });
      current = current.plus({ days: 1 });
    }
  }
  return resultList;
};

const getDemandByHourFromDB = async (query: IAnalyticsQuery): Promise<IDemandByHourData[]> => {
  const tz = await resolveAnalyticsTimezone(query.serviceAreaId, query.timezone);
  // Default filter is 'today' if none specified
  const filter = query.filter || "today";
  const dateRange = await getDateRangeForFilter(filter, query.startDate, query.endDate, tz);

  const matchStage: any = {};
  if (dateRange) {
    matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
  }
  if (query.serviceAreaId) {
    matchStage.serviceAreaId = new Types.ObjectId(query.serviceAreaId);
  }

  const rides = await Ride.aggregate([
    { $match: matchStage },
    {
      $project: {
        hour: {
          $hour: {
            date: "$createdAt",
            timezone: tz,
          },
        },
      },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $and: [{ $gte: ["$hour", 0] }, { $lt: ["$hour", 6] }] },
            "12AM",
            {
              $cond: [
                { $and: [{ $gte: ["$hour", 6] }, { $lt: ["$hour", 9] }] },
                "6AM",
                {
                  $cond: [
                    { $and: [{ $gte: ["$hour", 9] }, { $lt: ["$hour", 12] }] },
                    "9AM",
                    {
                      $cond: [
                        { $and: [{ $gte: ["$hour", 12] }, { $lt: ["$hour", 15] }] },
                        "12PM",
                        {
                          $cond: [
                            { $and: [{ $gte: ["$hour", 15] }, { $lt: ["$hour", 18] }] },
                            "3PM",
                            {
                              $cond: [
                                { $and: [{ $gte: ["$hour", 18] }, { $lt: ["$hour", 21] }] },
                                "6PM",
                                "9PM",
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const bucketCounts: Record<string, number> = {
    "6AM": 0, "9AM": 0, "12PM": 0, "3PM": 0, "6PM": 0, "9PM": 0, "12AM": 0,
  };

  for (const item of rides) {
    if (item._id && bucketCounts[item._id] !== undefined) {
      bucketCounts[item._id] = item.count;
    }
  }

  const labels = ["6AM", "9AM", "12PM", "3PM", "6PM", "9PM", "12AM"];
  const labelHours: Record<string, number> = {
    "12AM": 0, "6AM": 6, "9AM": 9, "12PM": 12, "3PM": 15, "6PM": 18, "9PM": 21,
  };

  return labels.map((label) => ({
    hour: labelHours[label],
    label,
    demand: bucketCounts[label],
  }));
};

export const AnalyticsService = {
  getOverviewFromDB,
  getDriverGrowthFromDB,
  getPassengerGrowthFromDB,
  getRevenueTrendFromDB,
  getDemandByHourFromDB,
};
