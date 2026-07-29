"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripReportService = void 0;
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const http_status_codes_1 = require("http-status-codes");
const tripReport_model_1 = require("./tripReport.model");
const ride_model_1 = require("../ride/ride.model");
const reportIssueCategory_model_1 = require("../reportIssueCategory/reportIssueCategory.model");
const user_model_1 = require("../user/user.model");
const car_model_1 = require("../car/car.model");
const tripReport_constant_1 = require("./tripReport.constant");
const ride_constant_1 = require("../ride/ride.constant");
const status_1 = require("../../../constants/status");
const ticketIdHelper_1 = require("../../../helpers/ticketIdHelper");
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const tracking_model_1 = require("../tracking/tracking.model");
const luxon_1 = require("luxon");
const systemConfigHelper_1 = require("../../../helpers/systemConfigHelper");
const config_1 = __importDefault(require("../../../config"));
const logger_1 = require("../../../shared/logger");
const points_service_1 = require("../tier/points.service");
const tier_constant_1 = require("../tier/tier.constant");
/**
 * Create a trip report for a completed ride
 * Only the passenger (user) who took the ride can submit a report
 */
const createTripReport = (reporterId, rideId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Step 1: Find the ride
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Ride not found");
    }
    // Step 2: Ride must be COMPLETED
    if (ride.status !== ride_constant_1.RIDE_STATUS.COMPLETED) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot report a ride with status: ${ride.status}. Only completed rides can be reported.`);
    }
    // Step 3: Only ride.userId can submit the report
    if (ride.userId.toString() !== reporterId) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "Only the passenger who took this ride can submit a report.");
    }
    // Step 4: Ensure no report already exists for this ride
    const existingReport = yield tripReport_model_1.TripReport.findOne({
        rideId: new mongoose_1.Types.ObjectId(rideId),
    });
    if (existingReport) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.CONFLICT, "This trip has already been reported.");
    }
    // Step 5: Load the selected ReportIssueCategory
    const issueCategory = yield reportIssueCategory_model_1.ReportIssueCategory.findById(payload.issueId);
    if (!issueCategory) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Issue category not found");
    }
    if (issueCategory.status !== status_1.STATUS.ACTIVE) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "This issue category is not active");
    }
    // Step 6: Generate a unique Ticket ID
    const ticketId = yield (0, ticketIdHelper_1.generateTicketId)();
    // Step 7: Fetch driver and vehicle information for snapshot
    let driverName = "Unknown Driver";
    const driverUser = yield user_model_1.User.findById(ride.driverId);
    if (driverUser) {
        driverName = driverUser.name;
    }
    let vehicleName = "Unknown Vehicle";
    let vehicleNumber = "Unknown";
    if (ride.carId) {
        const car = yield car_model_1.Car.findById(ride.carId);
        if (car) {
            vehicleName = `${car.brand} ${car.model}`;
            vehicleNumber = car.licensePlate;
        }
    }
    // Step 8: Create the report with ride snapshot
    const reportData = {
        ticketId,
        rideId: new mongoose_1.Types.ObjectId(rideId),
        reporterId: new mongoose_1.Types.ObjectId(reporterId),
        issueId: new mongoose_1.Types.ObjectId(payload.issueId),
        providedSummaryDetails: ((_a = payload.providedSummaryDetails) === null || _a === void 0 ? void 0 : _a.trim()) || "",
        estimatedResponseTimeInMinutes: issueCategory.estimatedResponseTimeInMinutes,
        status: tripReport_constant_1.TRIP_REPORT_STATUS.OPEN,
        rideSnapshot: {
            rideCategory: ride.rideCategory.name,
            pickupAddress: ride.pickup.address,
            destinationAddress: ride.destination.address,
            driverId: ride.driverId,
            driverName,
            vehicleName,
            vehicleNumber,
            completedAt: ride.completedAt,
        },
    };
    const report = yield tripReport_model_1.TripReport.create(reportData);
    // Step 9: Send confirmation notification to passenger
    yield (0, notificationsHelper_1.sendNotifications)({
        receiver: new mongoose_1.Types.ObjectId(reporterId),
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        title: "Trip Report Submitted Successfully",
        text: `Ticket ID: ${ticketId}\nEstimated Response Time: ${issueCategory.estimatedResponseTimeInMinutes} Minutes\nCurrent Status: Open`,
        referenceId: new mongoose_1.Types.ObjectId(rideId),
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
});
/**
 * Get all trip reports with pagination, search, filtering, and sorting
 * Admin only
 */
const getAllTripReports = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, status, issueId, driverId, startDate, endDate, ticketId, search, } = filters;
    const query = {};
    // Filter by status
    if (status) {
        query.status = status;
    }
    // Filter by issue category
    if (issueId) {
        query.issueId = new mongoose_1.Types.ObjectId(issueId);
    }
    // Filter by driver (from ride snapshot)
    if (driverId) {
        query["rideSnapshot.driverId"] = new mongoose_1.Types.ObjectId(driverId);
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
    const [reports, total] = yield Promise.all([
        tripReport_model_1.TripReport.find(query)
            .populate("rideId", "shareToken status")
            .populate("reporterId", "name email phone")
            .populate("issueId", "issueName description")
            .populate("resolvedBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        tripReport_model_1.TripReport.countDocuments(query),
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
});
/**
 * Get a single trip report by ID
 * Admin only
 */
const getTripReportById = (reportId) => __awaiter(void 0, void 0, void 0, function* () {
    const report = yield tripReport_model_1.TripReport.findById(reportId)
        .populate("rideId")
        .populate("reporterId", "name email phone")
        .populate("issueId", "issueName description estimatedResponseTimeInMinutes")
        .populate("resolvedBy", "name email");
    if (!report) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Trip report not found");
    }
    return {
        success: true,
        data: report,
    };
});
/**
 * Update a trip report (status and resolution notes)
 * Admin only
 */
const updateTripReport = (adminId, reportId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const report = yield tripReport_model_1.TripReport.findById(reportId);
    if (!report) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Trip report not found");
    }
    const updateData = {};
    if (payload.status) {
        updateData.status = payload.status;
        // If status is being set to resolved, auto-populate resolvedBy and resolvedAt
        if (payload.status === tripReport_constant_1.TRIP_REPORT_STATUS.RESOLVED &&
            report.status !== tripReport_constant_1.TRIP_REPORT_STATUS.RESOLVED) {
            updateData.resolvedBy = new mongoose_1.Types.ObjectId(adminId);
            updateData.resolvedAt = new Date();
        }
    }
    if (payload.resolutionNotes !== undefined) {
        updateData.resolutionNotes = payload.resolutionNotes.trim();
    }
    const updatedReport = yield tripReport_model_1.TripReport.findByIdAndUpdate(reportId, updateData, { new: true })
        .populate("rideId", "shareToken status")
        .populate("reporterId", "name email phone")
        .populate("issueId", "issueName description")
        .populate("resolvedBy", "name email");
    if (payload.status === tripReport_constant_1.TRIP_REPORT_STATUS.RESOLVED &&
        report.status !== tripReport_constant_1.TRIP_REPORT_STATUS.RESOLVED &&
        updatedReport &&
        ((_a = updatedReport.rideSnapshot) === null || _a === void 0 ? void 0 : _a.driverId)) {
        points_service_1.PointsService.deductPoints(updatedReport.rideSnapshot.driverId, tier_constant_1.POINT_EVENT_TYPE.POLICY_VIOLATION, "tripReport", updatedReport._id, {
            notes: `Policy violation confirmed for ticket ${updatedReport.ticketId}`,
            rideId: updatedReport.rideId,
        }).catch((err) => logger_1.logger.error(`[Point Processing Failed] Error deducting points for policy violation:`, err));
    }
    return {
        success: true,
        message: "Trip report updated successfully",
        data: updatedReport,
    };
});
const getDashboardCardsFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { startDate, endDate, city, rideCategory, status, complaintStatus, complaintType, } = query;
    const matchStage = {};
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
        }
        else if (statusVal === "UNDER_INVESTIGATION" ||
            statusVal === "investigating") {
            mappedStatus = "investigating";
        }
        else if (statusVal === "REJECTED" || statusVal === "rejected") {
            mappedStatus = "rejected";
        }
        else if (statusVal === "RESOLVED" || statusVal === "resolved") {
            mappedStatus = "resolved";
        }
        if (mappedStatus) {
            matchStage.status = mappedStatus;
        }
    }
    // Ride Category filter
    if (rideCategory) {
        if (mongoose_1.Types.ObjectId.isValid(rideCategory)) {
            matchStage["ride.rideCategory.categoryId"] = new mongoose_1.Types.ObjectId(rideCategory);
        }
        else {
            matchStage["rideSnapshot.rideCategory"] = {
                $regex: rideCategory,
                $options: "i",
            };
        }
    }
    // City filter
    if (city) {
        matchStage["serviceArea.city"] = { $regex: city, $options: "i" };
    }
    // Complaint type filter (issueName or issueId)
    if (complaintType) {
        if (mongoose_1.Types.ObjectId.isValid(complaintType)) {
            matchStage.issueId = new mongoose_1.Types.ObjectId(complaintType);
        }
        else {
            matchStage["issueCategory.issueName"] = {
                $regex: complaintType,
                $options: "i",
            };
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
                pendingReview: [{ $match: { status: "open" } }, { $count: "count" }],
                underInvestigation: [
                    { $match: { status: "investigating" } },
                    { $count: "count" },
                ],
                rejected: [{ $match: { status: "rejected" } }, { $count: "count" }],
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
    const result = yield tripReport_model_1.TripReport.aggregate(pipeline);
    return {
        totalComplaints: ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.totalComplaints) || 0,
        pendingReview: ((_b = result[0]) === null || _b === void 0 ? void 0 : _b.pendingReview) || 0,
        underInvestigation: ((_c = result[0]) === null || _c === void 0 ? void 0 : _c.underInvestigation) || 0,
        approvedRefunds: 0, // Refunds are excluded
        rejected: ((_d = result[0]) === null || _d === void 0 ? void 0 : _d.rejected) || 0,
    };
});
/**
 * Get all complaints (Admin Queue)
 */
const getAllComplaintsFromDB = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;
    const matchStage = {};
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
        if (filters.status === "PENDING_REVIEW" || filters.status === "open")
            mappedStatus = "open";
        else if (filters.status === "UNDER_INVESTIGATION" ||
            filters.status === "investigating")
            mappedStatus = "investigating";
        else if (filters.status === "REJECTED" || filters.status === "rejected")
            mappedStatus = "rejected";
        else if (filters.status === "RESOLVED" || filters.status === "resolved")
            mappedStatus = "resolved";
        if (mappedStatus) {
            matchStage.status = mappedStatus;
        }
    }
    const afterLookupMatch = {};
    if (filters.city) {
        afterLookupMatch["serviceArea.city"] = {
            $regex: filters.city,
            $options: "i",
        };
    }
    if (filters.rideCategory) {
        if (mongoose_1.Types.ObjectId.isValid(filters.rideCategory)) {
            afterLookupMatch["ride.rideCategory.categoryId"] = new mongoose_1.Types.ObjectId(filters.rideCategory);
        }
        else {
            afterLookupMatch["rideSnapshot.rideCategory"] = {
                $regex: filters.rideCategory,
                $options: "i",
            };
        }
    }
    if (filters.complaintType) {
        if (mongoose_1.Types.ObjectId.isValid(filters.complaintType)) {
            matchStage.issueId = new mongoose_1.Types.ObjectId(filters.complaintType);
        }
        else {
            afterLookupMatch["issueCategory.issueName"] = {
                $regex: filters.complaintType,
                $options: "i",
            };
        }
    }
    // Sorting
    const sortStage = {};
    if (filters.sortBy) {
        const order = filters.sortOrder === "asc" ? 1 : -1;
        if (filters.sortBy === "reportedAt") {
            sortStage.createdAt = order;
        }
        else {
            sortStage[filters.sortBy] = order;
        }
    }
    else {
        sortStage.createdAt = -1; // Default newest first
    }
    const pipeline = [
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
                                    {
                                        $ifNull: [
                                            "$tracking.totalDistanceKm",
                                            { $ifNull: ["$ride.routeInfo.totalDistanceKm", 0] },
                                        ],
                                    },
                                    { $ifNull: ["$ride.routeInfo.totalDistanceKm", 0] },
                                ],
                            },
                            1000,
                        ],
                    },
                },
            },
        },
    });
    // Re-match for search after adding names
    if (filters.searchTerm) {
        const searchRegex = { $regex: filters.searchTerm, $options: "i" };
        pipeline.push({
            $match: {
                $or: [
                    { ticketId: searchRegex },
                    { providedSummaryDetails: searchRegex },
                    { "passenger.name": searchRegex },
                    { "passenger.phone": searchRegex },
                    { "driver.name": searchRegex },
                ],
            },
        });
    }
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
        },
    });
    const result = yield tripReport_model_1.TripReport.aggregate(pipeline);
    const total = ((_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.metadata[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
    const rawData = ((_c = result[0]) === null || _c === void 0 ? void 0 : _c.data) || [];
    const data = rawData.map((item) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        return {
            complaintId: item.ticketId,
            rideId: item.rideId,
            passenger: {
                id: ((_a = item.passenger) === null || _a === void 0 ? void 0 : _a._id) || item.reporterId,
                name: ((_b = item.passenger) === null || _b === void 0 ? void 0 : _b.name) || "Passenger",
            },
            driver: {
                id: ((_c = item.driver) === null || _c === void 0 ? void 0 : _c._id) || ((_d = item.rideSnapshot) === null || _d === void 0 ? void 0 : _d.driverId),
                name: ((_e = item.driver) === null || _e === void 0 ? void 0 : _e.name) || ((_f = item.rideSnapshot) === null || _f === void 0 ? void 0 : _f.driverName),
            },
            complaintType: ((_g = item.issueCategory) === null || _g === void 0 ? void 0 : _g.issueName) || "General",
            distanceDeltaMeters: item.distanceDeltaMeters || 0,
            fare: ((_j = (_h = item.ride) === null || _h === void 0 ? void 0 : _h.fare) === null || _j === void 0 ? void 0 : _j.total) || 0,
            reportedAt: item.createdAt,
            status: item.status,
        };
    });
    return {
        success: true,
        message: "Trip completion complaints retrieved successfully",
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data,
    };
});
/**
 * Get detailed complaint report
 */
const getComplaintDetailsFromDB = (complaintId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const query = mongoose_1.Types.ObjectId.isValid(complaintId)
        ? { _id: new mongoose_1.Types.ObjectId(complaintId) }
        : { ticketId: complaintId };
    const report = yield tripReport_model_1.TripReport.findOne(query)
        .populate("rideId")
        .populate("reporterId", "name email phone profileImage")
        .populate("issueId", "issueName description");
    if (!report) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Trip completion complaint not found");
    }
    const ride = report.rideId;
    const passenger = report.reporterId;
    let driver = null;
    if (ride && ride.driverId) {
        driver = yield user_model_1.User.findById(ride.driverId).select("name email phone profileImage");
    }
    const tracking = yield tracking_model_1.Tracking.findOne({ rideId: report.rideId });
    const estimatedDistance = (((_a = ride === null || ride === void 0 ? void 0 : ride.routeInfo) === null || _a === void 0 ? void 0 : _a.totalDistanceKm) || 0) * 1000;
    const actualDistance = ((tracking === null || tracking === void 0 ? void 0 : tracking.totalDistanceKm) || ((_b = ride === null || ride === void 0 ? void 0 : ride.routeInfo) === null || _b === void 0 ? void 0 : _b.totalDistanceKm) || 0) * 1000;
    const gpsSummary = {
        estimatedDistanceMeters: Math.round(estimatedDistance),
        actualDistanceMeters: Math.round(actualDistance),
        distanceDeltaMeters: Math.round(Math.abs(actualDistance - estimatedDistance)),
        pickupCoords: ((_d = (_c = ride === null || ride === void 0 ? void 0 : ride.pickup) === null || _c === void 0 ? void 0 : _c.location) === null || _d === void 0 ? void 0 : _d.coordinates) || null,
        dropoffCoords: ((_f = (_e = ride === null || ride === void 0 ? void 0 : ride.destination) === null || _e === void 0 ? void 0 : _e.location) === null || _f === void 0 ? void 0 : _f.coordinates) || null,
        actualRoutePolyline: (tracking === null || tracking === void 0 ? void 0 : tracking.polyline) || ((_g = ride === null || ride === void 0 ? void 0 : ride.routeInfo) === null || _g === void 0 ? void 0 : _g.polyline) || null,
    };
    const fareBreakdown = (ride === null || ride === void 0 ? void 0 : ride.fare) || {
        baseFare: 0,
        distanceFare: 0,
        timeFare: 0,
        subtotal: 0,
        commission: 0,
        driverEarning: 0,
        total: 0,
    };
    const timelineEvents = [];
    if (ride) {
        if (ride.requestedAt) {
            timelineEvents.push({
                event: "Ride Requested",
                timestamp: ride.requestedAt,
                actor: "Passenger",
            });
        }
        if (ride.acceptedAt) {
            timelineEvents.push({
                event: "Ride Accepted",
                timestamp: ride.acceptedAt,
                actor: "Driver",
            });
        }
        if (ride.arrivedAt) {
            timelineEvents.push({
                event: "Driver Arrived at Pickup",
                timestamp: ride.arrivedAt,
                actor: "Driver",
            });
        }
        if (ride.startedAt) {
            timelineEvents.push({
                event: "Ride Started",
                timestamp: ride.startedAt,
                actor: "Driver",
            });
        }
        if (ride.completedAt) {
            timelineEvents.push({
                event: "Ride Completed",
                timestamp: ride.completedAt,
                actor: "Driver",
            });
        }
    }
    timelineEvents.push({
        event: "Complaint Filed",
        timestamp: report.createdAt,
        actor: "Passenger",
        details: {
            issue: (_h = report.issueId) === null || _h === void 0 ? void 0 : _h.issueName,
            details: report.providedSummaryDetails,
        },
    });
    if (report.auditLogs && report.auditLogs.length > 0) {
        for (const log of report.auditLogs) {
            let eventName = log.action;
            if (log.action === "STATUS_CHANGE") {
                eventName = `Status changed to ${((_j = log.details) === null || _j === void 0 ? void 0 : _j.newStatus) || "Unknown"}`;
            }
            else if (log.action === "INVESTIGATION_UPDATE") {
                eventName = "Investigation Update";
            }
            timelineEvents.push({
                event: eventName,
                timestamp: log.timestamp,
                actor: log.actorRole,
                details: log.details,
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
        updatedAt: report.updatedAt,
    };
    return {
        success: true,
        message: "Complaint details retrieved successfully",
        data: {
            complaint: formattedComplaint,
            ride: ride || null,
            passenger: passenger
                ? {
                    id: passenger._id,
                    name: passenger.name,
                    email: passenger.email,
                    phone: passenger.phone,
                    profileImage: passenger.profileImage,
                }
                : null,
            driver: driver
                ? {
                    id: driver._id,
                    name: driver.name,
                    email: driver.email,
                    phone: driver.phone,
                    profileImage: driver.profileImage,
                }
                : null,
            gpsSummary,
            fareBreakdown,
            refund: null, // Refunds are excluded
            timeline: timelineEvents,
            adminNotes: report.adminNotes || [],
        },
    };
});
/**
 * Update complaint status
 */
const updateComplaintStatusInDB = (adminId, complaintId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const query = mongoose_1.Types.ObjectId.isValid(complaintId)
        ? { _id: new mongoose_1.Types.ObjectId(complaintId) }
        : { ticketId: complaintId };
    const report = yield tripReport_model_1.TripReport.findOne(query);
    if (!report) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Trip completion complaint not found");
    }
    let dbStatus = "";
    if (payload.status === "PENDING_REVIEW" || payload.status === "open")
        dbStatus = "open";
    else if (payload.status === "UNDER_INVESTIGATION" ||
        payload.status === "investigating")
        dbStatus = "investigating";
    else if (payload.status === "REJECTED" || payload.status === "rejected")
        dbStatus = "rejected";
    else if (payload.status === "RESOLVED" || payload.status === "resolved")
        dbStatus = "resolved";
    if (!dbStatus) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid status value");
    }
    const oldStatus = report.status;
    report.status = dbStatus;
    if (dbStatus === "resolved" && oldStatus !== "resolved") {
        report.resolvedBy = new mongoose_1.Types.ObjectId(adminId);
        report.resolvedAt = new Date();
    }
    if (payload.adminNote && payload.adminNote.trim()) {
        if (!report.adminNotes)
            report.adminNotes = [];
        report.adminNotes.push({
            note: payload.adminNote.trim(),
            adminId: new mongoose_1.Types.ObjectId(adminId),
            createdAt: new Date(),
        });
    }
    if (!report.auditLogs)
        report.auditLogs = [];
    report.auditLogs.push({
        action: "STATUS_CHANGE",
        actor: new mongoose_1.Types.ObjectId(adminId),
        actorRole: "ADMIN",
        details: {
            oldStatus,
            newStatus: dbStatus,
            note: payload.adminNote || "",
        },
        timestamp: new Date(),
    });
    yield report.save();
    try {
        let notifyTitle = "";
        let notifyText = "";
        if (dbStatus === "investigating") {
            notifyTitle = "Trip Complaint Under Investigation";
            notifyText = `Your trip complaint (Ticket: ${report.ticketId}) is now under investigation by our support team.`;
        }
        else if (dbStatus === "resolved") {
            notifyTitle = "Trip Complaint Resolved";
            notifyText = `Your trip complaint (Ticket: ${report.ticketId}) has been successfully resolved. Thank you for your patience.`;
        }
        else if (dbStatus === "rejected") {
            notifyTitle = "Trip Complaint Rejected";
            notifyText = `Your trip complaint (Ticket: ${report.ticketId}) has been reviewed and rejected. Please contact support for more details.`;
        }
        if (notifyTitle) {
            yield (0, notificationsHelper_1.sendNotifications)({
                receiver: report.reporterId,
                type: notification_constant_1.NOTIFICATION_TYPE.USER,
                title: notifyTitle,
                text: notifyText,
                referenceId: report.rideId,
                referenceModel: "Ride",
            });
        }
    }
    catch (error) {
        logger_1.logger.error("Failed to send complaint status update notification:", error);
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
});
/**
 * Get monthly complaint trend chart
 */
const getComplaintTrendFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { startDate, endDate, city, rideCategory } = query;
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const tz = ((_a = systemConfig.driverRewards) === null || _a === void 0 ? void 0 : _a.timezone) ||
        ((_b = config_1.default.driverRewards) === null || _b === void 0 ? void 0 : _b.timezone) ||
        process.env.TIMEZONE ||
        "Asia/Dhaka";
    let start = startDate
        ? luxon_1.DateTime.fromISO(startDate, { zone: tz })
        : luxon_1.DateTime.now().setZone(tz).startOf("year");
    let end = endDate
        ? luxon_1.DateTime.fromISO(endDate, { zone: tz })
        : luxon_1.DateTime.now().setZone(tz).endOf("year");
    if (!start.isValid)
        start = luxon_1.DateTime.now().setZone(tz).startOf("year");
    if (!end.isValid)
        end = luxon_1.DateTime.now().setZone(tz).endOf("year");
    if (start > end) {
        const temp = start;
        start = end;
        end = temp;
    }
    const matchStage = {
        createdAt: {
            $gte: start.toJSDate(),
            $lte: end.toJSDate(),
        },
    };
    const afterLookupMatch = {};
    if (city) {
        afterLookupMatch["serviceArea.city"] = { $regex: city, $options: "i" };
    }
    if (rideCategory) {
        if (mongoose_1.Types.ObjectId.isValid(rideCategory)) {
            afterLookupMatch["ride.rideCategory.categoryId"] = new mongoose_1.Types.ObjectId(rideCategory);
        }
        else {
            afterLookupMatch["rideSnapshot.rideCategory"] = {
                $regex: rideCategory,
                $options: "i",
            };
        }
    }
    const pipeline = [
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
    pipeline.push({
        $project: {
            yearMonth: {
                $dateToString: {
                    format: "%Y-%m",
                    date: "$createdAt",
                    timezone: tz,
                },
            },
        },
    }, {
        $group: {
            _id: "$yearMonth",
            count: { $sum: 1 },
        },
    });
    const aggregationResult = yield tripReport_model_1.TripReport.aggregate(pipeline);
    const monthlyCountMap = {};
    for (const item of aggregationResult) {
        if (item._id) {
            monthlyCountMap[item._id] = item.count;
        }
    }
    const monthsList = [];
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
});
exports.TripReportService = {
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
