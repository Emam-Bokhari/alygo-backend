import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReferralService } from "./referral.service";
import { REFERRAL_RULES } from "./referral.constant";

const getUserInfo = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await ReferralService.getUserReferralInfo(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User referral information retrieved successfully",
    data: result,
  });
});

const getDriverInfo = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await ReferralService.getDriverReferralInfo(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver referral information retrieved successfully",
    data: result,
  });
});

const getDriverProgress = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await ReferralService.getDriverReferralProgress(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver referral progress retrieved successfully",
    data: result,
  });
});

const getDriverPayouts = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await ReferralService.getDriverPayoutHistory(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver referral payout history retrieved successfully",
    data: result,
  });
});

const verifyCode = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.body;
  const result = await ReferralService.verifyReferralCode(code);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Referral code verified successfully",
    data: result,
  });
});

const getRules = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Referral rules retrieved successfully",
    data: REFERRAL_RULES,
  });
});

export const ReferralController = {
  getUserInfo,
  getDriverInfo,
  getDriverProgress,
  getDriverPayouts,
  verifyCode,
  getRules,
};
