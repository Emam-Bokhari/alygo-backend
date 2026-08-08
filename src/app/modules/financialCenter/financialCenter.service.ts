import { Types } from "mongoose";
import { DateTime } from "luxon";
import { Ride } from "../ride/ride.model";
import { Transaction } from "../transaction/transaction.model";
import { Payout } from "../payout/payout.model";
import { Wallet } from "../wallet/wallet.model";
import { User } from "../user/user.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { RIDE_STATUS, PAYMENT_STATUS } from "../ride/ride.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { PAYOUT_STATUS } from "../payout/payout.constant";
import { WALLET_STATUS } from "../wallet/wallet.constant";
import { getDayRangeInTimezone } from "../../../shared/timezoneHelper";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import config from "../../../config";
import QueryBuilder from "../../builder/queryBuilder";
import {
  IRevenueResponse,
  IPayoutListItem,
  IWalletsResponse,
  ITransactionListItem,
} from "./financialCenter.interface";

/**
 * Helper to resolve the correct timezone for financial calculations
 */
const resolveDashboardTimezone = async (): Promise<string> => {
  const systemConfig = await getSystemConfig();
  return (
    systemConfig.driverRewards?.timezone ||
    config.driverRewards?.timezone ||
    (process.env.TIMEZONE as string) ||
    "Asia/Dhaka"
  );
};

/**
 * Helper to calculate total revenue and platform earnings for a specific date range
 */
