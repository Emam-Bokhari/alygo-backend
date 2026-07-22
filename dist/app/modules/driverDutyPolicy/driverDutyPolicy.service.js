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
exports.DriverDutyPolicyServices = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const driverDutyPolicy_model_1 = require("./driverDutyPolicy.model");
const serviceArea_model_1 = require("../serviceArea/serviceArea.model");
const serviceArea_service_1 = require("../serviceArea/serviceArea.service");
const status_1 = require("../../../constants/status");
const driver_model_1 = require("../driver/driver.model");
const ride_model_1 = require("../ride/ride.model");
const driver_constant_1 = require("../driver/driver.constant");
const socketHelper_1 = require("../../../helpers/socketHelper");
const timezoneHelper_1 = require("../../../shared/timezoneHelper");
const luxon_1 = require("luxon");
const createDriverDutyPolicyToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Auto-attach parent IDs based on scope type
    if (payload.scopeType && payload.airportId) {
        const airport = yield serviceArea_model_1.ServiceArea.findById(payload.airportId);
        if (airport) {
            payload.cityId = airport.cityId;
            if (airport.cityId) {
                const city = yield serviceArea_model_1.ServiceArea.findById(airport.cityId);
                if (city) {
                    payload.stateId = city.stateId;
                    if (city.stateId) {
                        const state = yield serviceArea_model_1.ServiceArea.findById(city.stateId);
                        if (state) {
                            payload.countryId = state.countryId;
                        }
                    }
                }
            }
        }
    }
    else if (payload.scopeType && payload.zoneId) {
        const zone = yield serviceArea_model_1.ServiceArea.findById(payload.zoneId);
        if (zone) {
            payload.cityId = zone.cityId;
            if (zone.cityId) {
                const city = yield serviceArea_model_1.ServiceArea.findById(zone.cityId);
                if (city) {
                    payload.stateId = city.stateId;
                    if (city.stateId) {
                        const state = yield serviceArea_model_1.ServiceArea.findById(city.stateId);
                        if (state) {
                            payload.countryId = state.countryId;
                        }
                    }
                }
            }
        }
    }
    else if (payload.scopeType && payload.cityId) {
        const city = yield serviceArea_model_1.ServiceArea.findById(payload.cityId);
        if (city) {
            payload.stateId = city.stateId;
            if (city.stateId) {
                const state = yield serviceArea_model_1.ServiceArea.findById(city.stateId);
                if (state) {
                    payload.countryId = state.countryId;
                }
            }
        }
    }
    else if (payload.scopeType && payload.stateId) {
        const state = yield serviceArea_model_1.ServiceArea.findById(payload.stateId);
        if (state) {
            payload.countryId = state.countryId;
        }
    }
    const driverDutyPolicy = yield driverDutyPolicy_model_1.DriverDutyPolicy.create(payload);
    return driverDutyPolicy;
});
const getDriverDutyPolicyFromDB = (driverDutyPolicyId) => __awaiter(void 0, void 0, void 0, function* () {
    const driverDutyPolicy = yield driverDutyPolicy_model_1.DriverDutyPolicy.findById(driverDutyPolicyId).populate([
        { path: "countryId", select: "country type maxDrivers" },
        { path: "stateId", select: "state type maxDrivers" },
        { path: "cityId", select: "city type maxDrivers" },
        { path: "zoneId", select: "zone type maxDrivers" },
        { path: "airportId", select: "airport type maxDrivers" },
    ]);
    if (!driverDutyPolicy) {
        throw new ApiErrors_1.default(404, "Driver duty policy not found");
    }
    return driverDutyPolicy;
});
const getAllDriverDutyPoliciesFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const searchTerm = query.searchTerm;
    // Build aggregation pipeline
    const pipeline = [
        {
            $lookup: {
                from: "serviceareas",
                localField: "countryId",
                foreignField: "_id",
                as: "countryId",
                pipeline: [
                    {
                        $project: {
                            country: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "stateId",
                foreignField: "_id",
                as: "stateId",
                pipeline: [
                    {
                        $project: {
                            state: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "cityId",
                foreignField: "_id",
                as: "cityId",
                pipeline: [
                    {
                        $project: {
                            city: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "zoneId",
                foreignField: "_id",
                as: "zoneId",
                pipeline: [
                    {
                        $project: {
                            zone: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "airportId",
                foreignField: "_id",
                as: "airportId",
                pipeline: [
                    {
                        $project: {
                            airport: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                path: "$countryId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$stateId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$cityId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$zoneId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$airportId",
                preserveNullAndEmptyArrays: true,
            },
        },
    ];
    // Add search condition if searchTerm exists
    if (searchTerm) {
        pipeline.push({
            $match: {
                $or: [
                    { name: { $regex: searchTerm, $options: "i" } },
                    { "countryId.country": { $regex: searchTerm, $options: "i" } },
                    { "stateId.state": { $regex: searchTerm, $options: "i" } },
                    { "cityId.city": { $regex: searchTerm, $options: "i" } },
                    { "zoneId.zone": { $regex: searchTerm, $options: "i" } },
                    { "airportId.airport": { $regex: searchTerm, $options: "i" } },
                ],
            },
        });
    }
    // Apply filters (excluding searchTerm, sort, limit, page, fields)
    const queryObj = Object.assign({}, query);
    const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    if (Object.keys(queryObj).length > 0) {
        pipeline.push({ $match: queryObj });
    }
    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = yield driverDutyPolicy_model_1.DriverDutyPolicy.aggregate(countPipeline);
    const total = ((_a = countResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    // Add sort
    const sortStr = query.sort || "-createdAt";
    const sortObj = {};
    sortStr.split(",").forEach((field) => {
        const trimmed = field.trim();
        if (trimmed.startsWith("-")) {
            sortObj[trimmed.substring(1)] = -1;
        }
        else {
            sortObj[trimmed] = 1;
        }
    });
    pipeline.push({ $sort: sortObj });
    // Add pagination
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: limit });
    // Add field projection
    const fieldsStr = query.fields || "-__v";
    const projectObj = {};
    fieldsStr.split(",").forEach((field) => {
        const trimmed = field.trim();
        if (trimmed.startsWith("-")) {
            projectObj[trimmed.substring(1)] = 0;
        }
        else {
            projectObj[trimmed] = 1;
        }
    });
    pipeline.push({ $project: projectObj });
    const result = yield driverDutyPolicy_model_1.DriverDutyPolicy.aggregate(pipeline);
    const totalPage = Math.ceil(total / limit);
    const meta = { page, limit, total, totalPage };
    return {
        data: result,
        meta,
    };
});
const updateDriverDutyPolicyFromDB = (driverDutyPolicyId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Auto-attach parent IDs if location IDs are being updated
    if (payload.airportId) {
        const airport = yield serviceArea_model_1.ServiceArea.findById(payload.airportId);
        if (airport) {
            payload.cityId = airport.cityId;
            if (airport.cityId) {
                const city = yield serviceArea_model_1.ServiceArea.findById(airport.cityId);
                if (city) {
                    payload.stateId = city.stateId;
                    if (city.stateId) {
                        const state = yield serviceArea_model_1.ServiceArea.findById(city.stateId);
                        if (state) {
                            payload.countryId = state.countryId;
                        }
                    }
                }
            }
        }
    }
    else if (payload.zoneId) {
        const zone = yield serviceArea_model_1.ServiceArea.findById(payload.zoneId);
        if (zone) {
            payload.cityId = zone.cityId;
            if (zone.cityId) {
                const city = yield serviceArea_model_1.ServiceArea.findById(zone.cityId);
                if (city) {
                    payload.stateId = city.stateId;
                    if (city.stateId) {
                        const state = yield serviceArea_model_1.ServiceArea.findById(city.stateId);
                        if (state) {
                            payload.countryId = state.countryId;
                        }
                    }
                }
            }
        }
    }
    else if (payload.cityId) {
        const city = yield serviceArea_model_1.ServiceArea.findById(payload.cityId);
        if (city) {
            payload.stateId = city.stateId;
            if (city.stateId) {
                const state = yield serviceArea_model_1.ServiceArea.findById(city.stateId);
                if (state) {
                    payload.countryId = state.countryId;
                }
            }
        }
    }
    else if (payload.stateId) {
        const state = yield serviceArea_model_1.ServiceArea.findById(payload.stateId);
        if (state) {
            payload.countryId = state.countryId;
        }
    }
    const updatedDriverDutyPolicy = yield driverDutyPolicy_model_1.DriverDutyPolicy.findByIdAndUpdate(driverDutyPolicyId, payload, { new: true, runValidators: true }).populate([
        { path: "countryId", select: "country type maxDrivers" },
        { path: "stateId", select: "state type maxDrivers" },
        { path: "cityId", select: "city type maxDrivers" },
        { path: "zoneId", select: "zone type maxDrivers" },
        { path: "airportId", select: "airport type maxDrivers" },
    ]);
    if (!updatedDriverDutyPolicy) {
        throw new ApiErrors_1.default(404, "Driver duty policy not found");
    }
    return updatedDriverDutyPolicy;
});
const deleteDriverDutyPolicyFromDB = (driverDutyPolicyId) => __awaiter(void 0, void 0, void 0, function* () {
    const deletedDriverDutyPolicy = yield driverDutyPolicy_model_1.DriverDutyPolicy.softDeleteById(driverDutyPolicyId);
    if (!deletedDriverDutyPolicy) {
        throw new ApiErrors_1.default(404, "Driver duty policy not found");
    }
    return deletedDriverDutyPolicy;
});
const getActiveDriverDutyPoliciesFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const searchTerm = query.searchTerm;
    // Build aggregation pipeline
    const pipeline = [
        {
            $match: { status: status_1.STATUS.ACTIVE },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "countryId",
                foreignField: "_id",
                as: "countryId",
                pipeline: [
                    {
                        $project: {
                            country: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "stateId",
                foreignField: "_id",
                as: "stateId",
                pipeline: [
                    {
                        $project: {
                            state: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "cityId",
                foreignField: "_id",
                as: "cityId",
                pipeline: [
                    {
                        $project: {
                            city: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "zoneId",
                foreignField: "_id",
                as: "zoneId",
                pipeline: [
                    {
                        $project: {
                            zone: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "serviceareas",
                localField: "airportId",
                foreignField: "_id",
                as: "airportId",
                pipeline: [
                    {
                        $project: {
                            airport: 1,
                            type: 1,
                            maxDrivers: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: {
                path: "$countryId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$stateId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$cityId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$zoneId",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: "$airportId",
                preserveNullAndEmptyArrays: true,
            },
        },
    ];
    // Add search condition if searchTerm exists
    if (searchTerm) {
        pipeline.push({
            $match: {
                $or: [
                    { name: { $regex: searchTerm, $options: "i" } },
                    { "countryId.country": { $regex: searchTerm, $options: "i" } },
                    { "stateId.state": { $regex: searchTerm, $options: "i" } },
                    { "cityId.city": { $regex: searchTerm, $options: "i" } },
                    { "zoneId.zone": { $regex: searchTerm, $options: "i" } },
                    { "airportId.airport": { $regex: searchTerm, $options: "i" } },
                ],
            },
        });
    }
    // Apply filters (excluding searchTerm, sort, limit, page, fields)
    const queryObj = Object.assign({}, query);
    const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    if (Object.keys(queryObj).length > 0) {
        pipeline.push({ $match: queryObj });
    }
    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = yield driverDutyPolicy_model_1.DriverDutyPolicy.aggregate(countPipeline);
    const total = ((_a = countResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    // Add sort
    const sortStr = query.sort || "-createdAt";
    const sortObj = {};
    sortStr.split(",").forEach((field) => {
        const trimmed = field.trim();
        if (trimmed.startsWith("-")) {
            sortObj[trimmed.substring(1)] = -1;
        }
        else {
            sortObj[trimmed] = 1;
        }
    });
    pipeline.push({ $sort: sortObj });
    // Add pagination
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: limit });
    // Add field projection
    const fieldsStr = query.fields || "-__v";
    const projectObj = {};
    fieldsStr.split(",").forEach((field) => {
        const trimmed = field.trim();
        if (trimmed.startsWith("-")) {
            projectObj[trimmed.substring(1)] = 0;
        }
        else {
            projectObj[trimmed] = 1;
        }
    });
    pipeline.push({ $project: projectObj });
    const result = yield driverDutyPolicy_model_1.DriverDutyPolicy.aggregate(pipeline);
    const totalPage = Math.ceil(total / limit);
    const meta = { page, limit, total, totalPage };
    return {
        data: result,
        meta,
    };
});
const updateDriverDutyPolicyStatusFromDB = (driverDutyPolicyId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const updatedDriverDutyPolicy = yield driverDutyPolicy_model_1.DriverDutyPolicy.findByIdAndUpdate(driverDutyPolicyId, { status }, { new: true, runValidators: true }).populate([
        { path: "countryId", select: "country type maxDrivers" },
        { path: "stateId", select: "state type maxDrivers" },
        { path: "cityId", select: "city type maxDrivers" },
        { path: "zoneId", select: "zone type maxDrivers" },
        { path: "airportId", select: "airport type maxDrivers" },
    ]);
    if (!updatedDriverDutyPolicy) {
        throw new ApiErrors_1.default(404, "Driver duty policy not found");
    }
    return updatedDriverDutyPolicy;
});
const getDriverAvailability = (driverId) => __awaiter(void 0, void 0, void 0, function* () {
    const driver = yield driver_model_1.Driver.findOne({ userId: driverId });
    if (!driver) {
        throw new Error("Driver not found");
    }
    // Default response - driver is available
    const defaultResponse = {
        canReceiveRide: true,
        blockedReason: null,
        blockedUntil: null,
        remainingHours: 0,
        remainingMinutes: 0,
        remainingSeconds: 0,
    };
    // Find applicable duty policy based on driver's current location
    let policy = null;
    let driverLocServiceArea = null;
    if (driver.location && driver.location.coordinates) {
        const [driverLongitude, driverLatitude] = driver.location.coordinates;
        driverLocServiceArea =
            yield serviceArea_service_1.ServiceAreaServices.findServiceAreaByCoordinates(driverLongitude, driverLatitude);
        if (driverLocServiceArea) {
            const query = { status: "active" };
            if (driverLocServiceArea.type === "city" && driverLocServiceArea._id) {
                query.cityId = driverLocServiceArea._id;
            }
            else if (driverLocServiceArea.type === "zone" &&
                driverLocServiceArea._id) {
                query.zoneId = driverLocServiceArea._id;
            }
            else if (driverLocServiceArea.type === "airport" &&
                driverLocServiceArea._id) {
                query.airportId = driverLocServiceArea._id;
            }
            else if (driverLocServiceArea.type === "state" &&
                driverLocServiceArea._id) {
                query.stateId = driverLocServiceArea._id;
            }
            else if (driverLocServiceArea.type === "country" &&
                driverLocServiceArea._id) {
                query.countryId = driverLocServiceArea._id;
            }
            policy = yield driverDutyPolicy_model_1.DriverDutyPolicy.findOne(query);
        }
    }
    // If no policy exists, driver is available
    if (!policy) {
        return defaultResponse;
    }
    // Get timezone from service area (default to UTC if not set)
    const timezone = (driverLocServiceArea === null || driverLocServiceArea === void 0 ? void 0 : driverLocServiceArea.timezone) || "UTC";
    // Get start of day in the driver's timezone
    const startOfDay = (0, timezoneHelper_1.getCurrentTimeInTimezone)(timezone)
        .startOf("day")
        .toUTC()
        .toJSDate();
    // Get today's completed rides
    const completedRides = yield ride_model_1.Ride.find({
        driverId: driver.userId,
        status: "completed",
        completedAt: { $gte: startOfDay },
    }).sort({ completedAt: 1 });
    // Calculate total driving hours today
    let totalDrivingHoursToday = 0;
    for (const ride of completedRides) {
        if (ride.startedAt && ride.completedAt) {
            const durationHrs = (ride.completedAt.getTime() - ride.startedAt.getTime()) /
                (1000 * 60 * 60);
            totalDrivingHoursToday += durationHrs;
        }
    }
    // Check daily limit
    if (totalDrivingHoursToday >= policy.maxDrivingHoursPerDay) {
        // Calculate blocked until time in driver's timezone (next day midnight)
        const blockedUntil = (0, timezoneHelper_1.getCurrentTimeInTimezone)(timezone)
            .plus({ days: 1 })
            .startOf("day")
            .toUTC()
            .toJSDate();
        const remainingMs = blockedUntil.getTime() - Date.now();
        const remainingSeconds = Math.floor(remainingMs / 1000);
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const remainingHours = Math.floor(remainingMinutes / 60);
        return {
            canReceiveRide: false,
            blockedReason: driver_constant_1.DRIVER_BLOCK_REASON.DAILY_LIMIT,
            blockedUntil,
            remainingHours,
            remainingMinutes: remainingMinutes % 60,
            remainingSeconds: remainingSeconds % 60,
        };
    }
    // Check continuous driving limit
    if (policy.maxContinuousDrivingHours > 0) {
        let continuousDrivingHours = 0;
        let lastRideEndTime = new Date();
        // Iterate backwards from most recent rides
        for (let i = completedRides.length - 1; i >= 0; i--) {
            const ride = completedRides[i];
            if (ride.startedAt && ride.completedAt) {
                const rideDuration = (ride.completedAt.getTime() - ride.startedAt.getTime()) /
                    (1000 * 60 * 60);
                // Check if there's a gap between rides (break)
                const gapHours = (lastRideEndTime.getTime() - ride.completedAt.getTime()) /
                    (1000 * 60 * 60);
                if (gapHours > policy.breakAfterHours) {
                    // Gap is large enough to reset continuous driving
                    break;
                }
                continuousDrivingHours += rideDuration;
                lastRideEndTime = ride.completedAt;
                if (continuousDrivingHours >= policy.maxContinuousDrivingHours) {
                    // Calculate blocked until time in driver's timezone
                    const blockedUntil = luxon_1.DateTime.fromJSDate(ride.completedAt)
                        .setZone(timezone)
                        .plus({ minutes: policy.breakDurationMinutes })
                        .toUTC()
                        .toJSDate();
                    const remainingMs = blockedUntil.getTime() - Date.now();
                    const remainingSeconds = Math.floor(remainingMs / 1000);
                    const remainingMinutes = Math.floor(remainingSeconds / 60);
                    const remainingHours = Math.floor(remainingMinutes / 60);
                    return {
                        canReceiveRide: false,
                        blockedReason: driver_constant_1.DRIVER_BLOCK_REASON.CONTINUOUS_LIMIT,
                        blockedUntil,
                        remainingHours,
                        remainingMinutes: remainingMinutes % 60,
                        remainingSeconds: remainingSeconds % 60,
                    };
                }
            }
        }
    }
    // Check if driver is currently on break and break duration hasn't elapsed
    if (driver.driverAvailabilityStatus === "break" && driver.lastOfflineAt) {
        // Calculate break end time in driver's timezone
        const breakEndTime = luxon_1.DateTime.fromJSDate(driver.lastOfflineAt)
            .setZone(timezone)
            .plus({ minutes: policy.breakDurationMinutes })
            .toUTC()
            .toJSDate();
        if (new Date() < breakEndTime) {
            const remainingMs = breakEndTime.getTime() - Date.now();
            const remainingSeconds = Math.floor(remainingMs / 1000);
            const remainingMinutes = Math.floor(remainingSeconds / 60);
            const remainingHours = Math.floor(remainingMinutes / 60);
            return {
                canReceiveRide: false,
                blockedReason: driver_constant_1.DRIVER_BLOCK_REASON.BREAK_REQUIRED,
                blockedUntil: breakEndTime,
                remainingHours,
                remainingMinutes: remainingMinutes % 60,
                remainingSeconds: remainingSeconds % 60,
            };
        }
    }
    return defaultResponse;
});
const updateDriverAvailability = (driverId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const driver = yield driver_model_1.Driver.findOne({ userId: driverId });
    if (!driver) {
        throw new Error("Driver not found");
    }
    const availabilityData = yield getDriverAvailability(driverId);
    const previousCanReceiveRide = (_b = (_a = driver.availability) === null || _a === void 0 ? void 0 : _a.canReceiveRide) !== null && _b !== void 0 ? _b : true;
    const newCanReceiveRide = availabilityData.canReceiveRide;
    // Update driver's availability in database
    yield driver_model_1.Driver.findOneAndUpdate({ userId: driverId }, {
        $set: {
            "availability.canReceiveRide": availabilityData.canReceiveRide,
            "availability.blockedReason": availabilityData.blockedReason,
            "availability.blockedUntil": availabilityData.blockedUntil,
        },
    });
    // Emit socket events if availability changed
    if (previousCanReceiveRide !== newCanReceiveRide) {
        if (newCanReceiveRide) {
            // Driver became available
            socketHelper_1.socketHelper.sendToUser(driverId, "driver-available", {
                canReceiveRide: true,
                blockedReason: null,
                blockedUntil: null,
            });
        }
        else {
            // Driver became unavailable due to duty limit
            socketHelper_1.socketHelper.sendToUser(driverId, "driver-duty-limit-reached", {
                canReceiveRide: false,
                blockedReason: availabilityData.blockedReason,
                blockedUntil: availabilityData.blockedUntil,
                remainingHours: availabilityData.remainingHours,
                remainingMinutes: availabilityData.remainingMinutes,
            });
        }
    }
    // Return availability data and whether it changed
    return Object.assign(Object.assign({}, availabilityData), { availabilityChanged: previousCanReceiveRide !== newCanReceiveRide });
});
exports.DriverDutyPolicyServices = {
    createDriverDutyPolicyToDB,
    getDriverDutyPolicyFromDB,
    getAllDriverDutyPoliciesFromDB,
    updateDriverDutyPolicyFromDB,
    deleteDriverDutyPolicyFromDB,
    getActiveDriverDutyPoliciesFromDB,
    updateDriverDutyPolicyStatusFromDB,
    getDriverAvailability,
    updateDriverAvailability,
};
