import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { WalletService } from "./wallet.service";

const getWalletBalance = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await WalletService.getWalletBalance(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wallet balance retrieved successfully",
    data: result,
  });
});

const getWalletHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await WalletService.getWalletHistory(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wallet history retrieved successfully",
    data: result,
  });
});

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
  getWalletBalance,
  getWalletHistory,
  topUpWallet,
};
