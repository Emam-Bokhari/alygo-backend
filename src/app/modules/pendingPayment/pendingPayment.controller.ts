import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PendingPaymentService } from "./pendingPayment.service";

const getPendingPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await PendingPaymentService.getPendingPaymentsByUser(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Pending payments retrieved successfully",
    data: result,
  });
});

const payCancellationFeeWithStripe = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { pendingPaymentId } = req.params;
    const result = await PendingPaymentService.payCancellationFeeNow(
      userId,
      pendingPaymentId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Stripe checkout session created successfully",
      data: result,
    });
  },
);

const payCancellationFeeWithWallet = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { pendingPaymentId } = req.params;
    const result = await PendingPaymentService.payCancellationFeeWithWallet(
      userId,
      pendingPaymentId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Cancellation fee paid successfully with wallet",
      data: result,
    });
  },
);

const skipPendingPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { pendingPaymentId } = req.params;
  const result = await PendingPaymentService.skipPendingPayment(
    userId,
    pendingPaymentId,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payment skipped successfully",
    data: result,
  });
});

export const PendingPaymentController = {
  getPendingPayments,
  payCancellationFeeWithStripe,
  payCancellationFeeWithWallet,
  skipPendingPayment,
};
