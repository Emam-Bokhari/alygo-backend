import { Request, Response } from "express";
import { CancellationPolicyService } from "./cancellationPolicy.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createCancellationPolicy = catchAsync(async (req, res) => {
  const cancellationPolicyData = req.body;
  const result = await CancellationPolicyService.createCancellationPolicyToDB(
    cancellationPolicyData,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cancellation policy created successfully",
    data: result,
  });
});

const getCancellationPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const { cancellationPolicyId } = req.params;
    const result =
      await CancellationPolicyService.getCancellationPolicyFromDB(
        cancellationPolicyId,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Cancellation policy retrieved successfully",
      data: result,
    });
  },
);

const getAllCancellationPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await CancellationPolicyService.getAllCancellationPolicyFromDB(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Cancellation policies retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  },
);

const getActiveCancellationPolicies = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await CancellationPolicyService.getActiveCancellationPoliciesFromDB(
        req.query,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active cancellation policies retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  },
);

const getCancellationPolicyByActorAndTrigger = catchAsync(
  async (req: Request, res: Response) => {
    const { actorType, triggerType } = req.params;
    const result =
      await CancellationPolicyService.getCancellationPolicyByActorAndTriggerFromDB(
        actorType,
        triggerType,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Cancellation policy retrieved successfully",
      data: result,
    });
  },
);

const updateCancellationPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const { cancellationPolicyId } = req.params;
    const updateData = req.body;

    const result = await CancellationPolicyService.updateCancellationPolicyToDB(
      cancellationPolicyId,
      updateData,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Cancellation policy updated successfully",
      data: result,
    });
  },
);

const updateCancellationPolicyStatus = catchAsync(async (req, res) => {
  const { cancellationPolicyId } = req.params;
  const { status } = req.body;
  const result =
    await CancellationPolicyService.updateCancellationPolicyStatusToDB(
      cancellationPolicyId,
      status,
    );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cancellation policy status updated successfully",
    data: result,
  });
});

const deleteCancellationPolicy = catchAsync(
  async (req: Request, res: Response) => {
    const { cancellationPolicyId } = req.params;
    const result =
      await CancellationPolicyService.deleteCancellationPolicyToDB(
        cancellationPolicyId,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Cancellation policy deleted successfully",
      data: result,
    });
  },
);

export const CancellationPolicyController = {
  createCancellationPolicy,
  getCancellationPolicy,
  getAllCancellationPolicy,
  getActiveCancellationPolicies,
  getCancellationPolicyByActorAndTrigger,
  updateCancellationPolicy,
  deleteCancellationPolicy,
  updateCancellationPolicyStatus,
};
