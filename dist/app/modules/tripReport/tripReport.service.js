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
    return {
        success: true,
        message: "Trip report updated successfully",
        data: updatedReport,
    };
});
exports.TripReportService = {
    createTripReport,
    getAllTripReports,
    getTripReportById,
    updateTripReport,
};
