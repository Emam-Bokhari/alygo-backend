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
import { Tracking } from "../tracking/tracking.model";
import { DateTime } from "luxon";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import config from "../../../config";
import { logger } from "../../../shared/logger";

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

const getDashboardCardsFromDB = async (query: {
  startDate?: string;
  endDate?: string;
  city?: string;
  rideCategory?: string;
  status?: string;
  complaintStatus?: string;
  complaintType?: string;
}) => {
  const {
    startDate,
    endDate,
    city,
    rideCategory,
    status,
    complaintStatus,
    complaintType,
  } = query;

  const matchStage: any = {};

  // Date range filter (trip report creation date)
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      const sDate = new Date(startDate);
      if (!isNaN(sDate.getTime())) {
        matchStage.createdAt.$gte = sDate;
      }
    }
    if (endDate) {
      const eDate = new Date(endDate);
      if (!isNaN(eDate.getTime())) {
        matchStage.createdAt.$lte = eDate;
      }
    }
  }

  // Complaint status filter
  const statusVal = status || complaintStatus;
  if (statusVal) {
    let mappedStatus = "";
    if (statusVal === "PENDING_REVIEW" || statusVal === "open") {
      mappedStatus = "open";
    } else if (statusVal === "UNDER_INVESTIGATION" || statusVal === "investigating") {
      mappedStatus = "investigating";
    } else if (statusVal === "REJECTED" || statusVal === "rejected") {
      mappedStatus = "rejected";
    } else if (statusVal === "RESOLVED" || statusVal === "resolved") {
      mappedStatus = "resolved";
    }

    if (mappedStatus) {
      matchStage.status = mappedStatus;
    }
  }

  // Ride Category filter
  if (rideCategory) {
    if (Types.ObjectId.isValid(rideCategory)) {
      matchStage["ride.rideCategory.categoryId"] = new Types.ObjectId(rideCategory);
    } else {
      matchStage["rideSnapshot.rideCategory"] = { $regex: rideCategory, $options: "i" };
    }
  }

  // City filter
  if (city) {
    matchStage["serviceArea.city"] = { $regex: city, $options: "i" };
  }

  // Complaint type filter (issueName or issueId)
  if (complaintType) {
    if (Types.ObjectId.isValid(complaintType)) {
      matchStage.issueId = new Types.ObjectId(complaintType);
    } else {
      matchStage["issueCategory.issueName"] = { $regex: complaintType, $options: "i" };
    }
  }

  const pipeline = [
    // 1. Join with rides (to support category/city filters)
    {
      $lookup: {
        from: "rides",
        localField: "rideId",
        foreignField: "_id",
        as: "ride",
      },
    },
    {
      $unwind: {
        path: "$ride",
        preserveNullAndEmptyArrays: true,
      },
    },
    // 2. Join with serviceareas (to support city filtering)
    {
      $lookup: {
        from: "serviceareas",
        localField: "ride.serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
      },
    },
    {
      $unwind: {
        path: "$serviceArea",
        preserveNullAndEmptyArrays: true,
      },
    },
    // 3. Join with reportissuecategories (to support complaint type filtering)
    {
      $lookup: {
        from: "reportissuecategories",
        localField: "issueId",
        foreignField: "_id",
        as: "issueCategory",
      },
    },
    {
      $unwind: {
        path: "$issueCategory",
        preserveNullAndEmptyArrays: true,
      },
    },
    // 4. Apply constructed matches
    {
      $match: matchStage,
    },
    // 5. Facet grouping to count statuses in a single DB call
    {
      $facet: {
        totalComplaints: [{ $count: "count" }],
        pendingReview: [
          { $match: { status: "open" } },
          { $count: "count" },
        ],
        underInvestigation: [
          { $match: { status: "investigating" } },
          { $count: "count" },
        ],
        rejected: [
          { $match: { status: "rejected" } },
          { $count: "count" },
        ],
      },
    },
    // 6. Reshape results
    {
      $project: {
        totalComplaints: {
          $ifNull: [{ $arrayElemAt: ["$totalComplaints.count", 0] }, 0],
        },
        pendingReview: {
          $ifNull: [{ $arrayElemAt: ["$pendingReview.count", 0] }, 0],
        },
        underInvestigation: {
          $ifNull: [{ $arrayElemAt: ["$underInvestigation.count", 0] }, 0],
        },
        rejected: {
          $ifNull: [{ $arrayElemAt: ["$rejected.count", 0] }, 0],
        },
      },
    },
  ];

  const result = await TripReport.aggregate(pipeline);

  return {
    totalComplaints: result[0]?.totalComplaints || 0,
    pendingReview: result[0]?.pendingReview || 0,
    underInvestigation: result[0]?.underInvestigation || 0,
    approvedRefunds: 0, // Refunds are excluded
    rejected: result[0]?.rejected || 0,
  };
};