const getFinancialMetricsForRange = async (
  start: Date,
  end: Date,
): Promise<{ totalRevenue: number; platformEarnings: number }> => {
  const [rideStats, txStats] = await Promise.all([
    Ride.aggregate([
      {
        $match: {
          status: RIDE_STATUS.COMPLETED,
          "payment.status": PAYMENT_STATUS.PAID,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalFare: { $sum: "$fare.total" },
          totalCommission: { $sum: "$fare.commission" },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
          transactionType: {
            $in: [
              TRANSACTION_TYPE.CANCELLATION_FEE,
              TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
            ],
          },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$transactionType",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const totalFare = rideStats[0]?.totalFare || 0;
  const totalCommission = rideStats[0]?.totalCommission || 0;

  const cancellationFee =
    txStats.find((t) => t._id === TRANSACTION_TYPE.CANCELLATION_FEE)
      ?.totalAmount || 0;
  const cancellationCompensation =
    txStats.find(
      (t) => t._id === TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
    )?.totalAmount || 0;

  const platformEarnings =
    totalCommission + cancellationFee - cancellationCompensation;

  return {
    totalRevenue: parseFloat(platformEarnings.toFixed(2)),
    platformEarnings: parseFloat(platformEarnings.toFixed(2)),
  };
};

/**
 * Service for the Revenue tab dashboard metrics
 */
const getRevenueSummaryFromDB = async (
  queryParams: Record<string, unknown>,
): Promise<IRevenueResponse> => {
  const tz = await resolveDashboardTimezone();

  // 1. Calculate All-time top summaries in parallel
  const [
    allTimeRideStats,
    allTimeTxStats,
    payoutStats,
  ] = await Promise.all([
    Ride.aggregate([
      {
        $match: {
          status: RIDE_STATUS.COMPLETED,
          "payment.status": PAYMENT_STATUS.PAID,
        },
      },
      {
        $group: {
          _id: null,
          totalFare: { $sum: "$fare.total" },
          totalCommission: { $sum: "$fare.commission" },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          paymentStatus: PAYMENT_STATUS.PAID,
          transactionType: {
            $in: [
              TRANSACTION_TYPE.CANCELLATION_FEE,
              TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$transactionType",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]),
    Payout.aggregate([
      {
        $match: {
          status: PAYOUT_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const allTimeTotalRevenue = allTimeRideStats[0]?.totalFare || 0;
  const allTimeCommission = allTimeRideStats[0]?.totalCommission || 0;
  const allTimeCancelFee =
    allTimeTxStats.find((t) => t._id === TRANSACTION_TYPE.CANCELLATION_FEE)
      ?.totalAmount || 0;
  const allTimeCancelComp =
    allTimeTxStats.find(
      (t) => t._id === TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
    )?.totalAmount || 0;
  const allTimePlatformEarnings =
    allTimeCommission + allTimeCancelFee - allTimeCancelComp;

  const driverPayouts = payoutStats[0]?.totalAmount || 0;

  // 2. Calculate today's metrics
  const { start: startOfToday, end: endOfToday } = getDayRangeInTimezone(
    "today",
    tz,
  );

  const todayMetrics = await getFinancialMetricsForRange(
    startOfToday,
    endOfToday,
  );

  // 3. Calculate this month's metrics
  const nowInTz = DateTime.now().setZone(tz);
  const startOfThisMonth = nowInTz.startOf("month").toUTC().toJSDate();
  const endOfThisMonth = nowInTz.endOf("month").toUTC().toJSDate();

  const thisMonthMetrics = await getFinancialMetricsForRange(
    startOfThisMonth,
    endOfThisMonth,
  );

  // 5. Generate daily revenue trend statistics based on Transactions (Platform Earnings)
  let trendStart: Date;
  let trendEnd: Date;

  if (queryParams.startDate && queryParams.endDate) {
    trendStart = DateTime.fromISO(queryParams.startDate as string)
      .setZone(tz)
      .startOf("day")
      .toUTC()
      .toJSDate();
    trendEnd = DateTime.fromISO(queryParams.endDate as string)
      .setZone(tz)
      .endOf("day")
      .toUTC()
      .toJSDate();
  } else {
    // Default to last 7 days (including today)
    const nowInTzObj = DateTime.now().setZone(tz);
    trendStart = nowInTzObj.minus({ days: 6 }).startOf("day").toUTC().toJSDate();
    trendEnd = nowInTzObj.endOf("day").toUTC().toJSDate();
  }

  const startDt = DateTime.fromJSDate(trendStart).setZone(tz);
  const endDt = DateTime.fromJSDate(trendEnd).setZone(tz);
  let currentDt = startDt.startOf("day");
  const days: DateTime[] = [];
  while (currentDt <= endDt) {
    days.push(currentDt);
    currentDt = currentDt.plus({ days: 1 });
  }

  const trendStats = await Transaction.aggregate([
    {
      $match: {
        paymentStatus: PAYMENT_STATUS.PAID,
        createdAt: { $gte: trendStart, $lte: trendEnd },
      },
    },
    {
      $project: {
        dayStr: {
          $dateToString: {
            format: "%Y-%m-%d",
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
        _id: "$dayStr",
        revenue: { $sum: "$revenue" },
      },
    },
  ]);

  const revenueMap: Record<string, number> = {};
  for (const stat of trendStats) {
    if (stat._id) {
      revenueMap[stat._id] = parseFloat(stat.revenue.toFixed(2));
    }
  }

  const trend = days.map((d) => {
    const dateStr = d.toFormat("yyyy-MM-dd");
    const label = d.toFormat("LLL d");
    return {
      date: dateStr,
      label,
      revenue: revenueMap[dateStr] || 0,
    };
  });

  return {
    summary: {
      totalRevenue: parseFloat(allTimePlatformEarnings.toFixed(2)),
      platformEarnings: parseFloat(allTimePlatformEarnings.toFixed(2)),
      driverPayouts: parseFloat(driverPayouts.toFixed(2)),
    },
    revenue: {
      today: parseFloat(todayMetrics.platformEarnings.toFixed(2)),
      thisMonth: parseFloat(thisMonthMetrics.platformEarnings.toFixed(2)),
    },
    trend,
  };
};

/**
 * Service to fetch driver payouts list with pagination and search
 */
const getPayoutsFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IPayoutListItem[]; meta: any }> => {
  const payoutQueryObj: any = {};

  if (query.status) {
    payoutQueryObj.status = query.status;
  }

  if (query.startDate || query.endDate) {
    payoutQueryObj.createdAt = {};
    if (query.startDate) {
      payoutQueryObj.createdAt.$gte = new Date(query.startDate as string);
    }
    if (query.endDate) {
      payoutQueryObj.createdAt.$lte = new Date(query.endDate as string);
    }
  }

  if (query.search) {
    const matchingUsers = await User.find({
      name: { $regex: query.search as string, $options: "i" },
    }).select("_id");
    const userIds = matchingUsers.map((u) => u._id);
    payoutQueryObj.$or = [
      { payoutId: { $regex: query.search as string, $options: "i" } },
      { userId: { $in: userIds } },
    ];
  }

  const queryBuilder = new QueryBuilder(
    Payout.find(payoutQueryObj).populate("userId", "name role"),
    query,
  )
    .sort()
    .paginate();

  const data = await queryBuilder.modelQuery.lean();
  const meta = await queryBuilder.countTotal();

  const mappedData = data.map((item: any) => ({
    payoutId: item.payoutId,
    driver: {
      id: item.userId?._id?.toString() || null,
      name: item.userId?.name || "Unknown Driver",
    },
    amount: item.amount,
    status: item.status,
    date: item.createdAt,
  }));

  return { data: mappedData, meta };
};

/**
 * Service to retrieve wallet totals, active wallets count, and pending top-ups
 */
const getWalletsSummaryFromDB = async (): Promise<IWalletsResponse> => {
  const [walletStats, pendingTopUpsResult] = await Promise.all([
    Wallet.aggregate([
      {
        $match: {
          status: WALLET_STATUS.ACTIVE,
        },
      },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          transactionType: TRANSACTION_TYPE.WALLET_TOPUP,
          paymentStatus: PAYMENT_STATUS.PENDING,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  return {
    totalWalletBalance: parseFloat(
      (walletStats[0]?.totalBalance || 0).toFixed(2),
    ),
    activeWallets: walletStats[0]?.count || 0,
    pendingTopUps: parseFloat(
      (pendingTopUpsResult[0]?.totalAmount || 0).toFixed(2),
    ),
  };
};

/**
 * Helper to map core transactionType to UI titles
 */
const mapType = (type?: string): string => {
  if (!type) return "Unknown";
  switch (type) {
    case TRANSACTION_TYPE.BOOKING_PAYMENT:
      return "Trip Payment";
    case TRANSACTION_TYPE.WALLET_TOPUP:
      return "Wallet Top-Up";
    case TRANSACTION_TYPE.REFUND:
      return "Refund";
    case TRANSACTION_TYPE.CANCELLATION_FEE:
      return "Cancellation Fee";
    case TRANSACTION_TYPE.CANCELLATION_COMPENSATION:
      return "Cancellation Compensation";
    case TRANSACTION_TYPE.PAYOUT:
      return "Driver Payout";
    case TRANSACTION_TYPE.DRIVER_APPRECIATION:
      return "Driver Appreciation";
    case TRANSACTION_TYPE.LOST_FOUND_DELIVERY:
      return "Lost & Found Delivery";
    case TRANSACTION_TYPE.USER_REFERRAL_REWARD:
      return "User Referral Reward";
    case TRANSACTION_TYPE.DRIVER_REFERRAL_REWARD:
      return "Driver Referral Reward";
    default:
      return type;
  }
};

/**
 * Helper to map transaction status to UI strings
 */
const mapStatus = (status?: string, type?: string): string => {
  if (!status) return "Pending";
  const s = status.toLowerCase();
  if (
    s === "paid" ||
    s === "completed" ||
    s === "processed" ||
    s === "success"
  ) {
    return type === TRANSACTION_TYPE.PAYOUT ? "Processed" : "Completed";
  }
  if (s === "pending" || s === "processing") return "Pending";
  if (s === "failed") return "Failed";
  if (s === "refunded") return "Refunded";
  return status;
};

/**
 * Service to fetch master paginated transactions list
 */
const getTransactionsFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: ITransactionListItem[]; meta: any }> => {
  const txQueryObj: any = {};

  if (query.status) {
    const statusStr = query.status as string;
    if (statusStr === "Completed" || statusStr === "Processed") {
      txQueryObj.paymentStatus = PAYMENT_STATUS.PAID;
    } else if (statusStr === "Pending") {
      txQueryObj.paymentStatus = PAYMENT_STATUS.PENDING;
    } else if (statusStr === "Failed") {
      txQueryObj.paymentStatus = PAYMENT_STATUS.FAILED;
    } else if (statusStr === "Refunded") {
      txQueryObj.paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else {
      txQueryObj.paymentStatus = statusStr;
    }
  }

  if (query.type) {
    const typeStr = query.type as string;
    const mappedType = Object.values(TRANSACTION_TYPE).find(
      (val) => val === typeStr || mapType(val) === typeStr,
    );
    if (mappedType) {
      txQueryObj.transactionType = mappedType;
    } else {
      txQueryObj.transactionType = typeStr;
    }
  }

  if (query.startDate || query.endDate) {
    txQueryObj.createdAt = {};
    if (query.startDate) {
      txQueryObj.createdAt.$gte = new Date(query.startDate as string);
    }
    if (query.endDate) {
      txQueryObj.createdAt.$lte = new Date(query.endDate as string);
    }
  }

  if (query.search) {
    txQueryObj.$or = [
      { transactionId: { $regex: query.search as string, $options: "i" } },
      { description: { $regex: query.search as string, $options: "i" } },
    ];
  }

  const queryBuilder = new QueryBuilder(Transaction.find(txQueryObj), query)
    .sort()
    .paginate();

  const data = await queryBuilder.modelQuery.lean();
  const meta = await queryBuilder.countTotal();

  const mappedData = data.map((item: any) => ({
    transactionId: item.transactionId,
    type: mapType(item.transactionType),
    amount: item.amount,
    platformFee: item.commission || item.fee || 0,
    status: mapStatus(item.paymentStatus, item.transactionType),
    createdAt: item.createdAt,
  }));

  return { data: mappedData, meta };
};

export const FinancialCenterService = {
  getRevenueSummaryFromDB,
  getPayoutsFromDB,
  getWalletsSummaryFromDB,
  getTransactionsFromDB,
};
