import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReviewServices } from "./review.service";
import { ReviewValidations } from "./review.validation";
import config from "../../../config";

/**
 * Create review handler (passenger or driver).
 */
const createReview = catchAsync(async (req: Request, res: Response) => {
  const reviewerId = req.user.id;
  const reviewerRole = req.user.role; // "user" | "driver"
  const { rideId } = req.params;

  // Validate request dynamically based on user role
  const validationSchema =
    reviewerRole === "driver"
      ? ReviewValidations.driverReviewValidationSchema
      : ReviewValidations.passengerReviewValidationSchema;

  await validationSchema.parseAsync({ body: req.body });

  const { review, pendingPayment, paymentResult } =
    await ReviewServices.createReviewInDB(
      reviewerId,
      reviewerRole,
      rideId,
      req.body,
    );

  // Handle payment result
  if (paymentResult) {
    if (paymentResult.method === "stripe") {
      const stripeData = paymentResult.data as {
        checkoutUrl: string;
        sessionId: string;
        expiresAt: string;
      };
      return sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message:
          "Review submitted successfully. Please complete payment via Stripe.",
        data: {
          review,
          payment: {
            required: true,
            method: "stripe",
            status: "pending_payment",
            checkoutUrl: stripeData.checkoutUrl,
            sessionId: stripeData.sessionId,
            expiresAt: stripeData.expiresAt,
          },
        },
      });
    } else if (paymentResult.method === "wallet") {
      const walletData = paymentResult.data as { amount: number };
      return sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Review submitted successfully. Payment completed via wallet.",
        data: {
          review,
          payment: {
            required: true,
            method: "wallet",
            status: "paid",
            amount: walletData.amount,
          },
        },
      });
    }
  }

  // Handle pending payment (no payment method provided)
  if (pendingPayment && pendingPayment.status === "pending") {
    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Review submitted successfully",
      data: {
        review,
        payment: {
          required: true,
          status: "pending",
          pendingPaymentId: pendingPayment._id,
          amount: pendingPayment.amount,
          currency: config.stripe.currency || "USD",
          options: ["pay_now", "skip"],
        },
      },
    });
  }

  // No payment required
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Review submitted successfully",
    data: {
      review,
      payment: {
        required: false,
      },
    },
  });
});

/**
 * Get reviews received by a driver.
 */
const getDriverReviews = catchAsync(async (req: Request, res: Response) => {
  const { driverId } = req.params;
  const result = await ReviewServices.getDriverReviewsFromDB(driverId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Driver reviews retrieved successfully",
    data: result,
  });
});

/**
 * Get reviews received by a user (passenger).
 */
const getUserReviews = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await ReviewServices.getUserReviewsFromDB(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User reviews retrieved successfully",
    data: result,
  });
});

/**
 * Get review and appreciation stats summary for a driver.
 */
const getDriverReviewSummary = catchAsync(
  async (req: Request, res: Response) => {
    const { driverId } = req.params;
    const result = await ReviewServices.getDriverReviewSummaryFromDB(driverId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver review summary retrieved successfully",
      data: result,
    });
  },
);

export const ReviewController = {
  createReview,
  getDriverReviews,
  getUserReviews,
  getDriverReviewSummary,
};