/**
 * Get all complaints (Admin Queue)
 */
const getAllComplaintsFromDB = async (filters: {
  page?: number;
  limit?: number;
  status?: string;
  complaintType?: string;
  city?: string;
  rideCategory?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const matchStage: any = {};

  // Date range filter (trip report creation date)
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) {
      matchStage.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      matchStage.createdAt.$lte = new Date(filters.endDate);
    }
  }

  // Complaint status filter
  if (filters.status) {
    let mappedStatus = "";
    if (filters.status === "PENDING_REVIEW" || filters.status === "open") mappedStatus = "open";
    else if (filters.status === "UNDER_INVESTIGATION" || filters.status === "investigating") mappedStatus = "investigating";
    else if (filters.status === "REJECTED" || filters.status === "rejected") mappedStatus = "rejected";
    else if (filters.status === "RESOLVED" || filters.status === "resolved") mappedStatus = "resolved";

    if (mappedStatus) {
      matchStage.status = mappedStatus;
    }
  }

  const afterLookupMatch: any = {};

  if (filters.city) {
    afterLookupMatch["serviceArea.city"] = { $regex: filters.city, $options: "i" };
  }

  if (filters.rideCategory) {
    if (Types.ObjectId.isValid(filters.rideCategory)) {
      afterLookupMatch["ride.rideCategory.categoryId"] = new Types.ObjectId(filters.rideCategory);
    } else {
      afterLookupMatch["rideSnapshot.rideCategory"] = { $regex: filters.rideCategory, $options: "i" };
    }
  }

  if (filters.complaintType) {
    if (Types.ObjectId.isValid(filters.complaintType)) {
      matchStage.issueId = new Types.ObjectId(filters.complaintType);
    } else {
      afterLookupMatch["issueCategory.issueName"] = { $regex: filters.complaintType, $options: "i" };
    }
  }

  // Sorting
  const sortStage: any = {};
  if (filters.sortBy) {
    const order = filters.sortOrder === "asc" ? 1 : -1;
    if (filters.sortBy === "reportedAt") {
      sortStage.createdAt = order;
    } else {
      sortStage[filters.sortBy] = order;
    }
  } else {
    sortStage.createdAt = -1; // Default newest first
  }

  const pipeline: any[] = [
    { $match: matchStage },
    // Join with Ride
    {
      $lookup: {
        from: "rides",
        localField: "rideId",
        foreignField: "_id",
        as: "ride",
      },
    },
    { $unwind: { path: "$ride", preserveNullAndEmptyArrays: true } },
    // Join with Passenger (User)
    {
      $lookup: {
        from: "users",
        localField: "reporterId",
        foreignField: "_id",
        as: "passenger",
      },
    },
    { $unwind: { path: "$passenger", preserveNullAndEmptyArrays: true } },
    // Join with Driver (User)
    {
      $lookup: {
        from: "users",
        localField: "ride.driverId",
        foreignField: "_id",
        as: "driver",
      },
    },
    { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
    // Join with ReportIssueCategory
    {
      $lookup: {
        from: "reportissuecategories",
        localField: "issueId",
        foreignField: "_id",
        as: "issueCategory",
      },
    },
    { $unwind: { path: "$issueCategory", preserveNullAndEmptyArrays: true } },
    // Join with ServiceArea
    {
      $lookup: {
        from: "serviceareas",
        localField: "ride.serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
      },
    },
    { $unwind: { path: "$serviceArea", preserveNullAndEmptyArrays: true } },
    // Join with Tracking
    {
      $lookup: {
        from: "trackings",
        localField: "rideId",
        foreignField: "rideId",
        as: "tracking",
      },
    },
    { $unwind: { path: "$tracking", preserveNullAndEmptyArrays: true } },
  ];

  if (Object.keys(afterLookupMatch).length > 0) {
    pipeline.push({ $match: afterLookupMatch });
  }

  // Calculate distanceDeltaMeters
  pipeline.push({
    $addFields: {
      distanceDeltaMeters: {
        $round: {
          $abs: {
            $multiply: [
              {
                $subtract: [
                  { $ifNull: ["$tracking.totalDistanceKm", { $ifNull: ["$ride.routeInfo.totalDistanceKm", 0] }] },
                  { $ifNull: ["$ride.routeInfo.totalDistanceKm", 0] }
                ]
              },
              1000
            ]
          }
        }
      }
    }
  });

  // Re-match for search after adding names
  if (filters.search) {
    const searchRegex = { $regex: filters.search, $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { ticketId: searchRegex },
          { providedSummaryDetails: searchRegex },
          { "passenger.name": searchRegex },
          { "passenger.phone": searchRegex },
          { "driver.name": searchRegex }
        ]
      }
    });
  }

  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
      ],
    },
  });

  const result = await TripReport.aggregate(pipeline);
  const total = result[0]?.metadata[0]?.total || 0;
  const rawData = result[0]?.data || [];

  const data = rawData.map((item: any) => {
    return {
      complaintId: item.ticketId,
      rideId: item.rideId,
      passenger: {
        id: item.passenger?._id || item.reporterId,
        name: item.passenger?.name || "Passenger"
      },
      driver: {
        id: item.driver?._id || item.rideSnapshot?.driverId,
        name: item.driver?.name || item.rideSnapshot?.driverName
      },
      complaintType: item.issueCategory?.issueName || "General",
      distanceDeltaMeters: item.distanceDeltaMeters || 0,
      fare: item.ride?.fare?.total || 0,
      reportedAt: item.createdAt,
      status: item.status
    };
  });

  return {
    success: true,
    message: "Trip completion complaints retrieved successfully",
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    data
  };
};

