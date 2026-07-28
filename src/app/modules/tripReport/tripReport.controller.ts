import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TripReportService } from "./tripReport.service";
import { TripReportValidations } from "./tripReport.validation";

/**
 * Create a trip report for a completed ride
 * Only the passenger (user) who took the ride can submit a report
 */
const createTripReport = catchAsync(async (req: Request, res: Response) => {
  const reporterId = req.user.id;
  const { rideId } = req.params;

  await TripReportValidations.createTripReportValidationSchema.parseAsync({
    body: req.body,
  });

  const result = await TripReportService.createTripReport(
    reporterId,
    rideId,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: result.message,
    data: result.data,
  });
});

/**
 * Get all trip reports (Admin only)
 * Supports pagination, search, filtering, and sorting
 */
const getAllTripReports = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    status: req.query.status as string,
    issueId: req.query.issueId as string,
    driverId: req.query.driverId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    ticketId: req.query.ticketId as string,
    search: req.query.search as string,
  };

  const result = await TripReportService.getAllTripReports(filters);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Trip reports retrieved successfully",
    data: result.data,
    meta: {
      pagination: result.pagination,
    },
  });
});

/**
 * Get a single trip report by ID (Admin only)
 */
const getTripReportById = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params;

  const result = await TripReportService.getTripReportById(reportId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Trip report retrieved successfully",
    data: result.data,
  });
});

/**
 * Update a trip report (Admin only)
 * Allows updating status and resolution notes
 */
const updateTripReport = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user.id;
  const { reportId } = req.params;

  await TripReportValidations.updateTripReportValidationSchema.parseAsync({
    body: req.body,
  });

  const result = await TripReportService.updateTripReport(
    adminId,
    reportId,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const getDashboardCards = catchAsync(async (req: Request, res: Response) => {
  const result = await TripReportService.getDashboardCardsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Trip completion complaint dashboard cards retrieved successfully",
    data: result,
  });
});

const getAllComplaints = catchAsync(async (req: Request, res: Response) => {
  const result = await TripReportService.getAllComplaintsFromDB(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
      totalPage: result.pagination.totalPages,
    } as any,
    data: result.data,
  });
});

const getComplaintDetails = catchAsync(async (req: Request, res: Response) => {
  const { complaintId } = req.params;
  const result = await TripReportService.getComplaintDetailsFromDB(complaintId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const updateComplaintStatus = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { complaintId } = req.params;

    await TripReportValidations.updateComplaintStatusValidationSchema.parseAsync(
      {
        body: req.body,
      },
    );

    const result = await TripReportService.updateComplaintStatusInDB(
      adminId,
      complaintId,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: result.data,
    });
  },
);

const getComplaintTrend = catchAsync(async (req: Request, res: Response) => {
  const result = await TripReportService.getComplaintTrendFromDB(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result.data,
  });
});

export const TripReportController = {
  createTripReport,
  getAllTripReports,
  getTripReportById,
  updateTripReport,
  getDashboardCards,
  getAllComplaints,
  getComplaintDetails,
  updateComplaintStatus,
  getComplaintTrend,
};
