import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { TripReport } from "./tripReport.model";
import { ITripReport } from "./tripReport.interface";
import { Ride } from "../ride/ride.model";
import { ReportIssueCategory } from "../reportIssueCategory/reportIssueCategory.model";
import { User } from "../user/user.model";
import { Car } from "../car/car.model";
import { TRIP_REPORT_STATUS } from "./tripReport.constant";
import { RIDE_STATUS } from "../ride/ride.constant";
import { STATUS } from "../../../constants/status";
import { generateTicketId } from "../../../helpers/ticketIdHelper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";

/**
 * Create a trip report for a completed ride
 * Only the passenger (user) who took the ride can submit a report
 */
const createTripReport = async (
  reporterId: string,
  rideId: string,
  payload: {
    issueId: string;
    providedSummaryDetails?: string;
  },
) => {
  // Step 1: Find the ride
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ride not found");
  }

  // Step 2: Ride must be COMPLETED
  if (ride.status !== RIDE_STATUS.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot report a ride with status: ${ride.status}. Only completed rides can be reported.`,
    );
  }

  // Step 3: Only ride.userId can submit the report
  if (ride.userId.toString() !== reporterId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only the passenger who took this ride can submit a report.",
    );
  }

  // Step 4: Ensure no report already exists for this ride
  const existingReport = await TripReport.findOne({
    rideId: new Types.ObjectId(rideId),
  });

  if (existingReport) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "This trip has already been reported.",
    );
  }

  // Step 5: Load the selected ReportIssueCategory
  const issueCategory = await ReportIssueCategory.findById(payload.issueId);
  if (!issueCategory) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Issue category not found");
  }

  if (issueCategory.status !== STATUS.ACTIVE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "This issue category is not active",
    );
  }

  // Step 6: Generate a unique Ticket ID
  const ticketId = await generateTicketId();

  // Step 7: Fetch driver and vehicle information for snapshot
  let driverName = "Unknown Driver";
  const driverUser = await User.findById(ride.driverId);
  if (driverUser) {
    driverName = driverUser.name;
  }

  let vehicleName = "Unknown Vehicle";
  let vehicleNumber = "Unknown";
  if (ride.carId) {
    const car = await Car.findById(ride.carId);
    if (car) {
      vehicleName = `${car.brand} ${car.model}`;
      vehicleNumber = car.licensePlate;
    }
  }

  // Step 8: Create the report with ride snapshot
  const reportData: Partial<ITripReport> = {
    ticketId,
    rideId: new Types.ObjectId(rideId),
    reporterId: new Types.ObjectId(reporterId),
    issueId: new Types.ObjectId(payload.issueId),
    providedSummaryDetails: payload.providedSummaryDetails?.trim() || "",
    estimatedResponseTimeInMinutes:
      issueCategory.estimatedResponseTimeInMinutes,
    status: TRIP_REPORT_STATUS.OPEN,
    rideSnapshot: {
      rideCategory: ride.rideCategory.name,
      pickupAddress: ride.pickup.address,
      destinationAddress: ride.destination.address,
      driverId: ride.driverId!,
      driverName,
      vehicleName,
      vehicleNumber,
      completedAt: ride.completedAt!,
    },
  };

  const report = await TripReport.create(reportData);

  // Step 9: Send confirmation notification to passenger
  await sendNotifications({
    receiver: new Types.ObjectId(reporterId),
    type: NOTIFICATION_TYPE.USER,
    title: "Trip Report Submitted Successfully",
    text: `Ticket ID: ${ticketId}\nEstimated Response Time: ${issueCategory.estimatedResponseTimeInMinutes} Minutes\nCurrent Status: Open`,
    referenceId: new Types.ObjectId(rideId),
    referenceModel: "Ride",
  });

  // Step 10: Return confirmation
  return {
    success: true,
    message: "Trip reported successfully.",
    data: {
      ticketId: report.ticketId,
      estimatedResponseTimeInMinutes: report.estimatedResponseTimeInMinutes,
      status: report.status,
    },
  };
};

/**
 * Get all trip reports with pagination, search, filtering, and sorting
 * Admin only
 */
const getAllTripReports = async (filters: {
  page?: number;
  limit?: number;
  status?: string;
  issueId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
  ticketId?: string;
  search?: string;
}) => {
  const {
    page = 1,
    limit = 10,
    status,
    issueId,
    driverId,
    startDate,
    endDate,
    ticketId,
    search,
  } = filters;

  const query: any = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by issue category
  if (issueId) {
    query.issueId = new Types.ObjectId(issueId);
  }

  // Filter by driver (from ride snapshot)
  if (driverId) {
    query["rideSnapshot.driverId"] = new Types.ObjectId(driverId);
  }

  // Filter by date range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  // Filter by ticket ID (exact match or partial)
  if (ticketId) {
    query.ticketId = { $regex: ticketId, $options: "i" };
  }

  // Search in ticketId and summary details
  if (search) {
    query.$or = [
      { ticketId: { $regex: search, $options: "i" } },
      { providedSummaryDetails: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    TripReport.find(query)
      .populate("rideId", "shareToken status")
      .populate("reporterId", "name email phone")
      .populate("issueId", "issueName description")
      .populate("resolvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TripReport.countDocuments(query),
  ]);

  return {
    success: true,
    data: reports,
    pagination: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single trip report by ID
 * Admin only
 */
const getTripReportById = async (reportId: string) => {
  const report = await TripReport.findById(reportId)
    .populate("rideId")
    .populate("reporterId", "name email phone")
    .populate("issueId", "issueName description estimatedResponseTimeInMinutes")
    .populate("resolvedBy", "name email");

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Trip report not found");
  }

  return {
    success: true,
    data: report,
  };
};

/**
 * Update a trip report (status and resolution notes)
 * Admin only
 */
const updateTripReport = async (
  adminId: string,
  reportId: string,
  payload: {
    status?: TRIP_REPORT_STATUS;
    resolutionNotes?: string;
  },
) => {
  const report = await TripReport.findById(reportId);

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Trip report not found");
  }

  const updateData: any = {};

  if (payload.status) {
    updateData.status = payload.status;

    // If status is being set to resolved, auto-populate resolvedBy and resolvedAt
    if (
      payload.status === TRIP_REPORT_STATUS.RESOLVED &&
      report.status !== TRIP_REPORT_STATUS.RESOLVED
    ) {
      updateData.resolvedBy = new Types.ObjectId(adminId);
      updateData.resolvedAt = new Date();
    }
  }

  if (payload.resolutionNotes !== undefined) {
    updateData.resolutionNotes = payload.resolutionNotes.trim();
  }

  const updatedReport = await TripReport.findByIdAndUpdate(
    reportId,
    updateData,
    { new: true },
  )
    .populate("rideId", "shareToken status")
    .populate("reporterId", "name email phone")
    .populate("issueId", "issueName description")
    .populate("resolvedBy", "name email");

  return {
    success: true,
    message: "Trip report updated successfully",
    data: updatedReport,
  };
};

export const TripReportService = {
  createTripReport,
  getAllTripReports,
  getTripReportById,
  updateTripReport,
};