/**
 * Get detailed complaint report
 */
const getComplaintDetailsFromDB = async (complaintId: string) => {
  const query = Types.ObjectId.isValid(complaintId)
    ? { _id: new Types.ObjectId(complaintId) }
    : { ticketId: complaintId };

  const report = await TripReport.findOne(query)
    .populate("rideId")
    .populate("reporterId", "name email phone profileImage")
    .populate("issueId", "issueName description");

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Trip completion complaint not found");
  }

  const ride: any = report.rideId;
  const passenger: any = report.reporterId;
  let driver: any = null;

  if (ride && ride.driverId) {
    driver = await User.findById(ride.driverId).select("name email phone profileImage");
  }

  const tracking = await Tracking.findOne({ rideId: report.rideId });

  const estimatedDistance = (ride?.routeInfo?.totalDistanceKm || 0) * 1000;
  const actualDistance = (tracking?.totalDistanceKm || ride?.routeInfo?.totalDistanceKm || 0) * 1000;
  const gpsSummary = {
    estimatedDistanceMeters: Math.round(estimatedDistance),
    actualDistanceMeters: Math.round(actualDistance),
    distanceDeltaMeters: Math.round(Math.abs(actualDistance - estimatedDistance)),
    pickupCoords: ride?.pickup?.location?.coordinates || null,
    dropoffCoords: ride?.destination?.location?.coordinates || null,
    actualRoutePolyline: tracking?.polyline || ride?.routeInfo?.polyline || null,
  };

  const fareBreakdown = ride?.fare || {
    baseFare: 0,
    distanceFare: 0,
    timeFare: 0,
    subtotal: 0,
    commission: 0,
    driverEarning: 0,
    total: 0
  };

  const timelineEvents: Array<{ event: string; timestamp: Date; actor?: string; details?: any }> = [];

  if (ride) {
    if (ride.requestedAt) {
      timelineEvents.push({ event: "Ride Requested", timestamp: ride.requestedAt, actor: "Passenger" });
    }
    if (ride.acceptedAt) {
      timelineEvents.push({ event: "Ride Accepted", timestamp: ride.acceptedAt, actor: "Driver" });
    }
    if (ride.arrivedAt) {
      timelineEvents.push({ event: "Driver Arrived at Pickup", timestamp: ride.arrivedAt, actor: "Driver" });
    }
    if (ride.startedAt) {
      timelineEvents.push({ event: "Ride Started", timestamp: ride.startedAt, actor: "Driver" });
    }
    if (ride.completedAt) {
      timelineEvents.push({ event: "Ride Completed", timestamp: ride.completedAt, actor: "Driver" });
    }
  }

  timelineEvents.push({
    event: "Complaint Filed",
    timestamp: report.createdAt,
    actor: "Passenger",
    details: { issue: (report.issueId as any)?.issueName, details: report.providedSummaryDetails }
  });

  if (report.auditLogs && report.auditLogs.length > 0) {
    for (const log of report.auditLogs) {
      let eventName = log.action;
      if (log.action === "STATUS_CHANGE") {
        eventName = `Status changed to ${log.details?.newStatus || "Unknown"}`;
      } else if (log.action === "INVESTIGATION_UPDATE") {
        eventName = "Investigation Update";
      }
      timelineEvents.push({
        event: eventName,
        timestamp: log.timestamp,
        actor: log.actorRole,
        details: log.details
      });
    }
  }

  timelineEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const formattedComplaint = {
    id: report._id,
    ticketId: report.ticketId,
    providedSummaryDetails: report.providedSummaryDetails,
    estimatedResponseTimeInMinutes: report.estimatedResponseTimeInMinutes,
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };

  return {
    success: true,
    message: "Complaint details retrieved successfully",
    data: {
      complaint: formattedComplaint,
      ride: ride || null,
      passenger: passenger ? { id: passenger._id, name: passenger.name, email: passenger.email, phone: passenger.phone, profileImage: passenger.profileImage } : null,
      driver: driver ? { id: driver._id, name: driver.name, email: driver.email, phone: driver.phone, profileImage: driver.profileImage } : null,
      gpsSummary,
      fareBreakdown,
      refund: null, // Refunds are excluded
      timeline: timelineEvents,
      adminNotes: report.adminNotes || []
    }
  };
};

