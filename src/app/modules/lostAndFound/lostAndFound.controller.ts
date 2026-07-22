import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { LostAndFoundService } from "./lostAndFound.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";

// ----------------------------------------------------
// Passenger Controllers
// ----------------------------------------------------

const reportLostItem = catchAsync(async (req: Request, res: Response) => {
  const passengerId = req.user.id;
  const uploadedFiles = req.body.uploadedFiles
    ? Array.isArray(req.body.uploadedFiles)
      ? req.body.uploadedFiles
      : [req.body.uploadedFiles]
    : [];

  const result = await LostAndFoundService.reportLostItem(passengerId, {
    ...req.body,
    uploadedFiles,
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Lost item reported successfully",
    data: result,
  });
});

const getMyReports = catchAsync(async (req: Request, res: Response) => {
  const passengerId = req.user.id;
  const result = await LostAndFoundService.getMyReports(passengerId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My lost reports retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getReportDetails = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { id } = req.params;

  const result = await LostAndFoundService.getReportDetails(id, userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Report details retrieved successfully",
    data: result,
  });
});

const confirmItemReceived = catchAsync(async (req: Request, res: Response) => {
  const passengerId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.confirmItemReceived(id, passengerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Item receipt confirmed successfully",
    data: result,
  });
});

const submitDriverRating = catchAsync(async (req: Request, res: Response) => {
  const passengerId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.submitDriverRating(id, passengerId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Driver rating submitted successfully",
    data: result,
  });
});

const createPaymentSession = catchAsync(async (req: Request, res: Response) => {
  const passengerId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.createPaymentSession(id, passengerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payment checkout session created successfully",
    data: result,
  });
});

// ----------------------------------------------------
// Driver Controllers
// ----------------------------------------------------

const getDriverReports = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.user.id;
  const result = await LostAndFoundService.getDriverReports(driverId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Driver lost reports retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const markFound = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.markFound(id, driverId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Item marked as found successfully",
    data: result,
  });
});

const markNotFound = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.markNotFound(id, driverId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Item marked as not found successfully",
    data: result,
  });
});

const configureRecovery = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.configureRecovery(id, driverId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Recovery method configured successfully",
    data: result,
  });
});

const markReturned = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.markReturned(id, driverId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Item marked as returned successfully",
    data: result,
  });
});

// ----------------------------------------------------
// Admin Controllers
// ----------------------------------------------------

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const result = await LostAndFoundService.getAllReports(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All lost reports retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const adminUpdateReport = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.adminUpdateReport(id, adminId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Lost report updated successfully by admin",
    data: result,
  });
});

const trackReportStatus = catchAsync(async (req: Request, res: Response) => {
  const passengerId = req.user.id;
  const { id } = req.params;

  const result = await LostAndFoundService.trackReportStatus(id, passengerId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Report tracking status retrieved successfully",
    data: result,
  });
});

export const LostAndFoundController = {
  reportLostItem,
  getMyReports,
  getReportDetails,
  confirmItemReceived,
  submitDriverRating,
  createPaymentSession,
  getDriverReports,
  markFound,
  markNotFound,
  configureRecovery,
  markReturned,
  getAllReports,
  adminUpdateReport,
  trackReportStatus,
};
