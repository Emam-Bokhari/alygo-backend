import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ComplianceCenterService } from "./complianceCenter.service";

const createBackgroundCheckFee = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const result =
      await ComplianceCenterService.createBackgroundCheckFeeToDB(payload);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Background check fee created successfully",
      data: result,
    });
  },
);

const getAllBackgroundCheckFees = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.query;
    const result =
      await ComplianceCenterService.getAllBackgroundCheckFeesFromDB(query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Background check fees retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  },
);

const getSingleBackgroundCheckFee = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result =
      await ComplianceCenterService.getSingleBackgroundCheckFeeFromDB(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Background check fee retrieved successfully",
      data: result,
    });
  },
);

const updateBackgroundCheckFee = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;
    const result =
      await ComplianceCenterService.updateBackgroundCheckFeeInDB(id, payload);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Background check fee updated successfully",
      data: result,
    });
  },
);

const deleteBackgroundCheckFee = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result =
      await ComplianceCenterService.deleteBackgroundCheckFeeFromDB(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Background check fee deleted successfully",
      data: result,
    });
  },
);

const updateFeeStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await ComplianceCenterService.updateFeeStatusInDB(id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Background check fee status updated to ${status} successfully`,
    data: result,
  });
});

const getDocumentMonitoring = catchAsync(
  async (req: Request, res: Response) => {
    const queryParams = req.query;
    const result =
      await ComplianceCenterService.getDocumentMonitoringFromDB(queryParams);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Document monitoring data retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  },
);

export const ComplianceCenterController = {
  createBackgroundCheckFee,
  getAllBackgroundCheckFees,
  getSingleBackgroundCheckFee,
  updateBackgroundCheckFee,
  deleteBackgroundCheckFee,
  updateFeeStatus,
  getDocumentMonitoring,
};