/**
 * Update complaint status
 */
const updateComplaintStatusInDB = async (
  adminId: string,
  complaintId: string,
  payload: {
    status: string;
    adminNote?: string;
  },
) => {
  const query = Types.ObjectId.isValid(complaintId)
    ? { _id: new Types.ObjectId(complaintId) }
    : { ticketId: complaintId };

  const report = await TripReport.findOne(query);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Trip completion complaint not found");
  }

  let dbStatus = "";
  if (payload.status === "PENDING_REVIEW" || payload.status === "open") dbStatus = "open";
  else if (payload.status === "UNDER_INVESTIGATION" || payload.status === "investigating") dbStatus = "investigating";
  else if (payload.status === "REJECTED" || payload.status === "rejected") dbStatus = "rejected";
  else if (payload.status === "RESOLVED" || payload.status === "resolved") dbStatus = "resolved";

  if (!dbStatus) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid status value");
  }

  const oldStatus = report.status;
  report.status = dbStatus as TRIP_REPORT_STATUS;

  if (dbStatus === "resolved" && oldStatus !== "resolved") {
    report.resolvedBy = new Types.ObjectId(adminId);
    report.resolvedAt = new Date();
  }

  if (payload.adminNote && payload.adminNote.trim()) {
    if (!report.adminNotes) report.adminNotes = [];
    report.adminNotes.push({
      note: payload.adminNote.trim(),
      adminId: new Types.ObjectId(adminId),
      createdAt: new Date(),
    });
  }

  if (!report.auditLogs) report.auditLogs = [];
  report.auditLogs.push({
    action: "STATUS_CHANGE",
    actor: new Types.ObjectId(adminId),
    actorRole: "ADMIN",
    details: {
      oldStatus,
      newStatus: dbStatus,
      note: payload.adminNote || "",
    },
    timestamp: new Date(),
  });

  await report.save();

  try {
    let notifyTitle = "";
    let notifyText = "";
    if (dbStatus === "investigating") {
      notifyTitle = "Trip Complaint Under Investigation";
      notifyText = `Your trip complaint (Ticket: ${report.ticketId}) is now under investigation by our support team.`;
    } else if (dbStatus === "resolved") {
      notifyTitle = "Trip Complaint Resolved";
      notifyText = `Your trip complaint (Ticket: ${report.ticketId}) has been successfully resolved. Thank you for your patience.`;
    } else if (dbStatus === "rejected") {
      notifyTitle = "Trip Complaint Rejected";
      notifyText = `Your trip complaint (Ticket: ${report.ticketId}) has been reviewed and rejected. Please contact support for more details.`;
    }

    if (notifyTitle) {
      await sendNotifications({
        receiver: report.reporterId,
        type: NOTIFICATION_TYPE.USER,
        title: notifyTitle,
        text: notifyText,
        referenceId: report.rideId,
        referenceModel: "Ride",
      });
    }
  } catch (error) {
    logger.error("Failed to send complaint status update notification:", error);
  }

  return {
    success: true,
    message: "Complaint status updated successfully",
    data: {
      complaintId: report.ticketId,
      status: report.status,
      updatedAt: report.updatedAt,
    },
  };
};

