import { Types } from "mongoose";
import { DateTime } from "luxon";
import { Ride } from "../ride/ride.model";
import { Transaction } from "../transaction/transaction.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { CANCELLED_BY, RIDE_STATUS } from "../ride/ride.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { PAYMENT_STATUS } from "../ride/ride.constant";
import {
  ICancellationAnalyticsSummary,
  ICancellationAnalyticsQuery,
  ICancellationTrendData,
  ICancellationReasonData,
  ICancellationCityData,
  ICancellationCategoryData,
  DateFilterType,
} from "./cancellationAnalytics.interface";
import { getDayRangeInTimezone } from "../../../shared/timezoneHelper";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import config from "../../../config";

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
  filter: DateFilterType,
  startDate?: string,
  endDate?: string,
  timezone?: string,
): Promise<{ start: Date; end: Date } | null> => {
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
        return {
          start: new Date(startDate),
          end: new Date(endDate),
        };
      }
      return null;
    default:
      return null;
  }
};

const buildBaseMatchStage = async (query: ICancellationAnalyticsQuery) => {
  const {
    filter,
    startDate,
    endDate,
    timezone,
    serviceAreaId,
    city,
    rideCategoryId,
  } = query;

  const tz = await resolveAnalyticsTimezone(serviceAreaId, timezone);
  const dateRange = filter
    ? await getDateRangeForFilter(filter, startDate, endDate, tz)
    : null;

  const matchStage: any = {
    status: {
      $in: [
        RIDE_STATUS.CANCELLED,
        RIDE_STATUS.CANCELLED_BY_USER,
        RIDE_STATUS.CANCELLED_BY_DRIVER,
      ],
    },
  };

  if (dateRange) {
    matchStage["cancellation.cancelledAt"] = {
      $gte: dateRange.start,
      $lte: dateRange.end,
    };
  }

  if (serviceAreaId) {
    matchStage.serviceAreaId = serviceAreaId;
  }

  if (rideCategoryId) {
    matchStage["rideCategory.categoryId"] = rideCategoryId;
  }

  if (city) {
    matchStage["pickup.address"] = { $regex: city, $options: "i" };
  }

  return matchStage;
};

const getSummaryFromDB = async (
  query: ICancellationAnalyticsQuery,
): Promise<ICancellationAnalyticsSummary> => {
  const matchStage = await buildBaseMatchStage(query);

  const transactionMatchStage: any = {};
  if (query.serviceAreaId) {
    transactionMatchStage["ride.serviceAreaId"] = new Types.ObjectId(
      query.serviceAreaId,
    );
  }
  if (query.rideCategoryId) {
    transactionMatchStage["ride.rideCategory.categoryId"] = new Types.ObjectId(
      query.rideCategoryId,
    );
  }
  if (query.city) {
    transactionMatchStage["ride.pickup.address"] = {
      $regex: query.city,
      $options: "i",
    };
  }

  const pipelineFees: any[] = [
    {
      $match: {
        transactionType: TRANSACTION_TYPE.CANCELLATION_FEE,
        paymentStatus: PAYMENT_STATUS.PAID,
      },
    },
  ];

  const pipelineCompensation: any[] = [
    {
      $match: {
        transactionType: TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
        paymentStatus: PAYMENT_STATUS.PAID,
      },
    },
  ];

  if (Object.keys(transactionMatchStage).length > 0) {
    const lookupStages = [
      {
        $lookup: {
          from: "rides",
          localField: "rideId",
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
        $match: transactionMatchStage,
      },
    ];
    pipelineFees.push(...lookupStages);
    pipelineCompensation.push(...lookupStages);
  }

  pipelineFees.push({
    $group: {
      _id: null,
      totalFees: { $sum: "$amount" },
    },
  });

  pipelineCompensation.push({
    $group: {
      _id: null,
      totalCompensation: { $sum: "$amount" },
    },
  });

  const [
    totalCancellationsResult,
    passengerCancellationsResult,
    driverCancellationsResult,
    feesCollectedResult,
    driverCompensationPaidResult,
  ] = await Promise.all([
    // Total Cancellations
    Ride.countDocuments(matchStage),

    // Passenger Cancellations
    Ride.countDocuments({
      ...matchStage,
      "cancellation.cancelledBy": CANCELLED_BY.USER,
    }),

    // Driver Cancellations
    Ride.countDocuments({
      ...matchStage,
      "cancellation.cancelledBy": CANCELLED_BY.DRIVER,
    }),

    // Cancellation Fees Collected
    Transaction.aggregate(pipelineFees),

    // Driver Compensation Paid
    Transaction.aggregate(pipelineCompensation),
  ]);

  return {
    totalCancellations: totalCancellationsResult,
    passengerCancellations: passengerCancellationsResult,
    driverCancellations: driverCancellationsResult,
    feesCollected: parseFloat(
      (feesCollectedResult[0]?.totalFees || 0).toFixed(2),
    ),
    totalDriverPaid: parseFloat(
      (driverCompensationPaidResult[0]?.totalCompensation || 0).toFixed(2),
    ),
  };
};

const getTrendFromDB = async (
  query: ICancellationAnalyticsQuery,
): Promise<ICancellationTrendData[]> => {
  const matchStage = await buildBaseMatchStage(query);
  const tz = await resolveAnalyticsTimezone(
    query.serviceAreaId,
    query.timezone,
  );

  const trendData = await Ride.aggregate([
    {
      $match: matchStage,
    },
    {
      $project: {
        dayOfWeek: {
          $dateToString: {
            format: "%u",
            date: "$cancellation.cancelledAt",
            timezone: tz,
          },
        },
      },
    },
    {
      $group: {
        _id: "$dayOfWeek",
        count: { $sum: 1 },
      },
    },
  ]);

  const dayMap: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
  };

  for (const item of trendData) {
    if (item._id && dayMap[item._id] !== undefined) {
      dayMap[item._id] = item.count;
    }
  }

  return [
    { day: "Mon", cancelledRides: dayMap["1"] },
    { day: "Tue", cancelledRides: dayMap["2"] },
    { day: "Wed", cancelledRides: dayMap["3"] },
    { day: "Thu", cancelledRides: dayMap["4"] },
    { day: "Fri", cancelledRides: dayMap["5"] },
    { day: "Sat", cancelledRides: dayMap["6"] },
    { day: "Sun", cancelledRides: dayMap["7"] },
  ];
};

