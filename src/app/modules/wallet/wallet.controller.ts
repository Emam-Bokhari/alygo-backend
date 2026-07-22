import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { WalletService } from "./wallet.service";
import { TransactionService } from "../transaction/transaction.service";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Transaction } from "../transaction/transaction.model";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { PAYMENT_STATUS } from "../ride/ride.constant";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";

// Passenger (User) Wallet Summary API
const getWalletSummary = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const wallet = await WalletService.getOrCreateWallet(userId);
  const user = (await User.findById(userId)) as any;

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wallet summary retrieved successfully",
    data: {
      walletBalance: wallet.balance,
      currency: wallet.currency,
      stripeConnected: !!(
        user?.stripeCustomerId || user?.stripeConnectedAccountId
      ),
    },
  });
});

// Passenger (User) Transaction History API
const getTransactionHistory = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const role = req.user.role || "user";

    const {
      filter,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      startDate,
      endDate,
    } = req.query;

    const result = await TransactionService.getTransactions(userId, role, {
      filter: filter as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Transaction history retrieved successfully",
      data: result,
    });
  },
);

// Driver Wallet Summary API
const getDriverWalletSummary = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const wallet = await WalletService.getOrCreateWallet(userId);
    const driver = await Driver.findOne({ userId });

    if (!driver) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
    }

    // Calculate total earnings (sum of completed credits)
    const totalEarningsQuery: any = {
      paymentStatus: PAYMENT_STATUS.PAID,
      transactionType: {
        $in: [
          TRANSACTION_TYPE.BOOKING_PAYMENT,
          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
          TRANSACTION_TYPE.DRIVER_APPRECIATION,
          TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
        ],
      },
    };
    totalEarningsQuery.$or = [
      { userId: new Types.ObjectId(userId) },
      { driverId: driver._id },
    ];

    const totalEarningsResult = await Transaction.aggregate([
      { $match: totalEarningsQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalEarnings =
      totalEarningsResult.length > 0
        ? parseFloat(totalEarningsResult[0].total.toFixed(2))
        : 0;

    // Calculate pending balance (sum of pending credits)
    const pendingQuery: any = {
      paymentStatus: PAYMENT_STATUS.PENDING,
      transactionType: {
        $in: [
          TRANSACTION_TYPE.BOOKING_PAYMENT,
          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
          TRANSACTION_TYPE.DRIVER_APPRECIATION,
          TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
        ],
      },
    };
    pendingQuery.$or = [
      { userId: new Types.ObjectId(userId) },
      { driverId: driver._id },
    ];

    const pendingResult = await Transaction.aggregate([
      { $match: pendingQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingBalance =
      pendingResult.length > 0
        ? parseFloat(pendingResult[0].total.toFixed(2))
        : 0;

    const stripeConnected = !!(
      driver.stripeConnectedAccountId && driver.isStripeOnboarded
    );
    const canWithdraw = wallet.balance > 0 && stripeConnected;

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver wallet summary retrieved successfully",
      data: {
        totalEarnings,
        availableBalance: wallet.balance,
        pendingBalance,
        currency: wallet.currency,
        stripeConnected,
        canWithdraw,
      },
    });
  },
);

// Driver Transaction History API
const getDriverTransactionHistory = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const role = "driver";

    const {
      filter,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      startDate,
      endDate,
    } = req.query;

    const result = await TransactionService.getTransactions(userId, role, {
      filter: filter as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver transaction history retrieved successfully",
      data: result,
    });
  },
);

// Top-up checkout initiation
const topUpWallet = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { amount } = req.body;
  const result = await WalletService.topUpWallet(userId, Number(amount));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wallet top-up checkout session initiated",
    data: result,
  });
});

export const WalletController = {
  getWalletSummary,
  getTransactionHistory,
  getDriverWalletSummary,
  getDriverTransactionHistory,
  topUpWallet,
};
