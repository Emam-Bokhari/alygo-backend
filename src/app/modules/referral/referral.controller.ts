import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReferralService } from "./referral.service";
import { StatusCodes } from "http-status-codes";

// --- NEW PASSENGER APIS ---
const getUserDashboard = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await ReferralService.getUserReferralDashboard(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Passenger referral dashboard retrieved successfully",
    data: result,
  });
});

const getReferredUsersHistory = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await ReferralService.getUserHistory(userId, req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Referred users history retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getUserRewardHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await ReferralService.getRewardPayoutHistory(
    userId,
    "user",
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Passenger referral reward history retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

// --- NEW DRIVER APIS ---
const getDriverDashboard = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const result = await ReferralService.getDriverReferralDashboard(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Driver referral dashboard retrieved successfully",
    data: result,
  });
});

const getDriverReferralProgress = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await ReferralService.getDriverProgressList(
      userId,
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver referral progress list retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getDriverRewardHistory = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const result = await ReferralService.getRewardPayoutHistory(
      userId,
      "driver",
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver referral reward history retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

// --- RULES API ---
const getRules = catchAsync(async (req: Request, res: Response) => {
  const role = (req.query.role as string) || "user";
  const result = await ReferralService.getRules(role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Referral rules retrieved successfully",
    data: result,
  });
});

// --- VERIFY CODE ---
const verifyCode = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.body;
  const result = await ReferralService.verifyReferralCode(code);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Referral code verified successfully",
    data: result,
  });
});

export const ReferralController = {
  getUserDashboard,
  getReferredUsersHistory,
  getUserRewardHistory,
  getDriverDashboard,
  getDriverReferralProgress,
  getDriverRewardHistory,
  getRules,
  verifyCode,
};