/**
 * Get monthly complaint trend chart
 */
const getComplaintTrendFromDB = async (query: {
  startDate?: string;
  endDate?: string;
  city?: string;
  rideCategory?: string;
}) => {
  const { startDate, endDate, city, rideCategory } = query;

  const systemConfig = await getSystemConfig();
  const tz =
    systemConfig.driverRewards?.timezone ||
    config.driverRewards?.timezone ||
    (process.env.TIMEZONE as string) ||
    "Asia/Dhaka";

  const matchStage: any = {};

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      matchStage.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchStage.createdAt.$lte = new Date(endDate);
    }
  }

  const afterLookupMatch: any = {};

  if (city) {
    afterLookupMatch["serviceArea.city"] = { $regex: city, $options: "i" };
  }

  if (rideCategory) {
    if (Types.ObjectId.isValid(rideCategory)) {
      afterLookupMatch["ride.rideCategory.categoryId"] = new Types.ObjectId(rideCategory);
    } else {
      afterLookupMatch["rideSnapshot.rideCategory"] = { $regex: rideCategory, $options: "i" };
    }
  }

  const pipeline: any[] = [
    { $match: matchStage },
    // Join with Ride
    {
      $lookup: {
        from: "rides",
        localField: "rideId",
        foreignField: "_id",
        as: "ride",
      },
    },
    { $unwind: { path: "$ride", preserveNullAndEmptyArrays: true } },
    // Join with ServiceArea
    {
      $lookup: {
        from: "serviceareas",
        localField: "ride.serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
      },
    },
    { $unwind: { path: "$serviceArea", preserveNullAndEmptyArrays: true } },
  ];

  if (Object.keys(afterLookupMatch).length > 0) {
    pipeline.push({ $match: afterLookupMatch });
  }

  pipeline.push(
    {
      $project: {
        yearMonth: {
          $dateToString: {
            format: "%Y-%m",
            date: "$createdAt",
            timezone: tz,
          },
        },
      },
    },
    {
      $group: {
        _id: "$yearMonth",
        count: { $sum: 1 },
      },
    },
  );

  const aggregationResult = await TripReport.aggregate(pipeline);

  const monthlyCountMap: Record<string, number> = {};
  for (const item of aggregationResult) {
    if (item._id) {
      monthlyCountMap[item._id] = item.count;
    }
  }

  let start = startDate ? DateTime.fromISO(startDate) : DateTime.now().minus({ months: 5 });
  let end = endDate ? DateTime.fromISO(endDate) : DateTime.now();

  if (!start.isValid) start = DateTime.now().minus({ months: 5 });
  if (!end.isValid) end = DateTime.now();

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  const monthsList: DateTime[] = [];
  let currentMonth = start.startOf("month");
  const limitMonth = end.startOf("month");

  while (currentMonth <= limitMonth) {
    monthsList.push(currentMonth);
    currentMonth = currentMonth.plus({ months: 1 });
  }

  const data = monthsList.map((m) => {
    const key = m.toFormat("yyyy-MM");
    const label = m.toFormat("LLL");
    return {
      month: label,
      complaints: monthlyCountMap[key] || 0,
    };
  });

  return {
    success: true,
    message: "Complaint trend retrieved successfully",
    data,
  };
};

export const TripReportService = {
  createTripReport,
  getAllTripReports,
  getTripReportById,
  updateTripReport,
  getDashboardCardsFromDB,
  getAllComplaintsFromDB,
  getComplaintDetailsFromDB,
  updateComplaintStatusInDB,
  getComplaintTrendFromDB,
};
