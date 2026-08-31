import { Types } from "mongoose";
import { DateTime } from "luxon";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Ride } from "../ride/ride.model";
import { Transaction } from "../transaction/transaction.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { VERIFICATION_STATUS } from "../driver/driver.constant";
import { DRIVER_STATUS, STATUS, USER_ROLES } from "../../../enums/user";
import { PAYMENT_STATUS, RIDE_STATUS, RIDE_TYPE } from "../ride/ride.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import {
  getDayRangeInTimezone,
  utcToTimezone,
} from "../../../shared/timezoneHelper";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import config from "../../../config";
import { SERVICE_AREA_TYPE } from "../serviceArea/serviceArea.constant";

const resolveDashboardTimezone = async (
  serviceAreaId?: string,
): Promise<string> => {
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

const getSummaryFromDB = async () => {
  const tz = await resolveDashboardTimezone();
  const { start: startOfToday, end: endOfToday } = getDayRangeInTimezone(
    "today",
    tz,
  );

  const nowInTz = DateTime.now().setZone(tz);
  const startOfMonth = nowInTz.startOf("month").toUTC().toJSDate();
  const endOfMonth = nowInTz.endOf("month").toUTC().toJSDate();

  const [
    totalDriversResult,
    totalPassengers,
    activeTrips,
    revenueTodayResult,
    revenueThisMonthResult,
    totalRevenueResult,
    driverApprovalQueueResult,
    airportQueueCount,
    scheduledRides,
  ] = await Promise.all([
    // totalDrivers: Count all approved, active drivers
    Driver.aggregate([
      {
        $match: {
          approvalStatus: DRIVER_STATUS.APPROVED,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          "user.role": USER_ROLES.DRIVER,
          "user.status": STATUS.ACTIVE,
          "user.isDeleted": { $ne: true },
        },
      },
      {
        $count: "count",
      },
    ]),
    // totalPassengers: Count all active passengers
    User.countDocuments({
      role: USER_ROLES.USER,
      status: STATUS.ACTIVE,
      isDeleted: { $ne: true },
    } as any),
    // activeTrips: Count rides currently running (accepted, on the way, arrived, started)
    Ride.countDocuments({
      status: {
        $in: [
          RIDE_STATUS.DRIVER_ACCEPTED,
          RIDE_STATUS.DRIVER_ON_THE_WAY,
          RIDE_STATUS.DRIVER_ARRIVED,
          RIDE_STATUS.STARTED,
        ],
      },
    }),
    // revenueToday: today's platform revenue
    Transaction.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $addFields: {
          resolvedRideId: { $ifNull: ["$rideId", "$bookingId"] }
        }
      },
      {
        $lookup: {
          from: "rides",
          localField: "resolvedRideId",
          foreignField: "_id",
          as: "ride",
        },
      },
      {
        $unwind: {
          path: "$ride",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          revenue: {
            $cond: [
              {
                $and: [
                  { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
                  { $eq: ["$ride.status", RIDE_STATUS.COMPLETED] }
                ]
              },
              { $ifNull: ["$commission", 0] },
              {
                $cond: [
                  {
                    $eq: [
                      "$transactionType",
                      TRANSACTION_TYPE.CANCELLATION_FEE,
                    ],
                  },
                  "$amount",
                  {
                    $cond: [
                      {
                        $eq: [
                          "$transactionType",
                          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                        ],
                      },
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
    // revenueThisMonth: current month's platform revenue
    Transaction.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $addFields: {
          resolvedRideId: { $ifNull: ["$rideId", "$bookingId"] }
        }
      },
      {
        $lookup: {
          from: "rides",
          localField: "resolvedRideId",
          foreignField: "_id",
          as: "ride",
        },
      },
      {
        $unwind: {
          path: "$ride",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          revenue: {
            $cond: [
              {
                $and: [
                  { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
                  { $eq: ["$ride.status", RIDE_STATUS.COMPLETED] }
                ]
              },
              { $ifNull: ["$commission", 0] },
              {
                $cond: [
                  {
                    $eq: [
                      "$transactionType",
                      TRANSACTION_TYPE.CANCELLATION_FEE,
                    ],
                  },
                  "$amount",
                  {
                    $cond: [
                      {
                        $eq: [
                          "$transactionType",
                          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                        ],
                      },
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
    // totalRevenue: all-time platform revenue
    Transaction.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
        },
      },
      {
        $addFields: {
          resolvedRideId: { $ifNull: ["$rideId", "$bookingId"] }
        }
      },
      {
        $lookup: {
          from: "rides",
          localField: "resolvedRideId",
          foreignField: "_id",
          as: "ride",
        },
      },
      {
        $unwind: {
          path: "$ride",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          revenue: {
            $cond: [
              {
                $and: [
                  { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
                  { $eq: ["$ride.status", RIDE_STATUS.COMPLETED] }
                ]
              },
              { $ifNull: ["$commission", 0] },
              {
                $cond: [
                  {
                    $eq: [
                      "$transactionType",
                      TRANSACTION_TYPE.CANCELLATION_FEE,
                    ],
                  },
                  "$amount",
                  {
                    $cond: [
                      {
                        $eq: [
                          "$transactionType",
                          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                        ],
                      },
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
    // driverApprovalQueue: Count pending driver approval requests
    Driver.aggregate([
      {
        $match: {
          approvalStatus: DRIVER_STATUS.PENDING,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          "user.isDeleted": { $ne: true },
        },
      },
      {
        $count: "count",
      },
    ]),
    // airportQueueCount: active online drivers located in service areas of type 'airport'
    ServiceArea.find({ type: "airport" }).then(async (airports) => {
      const airportIds = airports.map((a) => a._id);
      return Driver.countDocuments({
        driverAvailabilityStatus: "online",
        approvalStatus: DRIVER_STATUS.APPROVED,
        serviceAreaId: { $in: airportIds },
      });
    }),
    // scheduledRides: Count all future scheduled rides, excluding completed/cancelled/expired
    Ride.countDocuments({
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
  ]);

  return {
    totalDrivers: totalDriversResult[0]?.count || 0,
    totalPassengers,
    activeTrips,
    revenueToday: parseFloat(
      (revenueTodayResult[0]?.totalRevenue || 0).toFixed(2),
    ),
    revenueThisMonth: parseFloat(
      (revenueThisMonthResult[0]?.totalRevenue || 0).toFixed(2),
    ),
    totalRevenue: parseFloat(
      (totalRevenueResult[0]?.totalRevenue || 0).toFixed(2),
    ),
    driverApprovalQueue: driverApprovalQueueResult[0]?.count || 0,
    airportQueueCount,
    scheduledRides,
  };
};

const getRevenueChartFromDB = async (range: string = "week") => {
  const tz = await resolveDashboardTimezone();
  const nowInTz = DateTime.now().setZone(tz);
  const startOfWeek = nowInTz.startOf("week").toUTC().toJSDate();
  const endOfWeek = nowInTz.endOf("week").toUTC().toJSDate();

  const transactions = await Transaction.aggregate([
    {
      $match: {
        paymentStatus: PAYMENT_STATUS.PAID,
        createdAt: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
      },
    },
    {
      $addFields: {
        resolvedRideId: { $ifNull: ["$rideId", "$bookingId"] }
      }
    },
    {
      $lookup: {
        from: "rides",
        localField: "resolvedRideId",
        foreignField: "_id",
        as: "ride",
      },
    },
    {
      $unwind: {
        path: "$ride",
        preserveNullAndEmptyArrays: true,
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
            {
              $and: [
                { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
                { $eq: ["$ride.status", RIDE_STATUS.COMPLETED] }
              ]
            },
            { $ifNull: ["$commission", 0] },
            {
              $cond: [
                {
                  $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_FEE],
                },
                "$amount",
                {
                  $cond: [
                    {
                      $eq: [
                        "$transactionType",
                        TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                      ],
                    },
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
  ]);

  const revenueMap: Record<string, number> = {
    "1": 0, // Mon
    "2": 0, // Tue
    "3": 0, // Wed
    "4": 0, // Thu
    "5": 0, // Fri
    "6": 0, // Sat
    "7": 0, // Sun
  };

  for (const item of transactions) {
    if (item._id && revenueMap[item._id] !== undefined) {
      revenueMap[item._id] = parseFloat(item.totalRevenue.toFixed(2));
    }
  }

  return [
    { day: "Mon", revenue: revenueMap["1"] },
    { day: "Tue", revenue: revenueMap["2"] },
    { day: "Wed", revenue: revenueMap["3"] },
    { day: "Thu", revenue: revenueMap["4"] },
    { day: "Fri", revenue: revenueMap["5"] },
    { day: "Sat", revenue: revenueMap["6"] },
    { day: "Sun", revenue: revenueMap["7"] },
  ];
};

const getDemandChartFromDB = async (range: string = "today") => {
  const tz = await resolveDashboardTimezone();
  let start: Date;
  let end: Date;

  const dateRange = getDateRangeForRange(range, tz);
  if (dateRange) {
    start = dateRange.start;
    end = dateRange.end;
  } else {
    const dayRange = getDayRangeInTimezone(
      range === "yesterday" ? "yesterday" : "today",
      tz,
    );
    start = dayRange.start;
    end = dayRange.end;
  }

  const rides = await Ride.aggregate([
    {
      $match: {
        createdAt: {
          $gte: start,
          $lte: end,
        },
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
                        {
                          $and: [
                            { $gte: ["$hour", 12] },
                            { $lt: ["$hour", 15] },
                          ],
                        },
                        "12PM",
                        {
                          $cond: [
                            {
                              $and: [
                                { $gte: ["$hour", 15] },
                                { $lt: ["$hour", 18] },
                              ],
                            },
                            "3PM",
                            {
                              $cond: [
                                {
                                  $and: [
                                    { $gte: ["$hour", 18] },
                                    { $lt: ["$hour", 21] },
                                  ],
                                },
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
    "6AM": 0,
    "9AM": 0,
    "12PM": 0,
    "3PM": 0,
    "6PM": 0,
    "9PM": 0,
    "12AM": 0,
  };

  for (const item of rides) {
    if (item._id && bucketCounts[item._id] !== undefined) {
      bucketCounts[item._id] = item.count;
    }
  }

  const labels = ["6AM", "9AM", "12PM", "3PM", "6PM", "9PM", "12AM"];
  return labels.map((label) => ({
    time: label,
    demand: bucketCounts[label],
  }));
};

const getDateRangeForRange = (
  range: string,
  tz: string,
): { start: Date; end: Date } | null => {
  const nowInTz = DateTime.now().setZone(tz);
  let start: DateTime;
  let end = nowInTz.endOf("day");

  switch (range) {
    case "7days":
      start = nowInTz.minus({ days: 6 }).startOf("day");
      break;
    case "30days":
      start = nowInTz.minus({ days: 29 }).startOf("day");
      break;
    case "6months":
      start = nowInTz.minus({ months: 5 }).startOf("month");
      end = nowInTz.endOf("month");
      break;
    case "12months":
      start = nowInTz.minus({ months: 11 }).startOf("month");
      end = nowInTz.endOf("month");
      break;
    default:
      return null;
  }

  return {
    start: start.toUTC().toJSDate(),
    end: end.toUTC().toJSDate(),
  };
};

const getDriverGrowthFromDB = async (
  range: string = "12months",
  serviceAreaId?: string,
) => {
  const tz = await resolveDashboardTimezone(serviceAreaId);
  const nowInTz = DateTime.now().setZone(tz);

  let monthsCount = 12;
  if (range === "6months") monthsCount = 6;

  const months: DateTime[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    months.push(nowInTz.minus({ months: i }));
  }

  const startDate = months[0].startOf("month").toUTC().toJSDate();
  const endDate = nowInTz.endOf("month").toUTC().toJSDate();

  const monthlyDriversResult = await Driver.aggregate([
    {
      $match: {
        approvalStatus: DRIVER_STATUS.APPROVED,
        ...(serviceAreaId
          ? { serviceAreaId: new Types.ObjectId(serviceAreaId) }
          : {}),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $match: {
        "user.role": USER_ROLES.DRIVER,
        "user.status": STATUS.ACTIVE,
        "user.isDeleted": { $ne: true },
      },
    },
    {
      $project: {
        verificationDate: "$createdAt",
      },
    },
    {
      $match: {
        verificationDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        yearMonth: {
          $dateToString: {
            format: "%Y-%m",
            date: "$verificationDate",
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

  const result: Array<{ month: string; drivers: number }> = [];

  for (const monthDate of months) {
    const key = monthDate.toFormat("yyyy-MM");
    const label = monthDate.toFormat("LLL");
    const count = monthlyCountMap[key] || 0;
    result.push({
      month: label,
      drivers: count,
    });
  }

  return result;
};

const getPassengerGrowthFromDB = async (
  range: string = "12months",
  serviceAreaId?: string,
) => {
  const tz = await resolveDashboardTimezone(serviceAreaId);
  const nowInTz = DateTime.now().setZone(tz);

  let monthsCount = 12;
  if (range === "6months") monthsCount = 6;

  const months: DateTime[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    months.push(nowInTz.minus({ months: i }));
  }

  const startDate = months[0].startOf("month").toUTC().toJSDate();
  const endDate = nowInTz.endOf("month").toUTC().toJSDate();

  const monthlyPassengersResult = await User.aggregate([
    {
      $match: {
        role: USER_ROLES.USER,
        status: STATUS.ACTIVE,
        isDeleted: { $ne: true },
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

  const result: Array<{ month: string; passengers: number }> = [];

  for (const monthDate of months) {
    const key = monthDate.toFormat("yyyy-MM");
    const label = monthDate.toFormat("LLL");
    const count = monthlyCountMap[key] || 0;
    result.push({
      month: label,
      passengers: count,
    });
  }

  return result;
};

const getCategoryUsageFromDB = async () => {
  const categoriesResult = await Ride.aggregate([
    {
      $match: {
        status: RIDE_STATUS.COMPLETED,
      },
    },
    {
      $group: {
        _id: "$rideCategory.categoryId",
        name: { $first: "$rideCategory.name" },
        totalTrips: { $sum: 1 },
      },
    },
  ]);

  const totalTrips = categoriesResult.reduce(
    (sum, item) => sum + item.totalTrips,
    0,
  );

  const categories = categoriesResult
    .map((item) => ({
      id: item._id,
      name: item.name || "Unknown",
      totalTrips: item.totalTrips,
      percentage:
        totalTrips > 0
          ? parseFloat(((item.totalTrips / totalTrips) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.totalTrips - a.totalTrips);

  return categories;
};

const getTopCitiesFromDB = async (
  limit: number = 5,
  range?: string,
  serviceAreaId?: string,
) => {
  const tz = await resolveDashboardTimezone(serviceAreaId);

  const matchStage: any = {
    paymentStatus: PAYMENT_STATUS.PAID,
  };

  if (range) {
    const dateRange = getDateRangeForRange(range, tz);
    if (dateRange) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }
  }

  const result = await Transaction.aggregate([
    {
      $match: matchStage,
    },
    {
      $addFields: {
        resolvedRideId: { $ifNull: ["$rideId", "$bookingId"] }
      }
    },
    {
      $lookup: {
        from: "rides",
        localField: "resolvedRideId",
        foreignField: "_id",
        as: "ride",
      },
    },
    {
      $unwind: "$ride",
    },
    {
      $project: {
        ride: 1,
        revenue: {
          $cond: [
            {
              $and: [
                { $eq: ["$transactionType", TRANSACTION_TYPE.BOOKING_PAYMENT] },
                { $eq: ["$ride.status", RIDE_STATUS.COMPLETED] }
              ]
            },
            { $ifNull: ["$commission", 0] },
            {
              $cond: [
                {
                  $eq: ["$transactionType", TRANSACTION_TYPE.CANCELLATION_FEE],
                },
                "$amount",
                {
                  $cond: [
                    {
                      $eq: [
                        "$transactionType",
                        TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                      ],
                    },
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
      $lookup: {
        from: "serviceareas",
        localField: "ride.serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
      },
    },
    {
      $unwind: "$serviceArea",
    },
    {
      $lookup: {
        from: "serviceareas",
        localField: "serviceArea.cityId",
        foreignField: "_id",
        as: "parentCity",
      },
    },
    {
      $unwind: {
        path: "$parentCity",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        revenue: "$revenue",
        cityName: {
          $cond: [
            {
              $and: [
                { $ne: ["$serviceArea.city", ""] },
                { $ne: ["$serviceArea.city", null] },
              ],
            },
            "$serviceArea.city",
            { $ifNull: ["$parentCity.city", "Unknown"] },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$cityName",
        totalRevenue: { $sum: "$revenue" },
      },
    },
    {
      $sort: {
        totalRevenue: -1,
      },
    },
    {
      $limit: limit,
    },
  ]);

  return result.map((item) => ({
    city: item._id || "Unknown",
    revenue: parseFloat(item.totalRevenue.toFixed(2)),
  }));
};

const getTopAirportsFromDB = async (
  limit: number = 5,
  range?: string,
  serviceAreaId?: string,
) => {
  const tz = await resolveDashboardTimezone(serviceAreaId);

  const matchStage: any = {
    status: RIDE_STATUS.COMPLETED,
  };

  if (range) {
    const dateRange = getDateRangeForRange(range, tz);
    if (dateRange) {
      matchStage.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }
  }

  const result = await Ride.aggregate([
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "serviceareas",
        localField: "serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
      },
    },
    {
      $unwind: "$serviceArea",
    },
    {
      $match: {
        "serviceArea.type": SERVICE_AREA_TYPE.AIRPORT,
      },
    },
    {
      $group: {
        _id: "$serviceArea.airport",
        totalTrips: { $sum: 1 },
      },
    },
    {
      $sort: {
        totalTrips: -1,
      },
    },
    {
      $limit: limit,
    },
  ]);

  return result.map((item) => ({
    airport: item._id || "Unknown",
    trips: item.totalTrips,
  }));
};

export const DashboardService = {
  getSummaryFromDB,
  getRevenueChartFromDB,
  getDemandChartFromDB,
  getDriverGrowthFromDB,
  getPassengerGrowthFromDB,
  getCategoryUsageFromDB,
  getTopCitiesFromDB,
  getTopAirportsFromDB,
};
