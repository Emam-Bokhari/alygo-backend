import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PayoutService } from "./payout.service";

const requestWithdrawal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { amount } = req.body;
  const result = await PayoutService.requestWithdrawal(userId, Number(amount));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Withdrawal processed successfully",
    data: result,
  });
});

const getWithdrawalHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await PayoutService.getWithdrawalHistory(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Withdrawal history retrieved successfully",
    data: result,
  });
});

export const PayoutController = {
  requestWithdrawal,
  getWithdrawalHistory,
};
