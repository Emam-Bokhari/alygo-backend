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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverServices = void 0;
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const user_model_1 = require("../user/user.model");
const driver_model_1 = require("./driver.model");
const driver_constant_1 = require("./driver.constant");
const driverDutyPolicy_service_1 = require("../driverDutyPolicy/driverDutyPolicy.service");
const createDriverToDB = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existingUser = yield user_model_1.User.isExistUserById(userId);
    if (!existingUser) {
        throw new ApiErrors_1.default(404, "User not found");
    }
    const existingDriver = yield driver_model_1.Driver.findOne({
        userId: new mongoose_1.Types.ObjectId(userId),
    });
    if (existingDriver) {
        throw new ApiErrors_1.default(409, "Driver profile already exists for this user");
    }
    // Process taxDocuments to ensure they have required fields
    let processedTaxDocuments = payload.taxDocuments;
    if (processedTaxDocuments && Array.isArray(processedTaxDocuments)) {
        processedTaxDocuments = processedTaxDocuments.map((doc) => (Object.assign(Object.assign({}, doc), { extractionStatus: doc.extractionStatus || driver_constant_1.EXTRACTION_STATUS.PENDING, extractedData: doc.extractedData || {} })));
    }
    const driverPayload = Object.assign(Object.assign({ userId: new mongoose_1.Types.ObjectId(userId) }, payload), { taxDocuments: processedTaxDocuments || [] });
    const driver = yield driver_model_1.Driver.create(driverPayload);
    return driver;
});
const getDriverProfileFromDB = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ userId: new mongoose_1.Types.ObjectId(userId) });
    if (!driver) {
        throw new ApiErrors_1.default(404, "Driver profile not found");
    }
    return driver;
});
const updateDriverFromDB = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existingUser = yield user_model_1.User.isExistUserById(userId);
    if (!existingUser) {
        throw new ApiErrors_1.default(404, "User not found");
    }
    const _a = payload, { userId: _ } = _a, updatePayload = __rest(_a, ["userId"]);
    // Process taxDocuments if present
    if (updatePayload.taxDocuments && Array.isArray(updatePayload.taxDocuments)) {
        updatePayload.taxDocuments = updatePayload.taxDocuments.map((doc) => (Object.assign(Object.assign({}, doc), { extractionStatus: doc.extractionStatus || driver_constant_1.EXTRACTION_STATUS.PENDING, extractedData: doc.extractedData || {} })));
    }
    const updatedDriver = yield driver_model_1.Driver.findOneAndUpdate({ userId: new mongoose_1.Types.ObjectId(userId) }, updatePayload, { new: true, runValidators: true });
    if (!updatedDriver) {
        throw new ApiErrors_1.default(404, "Driver profile not found");
    }
    return updatedDriver;
});
const getDriverAvailability = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ userId: new mongoose_1.Types.ObjectId(userId) });
    if (!driver) {
        throw new ApiErrors_1.default(404, "Driver profile not found");
    }
    const availabilityData = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getDriverAvailability(userId);
    // Update driver's availability in database
    yield driver_model_1.Driver.findOneAndUpdate({ userId: new mongoose_1.Types.ObjectId(userId) }, {
        $set: {
            "availability.canReceiveRide": availabilityData.canReceiveRide,
            "availability.blockedReason": availabilityData.blockedReason,
            "availability.blockedUntil": availabilityData.blockedUntil,
        },
    });
    return availabilityData;
});
const ride_model_1 = require("../ride/ride.model");
const ride_constant_1 = require("../ride/ride.constant");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const systemConfigHelper_1 = require("../../../helpers/systemConfigHelper");
const timezoneHelper_1 = require("../../../shared/timezoneHelper");
const serviceArea_model_1 = require("../serviceArea/serviceArea.model");
const getDriverReservationsFromDB = (driverUserId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const visibleBeforeMs = (systemConfig.reservation.driverVisibleBeforeMinutes || 60) * 60 * 1000;
    const now = new Date();
    const visibilityWindowMaxDate = new Date(now.getTime() + visibleBeforeMs);
    const statusFilter = query.status; // "upcoming", "today", "completed", "cancelled", "all"
    const filterQuery = {
        rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
        $or: [
            { assignedDriverId: new mongoose_1.Types.ObjectId(driverUserId) },
            { driverId: new mongoose_1.Types.ObjectId(driverUserId) },
        ],
    };
    // Get driver's service area for timezone-aware date calculations
    const driver = yield driver_model_1.Driver.findOne({
        userId: new mongoose_1.Types.ObjectId(driverUserId),
    });
    let driverTimezone = "UTC";
    if (driver === null || driver === void 0 ? void 0 : driver.serviceAreaId) {
        const serviceArea = yield serviceArea_model_1.ServiceArea.findById(driver.serviceAreaId);
        driverTimezone = (serviceArea === null || serviceArea === void 0 ? void 0 : serviceArea.timezone) || "UTC";
    }
    // Calculate start/end of day in driver's timezone
    const startOfDay = (0, timezoneHelper_1.getCurrentTimeInTimezone)(driverTimezone)
        .startOf("day")
        .toUTC()
        .toJSDate();
    const endOfDay = (0, timezoneHelper_1.getCurrentTimeInTimezone)(driverTimezone)
        .endOf("day")
        .toUTC()
        .toJSDate();
    if (statusFilter === "upcoming") {
        filterQuery.status = {
            $in: [ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER, ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED],
        };
        filterQuery.scheduledAt = {
            $gte: now,
            $lte: visibilityWindowMaxDate,
        };
    }
    else if (statusFilter === "today") {
        filterQuery.scheduledAt = {
            $gte: startOfDay,
            $lte: endOfDay,
        };
    }
    else if (statusFilter === "completed") {
        filterQuery.status = ride_constant_1.RIDE_STATUS.COMPLETED;
    }
    else if (statusFilter === "cancelled") {
        filterQuery.status = {
            $in: [
                ride_constant_1.RIDE_STATUS.CANCELLED,
                ride_constant_1.RIDE_STATUS.CANCELLED_BY_USER,
                ride_constant_1.RIDE_STATUS.CANCELLED_BY_DRIVER,
                ride_constant_1.RIDE_STATUS.EXPIRED,
            ],
        };
    }
    else {
        filterQuery.$and = [
            {
                $or: [
                    { status: { $ne: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER } },
                    { scheduledAt: { $lte: visibilityWindowMaxDate } },
                ],
            },
        ];
    }
    const reservationQuery = new queryBuilder_1.default(ride_model_1.Ride.find(filterQuery).populate("userId", "name profileImage phone"), query)
        .search([])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield reservationQuery.modelQuery;
    const meta = yield reservationQuery.countTotal();
    return { data, meta };
});
exports.DriverServices = {
    createDriverToDB,
    getDriverProfileFromDB,
    updateDriverFromDB,
    getDriverAvailability,
    getDriverReservationsFromDB,
};
