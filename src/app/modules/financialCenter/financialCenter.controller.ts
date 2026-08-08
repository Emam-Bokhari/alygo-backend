import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { FinancialCenterService } from "./financialCenter.service";

/**
 * Controller for the Revenue section APIs
 */
const getRevenue = catchAsync(async (req: Request, res: Response) => {
  const result = await FinancialCenterService.getRevenueSummaryFromDB(
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Revenue summary retrieved successfully",
    data: result,
  });
});

/**
 * Controller for the Payouts section APIs (paginated list of driver payouts)
 */
const getPayouts = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await FinancialCenterService.getPayoutsFromDB(
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payouts retrieved successfully",
    data,
    meta,
  });
});

/**
 * Controller for the Wallets section APIs
 */
const getWallets = catchAsync(async (req: Request, res: Response) => {
  const result = await FinancialCenterService.getWalletsSummaryFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wallets summary retrieved successfully",
    data: result,
  });
});

/**
 * Controller for the Transactions section APIs (paginated master list of transactions)
 */
const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await FinancialCenterService.getTransactionsFromDB(
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Transactions retrieved successfully",
    data,
    meta,
  });
});

export const FinancialCenterController = {
  getRevenue,
  getPayouts,
  getWallets,
  getTransactions,
};