const getReasonsFromDB = async (
  query: ICancellationAnalyticsQuery,
): Promise<ICancellationReasonData[]> => {
  const matchStage = await buildBaseMatchStage(query);
  const limit = query.limit || 10;

  const reasonsData = await Ride.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: {
          $ifNull: ["$cancellation.cancellationReasonName", "Unknown"],
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  return reasonsData.map((item) => ({
    reason: item._id,
    count: item.count,
  }));
};

const getCitiesFromDB = async (
  query: ICancellationAnalyticsQuery,
): Promise<ICancellationCityData[]> => {
  const matchStage = await buildBaseMatchStage(query);
  const limit = query.limit || 10;

  const citiesData = await Ride.aggregate([
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
      $unwind: {
        path: "$serviceArea",
        preserveNullAndEmptyArrays: true,
      },
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
        city: {
          $cond: [
            {
              $and: [
                { $ne: ["$serviceArea.city", ""] },
                { $ne: ["$serviceArea.city", null] },
              ],
            },
            "$serviceArea.city",
            {
              $cond: [
                {
                  $and: [
                    { $ne: ["$parentCity.city", ""] },
                    { $ne: ["$parentCity.city", null] },
                  ],
                },
                "$parentCity.city",
                "Unknown",
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$city",
        total: { $sum: 1 },
      },
    },
    {
      $sort: { total: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  return citiesData.map((item) => ({
    city: item._id || "Unknown",
    total: item.total,
  }));
};

const getCategoriesFromDB = async (
  query: ICancellationAnalyticsQuery,
): Promise<ICancellationCategoryData[]> => {
  const matchStage = await buildBaseMatchStage(query);
  const limit = query.limit || 10;

  const categoriesData = await Ride.aggregate([
    {
      $match: matchStage,
    },
    {
      $group: {
        _id: {
          $ifNull: ["$rideCategory.name", "Unknown"],
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  return categoriesData.map((item) => ({
    category: item._id,
    count: item.count,
  }));
};

export const CancellationAnalyticsService = {
  getSummaryFromDB,
  getTrendFromDB,
  getReasonsFromDB,
  getCitiesFromDB,
  getCategoriesFromDB,
};
