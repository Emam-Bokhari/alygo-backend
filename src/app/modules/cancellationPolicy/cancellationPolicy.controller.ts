import { Request, Response } from "express";
import { CancellationPolicyService } from "./cancellationPolicy.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const getActiveCancellationPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await CancellationPolicyService.getActiveCancellationPolicyFromDB();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active cancellation policy retrieved successfully",
      data: result,
    });
  },
);

const createOrUpdateCancellationPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const cancellationPolicyData = req.body;
    const result =
      await CancellationPolicyService.createOrUpdateCancellationPolicyToDB(
        cancellationPolicyData,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Cancellation policy updated successfully",
      data: result,
    });
  },
);

export const CancellationPolicyController = {
  getActiveCancellationPolicy,
  createOrUpdateCancellationPolicy,
};
