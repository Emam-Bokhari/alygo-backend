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
exports.RideServices = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const config_1 = __importDefault(require("../../../config"));
const ride_model_1 = require("./ride.model");
const user_model_1 = require("../user/user.model");
const driver_model_1 = require("../driver/driver.model");
const car_model_1 = require("../car/car.model");
const serviceArea_model_1 = require("../serviceArea/serviceArea.model");
const serviceArea_service_1 = require("../serviceArea/serviceArea.service");
const serviceCategory_model_1 = require("../serviceCategory/serviceCategory.model");
const rideCategory_model_1 = require("../rideCategory/rideCategory.model");
const fareConfiguration_model_1 = require("../fareConfiguration/fareConfiguration.model");
const driverDutyPolicy_service_1 = require("../driverDutyPolicy/driverDutyPolicy.service");
const transaction_model_1 = require("../transaction/transaction.model");
const wallet_service_1 = require("../wallet/wallet.service");
const referral_service_1 = require("../referral/referral.service");
const tracking_model_1 = require("../tracking/tracking.model");
const googleMapsHelper_1 = require("../../../helpers/googleMapsHelper");
const socketHelper_1 = require("../../../helpers/socketHelper");
const googleRouteService_1 = require("../../../services/googleRouteService");
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const transaction_constant_1 = require("../transaction/transaction.constant");
const cancellationReason_model_1 = require("../cancellationReason/cancellationReason.model");
const cancellationPolicy_service_1 = require("../cancellationPolicy/cancellationPolicy.service");
const pendingPayment_model_1 = require("../pendingPayment/pendingPayment.model");
const status_1 = require("../../../constants/status");
const ride_constant_1 = require("./ride.constant");
const logger_1 = require("../../../shared/logger");
const driverMatchingService_1 = require("../../../services/driverMatchingService");
const surgeCalculation_service_1 = require("../surgeRule/surgeCalculation.service");
const bullmq_1 = require("../../../config/bullmq");
const rideSearchTimingHelper_1 = require("../../../helpers/rideSearchTimingHelper");
const systemConfigHelper_1 = require("../../../helpers/systemConfigHelper");
const recentDestination_service_1 = require("../recentDestination/recentDestination.service");
const buildRideParticipantSummary_1 = require("./helpers/buildRideParticipantSummary");
const timezoneHelper_1 = require("../../../shared/timezoneHelper");
const points_service_1 = require("../tier/points.service");
const peakHour_model_1 = require("../peakHour/peakHour.model");
const surgeCalculation_service_2 = require("../surgeRule/surgeCalculation.service");
const tier_model_1 = require("../tier/tier.model");
/**
 * Perform fare calculation based on distance, duration, and pricing configuration rules.
 */
const calculateFare = (distanceKm, durationMinutes, categoryId, serviceAreaId, serviceCategoryId) => __awaiter(void 0, void 0, void 0, function* () {
    // Query Cascading Lookup:
    // 1. ServiceArea + ServiceCategory + RideCategory (Reservation Booking specific)
    // 2. ServiceArea + RideCategory (Normal Booking, serviceCategoryId is null)
    // 3. Global (serviceAreaId = null) + RideCategory
    let fareConfig = null;
    if (serviceAreaId) {
        if (serviceCategoryId) {
            fareConfig = yield fareConfiguration_model_1.FareConfiguration.findOne({
                serviceAreaId,
                serviceCategoryId,
                rideCategoryId: categoryId,
                status: "active",
            });
        }
        if (!fareConfig) {
            // Normal Booking fallback (where serviceCategoryId is optional/null)
            fareConfig = yield fareConfiguration_model_1.FareConfiguration.findOne({
                serviceAreaId,
                serviceCategoryId: { $exists: false },
                rideCategoryId: categoryId,
                status: "active",
            });
        }
    }
    // Global Fallback
    if (!fareConfig) {
        if (serviceCategoryId) {
            fareConfig = yield fareConfiguration_model_1.FareConfiguration.findOne({
                serviceAreaId: { $exists: false },
                serviceCategoryId,
                rideCategoryId: categoryId,
                status: "active",
            });
        }
        if (!fareConfig) {
            fareConfig = yield fareConfiguration_model_1.FareConfiguration.findOne({
                serviceAreaId: { $exists: false },
                serviceCategoryId: { $exists: false },
                rideCategoryId: categoryId,
                status: "active",
            });
        }
    }
    console.log(fareConfig, "Fare Config");
    if (!fareConfig) {
        throw new ApiErrors_1.default(404, `Fare configuration not found for Ride Category: ${categoryId} in Service Area: ${serviceAreaId || "Global"}`);
    }
    const rideCategory = yield rideCategory_model_1.RideCategory.findById(categoryId);
    if (!rideCategory) {
        throw new ApiErrors_1.default(404, "Selected Ride Category not found");
    }
    // Computation formula
    const baseFare = fareConfig.baseFare;
    const distanceFare = distanceKm * fareConfig.perKmFare;
    const timeFare = durationMinutes * fareConfig.perMinuteFare;
    const stopWaitingCharge = 0; // calculated dynamically at ride completion if needed
    let subtotal = baseFare + distanceFare + timeFare + stopWaitingCharge;
    if (subtotal < fareConfig.minimumFare) {
        subtotal = fareConfig.minimumFare;
    }
    // Calculate Surge Multiplier
    let multiplier = 1.0;
    if (serviceAreaId) {
        try {
            multiplier = yield surgeCalculation_service_1.SurgeCalculationService.calculateSurgeMultiplier(serviceAreaId.toString());
        }
        catch (err) {
            logger_1.logger.error(`Error calculating surge multiplier: ${err.message}`);
        }
    }
    const surgedSubtotal = subtotal * multiplier;
    const commission = surgedSubtotal * (rideCategory.commissionRate / 100);
    const driverEarning = surgedSubtotal - commission;
    const total = surgedSubtotal; // can apply discount/tax adjustments in future
    return {
        baseFare: parseFloat((baseFare * multiplier).toFixed(2)),
        distanceFare: parseFloat((distanceFare * multiplier).toFixed(2)),
        timeFare: parseFloat((timeFare * multiplier).toFixed(2)),
        stopWaitingCharge: parseFloat((stopWaitingCharge * multiplier).toFixed(2)),
        cancellationFee: 0,
        discount: 0,
        subtotal: parseFloat(surgedSubtotal.toFixed(2)),
        commission: parseFloat(commission.toFixed(2)),
        driverEarning: parseFloat(driverEarning.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        surgeMultiplier: multiplier,
        surgeApplied: parseFloat((surgedSubtotal - subtotal).toFixed(2)),
    };
});
/**
 * Route details estimation for display
 */
const estimateFareAndRoute = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { pickup, stops, destination, serviceCategoryId, rideType, scheduledAt, timezone, } = payload;
    // Convert scheduledAt from local timezone to UTC if timezone is provided
    let scheduledAtUtc = scheduledAt;
    if (scheduledAt && timezone) {
        scheduledAtUtc = (0, timezoneHelper_1.timezoneToUtc)(scheduledAt, timezone).toJSDate();
    }
    const isReservation = rideType === ride_constant_1.RIDE_TYPE.SCHEDULED || rideType === "reservation";
    let serviceCategoryDoc = null;
    if (serviceCategoryId || isReservation) {
        if (isReservation && !serviceCategoryId) {
            throw new ApiErrors_1.default(400, "serviceCategoryId is required for Scheduled (Reservation) rides");
        }
        if (serviceCategoryId) {
            if (!mongoose_2.default.Types.ObjectId.isValid(serviceCategoryId)) {
                throw new ApiErrors_1.default(400, "Invalid Service Category ID");
            }
            serviceCategoryDoc = yield serviceCategory_model_1.ServiceCategory.findById(serviceCategoryId);
            if (!serviceCategoryDoc) {
                throw new ApiErrors_1.default(404, "Service Category not found");
            }
            if (serviceCategoryDoc.status !== status_1.STATUS.ACTIVE) {
                throw new ApiErrors_1.default(400, "Service Category is disabled or inactive");
            }
            if (isReservation && serviceCategoryDoc.supportsReservation === false) {
                throw new ApiErrors_1.default(400, "Service Category does not support reservation rides");
            }
        }
    }
    // 1. Calculate entire route from pickup through stops to destination using Directions API
    const originCoord = {
        lat: pickup.location.coordinates[1],
        lng: pickup.location.coordinates[0],
    };
    const destCoord = {
        lat: destination.location.coordinates[1],
        lng: destination.location.coordinates[0],
    };
    const stopsCoords = stops
        ? stops
            .sort((a, b) => a.order - b.order)
            .map((s) => ({
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
        }))
        : [];
    const routeInfo = yield googleMapsHelper_1.googleMapsHelper.getRoute(originCoord, destCoord, stopsCoords);
    // 2. Resolve Service Area dynamically from Pickup location using coordinate-based matching
    const [longitude, latitude] = pickup.location.coordinates;
    console.log("🔍 Finding service area for coordinates:", {
        longitude,
        latitude,
    });
    let serviceArea = yield serviceArea_service_1.ServiceAreaServices.findServiceAreaByCoordinates(longitude, latitude);
    console.log("🔍 Found service area:", serviceArea);
    let serviceAreaId = serviceArea === null || serviceArea === void 0 ? void 0 : serviceArea._id;
    // Fallback: If no service area found by coordinates, try reverse geocoding for backward compatibility
    if (!serviceArea) {
        console.log("🔍 No service area found by coordinates, trying fallback reverse geocoding");
        const geoDetails = yield googleMapsHelper_1.googleMapsHelper.reverseGeocode(latitude, longitude);
        const fallbackServiceArea = yield serviceArea_model_1.ServiceArea.findOne({
            city: { $regex: new RegExp(`^${geoDetails.city}$`, "i") },
            status: "active",
        });
        if (fallbackServiceArea) {
            console.log("🔍 Found service area via fallback:", fallbackServiceArea);
            serviceArea = fallbackServiceArea;
            serviceAreaId = fallbackServiceArea._id;
        }
    }
    if (!serviceArea) {
        throw new ApiErrors_1.default(400, "Pickup location is outside of active service areas");
    }
    // 3. Load active ride categories under the selected Service Category
    const query = { status: status_1.STATUS.ACTIVE };
    if (serviceCategoryId) {
        query.serviceCategoryId = serviceCategoryId;
    }
    if (isReservation) {
        query.supportsReservation = { $ne: false };
    }
    const categories = yield rideCategory_model_1.RideCategory.find(query);
    if (serviceCategoryId && categories.length === 0) {
        throw new ApiErrors_1.default(404, "No active ride categories found under the selected service category");
    }
    const categoryEstimations = [];
    const baseTime = scheduledAtUtc ? new Date(scheduledAtUtc) : new Date();
    // 4. Loop through categories and calculate fare for each
    for (const cat of categories) {
        try {
            const fare = yield calculateFare(routeInfo.totalDistanceKm, routeInfo.totalDurationMinutes, cat._id.toString(), serviceAreaId, serviceCategoryId);
            const estimatedArrivalTime = new Date(baseTime.getTime() + routeInfo.totalDurationMinutes * 60 * 1000).toISOString();
            categoryEstimations.push({
                rideCategoryId: cat._id.toString(),
                categoryName: cat.name,
                categoryDescription: cat.description || "",
                vehicleType: ((_a = cat.vehicleRequirements) === null || _a === void 0 ? void 0 : _a.vehicleTypes) || [],
                vehicleCapacity: ((_b = cat.vehicleRequirements) === null || _b === void 0 ? void 0 : _b.minimumSeats) || 0,
                luggageCapacity: ((_c = cat.vehicleRequirements) === null || _c === void 0 ? void 0 : _c.luggageCapacity) || 0,
                estimatedFare: fare.total,
                pricingBreakdown: {
                    baseFare: fare.baseFare,
                    distanceFare: fare.distanceFare,
                    durationFare: fare.timeFare,
                    surge: fare.surgeApplied || 0,
                    surgeMultiplier: fare.surgeMultiplier || 1.0,
                    taxes: 0,
                    discounts: fare.discount || 0,
                    driverEarning: fare.driverEarning,
                    commission: fare.commission,
                    total: fare.total,
                },
                estimatedDistance: routeInfo.totalDistanceKm,
                estimatedDuration: routeInfo.totalDurationMinutes,
                routePolyline: routeInfo.polyline,
                estimatedArrivalTime,
                name: cat.name,
                description: cat.description,
                vehicleRequirements: cat.vehicleRequirements,
                commissionRate: cat.commissionRate,
            });
        }
        catch (err) {
            // Skip categories that don't have fare configurations set up
            logger_1.logger.warn(`Skipping estimation for category ${cat.name}: ${err.message}`);
        }
    }
    // 5. Return error if no valid ride category can be estimated
    if (categoryEstimations.length === 0) {
        throw new ApiErrors_1.default(404, "No valid ride categories found with fare configurations for this route in the selected Service Area");
    }
    return {
        isEstimated: true,
        serviceCategory: serviceCategoryDoc
            ? {
                id: serviceCategoryDoc._id.toString(),
                name: serviceCategoryDoc.name,
                description: serviceCategoryDoc.description,
                image: serviceCategoryDoc.image,
                status: serviceCategoryDoc.status,
                supportsReservation: serviceCategoryDoc.supportsReservation !== false,
            }
            : null,
        routeInfo,
        estimatedDistance: routeInfo.totalDistanceKm,
        estimatedDuration: routeInfo.totalDurationMinutes,
        serviceArea,
        rideCategories: categoryEstimations,
        categories: categoryEstimations,
    };
});
/**
 * Request a ride immediately (Normal) or reservation (Scheduled)
 */
const requestRide = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    // Convert scheduledAt from local timezone to UTC if timezone is provided
    let scheduledAtUtc = payload.scheduledAt;
    if (payload.scheduledAt && payload.timezone) {
        scheduledAtUtc = (0, timezoneHelper_1.timezoneToUtc)(payload.scheduledAt, payload.timezone).toJSDate();
    }
    // 1. Prevent duplicate active booking for the user
    if (payload.rideType === ride_constant_1.RIDE_TYPE.INSTANT) {
        const activeRide = yield ride_model_1.Ride.findOne({
            userId,
            $or: [
                {
                    rideType: ride_constant_1.RIDE_TYPE.INSTANT,
                    status: {
                        $in: [
                            ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
                            ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                            ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                            ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                            ride_constant_1.RIDE_STATUS.STARTED,
                        ],
                    },
                },
                {
                    rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                    status: {
                        $in: [
                            ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                            ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                            ride_constant_1.RIDE_STATUS.STARTED,
                        ],
                    },
                },
            ],
        });
        if (activeRide) {
            throw new ApiErrors_1.default(400, "You already have an active ride request or booking.");
        }
    }
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiErrors_1.default(404, "Passenger user not found");
    }
    // 2. Validate Service Category and Ride Category relationship for Scheduled (Reservation) Rides
    const isReservation = payload.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED;
    if (isReservation) {
        if (!payload.serviceCategoryId) {
            throw new ApiErrors_1.default(400, "serviceCategoryId is required for Scheduled (Reservation) rides");
        }
        if (!scheduledAtUtc) {
            throw new ApiErrors_1.default(400, "scheduledAt is required for Scheduled (Reservation) rides");
        }
        if (new Date(scheduledAtUtc).getTime() <= Date.now()) {
            throw new ApiErrors_1.default(400, "scheduledAt must be a future date and time");
        }
        if (!mongoose_2.default.Types.ObjectId.isValid(payload.serviceCategoryId)) {
            throw new ApiErrors_1.default(400, "Invalid Service Category ID");
        }
        const serviceCategory = yield serviceCategory_model_1.ServiceCategory.findById(payload.serviceCategoryId);
        if (!serviceCategory) {
            throw new ApiErrors_1.default(404, "Service Category not found");
        }
        if (serviceCategory.status !== status_1.STATUS.ACTIVE) {
            throw new ApiErrors_1.default(400, "Service Category is disabled or inactive");
        }
        if (serviceCategory.supportsReservation === false) {
            throw new ApiErrors_1.default(400, "Service Category does not support reservation rides");
        }
        const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
        const minAdvanceMinutes = (_a = serviceCategory.minimumAdvanceBookingMinutes) !== null && _a !== void 0 ? _a : systemConfig.reservation.minAdvanceMinutes;
        const maxAdvanceDays = (_b = serviceCategory.maximumAdvanceBookingDays) !== null && _b !== void 0 ? _b : systemConfig.reservation.maxAdvanceDays;
        const scheduledTime = new Date(scheduledAtUtc).getTime();
        const now = Date.now();
        if (scheduledTime < now + minAdvanceMinutes * 60 * 1000) {
            throw new ApiErrors_1.default(400, `Reservation must be booked at least ${minAdvanceMinutes} minutes in advance`);
        }
        if (scheduledTime > now + maxAdvanceDays * 24 * 60 * 60 * 1000) {
            throw new ApiErrors_1.default(400, `Reservation cannot be booked more than ${maxAdvanceDays} days in advance`);
        }
        // Check for conflicting reservation around the same time
        const windowMs = 30 * 60 * 1000;
        const conflictingReservation = yield ride_model_1.Ride.findOne({
            userId,
            rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
            status: {
                $in: [
                    ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
                    ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                    ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                    ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                    ride_constant_1.RIDE_STATUS.STARTED,
                ],
            },
            scheduledAt: {
                $gte: new Date(scheduledTime - windowMs),
                $lte: new Date(scheduledTime + windowMs),
            },
        });
        if (conflictingReservation) {
            throw new ApiErrors_1.default(400, "You already have a reservation ride scheduled around this time.");
        }
    }
    const category = yield rideCategory_model_1.RideCategory.findById(payload.rideCategoryId);
    if (!category) {
        throw new ApiErrors_1.default(404, "Ride category not found");
    }
    if (category.status !== status_1.STATUS.ACTIVE) {
        throw new ApiErrors_1.default(400, "Selected ride category is disabled or inactive");
    }
    if (isReservation && category.supportsReservation === false) {
        throw new ApiErrors_1.default(400, "Selected ride category does not support reservation rides");
    }
    if (payload.serviceCategoryId &&
        category.serviceCategoryId &&
        category.serviceCategoryId.toString() !== payload.serviceCategoryId) {
        throw new ApiErrors_1.default(400, "Selected Ride Category does not belong to the selected Service Category");
    }
    // 3. Perform route estimation
    const routeEstimation = yield estimateFareAndRoute({
        pickup: payload.pickup,
        stops: payload.stops,
        destination: payload.destination,
        serviceCategoryId: payload.serviceCategoryId,
        rideType: payload.rideType,
        scheduledAt: scheduledAtUtc,
    });
    // 4. Progressive Driver Matching
    // - Initial search within configured radius (default 5km)
    // - Drivers have 60 seconds visibility to accept
    // - Radius expands progressively if no driver accepts
    // - Overall 5-minute lifetime for the ride request
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const initialSearchRadiusKm = systemConfig.driverMatching.initialSearchRadiusKm;
    // Find eligible drivers within initial radius
    const eligibleDrivers = yield (0, driverMatchingService_1.findEligibleDriversInRadius)({
        pickupLocation: payload.pickup.location,
        radiusKm: initialSearchRadiusKm,
        rideCategoryId: payload.rideCategoryId,
        serviceCategoryId: payload.serviceCategoryId,
        rideServiceAreaId: (_d = (_c = routeEstimation.serviceArea) === null || _c === void 0 ? void 0 : _c._id) === null || _d === void 0 ? void 0 : _d.toString(),
        rideDestination: payload.destination.location,
        rideType: payload.rideType,
        scheduledAt: scheduledAtUtc,
    });
    const selectedDrivers = eligibleDrivers.slice(0, 10); // Limit to nearest 10 drivers
    const pendingPayments = yield pendingPayment_model_1.PendingPayment.find({
        userId,
        status: "pending",
        type: "cancellation_fee",
    });
    const outstandingCancellationFee = pendingPayments.reduce((sum, item) => sum + item.amount, 0);
    // Find the fare for the selected category from the categories array
    const selectedCategoryEstimation = routeEstimation.categories.find((cat) => cat.rideCategoryId === payload.rideCategoryId);
    const baseCalculatedFare = selectedCategoryEstimation
        ? {
            baseFare: selectedCategoryEstimation.pricingBreakdown.baseFare,
            distanceFare: selectedCategoryEstimation.pricingBreakdown.distanceFare,
            timeFare: selectedCategoryEstimation.pricingBreakdown.durationFare,
            stopWaitingCharge: 0,
            cancellationFee: 0,
            discount: selectedCategoryEstimation.pricingBreakdown.discounts,
            subtotal: selectedCategoryEstimation.pricingBreakdown.total,
            commission: selectedCategoryEstimation.pricingBreakdown.commission,
            driverEarning: selectedCategoryEstimation.pricingBreakdown.driverEarning,
            total: selectedCategoryEstimation.pricingBreakdown.total,
            surgeMultiplier: selectedCategoryEstimation.pricingBreakdown.surgeMultiplier,
            surgeApplied: selectedCategoryEstimation.pricingBreakdown.surge,
        }
        : yield calculateFare(routeEstimation.routeInfo.totalDistanceKm, routeEstimation.routeInfo.totalDurationMinutes, category._id.toString(), (_e = routeEstimation.serviceArea) === null || _e === void 0 ? void 0 : _e._id, payload.serviceCategoryId);
    const fareSnapshot = Object.assign(Object.assign({}, baseCalculatedFare), { rideFare: baseCalculatedFare.total, pendingCancellationFee: outstandingCancellationFee, total: baseCalculatedFare.total + outstandingCancellationFee });
    const ridePayload = {
        userId: new mongoose_1.Types.ObjectId(userId),
        serviceAreaId: (_f = routeEstimation.serviceArea) === null || _f === void 0 ? void 0 : _f._id,
        serviceCategoryId: payload.serviceCategoryId
            ? new mongoose_1.Types.ObjectId(payload.serviceCategoryId)
            : undefined,
        rideCategory: {
            categoryId: category._id,
            name: category.name,
            commissionRate: category.commissionRate,
        },
        pickup: {
            address: payload.pickup.address,
            location: {
                type: "Point",
                coordinates: payload.pickup.location.coordinates,
            },
        },
        stops: (_g = payload.stops) === null || _g === void 0 ? void 0 : _g.map((s) => ({
            order: s.order,
            address: s.address,
            location: {
                type: "Point",
                coordinates: s.location.coordinates,
            },
        })),
        destination: {
            address: payload.destination.address,
            location: {
                type: "Point",
                coordinates: payload.destination.location.coordinates,
            },
        },
        routeInfo: {
            totalDistanceKm: routeEstimation.routeInfo.totalDistanceKm,
            totalDurationMinutes: routeEstimation.routeInfo.totalDurationMinutes,
            polyline: routeEstimation.routeInfo.polyline,
        },
        driverMatching: {
            requestExpireSeconds: systemConfig.driverMatching.rideRequestLifetimeSeconds,
            searchRadiusKm: initialSearchRadiusKm,
            requiredDriverCount: 1,
            notifiedDrivers: selectedDrivers.map((d) => ({
                driverId: d.driverId,
                sentAt: new Date(),
                status: ride_constant_1.DRIVER_MATCHING_STATUS.SENT,
            })),
        },
        rideType: payload.rideType,
        scheduledAt: scheduledAtUtc,
        timezone: payload.timezone,
        reservationStatus: isReservation ? "pending" : undefined,
        reservationExpiresAt: isReservation && scheduledAtUtc ? new Date(scheduledAtUtc) : undefined,
        status: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
        pickupVerification: {
            method: ride_constant_1.VERIFICATION_METHOD.OTP,
            phoneLastFourDigits: {
                value: user.phone.slice(-4),
                verified: false,
            },
        },
        dropVerification: {
            method: ride_constant_1.VERIFICATION_METHOD.OTP,
            phoneLastFourDigits: {
                value: user.phone.slice(-4),
                verified: false,
            },
        },
        fare: fareSnapshot,
        payment: {
            method: payload.paymentMethod,
            status: ride_constant_1.PAYMENT_STATUS.PENDING,
        },
        requestedAt: new Date(),
    };
    const ride = yield ride_model_1.Ride.create(ridePayload);
    if (isReservation) {
        // Convert scheduledAt from UTC to user's timezone for display
        const scheduledAtDisplay = ride.timezone && ride.scheduledAt
            ? (0, timezoneHelper_1.utcToTimezone)(ride.scheduledAt, ride.timezone).toISO()
            : ride.scheduledAt;
        socketHelper_1.socketHelper.sendToUser(userId, "reservation-created", {
            ride,
            message: "Reservation ride created successfully",
        });
        socketHelper_1.socketHelper.sendToUser(userId, "reservation-searching-driver", Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)));
    }
    // Calculate driver search timing information for response
    const driverSearchTiming = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
    // Initialize live tracking record for the ride
    yield tracking_model_1.Tracking.create({
        rideId: ride._id,
        userId: ride.userId,
        userLocation: {
            type: "Point",
            coordinates: payload.pickup.location.coordinates,
        },
        lastUpdatedAt: new Date(),
    });
    // 5. Emit socket events to eligible drivers in real-time
    // Build passenger summary once for all drivers
    const passengerSummary = (0, buildRideParticipantSummary_1.buildPassengerSummary)(user);
    logger_1.logger.info(`Attempting to send ride-request to ${selectedDrivers.length} drivers`);
    selectedDrivers.forEach((driver) => {
        logger_1.logger.info(`Sending ride-request to driver: ${driver.driverId.toString()}`);
        const sent = socketHelper_1.socketHelper.sendToUser(driver.driverId.toString(), "ride-request", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { pickup: ride.pickup, destination: ride.destination, stops: ride.stops, fare: ride.fare.total, routeInfo: ride.routeInfo, driverSearch: driverSearchTiming, user: passengerSummary }));
        logger_1.logger.info(`Ride-request to driver ${driver.driverId.toString()} - ${sent ? "SENT" : "FAILED"}`);
    });
    // 6. Schedule BullMQ jobs for progressive matching
    // A. Schedule overall ride expiration (5-minute lifetime)
    yield bullmq_1.rideExpirationQueue.add(`ride-expiration-${ride._id}`, {
        rideId: ride._id.toString(),
        userId,
    }, {
        delay: systemConfig.driverMatching.rideRequestLifetimeSeconds * 1000,
        jobId: `ride-expiration-${ride._id}`,
    });
    // B. Schedule driver visibility timeouts (60 seconds per driver)
    selectedDrivers.forEach((driver) => {
        bullmq_1.driverVisibilityQueue.add(`driver-visibility-${ride._id}-${driver.driverId}`, {
            rideId: ride._id.toString(),
            driverId: driver.driverId.toString(),
            userId,
        }, {
            delay: systemConfig.driverMatching.driverVisibilityDurationSeconds * 1000,
            jobId: `driver-visibility-${ride._id}-${driver.driverId}`,
        });
    });
    // C. Schedule first radius expansion if no drivers found in initial radius
    if (selectedDrivers.length === 0) {
        yield bullmq_1.radiusExpansionQueue.add(`radius-expansion-${ride._id}`, {
            rideId: ride._id.toString(),
            userId,
            pickupLocation: payload.pickup.location,
            currentRadiusKm: initialSearchRadiusKm,
            rideCategoryId: payload.rideCategoryId,
            serviceCategoryId: payload.serviceCategoryId,
            expansionCount: 0,
        }, {
            jobId: `radius-expansion-${ride._id}-0`,
        });
    }
    // Add driver search timing to response
    const rideWithTiming = ride.toObject();
    rideWithTiming.driverSearch = driverSearchTiming;
    return rideWithTiming;
});
/**
 * Driver accepts the ride (Atomic to prevent race conditions)
 */
const acceptRide = (driverUserId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId }).populate("userId", "name profileImage");
    if (!driverDoc) {
        throw new ApiErrors_1.default(404, "Driver profile not found");
    }
    // Verify driver is active/online
    if (driverDoc.driverAvailabilityStatus !== "online") {
        throw new ApiErrors_1.default(400, "You must be online to accept rides.");
    }
    const rideToAccept = yield ride_model_1.Ride.findById(rideId);
    if (!rideToAccept) {
        throw new ApiErrors_1.default(404, "Ride request not found");
    }
    // Verify reservation access if ride is scheduled
    if (rideToAccept.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
        const activeTier = yield tier_model_1.Tier.findById(driverDoc.currentTier);
        if (!activeTier || !((_b = (_a = activeTier.benefits) === null || _a === void 0 ? void 0 : _a.reservationAccess) === null || _b === void 0 ? void 0 : _b.enabled)) {
            throw new ApiErrors_1.default(403, "Your current tier does not support accepting scheduled reservations.");
        }
        const maxAdvanceHours = activeTier.benefits.reservationAccess.maxAdvanceHours || 0;
        if (maxAdvanceHours > 0 && rideToAccept.scheduledAt) {
            const scheduledTime = new Date(rideToAccept.scheduledAt).getTime();
            const advanceHours = (scheduledTime - Date.now()) / (1000 * 60 * 60);
            if (advanceHours > maxAdvanceHours) {
                throw new ApiErrors_1.default(403, `Your tier only supports reservation bookings up to ${maxAdvanceHours} hours in advance.`);
            }
        }
    }
    // Extract user ObjectId from populated userId
    const userObjectId = typeof driverDoc.userId === "object"
        ? driverDoc.userId._id
        : driverDoc.userId;
    if (rideToAccept.status !== ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER) {
        throw new ApiErrors_1.default(409, "This ride request is no longer available or was accepted by another driver.");
    }
    // Verify driver was notified and request is still active
    const driverNotification = (_d = (_c = rideToAccept.driverMatching) === null || _c === void 0 ? void 0 : _c.notifiedDrivers) === null || _d === void 0 ? void 0 : _d.find((d) => d.driverId.toString() === userObjectId.toString());
    if (!driverNotification) {
        throw new ApiErrors_1.default(400, "You were not notified for this ride request.");
    }
    if (driverNotification.status !== ride_constant_1.DRIVER_MATCHING_STATUS.SENT) {
        if (driverNotification.status === ride_constant_1.DRIVER_MATCHING_STATUS.EXPIRED) {
            throw new ApiErrors_1.default(400, "This ride request offer has expired for you.");
        }
        if (driverNotification.status === ride_constant_1.DRIVER_MATCHING_STATUS.REJECTED) {
            throw new ApiErrors_1.default(400, "You have already rejected this ride request.");
        }
        if (driverNotification.status === ride_constant_1.DRIVER_MATCHING_STATUS.ACCEPTED) {
            throw new ApiErrors_1.default(400, "You have already accepted this ride request.");
        }
        throw new ApiErrors_1.default(400, "This ride request offer is no longer valid.");
    }
    // Double check request time expiration in case background worker hasn't marked it yet
    if (driverNotification.sentAt &&
        ((_e = rideToAccept.driverMatching) === null || _e === void 0 ? void 0 : _e.requestExpireSeconds)) {
        const expireTime = new Date(driverNotification.sentAt).getTime() +
            rideToAccept.driverMatching.requestExpireSeconds * 1000;
        if (Date.now() > expireTime) {
            throw new ApiErrors_1.default(400, "This ride request offer has expired for you.");
        }
    }
    if (rideToAccept.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED &&
        rideToAccept.scheduledAt) {
        const scheduledTime = new Date(rideToAccept.scheduledAt).getTime();
        const windowMs = 30 * 60 * 1000;
        const driverConflict = yield ride_model_1.Ride.findOne({
            $or: [{ driverId: userObjectId }, { assignedDriverId: userObjectId }],
            status: {
                $in: [
                    ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
                    ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                    ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                    ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                    ride_constant_1.RIDE_STATUS.STARTED,
                ],
            },
            scheduledAt: {
                $gte: new Date(scheduledTime - windowMs),
                $lte: new Date(scheduledTime + windowMs),
            },
        });
        if (driverConflict) {
            throw new ApiErrors_1.default(400, "You have a schedule conflict with another active trip or reservation assignment.");
        }
    }
    const session = yield mongoose_2.default.startSession();
    session.startTransaction();
    try {
        const isReservationRide = rideToAccept.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED;
        const updateFields = {
            status: ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
            driverId: userObjectId,
            acceptedAt: new Date(),
            "driverMatching.notifiedDrivers.$[elem].status": ride_constant_1.DRIVER_MATCHING_STATUS.ACCEPTED,
            "driverMatching.notifiedDrivers.$[elem].respondedAt": new Date(),
        };
        if (isReservationRide) {
            updateFields.reservationStatus = "confirmed";
            updateFields.assignedDriverId = userObjectId;
            updateFields.reservationConfirmedAt = new Date();
            updateFields.reservationAssignedAt = new Date();
            updateFields.reservationAcceptedAt = new Date();
        }
        // Atomic update on Ride ensuring status is searching, driverId is empty, and driver notification status is sent
        const ride = yield ride_model_1.Ride.findOneAndUpdate({
            _id: rideId,
            status: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
            driverId: { $exists: false },
            "driverMatching.notifiedDrivers": {
                $elemMatch: {
                    driverId: userObjectId,
                    status: ride_constant_1.DRIVER_MATCHING_STATUS.SENT,
                },
            },
        }, {
            $set: updateFields,
        }, {
            new: true,
            session,
            arrayFilters: [
                {
                    "elem.driverId": userObjectId,
                    "elem.status": ride_constant_1.DRIVER_MATCHING_STATUS.SENT,
                },
            ],
        });
        if (!ride) {
            throw new ApiErrors_1.default(409, "This ride request is no longer available or was accepted by another driver.");
        }
        // Find driver's verified vehicle
        const car = yield car_model_1.Car.findOne({
            driverId: driverDoc._id,
            isVerified: true,
        }).session(session);
        if (car) {
            ride.carId = car._id;
            yield ride.save({ session });
        }
        // Set driver availability status to ON_TRIP only for immediate/instant rides
        if (!isReservationRide) {
            driverDoc.driverAvailabilityStatus = "on_trip";
            yield driverDoc.save({ session });
        }
        // Set driver details in the Tracking record with enhanced tracking fields and initial Google route
        let initialRemainingDistanceKm = 0;
        let initialEstimatedArrivalMinutes = 0;
        if (driverDoc.location && driverDoc.location.coordinates) {
            try {
                const route = yield googleRouteService_1.GoogleRouteService.calculateRoute({
                    lat: driverDoc.location.coordinates[1],
                    lng: driverDoc.location.coordinates[0],
                }, {
                    lat: ride.pickup.location.coordinates[1],
                    lng: ride.pickup.location.coordinates[0],
                });
                initialRemainingDistanceKm = route.totalDistanceKm;
                initialEstimatedArrivalMinutes = route.totalDurationMinutes;
            }
            catch (err) {
                logger_1.logger.error(`[RideService] Error calculating initial driver-to-pickup route: ${err.message}`);
                throw err;
            }
        }
        yield tracking_model_1.Tracking.findOneAndUpdate({ rideId: ride._id }, {
            $set: {
                driverId: userObjectId,
                driverLocation: driverDoc.location || {
                    type: "Point",
                    coordinates: [0, 0],
                },
                lastUpdatedAt: new Date(),
                lastDriverLocationUpdateAt: new Date(),
                remainingDistanceKm: initialRemainingDistanceKm,
                estimatedArrivalMinutes: initialEstimatedArrivalMinutes,
                etaCalculatedAt: new Date(),
            },
        }, { session, upsert: true });
        yield session.commitTransaction();
        session.endSession();
        // Update driver availability after accepting ride (outside transaction to prevent blocking)
        yield driverDutyPolicy_service_1.DriverDutyPolicyServices.updateDriverAvailability(userObjectId.toString());
        // Cancel all BullMQ jobs for this ride since it's been accepted
        try {
            // Remove ride expiration job
            const expirationJob = yield bullmq_1.rideExpirationQueue.getJob(`ride-expiration-${ride._id}`);
            if (expirationJob)
                yield expirationJob.remove();
            // Remove all driver visibility jobs for this ride
            const visibilityJobs = yield bullmq_1.driverVisibilityQueue.getJobs(["waiting", "delayed"], 0, 100);
            for (const job of visibilityJobs) {
                if (job.name.startsWith(`driver-visibility-${ride._id}`)) {
                    yield job.remove();
                }
            }
            // Remove all radius expansion jobs for this ride
            const expansionJobs = yield bullmq_1.radiusExpansionQueue.getJobs(["waiting", "delayed"], 0, 100);
            for (const job of expansionJobs) {
                if (job.name.startsWith(`radius-expansion-${ride._id}`)) {
                    yield job.remove();
                }
            }
            logger_1.logger.info(`Cancelled all BullMQ jobs for accepted ride ${ride._id}`);
        }
        catch (error) {
            logger_1.logger.error(`Error cancelling BullMQ jobs for ride ${ride._id}:`, error);
        }
        // Populate user and car info for the socket payloads
        // Note: phone is excluded from userId populate to protect passenger privacy
        const populatedRide = yield ride_model_1.Ride.findById(ride._id)
            .populate("userId", "name profileImage averageRating totalRatings")
            .populate("carId");
        // Build enriched driver summary with ratings, total trips, and car info
        const driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
        // Real-time socket events:
        // A. Notify Passenger that ride is accepted
        const driverSearchTiming = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
        // Get tracking info for ETA
        const tracking = yield tracking_model_1.Tracking.findOne({ rideId: ride._id });
        socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "ride-accepted", Object.assign(Object.assign({ ride: populatedRide }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { driver: driverSummary, driverSearch: driverSearchTiming, pickupLocation: ride.pickup, rideCategory: ride.rideCategory, price: ride.fare.total, estimatedArrivalMinutes: tracking === null || tracking === void 0 ? void 0 : tracking.estimatedArrivalMinutes, remainingDistanceKm: tracking === null || tracking === void 0 ? void 0 : tracking.remainingDistanceKm }));
        if (ride.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "reservation-confirmed", {
                ride: populatedRide,
                driver: driverSummary,
            });
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "reservation-driver-assigned", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { driver: driverSummary }));
        }
        // B. Send push notification to passenger
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Ride Confirmed",
            text: `${driverSummary.name || "Driver"} has accepted your ride request and is on the way.`,
            receiver: ride.userId,
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
            referenceId: ride._id,
            referenceModel: "Ride",
        });
        // C. Cancel the request for all other notified drivers
        const otherDrivers = ride.driverMatching.notifiedDrivers
            .filter((d) => d.driverId.toString() !== driverUserId)
            .map((d) => d.driverId.toString());
        socketHelper_1.socketHelper.sendToUsers(otherDrivers, "ride-request-cancelled", {
            rideId: ride._id,
            message: "This ride request has been accepted by another driver.",
            driverSearch: driverSearchTiming,
        });
        return populatedRide;
    }
    catch (error) {
        if (session.inTransaction()) {
            yield session.abortTransaction();
        }
        session.endSession();
        throw error;
    }
});
/**
 * Driver rejects the ride request
 */
const rejectRide = (driverUserId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId }).populate("userId", "name profileImage");
    if (!driverDoc) {
        throw new ApiErrors_1.default(404, "Driver profile not found");
    }
    const ride = yield ride_model_1.Ride.findOne({
        _id: rideId,
        status: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
    });
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found or no longer accepting drivers.");
    }
    // Check if this driver was actually notified
    const driverNotification = ride.driverMatching.notifiedDrivers.find((d) => d.driverId.toString() === driverUserId);
    if (!driverNotification) {
        throw new ApiErrors_1.default(400, "You were not notified for this ride request.");
    }
    if (driverNotification.status !== ride_constant_1.DRIVER_MATCHING_STATUS.SENT) {
        throw new ApiErrors_1.default(400, "You have already responded to this ride request.");
    }
    // Update driver notification status to REJECTED
    driverNotification.status = ride_constant_1.DRIVER_MATCHING_STATUS.REJECTED;
    driverNotification.respondedAt = new Date();
    yield ride.save();
    // Check if all drivers have responded (accepted, rejected, or expired)
    const allDriversResponded = ride.driverMatching.notifiedDrivers.every((d) => d.status !== ride_constant_1.DRIVER_MATCHING_STATUS.SENT);
    // If all drivers have responded and no one accepted, trigger immediate radius expansion
    if (allDriversResponded && ride.status === ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER) {
        yield triggerImmediateRadiusExpansion(ride);
    }
    logger_1.logger.info(`Driver ${driverUserId} rejected ride ${rideId}`);
    return ride;
});
/**
 * Trigger immediate radius expansion when all drivers have responded
 */
const triggerImmediateRadiusExpansion = (ride) => __awaiter(void 0, void 0, void 0, function* () {
    const currentRadius = ride.driverMatching.searchRadiusKm;
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const maxRadius = systemConfig.driverMatching.maxSearchRadiusKm;
    if (currentRadius >= maxRadius) {
        logger_1.logger.info(`Ride ${ride._id} reached maximum search radius, no further expansion`);
        return;
    }
    const newRadius = currentRadius + systemConfig.driverMatching.radiusExpansionDistanceKm;
    // Cancel any existing radius expansion jobs
    try {
        const existingJobs = yield bullmq_1.radiusExpansionQueue.getJobs(["waiting", "delayed"], 0, 100);
        for (const job of existingJobs) {
            if (job.name.startsWith(`radius-expansion-${ride._id}`)) {
                yield job.remove();
            }
        }
    }
    catch (error) {
        logger_1.logger.error(`Error cancelling existing radius expansion jobs:`, error);
    }
    // Trigger immediate expansion
    yield bullmq_1.radiusExpansionQueue.add(`radius-expansion-${ride._id}`, {
        rideId: ride._id.toString(),
        userId: ride.userId.toString(),
        pickupLocation: ride.pickup.location,
        currentRadiusKm: newRadius,
        rideCategoryId: ride.rideCategory.categoryId.toString(),
        serviceCategoryId: ride.serviceCategoryId,
        expansionCount: (ride.driverMatching.expansionCount || 0) + 1,
    }, {
        jobId: `radius-expansion-${ride._id}-immediate`,
    });
    logger_1.logger.info(`Triggered immediate radius expansion for ride ${ride._id} from ${currentRadius}km to ${newRadius}km`);
});
/**
 * Driver arrived at pickup point
 */
const arriveAtPickup = (driverUserId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId, driverId: driverUserId });
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found or you are not the assigned driver.");
    }
    if (ride.status !== ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED &&
        ride.status !== ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY) {
        throw new ApiErrors_1.default(400, "Invalid ride status transition to Arrived.");
    }
    // Only update status to DRIVER_ARRIVED - OTP will be generated when driver requests it
    ride.status = ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED;
    ride.arrivedAt = new Date();
    yield ride.save();
    // Build enriched driver summary for passenger
    const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId }).populate("userId", "name profileImage");
    // Ensure driver availability status is set to ON_TRIP when arriving at pickup
    if (driverDoc && driverDoc.driverAvailabilityStatus !== "on_trip") {
        driverDoc.driverAvailabilityStatus = "on_trip";
        yield driverDoc.save();
    }
    const car = yield car_model_1.Car.findOne({ driverId: driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc._id, isVerified: true });
    const driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
    // Send real-time updates with enriched driver summary
    socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "driver-arrived", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { driver: driverSummary, pickupLocation: ride.pickup, rideCategory: ride.rideCategory, price: ride.fare.total, estimatedArrivalMinutes: 0, remainingDistanceKm: 0 }));
    yield (0, notificationsHelper_1.sendNotifications)({
        title: "Driver Arrived",
        text: "Your driver has arrived at the pickup location.",
        receiver: ride.userId,
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: ride._id,
        referenceModel: "Ride",
    });
    return ride;
});
/**
 * Request start verification - Generate and send OTP to passenger
 */
const requestStartVerification = (driverUserId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId, driverId: driverUserId });
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found or you are not the assigned driver.");
    }
    if (ride.status !== ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED) {
        throw new ApiErrors_1.default(400, "Start verification can only be requested after driver has arrived.");
    }
    // Check if OTP already exists and is not expired
    if (ride.pickupVerification.otp && ride.pickupVerification.otp.expiresAt) {
        const now = new Date();
        if (ride.pickupVerification.otp.expiresAt > now &&
            !ride.pickupVerification.otp.verified) {
            // OTP is still valid, resend it
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "start-otp-generated", {
                rideId: ride._id,
                otp: ride.pickupVerification.otp.code,
            });
            return { ride, otpSent: true };
        }
    }
    // Generate new 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiration
    ride.pickupVerification = {
        method: ride_constant_1.VERIFICATION_METHOD.OTP,
        otp: {
            code: otpCode,
            createdAt: now,
            expiresAt: expiresAt,
            verified: false,
            attempts: 0,
        },
        phoneLastFourDigits: ride.pickupVerification.phoneLastFourDigits,
        verificationAttempts: ride.pickupVerification.verificationAttempts || [],
    };
    yield ride.save();
    // Send OTP ONLY to passenger via Socket.IO
    // Note: phoneLastFourDigits is NOT sent - driver must ask passenger verbally
    socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "start-otp-generated", {
        rideId: ride._id,
        otp: otpCode,
    });
    yield (0, notificationsHelper_1.sendNotifications)({
        title: "Start Ride Verification",
        text: `Share OTP ${otpCode} with your driver to start the ride.`,
        receiver: ride.userId,
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: ride._id,
        referenceModel: "Ride",
    });
    return { ride, otpSent: true };
});
/**
 * Verify OTP / Phone and start ride
 */
const startRide = (driverUserId, rideId, verification, ipAddress) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId, driverId: driverUserId });
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found or you are not the assigned driver.");
    }
    if (ride.status !== ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED) {
        throw new ApiErrors_1.default(400, "Ride can only be started after driver has arrived at pickup.");
    }
    // Prevent duplicate verification
    if (((_a = ride.pickupVerification.otp) === null || _a === void 0 ? void 0 : _a.verified) ||
        ((_b = ride.pickupVerification.phoneLastFourDigits) === null || _b === void 0 ? void 0 : _b.verified)) {
        throw new ApiErrors_1.default(400, "Ride has already been verified and started.");
    }
    const { otp, phoneLastFourDigits } = verification;
    let verified = false;
    let methodUsed = ride_constant_1.VERIFICATION_METHOD.OTP;
    if (otp) {
        const savedOtp = ride.pickupVerification.otp;
        if (!savedOtp) {
            throw new ApiErrors_1.default(400, "No OTP has been generated. Please request start verification first.");
        }
        // Check OTP expiration
        if (savedOtp.expiresAt && new Date() > savedOtp.expiresAt) {
            throw new ApiErrors_1.default(400, "OTP has expired. Please request a new OTP.");
        }
        // Verify OTP
        if (savedOtp.code === otp) {
            savedOtp.verified = true;
            savedOtp.verifiedAt = new Date();
            methodUsed = ride_constant_1.VERIFICATION_METHOD.OTP;
            verified = true;
        }
        else {
            savedOtp.attempts = (savedOtp.attempts || 0) + 1;
            // Log failed attempt
            ride.pickupVerification.verificationAttempts =
                ride.pickupVerification.verificationAttempts || [];
            ride.pickupVerification.verificationAttempts.push({
                method: ride_constant_1.VERIFICATION_METHOD.OTP,
                attemptedAt: new Date(),
                success: false,
                ipAddress: ipAddress || "unknown",
            });
            yield ride.save();
            throw new ApiErrors_1.default(400, "Incorrect verification OTP.");
        }
    }
    else if (phoneLastFourDigits) {
        const savedPhone = ride.pickupVerification.phoneLastFourDigits;
        if (savedPhone && savedPhone.value === phoneLastFourDigits) {
            savedPhone.verified = true;
            savedPhone.verifiedAt = new Date();
            methodUsed = ride_constant_1.VERIFICATION_METHOD.PHONE_LAST_4_DIGITS;
            verified = true;
        }
        else {
            // Log failed attempt
            ride.pickupVerification.verificationAttempts =
                ride.pickupVerification.verificationAttempts || [];
            ride.pickupVerification.verificationAttempts.push({
                method: ride_constant_1.VERIFICATION_METHOD.PHONE_LAST_4_DIGITS,
                attemptedAt: new Date(),
                success: false,
                ipAddress: ipAddress || "unknown",
            });
            yield ride.save();
            throw new ApiErrors_1.default(400, "Incorrect phone number digits verification.");
        }
    }
    if (!verified) {
        throw new ApiErrors_1.default(400, "Ride start verification failed.");
    }
    // Log successful verification attempt
    ride.pickupVerification.verificationAttempts =
        ride.pickupVerification.verificationAttempts || [];
    ride.pickupVerification.verificationAttempts.push({
        method: methodUsed,
        attemptedAt: new Date(),
        success: true,
        ipAddress: ipAddress || "unknown",
    });
    // Immediately invalidate OTP after successful verification
    if (ride.pickupVerification.otp) {
        ride.pickupVerification.otp.code = ""; // Clear the OTP
    }
    // Transition ride status to STARTED
    ride.status = ride_constant_1.RIDE_STATUS.STARTED;
    ride.startedAt = new Date();
    ride.pickupVerification.method = methodUsed;
    // Clear drop verification OTP (will be generated when needed)
    ride.dropVerification = {
        method: ride_constant_1.VERIFICATION_METHOD.OTP,
        phoneLastFourDigits: ride.pickupVerification.phoneLastFourDigits,
        verificationAttempts: ride.dropVerification.verificationAttempts || [],
    };
    yield ride.save();
    // Build enriched summaries for both passenger and driver
    const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId }).populate("userId", "name profileImage");
    const car = yield car_model_1.Car.findOne({ driverId: driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc._id, isVerified: true });
    const driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
    const userDoc = yield user_model_1.User.findById(ride.userId).select("name profileImage averageRating totalRatings");
    const passengerSummary = (0, buildRideParticipantSummary_1.buildPassengerSummary)(userDoc);
    // Socket update - notify both passenger and driver with enriched summaries
    socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "ride-started", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { verificationMethod: methodUsed, driver: driverSummary }));
    socketHelper_1.socketHelper.sendToUser(driverUserId, "ride-started", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { user: passengerSummary }));
    yield (0, notificationsHelper_1.sendNotifications)({
        title: "Ride Started",
        text: "Your ride has started. Have a safe journey!",
        receiver: ride.userId,
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: ride._id,
        referenceModel: "Ride",
    });
    return ride;
});
/**
 * Request end verification - Generate and send OTP to passenger
 */
const requestEndVerification = (driverUserId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId, driverId: driverUserId });
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found or you are not the assigned driver.");
    }
    if (ride.status !== ride_constant_1.RIDE_STATUS.STARTED) {
        throw new ApiErrors_1.default(400, "End verification can only be requested for ongoing rides.");
    }
    // Check if OTP already exists and is not expired
    if (ride.dropVerification.otp && ride.dropVerification.otp.expiresAt) {
        const now = new Date();
        if (ride.dropVerification.otp.expiresAt > now &&
            !ride.dropVerification.otp.verified) {
            // OTP is still valid, resend it
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "end-otp-generated", {
                rideId: ride._id,
                otp: ride.dropVerification.otp.code,
            });
            return { ride, otpSent: true };
        }
    }
    // Generate new 6-digit OTP (different from start OTP)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiration
    ride.dropVerification = {
        method: ride_constant_1.VERIFICATION_METHOD.OTP,
        otp: {
            code: otpCode,
            createdAt: now,
            expiresAt: expiresAt,
            verified: false,
            attempts: 0,
        },
        phoneLastFourDigits: ride.dropVerification.phoneLastFourDigits,
        verificationAttempts: ride.dropVerification.verificationAttempts || [],
    };
    yield ride.save();
    // Send OTP ONLY to passenger via Socket.IO
    // Note: phoneLastFourDigits is NOT sent - driver must ask passenger verbally
    socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "end-otp-generated", {
        rideId: ride._id,
        otp: otpCode,
    });
    yield (0, notificationsHelper_1.sendNotifications)({
        title: "Complete Ride Verification",
        text: `Share OTP ${otpCode} with your driver to complete the ride.`,
        receiver: ride.userId,
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: ride._id,
        referenceModel: "Ride",
    });
    return { ride, otpSent: true };
});
/**
 * Verify OTP / Phone and end ride (transitions driver availability back to online)
 */
const completeRide = (driverUserId, rideId, verification, ipAddress) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId, driverId: driverUserId });
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found or you are not the assigned driver.");
    }
    if (ride.status !== ride_constant_1.RIDE_STATUS.STARTED) {
        throw new ApiErrors_1.default(400, "Only ongoing rides can be completed.");
    }
    // Prevent duplicate verification
    if (((_a = ride.dropVerification.otp) === null || _a === void 0 ? void 0 : _a.verified) ||
        ((_b = ride.dropVerification.phoneLastFourDigits) === null || _b === void 0 ? void 0 : _b.verified)) {
        throw new ApiErrors_1.default(400, "Ride has already been verified and completed.");
    }
    const { otp, phoneLastFourDigits } = verification;
    let verified = false;
    let methodUsed = ride_constant_1.VERIFICATION_METHOD.OTP;
    if (otp) {
        const savedOtp = ride.dropVerification.otp;
        if (!savedOtp) {
            throw new ApiErrors_1.default(400, "No OTP has been generated. Please request end verification first.");
        }
        // Check OTP expiration
        if (savedOtp.expiresAt && new Date() > savedOtp.expiresAt) {
            throw new ApiErrors_1.default(400, "OTP has expired. Please request a new OTP.");
        }
        // Verify OTP
        if (savedOtp.code === otp) {
            savedOtp.verified = true;
            savedOtp.verifiedAt = new Date();
            methodUsed = ride_constant_1.VERIFICATION_METHOD.OTP;
            verified = true;
        }
        else {
            savedOtp.attempts = (savedOtp.attempts || 0) + 1;
            // Log failed attempt
            ride.dropVerification.verificationAttempts =
                ride.dropVerification.verificationAttempts || [];
            ride.dropVerification.verificationAttempts.push({
                method: ride_constant_1.VERIFICATION_METHOD.OTP,
                attemptedAt: new Date(),
                success: false,
                ipAddress: ipAddress || "unknown",
            });
            yield ride.save();
            throw new ApiErrors_1.default(400, "Incorrect drop verification OTP.");
        }
    }
    else if (phoneLastFourDigits) {
        const savedPhone = ride.dropVerification.phoneLastFourDigits;
        if (savedPhone && savedPhone.value === phoneLastFourDigits) {
            savedPhone.verified = true;
            savedPhone.verifiedAt = new Date();
            methodUsed = ride_constant_1.VERIFICATION_METHOD.PHONE_LAST_4_DIGITS;
            verified = true;
        }
        else {
            // Log failed attempt
            ride.dropVerification.verificationAttempts =
                ride.dropVerification.verificationAttempts || [];
            ride.dropVerification.verificationAttempts.push({
                method: ride_constant_1.VERIFICATION_METHOD.PHONE_LAST_4_DIGITS,
                attemptedAt: new Date(),
                success: false,
                ipAddress: ipAddress || "unknown",
            });
            yield ride.save();
            throw new ApiErrors_1.default(400, "Incorrect passenger phone verification digits.");
        }
    }
    if (!verified) {
        throw new ApiErrors_1.default(400, "Ride end completion verification failed.");
    }
    // Log successful verification attempt
    ride.dropVerification.verificationAttempts =
        ride.dropVerification.verificationAttempts || [];
    ride.dropVerification.verificationAttempts.push({
        method: methodUsed,
        attemptedAt: new Date(),
        success: true,
        ipAddress: ipAddress || "unknown",
    });
    // Immediately invalidate OTP after successful verification
    if (ride.dropVerification.otp) {
        ride.dropVerification.otp.code = ""; // Clear the OTP
    }
    const session = yield mongoose_2.default.startSession();
    session.startTransaction();
    try {
        // Transition ride status to COMPLETED (will be changed to PAYMENT_PENDING after payment processing)
        ride.status = ride_constant_1.RIDE_STATUS.COMPLETED;
        ride.completedAt = new Date();
        ride.dropVerification.method = methodUsed;
        // Reset consecutive cancellations for passenger and driver upon successful trip completion
        yield user_model_1.User.findByIdAndUpdate(ride.userId, { $set: { consecutiveCancellations: 0 } }, { session });
        if (ride.driverId) {
            yield driver_model_1.Driver.findOneAndUpdate({ userId: ride.driverId }, { $set: { consecutiveCancellations: 0 } }, { session });
        }
        // Recalculate duration & distances dynamically if actual route values deviated (future addition),
        // but for now finalize current estimated prices.
        yield ride.save({ session });
        // Mark driver status back to online
        yield driver_model_1.Driver.findOneAndUpdate({ userId: driverUserId }, { $set: { driverAvailabilityStatus: "online" } }, { session });
        yield session.commitTransaction();
        session.endSession();
        // Update driver availability after completing ride (outside transaction to prevent blocking)
        yield driverDutyPolicy_service_1.DriverDutyPolicyServices.updateDriverAvailability(driverUserId);
        // Trigger referral checks
        referral_service_1.ReferralService.handleDriverRideCompletion(driverUserId).catch((err) => {
            logger_1.logger.error("Driver referral completed ride progress error:", err);
        });
        // Award Points to Driver for Ride Completion
        points_service_1.PointsService.awardPoints(driverUserId, "ride_completed", "ride", ride._id, { notes: `Completed Ride ${ride._id}` })
            .then(() => __awaiter(void 0, void 0, void 0, function* () {
            // Award additional bonuses
            const sa = yield serviceArea_model_1.ServiceArea.findById(ride.serviceAreaId);
            if (sa && sa.type === "airport") {
                yield points_service_1.PointsService.awardPoints(driverUserId, "airport_ride", "ride", ride._id, { notes: `Airport Ride Bonus for Ride ${ride._id}` });
            }
            if (ride.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
                yield points_service_1.PointsService.awardPoints(driverUserId, "scheduled_ride", "ride", ride._id, { notes: `Scheduled Ride Bonus for Ride ${ride._id}` });
            }
            const activePeakHours = yield peakHour_model_1.PeakHour.find({ status: status_1.STATUS.ACTIVE });
            const isPeak = yield (0, surgeCalculation_service_2.isPeakHour)(ride.completedAt || new Date(), activePeakHours);
            if (isPeak) {
                yield points_service_1.PointsService.awardPoints(driverUserId, "peak_hour_ride", "ride", ride._id, { notes: `Peak Hour Ride Bonus for Ride ${ride._id}` });
            }
        }))
            .catch((err) => {
            logger_1.logger.error("Error awarding ride completion points:", err);
        });
        referral_service_1.ReferralService.checkAndProcessPassengerReferral(ride.userId.toString()).catch((err) => {
            logger_1.logger.error("Passenger referral completed ride check error:", err);
        });
        // Save destination to recent destinations (fire and forget, don't block the flow)
        // Only for passengers, not drivers
        recentDestination_service_1.RecentDestinationServices.saveOrUpdateRecentDestination(ride.userId.toString(), ride.destination.address, undefined, // placeName can be extracted from address if needed
        ride.destination.location.coordinates).catch((error) => {
            // Log error but don't break the ride completion flow
            logger_1.logger.error(`Failed to save recent destination for ride ${ride._id}:`, error);
        });
        // Build enriched summaries for both passenger and driver
        const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId }).populate("userId", "name profileImage");
        const car = yield car_model_1.Car.findOne({
            driverId: driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc._id,
            isVerified: true,
        });
        const driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
        const userDoc = yield user_model_1.User.findById(ride.userId).select("name profileImage averageRating totalRatings");
        const passengerSummary = (0, buildRideParticipantSummary_1.buildPassengerSummary)(userDoc);
        // Socket notify - notify both passenger and driver with enriched summaries
        socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "ride-completed", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { finalFare: ride.fare, verificationMethod: methodUsed, driver: driverSummary }));
        socketHelper_1.socketHelper.sendToUser(driverUserId, "ride-completed", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { user: passengerSummary }));
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Ride Completed",
            text: "You have arrived at your destination. Please pay the invoice.",
            receiver: ride.userId,
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
            referenceId: ride._id,
            referenceModel: "Ride",
        });
        return ride;
    }
    catch (error) {
        if (session.inTransaction()) {
            yield session.abortTransaction();
        }
        session.endSession();
        throw error;
    }
});
/**
 * Unified processor for completed ride payments (Stripe/Wallet)
 * Handles ride status update, commission split, driver wallet credit, transaction records, and alerts.
 */
const completeRidePayment = (rideId, paymentMethod, paymentIntent, // optional Stripe PaymentIntent object (if paid via Stripe)
stripeCheckoutSessionId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found");
    }
    if (ride.payment.status === ride_constant_1.PAYMENT_STATUS.PAID) {
        const transaction = yield transaction_model_1.Transaction.findOne({
            rideId: ride._id,
            transactionType: transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
        });
        return {
            ride,
            transaction,
            invoice: {
                rideId: ride._id,
                amount: ride.fare.total,
                paymentMethod: ride.payment.method,
                paidAt: ride.payment.paidAt,
            },
        };
    }
    let walletAmount = 0;
    let useWallet = false;
    let chargeAmount = ride.fare.total;
    if (paymentMethod === ride_constant_1.PAYMENT_METHOD.WALLET) {
        useWallet = true;
        walletAmount = ride.fare.total;
        chargeAmount = 0;
    }
    else if (paymentIntent && paymentIntent.metadata) {
        useWallet = paymentIntent.metadata.useWallet === "true";
        walletAmount = parseFloat(paymentIntent.metadata.walletAmount || "0");
        chargeAmount = paymentIntent.amount / 100;
    }
    const session = yield mongoose_2.default.startSession();
    session.startTransaction();
    try {
        // 1. Process partial/full wallet deduction if applicable
        if (useWallet && walletAmount > 0) {
            const passengerWallet = yield wallet_service_1.WalletService.getOrCreateWallet(ride.userId, session);
            if (passengerWallet.balance < walletAmount) {
                throw new ApiErrors_1.default(400, "Insufficient wallet balance.");
            }
            passengerWallet.balance = parseFloat((passengerWallet.balance - walletAmount).toFixed(2));
            yield passengerWallet.save({ session });
            // Record transaction for wallet deduction portion
            yield transaction_model_1.Transaction.create([
                {
                    transactionId: `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
                    userId: ride.userId,
                    rideId: ride._id,
                    bookingId: ride._id,
                    walletId: passengerWallet._id,
                    amount: walletAmount,
                    currency: config_1.default.stripe.currency || "USD",
                    paymentMethod: ride_constant_1.PAYMENT_METHOD.WALLET,
                    paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                    transactionType: transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    description: paymentMethod === ride_constant_1.PAYMENT_METHOD.WALLET
                        ? `Full ride payment of ${walletAmount} via passenger wallet.`
                        : `Partial payment of ${walletAmount} via passenger wallet.`,
                },
            ], { session });
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "wallet-updated", {
                balance: passengerWallet.balance,
            });
        }
        // 2. Mark ride payment details
        ride.payment.method = paymentMethod;
        ride.payment.status = ride_constant_1.PAYMENT_STATUS.PAID;
        ride.payment.paidAt = new Date();
        if (paymentIntent) {
            ride.payment.stripePaymentIntentId = paymentIntent.id;
        }
        if (stripeCheckoutSessionId) {
            ride.payment.stripeCheckoutSessionId = stripeCheckoutSessionId;
        }
        yield ride.save({ session });
        if (((_a = ride.fare) === null || _a === void 0 ? void 0 : _a.pendingCancellationFee) &&
            ride.fare.pendingCancellationFee > 0) {
            yield pendingPayment_model_1.PendingPayment.updateMany({ userId: ride.userId, status: "pending", type: "cancellation_fee" }, { $set: { status: "paid", paidWithRideId: ride._id } }, { session });
        }
        // 3. Create transaction record for the Stripe/Card payment portion
        let cardTransaction = null;
        const uniqueTxnRef = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (chargeAmount > 0) {
            const [cardTxn] = yield transaction_model_1.Transaction.create([
                {
                    transactionId: uniqueTxnRef,
                    userId: ride.userId,
                    driverId: ride.driverId
                        ? new mongoose_1.Types.ObjectId(ride.driverId)
                        : undefined,
                    bookingId: ride._id,
                    rideId: ride._id,
                    amount: chargeAmount,
                    currency: config_1.default.stripe.currency || "USD",
                    paymentMethod,
                    paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                    transactionType: transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    stripeCustomerId: (paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.customer) || undefined,
                    stripePaymentIntentId: (paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.id) || undefined,
                    stripeCheckoutSessionId: stripeCheckoutSessionId || undefined,
                    gatewayTransactionId: (paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.id) || undefined,
                    gatewayResponse: paymentIntent || undefined,
                    description: `Ride complete fare payment of ${chargeAmount} via ${paymentMethod}.`,
                },
            ], { session });
            cardTransaction = cardTxn;
        }
        // 4. Credit Driver's Wallet automatically with Driver Earnings
        if (ride.driverId) {
            const driverWallet = yield wallet_service_1.WalletService.getOrCreateWallet(ride.driverId, session);
            // Fetch driver profile ID
            const driverProfile = yield driver_model_1.Driver.findOne({
                userId: ride.driverId,
            }).session(session);
            let driverEarning = ride.fare.driverEarning;
            const commission = ride.fare.commission;
            // Apply tier bonus multiplier to driver earnings if enabled
            let multiplier = 1.0;
            if (driverProfile && driverProfile.currentTier) {
                const activeTier = yield tier_model_1.Tier.findById(driverProfile.currentTier);
                if (activeTier && ((_c = (_b = activeTier.benefits) === null || _b === void 0 ? void 0 : _b.bonusMultiplier) === null || _c === void 0 ? void 0 : _c.enabled)) {
                    multiplier =
                        activeTier.benefits.bonusMultiplier.multiplierValue || 1.0;
                    driverEarning = parseFloat((driverEarning * multiplier).toFixed(2));
                }
            }
            driverWallet.balance = parseFloat((driverWallet.balance + driverEarning).toFixed(2));
            yield driverWallet.save({ session });
            // Create Driver Earnings Credit Transaction record
            yield transaction_model_1.Transaction.create([
                {
                    transactionId: `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
                    userId: ride.driverId,
                    driverId: (driverProfile === null || driverProfile === void 0 ? void 0 : driverProfile._id) || undefined,
                    bookingId: ride._id,
                    rideId: ride._id,
                    walletId: driverWallet._id,
                    amount: driverEarning,
                    totalFare: ride.fare.total,
                    commission,
                    currency: config_1.default.stripe.currency || "USD",
                    paymentMethod,
                    paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                    transactionType: transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    description: `Driver earnings of ${driverEarning} credited (Total fare: ${ride.fare.total}, Commission: ${commission}${multiplier > 1.0 ? `, Tier Multiplier: ${multiplier}x` : ""}) for Ride: ${ride._id}.`,
                },
            ], { session });
            socketHelper_1.socketHelper.sendToUser(ride.driverId.toString(), "wallet-updated", {
                balance: driverWallet.balance,
            });
            socketHelper_1.socketHelper.sendToUser(ride.driverId.toString(), "driver-wallet-credited", {
                amount: driverEarning,
                rideId: ride._id,
            });
        }
        yield session.commitTransaction();
        session.endSession();
        // Trigger Passenger referral check upon payment completion
        referral_service_1.ReferralService.checkAndProcessPassengerReferral(ride.userId.toString()).catch((err) => {
            logger_1.logger.error("Passenger referral payment check error:", err);
        });
        // Build enriched summaries for both passenger and driver
        let driverSummary;
        let passengerSummary;
        if (ride.driverId) {
            const driverDoc = yield driver_model_1.Driver.findOne({
                userId: ride.driverId,
            }).populate("userId", "name profileImage");
            const car = yield car_model_1.Car.findOne({
                driverId: driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc._id,
                isVerified: true,
            });
            driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
        }
        const userDoc = yield user_model_1.User.findById(ride.userId).select("name profileImage averageRating totalRatings");
        passengerSummary = (0, buildRideParticipantSummary_1.buildPassengerSummary)(userDoc);
        // 5. Send Realtime alerts, notifications, and events
        const receipt = {
            rideId: ride._id,
            amount: ride.fare.total,
            paymentMethod,
            transactionId: uniqueTxnRef,
            paidAt: ride.payment.paidAt,
            driver: driverSummary,
        };
        socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "payment-completed", receipt);
        socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "payment-success", receipt);
        if (ride.driverId) {
            const driverReceipt = Object.assign(Object.assign({}, receipt), { user: passengerSummary });
            socketHelper_1.socketHelper.sendToUser(ride.driverId.toString(), "payment-completed", driverReceipt);
            socketHelper_1.socketHelper.sendToUser(ride.driverId.toString(), "payment-success", driverReceipt);
        }
        // Push notifications
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Payment Successful",
            text: `Your payment of ${ride.fare.total} via ${paymentMethod} was processed successfully.`,
            receiver: ride.userId,
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
            referenceId: ride._id,
            referenceModel: "Ride",
        });
        if (ride.driverId) {
            yield (0, notificationsHelper_1.sendNotifications)({
                title: "Earnings Received",
                text: `Passenger paid ${ride.fare.total}. Your earning of ${ride.fare.driverEarning} has been added.`,
                receiver: ride.driverId,
                type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
                referenceId: ride._id,
                referenceModel: "Ride",
            });
        }
        return {
            ride,
            transaction: cardTransaction || { transactionId: uniqueTxnRef },
            invoice: receipt,
        };
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
/**
 * Driver confirms receiving cash payment from passenger
 */
const confirmCashPayment = (driverUserId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId, driverId: driverUserId });
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found or you are not the assigned driver.");
    }
    if (ride.status !== ride_constant_1.RIDE_STATUS.COMPLETED) {
        throw new ApiErrors_1.default(400, "Payments can only be confirmed for completed rides.");
    }
    if (ride.payment.status === ride_constant_1.PAYMENT_STATUS.PAID) {
        throw new ApiErrors_1.default(400, "This ride has already been paid.");
    }
    const session = yield mongoose_2.default.startSession();
    session.startTransaction();
    try {
        ride.payment.status = ride_constant_1.PAYMENT_STATUS.PAID;
        ride.payment.paidAt = new Date();
        yield ride.save({ session });
        if (((_a = ride.fare) === null || _a === void 0 ? void 0 : _a.pendingCancellationFee) &&
            ride.fare.pendingCancellationFee > 0) {
            yield pendingPayment_model_1.PendingPayment.updateMany({ userId: ride.userId, status: "pending", type: "cancellation_fee" }, { $set: { status: "paid", paidWithRideId: ride._id } }, { session });
        }
        const uniqueTxnRef = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        yield transaction_model_1.Transaction.create([
            {
                transactionId: uniqueTxnRef,
                userId: ride.userId,
                driverId: new mongoose_1.Types.ObjectId(driverUserId),
                bookingId: ride._id,
                amount: ride.fare.total,
                paymentMethod: ride_constant_1.PAYMENT_METHOD.CARD, // maps to hand cash collection in backend transaction model
                paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                transactionType: transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                description: "Cash collected by Driver.",
            },
        ], { session });
        yield session.commitTransaction();
        session.endSession();
        // Build enriched summaries for both passenger and driver
        const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId }).populate("userId", "name profileImage");
        const car = yield car_model_1.Car.findOne({
            driverId: driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc._id,
            isVerified: true,
        });
        const driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
        const userDoc = yield user_model_1.User.findById(ride.userId).select("name profileImage averageRating totalRatings");
        const passengerSummary = (0, buildRideParticipantSummary_1.buildPassengerSummary)(userDoc);
        const receipt = {
            rideId: ride._id,
            amount: ride.fare.total,
            paymentMethod: "CASH",
            paidAt: ride.payment.paidAt,
            driver: driverSummary,
        };
        const driverReceipt = Object.assign(Object.assign({}, receipt), { user: passengerSummary });
        socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "payment-completed", receipt);
        socketHelper_1.socketHelper.sendToUser(driverUserId, "payment-completed", driverReceipt);
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Cash Payment Confirmed",
            text: `Driver confirmed cash payment of ${ride.fare.total}.`,
            receiver: ride.userId,
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
            referenceId: ride._id,
            referenceModel: "Ride",
        });
        return ride;
    }
    catch (error) {
        if (session.inTransaction()) {
            yield session.abortTransaction();
        }
        session.endSession();
        throw error;
    }
});
/**
 * Cancel ride
 */
const cancelRide = (userId, role, rideId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found");
    }
    // Prevent cancellation if ride already completed, started, or cancelled
    if (ride.status === ride_constant_1.RIDE_STATUS.COMPLETED ||
        ride.status === ride_constant_1.RIDE_STATUS.STARTED ||
        ride.status === ride_constant_1.RIDE_STATUS.CANCELLED ||
        ride.status === ride_constant_1.RIDE_STATUS.CANCELLED_BY_USER ||
        ride.status === ride_constant_1.RIDE_STATUS.CANCELLED_BY_DRIVER) {
        throw new ApiErrors_1.default(400, "Cannot cancel ride in its current state.");
    }
    const isUserPassenger = ride.userId.toString() === userId;
    const isUserDriver = ((_a = ride.driverId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    // Check if user is a notified driver (for rides in SEARCHING_DRIVER status)
    const isNotifiedDriver = ((_c = (_b = ride.driverMatching) === null || _b === void 0 ? void 0 : _b.notifiedDrivers) === null || _c === void 0 ? void 0 : _c.some((d) => d.driverId.toString() === userId)) || false;
    if (!isUserPassenger &&
        !isUserDriver &&
        !isNotifiedDriver &&
        role !== "admin" &&
        role !== "superAdmin") {
        throw new ApiErrors_1.default(403, "You do not have permission to cancel this ride.");
    }
    if (!payload.cancellationReasonId) {
        throw new ApiErrors_1.default(400, "Cancellation reason ID is required.");
    }
    const cancellationReason = yield cancellationReason_model_1.CancellationReason.findById(payload.cancellationReasonId);
    if (!cancellationReason) {
        throw new ApiErrors_1.default(404, "Cancellation reason not found");
    }
    const cancelledBy = isUserPassenger
        ? ride_constant_1.CANCELLED_BY.USER
        : isUserDriver || isNotifiedDriver
            ? ride_constant_1.CANCELLED_BY.DRIVER
            : ride_constant_1.CANCELLED_BY.ADMIN;
    // Fetch the simplified cancellation policy configuration document
    const policyConfig = yield cancellationPolicy_service_1.CancellationPolicyService.getPolicyConfig();
    // If Passenger (User) cancels:
    if (cancelledBy === ride_constant_1.CANCELLED_BY.USER || cancelledBy === ride_constant_1.CANCELLED_BY.ADMIN) {
        const isDriverAccepted = !!ride.driverId;
        const isDriverArrived = ride.status === ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED;
        let scenarioName;
        let scenario;
        if (!isDriverAccepted) {
            scenarioName = "passenger.beforeDriverAccepted";
            scenario = policyConfig.passenger.beforeDriverAccepted;
        }
        else if (isDriverArrived) {
            scenarioName = "passenger.afterDriverArrived";
            scenario = policyConfig.passenger.afterDriverArrived;
        }
        else {
            scenarioName = "passenger.afterDriverAccepted";
            scenario = policyConfig.passenger.afterDriverAccepted;
        }
        const mapped = cancellationPolicy_service_1.CANCEL_SCENARIO_MAPPING[scenarioName] || {
            scenario: scenarioName.replace(".", "_"),
            policyName: scenarioName,
        };
        const surgeMultiplier = ((_d = ride.fare) === null || _d === void 0 ? void 0 : _d.surgeMultiplier) || 1.0;
        const cancellationFee = scenario.cancellationFee * surgeMultiplier;
        const platformShare = scenario.platformShare * surgeMultiplier;
        const driverCompensation = scenario.driverCompensation * surgeMultiplier;
        const session = yield mongoose_2.default.startSession();
        session.startTransaction();
        try {
            const rideStatusBefore = ride.status;
            // Release driver immediately if exists
            if (ride.driverId) {
                yield driver_model_1.Driver.findOneAndUpdate({ userId: ride.driverId }, { $set: { driverAvailabilityStatus: "online" } }, { session });
                // Update driver availability after cancellation
                yield driverDutyPolicy_service_1.DriverDutyPolicyServices.updateDriverAvailability(ride.driverId.toString());
            }
            ride.status =
                cancelledBy === ride_constant_1.CANCELLED_BY.USER
                    ? ride_constant_1.RIDE_STATUS.CANCELLED_BY_USER
                    : ride_constant_1.RIDE_STATUS.CANCELLED;
            ride.cancellation = {
                cancelledBy,
                cancellationReasonId: cancellationReason._id,
                cancellationReasonName: payload.cancellationReasonName || cancellationReason.reasonName,
                cancellationFee,
                driverCompensation,
                platformShare,
                cancellationPolicy: {
                    scenario: mapped.scenario,
                    policyName: mapped.policyName,
                    cancellationFee,
                    driverCompensation,
                    platformShare,
                },
                paymentStatus: cancellationFee > 0
                    ? payload.paymentTiming === "now"
                        ? "pending"
                        : "pending"
                    : "paid",
                paymentCollectionMode: cancellationFee > 0
                    ? payload.paymentTiming === "now"
                        ? "immediate"
                        : "next_ride"
                    : undefined,
                rideStatusBeforeCancellation: rideStatusBefore,
                surgeSnapshot: {
                    multiplier: ((_e = ride.fare) === null || _e === void 0 ? void 0 : _e.surgeMultiplier) || 1.0,
                    amount: ((_f = ride.fare) === null || _f === void 0 ? void 0 : _f.surgeApplied) || 0.0,
                },
                fareSnapshot: ride.fare,
                cancelledAt: new Date(),
            };
            let pendingPaymentId;
            if (cancellationFee > 0) {
                const [createdPendingPayment] = yield pendingPayment_model_1.PendingPayment.create([
                    {
                        userId: ride.userId,
                        rideId: ride._id,
                        type: "cancellation_fee",
                        amount: cancellationFee,
                        driverCompensation: driverCompensation || 0,
                        platformShare: platformShare || 0,
                        status: "pending",
                    },
                ], { session });
                if (createdPendingPayment) {
                    pendingPaymentId = createdPendingPayment._id.toString();
                }
            }
            if (ride.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
                ride.reservationStatus = "cancelled";
                ride.reservationCancelledReason =
                    payload.cancellationReasonName || cancellationReason.reasonName;
            }
            yield ride.save({ session });
            // Only increment user cancellation statistics when passenger actively cancels
            if (cancelledBy === ride_constant_1.CANCELLED_BY.USER) {
                yield user_model_1.User.findByIdAndUpdate(ride.userId, {
                    $inc: { totalCancellations: 1, consecutiveCancellations: 1 },
                    $set: { lastCancellationTime: new Date() },
                }, { session });
            }
            yield session.commitTransaction();
            session.endSession();
            // Cancel all matching jobs
            try {
                const expirationJob = yield bullmq_1.rideExpirationQueue.getJob(`ride-expiration-${ride._id}`);
                if (expirationJob)
                    yield expirationJob.remove();
                const visibilityJobs = yield bullmq_1.driverVisibilityQueue.getJobs(["waiting", "delayed"], 0, 100);
                for (const job of visibilityJobs) {
                    if (job.name.startsWith(`driver-visibility-${ride._id}`)) {
                        yield job.remove();
                    }
                }
                const expansionJobs = yield bullmq_1.radiusExpansionQueue.getJobs(["waiting", "delayed"], 0, 100);
                for (const job of expansionJobs) {
                    if (job.name.startsWith(`radius-expansion-${ride._id}`)) {
                        yield job.remove();
                    }
                }
            }
            catch (err) {
                logger_1.logger.error("Error clearing match queues on cancellation:", err);
            }
            // Build enriched summaries for both passenger and driver
            let driverSummary;
            let passengerSummary;
            if (ride.driverId) {
                const driverDoc = yield driver_model_1.Driver.findOne({
                    userId: ride.driverId,
                }).populate("userId", "name profileImage");
                const car = yield car_model_1.Car.findOne({
                    driverId: driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc._id,
                    isVerified: true,
                });
                driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
            }
            const userDoc = yield user_model_1.User.findById(ride.userId).select("name profileImage averageRating totalRatings");
            passengerSummary = (0, buildRideParticipantSummary_1.buildPassengerSummary)(userDoc);
            // Notify User and Driver with enriched summaries
            const cancelPayload = Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { cancelledBy, reason: payload.cancellationReasonName || cancellationReason.reasonName, cancellationFee,
                driverCompensation,
                pendingPaymentId, driver: driverSummary });
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "ride-cancelled", cancelPayload);
            if (ride.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
                socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "reservation-cancelled", cancelPayload);
                if (ride.driverId) {
                    socketHelper_1.socketHelper.sendToUser(ride.driverId.toString(), "reservation-cancelled", Object.assign(Object.assign({}, cancelPayload), { user: passengerSummary }));
                }
            }
            // Notify all notified drivers whose status is "sent"
            (_h = (_g = ride.driverMatching) === null || _g === void 0 ? void 0 : _g.notifiedDrivers) === null || _h === void 0 ? void 0 : _h.forEach((d) => {
                if (d.status === ride_constant_1.DRIVER_MATCHING_STATUS.SENT) {
                    socketHelper_1.socketHelper.sendToUser(d.driverId.toString(), "ride-request-expired", {
                        rideId: ride._id,
                        message: "Ride request cancelled by passenger.",
                    });
                }
            });
            // Push Notifications
            if (ride.driverId) {
                yield (0, notificationsHelper_1.sendNotifications)({
                    title: "Ride Cancelled",
                    text: "The passenger has cancelled this ride request.",
                    receiver: ride.driverId,
                    type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
                    referenceId: ride._id,
                    referenceModel: "Ride",
                });
            }
            yield (0, notificationsHelper_1.sendNotifications)({
                title: "Ride Cancelled",
                text: "You have cancelled your ride.",
                receiver: ride.userId,
                type: notification_constant_1.NOTIFICATION_TYPE.USER,
                referenceId: ride._id,
                referenceModel: "Ride",
            });
            if (cancellationFee > 0) {
                yield (0, notificationsHelper_1.sendNotifications)({
                    title: "Cancellation Fee Applied",
                    text: `A cancellation fee of ${cancellationFee.toFixed(2)} has been applied to your account.`,
                    receiver: ride.userId,
                    type: notification_constant_1.NOTIFICATION_TYPE.USER,
                    referenceId: ride._id,
                    referenceModel: "Ride",
                });
            }
            return ride;
        }
        catch (error) {
            yield session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
    // If Driver cancels:
    if (cancelledBy === ride_constant_1.CANCELLED_BY.DRIVER) {
        const cancellingDriverUserId = userId;
        // Find driver profile
        const driverDoc = yield driver_model_1.Driver.findOne({
            userId: cancellingDriverUserId,
        }).populate("userId", "name profileImage");
        if (!driverDoc) {
            throw new ApiErrors_1.default(404, "Driver profile not found");
        }
        const consecutiveCancellations = driverDoc.consecutiveCancellations || 0;
        const threshold = policyConfig.driver.excessiveCancellationThreshold || 3;
        const isExcessive = consecutiveCancellations >= threshold;
        const internalScenarioName = isExcessive
            ? "driver.excessiveCancellation"
            : "driver.afterAccept";
        const scenario = isExcessive
            ? policyConfig.driver.excessiveCancellation
            : policyConfig.driver.afterAccept;
        const mapped = cancellationPolicy_service_1.CANCEL_SCENARIO_MAPPING[internalScenarioName] || {
            scenario: internalScenarioName.replace(".", "_"),
            policyName: internalScenarioName,
        };
        const surgeMultiplier = ((_j = ride.fare) === null || _j === void 0 ? void 0 : _j.surgeMultiplier) || 1.0;
        const cancellationFee = scenario.cancellationFee * surgeMultiplier;
        const platformShare = scenario.platformShare * surgeMultiplier;
        const driverCompensation = 0;
        const session = yield mongoose_2.default.startSession();
        session.startTransaction();
        try {
            // 1. Release the cancelling driver and make online
            yield driver_model_1.Driver.findOneAndUpdate({ userId: cancellingDriverUserId }, {
                $set: {
                    driverAvailabilityStatus: "online",
                    lastCancellationTime: new Date(),
                },
                $inc: { totalCancellations: 1, consecutiveCancellations: 1 },
                $push: {
                    cancellationHistory: {
                        rideId: ride._id,
                        cancellationReasonId: cancellationReason._id,
                        cancellationReasonName: payload.cancellationReasonName || cancellationReason.reasonName,
                        cancelledAt: new Date(),
                        cancellationFee,
                        platformShare,
                        driverCompensation,
                        cancellationPolicy: {
                            scenario: mapped.scenario,
                            policyName: mapped.policyName,
                            cancellationFee,
                            driverCompensation,
                            platformShare,
                        },
                    },
                },
            }, { session });
            // Update driver availability after cancellation
            yield driverDutyPolicy_service_1.DriverDutyPolicyServices.updateDriverAvailability(cancellingDriverUserId);
            // 2. Update Ride details
            // Remove driverId and carId, revert status to SEARCHING_DRIVER
            ride.status = ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER;
            ride.driverId = undefined;
            ride.carId = undefined;
            // Update matching history for the driver who cancelled
            // Find the driver in notifiedDrivers and update status to REJECTED
            const driverNotification = ride.driverMatching.notifiedDrivers.find((d) => d.driverId.toString() === cancellingDriverUserId);
            if (driverNotification) {
                driverNotification.status = ride_constant_1.DRIVER_MATCHING_STATUS.REJECTED;
                driverNotification.respondedAt = new Date();
            }
            else {
                ride.driverMatching.notifiedDrivers.push({
                    driverId: new mongoose_1.Types.ObjectId(cancellingDriverUserId),
                    sentAt: new Date(),
                    respondedAt: new Date(),
                    status: ride_constant_1.DRIVER_MATCHING_STATUS.REJECTED,
                });
            }
            yield ride.save({ session });
            yield session.commitTransaction();
            session.endSession();
            // Deduct points for accepted ride cancellation
            points_service_1.PointsService.deductPoints(cancellingDriverUserId, "accepted_ride_cancelled", "ride", ride._id, { notes: `Cancelled Accepted Ride ${ride._id}` }).catch((err) => logger_1.logger.error("Error deducting points for cancellation:", err));
            // 3. Resume Driver Matching automatically
            // Original timer calculation
            const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
            const elapsedMs = Date.now() - new Date(ride.requestedAt).getTime();
            const lifetimeMs = systemConfig.driverMatching.rideRequestLifetimeSeconds * 1000;
            const remainingMs = lifetimeMs - elapsedMs;
            if (remainingMs <= 0) {
                // Expire ride request immediately
                ride.status = ride_constant_1.RIDE_STATUS.EXPIRED;
                ride.cancellation = {
                    cancelledBy: ride_constant_1.CANCELLED_BY.ADMIN,
                    cancellationReasonName: "Ride request expired. No driver accepted within the maximum time limit.",
                    cancellationFee: 0,
                    driverCompensation: 0,
                    platformShare: 0,
                    cancelledAt: new Date(),
                };
                yield ride.save();
                socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "ride-expired", {
                    rideId: ride._id,
                    message: "Request expired. No driver found within the time limit.",
                    driverSearch: (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride),
                });
            }
            else {
                // Schedule overall expiration with remaining timer
                try {
                    const expJob = yield bullmq_1.rideExpirationQueue.getJob(`ride-expiration-${ride._id}`);
                    if (expJob)
                        yield expJob.remove();
                }
                catch (e) { }
                yield bullmq_1.rideExpirationQueue.add(`ride-expiration-${ride._id}`, {
                    rideId: ride._id.toString(),
                    userId: ride.userId.toString(),
                }, {
                    delay: remainingMs,
                    jobId: `ride-expiration-${ride._id}`,
                });
                // Find eligible drivers in search radius, excluding previously notified/rejected/cancelled ones
                const eligibleDrivers = yield (0, driverMatchingService_1.findEligibleDriversInRadius)({
                    pickupLocation: ride.pickup.location,
                    radiusKm: ride.driverMatching.searchRadiusKm,
                    rideCategoryId: ride.rideCategory.categoryId.toString(),
                    serviceCategoryId: (_k = ride.serviceCategoryId) === null || _k === void 0 ? void 0 : _k.toString(),
                    excludeDriverIds: ride.driverMatching.notifiedDrivers.map((d) => d.driverId.toString()),
                    rideServiceAreaId: (_l = ride.serviceAreaId) === null || _l === void 0 ? void 0 : _l.toString(),
                    rideDestination: ride.destination.location,
                    rideType: ride.rideType,
                    scheduledAt: ride.scheduledAt,
                });
                const newDrivers = eligibleDrivers.slice(0, 10);
                if (newDrivers.length > 0) {
                    const newDriverNotifications = newDrivers.map((driver) => ({
                        driverId: driver.driverId,
                        sentAt: new Date(),
                        status: ride_constant_1.DRIVER_MATCHING_STATUS.SENT,
                    }));
                    ride.driverMatching.notifiedDrivers.push(...newDriverNotifications);
                    yield ride.save();
                    const driverSearchTiming = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
                    // Build passenger summary for new drivers
                    const userDoc = yield user_model_1.User.findById(ride.userId).select("name profileImage averageRating totalRatings");
                    const passengerSummary = (0, buildRideParticipantSummary_1.buildPassengerSummary)(userDoc);
                    newDrivers.forEach((driver) => {
                        socketHelper_1.socketHelper.sendToUser(driver.driverId.toString(), "ride-request", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { pickup: ride.pickup, destination: ride.destination, stops: ride.stops, fare: ride.fare.total, routeInfo: ride.routeInfo, driverSearch: driverSearchTiming, user: passengerSummary }));
                        bullmq_1.driverVisibilityQueue.add(`driver-visibility-${ride._id}-${driver.driverId}`, {
                            rideId: ride._id.toString(),
                            driverId: driver.driverId.toString(),
                            userId: ride.userId.toString(),
                        }, {
                            delay: systemConfig.driverMatching.driverVisibilityDurationSeconds *
                                1000,
                            jobId: `driver-visibility-${ride._id}-${driver.driverId}`,
                        });
                    });
                }
                else {
                    // If no new drivers are found, trigger immediate radius expansion
                    yield triggerImmediateRadiusExpansion(ride);
                }
            }
            // Notify passenger of driver cancellation, but ride continues searching
            const cancelPayload = {
                rideId: ride._id,
                cancelledBy: ride_constant_1.CANCELLED_BY.DRIVER,
                reason: payload.cancellationReasonName || cancellationReason.reasonName,
                cancellationFee,
                driverCompensation,
            };
            // Emit ride-cancelled socket event to user/cancelling driver to signal cancellation of current acceptance
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "ride-cancelled", cancelPayload);
            socketHelper_1.socketHelper.sendToUser(cancellingDriverUserId, "ride-cancelled", cancelPayload);
            // Send push notification to passenger
            yield (0, notificationsHelper_1.sendNotifications)({
                title: "Ride Cancelled by Driver",
                text: "The driver has cancelled this ride. We are looking for another driver.",
                receiver: ride.userId,
                type: notification_constant_1.NOTIFICATION_TYPE.USER,
                referenceId: ride._id,
                referenceModel: "Ride",
            });
            // Send push notification to driver
            yield (0, notificationsHelper_1.sendNotifications)({
                title: "Ride Cancelled",
                text: "You have cancelled this ride.",
                receiver: new mongoose_1.Types.ObjectId(cancellingDriverUserId),
                type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
                referenceId: ride._id,
                referenceModel: "Ride",
            });
            return ride;
        }
        catch (error) {
            yield session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
    throw new ApiErrors_1.default(400, "Invalid cancellation actor.");
});
/**
 * Add stops during an active trip
 * Only allowed after ride has started and before completion
 */
const addStopsDuringTrip = (userId, rideId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found");
    }
    // Verify user is the passenger
    if (ride.userId.toString() !== userId) {
        throw new ApiErrors_1.default(403, "Only the passenger can add stops to this ride");
    }
    // Validate ride status - must be STARTED
    if (ride.status !== ride_constant_1.RIDE_STATUS.STARTED) {
        throw new ApiErrors_1.default(400, "Stops can only be added during an ongoing trip (status: STARTED)");
    }
    // Get current tracking to determine completed stops
    const tracking = yield tracking_model_1.Tracking.findOne({ rideId });
    const currentStopOrder = (_a = tracking === null || tracking === void 0 ? void 0 : tracking.currentStopOrder) !== null && _a !== void 0 ? _a : -1;
    // Validate each new stop
    for (const newStop of payload.stops) {
        // Validate coordinates
        const [longitude, latitude] = newStop.location.coordinates;
        if (isNaN(latitude) ||
            isNaN(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180) {
            throw new ApiErrors_1.default(400, `Invalid coordinates for stop at order ${newStop.order}`);
        }
        // Validate stop order - must be greater than current completed stop order
        if (newStop.order <= currentStopOrder) {
            throw new ApiErrors_1.default(400, `Stop order ${newStop.order} conflicts with already completed stops (current: ${currentStopOrder})`);
        }
        // Check if stop with same order already exists
        const existingStop = (_b = ride.stops) === null || _b === void 0 ? void 0 : _b.find((s) => s.order === newStop.order);
        if (existingStop) {
            throw new ApiErrors_1.default(400, `Stop with order ${newStop.order} already exists`);
        }
        // Check if stop is a duplicate of existing stops
        const isDuplicate = (_c = ride.stops) === null || _c === void 0 ? void 0 : _c.some((s) => {
            const [existingLon, existingLat] = s.location.coordinates;
            const distance = Math.sqrt(Math.pow(existingLat - latitude, 2) +
                Math.pow(existingLon - longitude, 2));
            return distance < 0.0001; // Very small tolerance for duplicate detection
        });
        if (isDuplicate) {
            throw new ApiErrors_1.default(400, `Stop at order ${newStop.order} is a duplicate of an existing stop`);
        }
    }
    // Get current driver location for route recalculation
    const driverLocation = tracking === null || tracking === void 0 ? void 0 : tracking.driverLocation;
    if (!driverLocation) {
        throw new ApiErrors_1.default(400, "Driver location not available for route recalculation");
    }
    // Build the remaining route points
    // Start from current driver location
    const originCoord = {
        lat: driverLocation.coordinates[1],
        lng: driverLocation.coordinates[0],
    };
    // Get all uncompleted existing stops (order > currentStopOrder AND !isCompleted)
    const uncompletedExistingStops = ((_d = ride.stops) === null || _d === void 0 ? void 0 : _d.filter((s) => s.order > currentStopOrder && !s.isCompleted).sort((a, b) => a.order - b.order)) || [];
    // Merge new stops with existing uncompleted stops, preserving order
    const allStops = [...uncompletedExistingStops, ...payload.stops].sort((a, b) => a.order - b.order);
    // Build waypoints for route calculation
    const waypoints = allStops.map((s) => ({
        lat: s.location.coordinates[1],
        lng: s.location.coordinates[0],
    }));
    // Destination is the final destination
    const destCoord = {
        lat: ride.destination.location.coordinates[1],
        lng: ride.destination.location.coordinates[0],
    };
    console.log("📍 Route Recalculation Debug:");
    console.log("  Driver Location (MongoDB [lng, lat]):", driverLocation.coordinates);
    console.log("  Origin (Google Maps lat, lng):", originCoord);
    console.log("  Destination (MongoDB [lng, lat]):", ride.destination.location.coordinates);
    console.log("  Destination (Google Maps lat, lng):", destCoord);
    console.log("  Current Stop Order:", currentStopOrder);
    console.log("  Uncompleted Existing Stops:", uncompletedExistingStops.length);
    console.log("  New Stops:", payload.stops.length);
    console.log("  All Stops (sorted):", allStops.map((s) => ({
        order: s.order,
        address: s.address,
        coords: s.location.coordinates,
    })));
    console.log("  Waypoints (Google Maps lat, lng):", waypoints);
    console.log("🚗 Route Sequence:");
    console.log("  Origin: Driver Current Location", originCoord);
    if (waypoints.length > 0) {
        console.log("  Waypoints:");
        waypoints.forEach((wp, index) => {
            const stop = allStops[index];
            console.log(`    ${index + 1}. ${stop.address} (${wp.lat}, ${wp.lng})`);
        });
    }
    console.log("  Destination:", ride.destination.address, destCoord);
    // Recalculate route using Google Maps Directions API
    const newRouteInfo = yield googleMapsHelper_1.googleMapsHelper.getRoute(originCoord, destCoord, waypoints);
    // Calculate remaining fare based on new route
    const remainingFare = yield calculateFare(newRouteInfo.totalDistanceKm, newRouteInfo.totalDurationMinutes, ride.rideCategory.categoryId.toString(), ride.serviceAreaId, undefined);
    // Update ride with new stops and route info
    ride.stops = [
        ...(ride.stops || []),
        ...payload.stops.map((s) => ({
            order: s.order,
            address: s.address,
            location: {
                type: "Point",
                coordinates: s.location.coordinates,
            },
            isCompleted: false,
        })),
    ];
    ride.routeInfo = {
        totalDistanceKm: newRouteInfo.totalDistanceKm,
        totalDurationMinutes: newRouteInfo.totalDurationMinutes,
        polyline: newRouteInfo.polyline,
        googleRouteId: newRouteInfo.googleRouteId,
    };
    ride.fare = remainingFare;
    yield ride.save();
    // Update tracking with new ETA and distance
    if (tracking) {
        tracking.remainingDistanceKm = newRouteInfo.totalDistanceKm;
        tracking.estimatedArrivalMinutes = newRouteInfo.totalDurationMinutes;
        tracking.etaCalculatedAt = new Date();
        yield tracking.save();
    }
    // Notify passenger about updated route and fare
    socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "stops-added", {
        rideId: ride._id,
        newStops: payload.stops,
        updatedRouteInfo: ride.routeInfo,
        updatedFare: ride.fare,
        remainingDistanceKm: tracking === null || tracking === void 0 ? void 0 : tracking.remainingDistanceKm,
        estimatedArrivalMinutes: tracking === null || tracking === void 0 ? void 0 : tracking.estimatedArrivalMinutes,
    });
    // Notify driver about updated route
    if (ride.driverId) {
        socketHelper_1.socketHelper.sendToUser(ride.driverId.toString(), "stops-added", {
            rideId: ride._id,
            newStops: payload.stops,
            updatedRouteInfo: ride.routeInfo,
            remainingDistanceKm: tracking === null || tracking === void 0 ? void 0 : tracking.remainingDistanceKm,
            estimatedArrivalMinutes: tracking === null || tracking === void 0 ? void 0 : tracking.estimatedArrivalMinutes,
        });
    }
    // Send push notification to passenger
    yield (0, notificationsHelper_1.sendNotifications)({
        title: "Route Updated",
        text: `${payload.stops.length} new stop(s) added to your trip. Fare and ETA have been updated.`,
        receiver: ride.userId,
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: ride._id,
        referenceModel: "Ride",
    });
    return ride;
});
/**
 * Retrieve specific ride details
 */
const getRideDetails = (userId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get the user to determine their role
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiErrors_1.default(404, "User not found");
    }
    // Build populate fields based on user role
    // Drivers should never see passenger phone numbers
    const userFields = user.role === "driver"
        ? "name profileImage averageRating totalRatings"
        : "name phone profileImage averageRating totalRatings";
    const driverFields = user.role === "driver" ? "name phone profileImage" : "name profileImage";
    const ride = yield ride_model_1.Ride.findById(rideId)
        .populate("userId", userFields)
        .populate("driverId", driverFields)
        .populate("carId");
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride booking not found");
    }
    if (ride.userId._id.toString() !== userId &&
        ((_a = ride.driverId) === null || _a === void 0 ? void 0 : _a._id.toString()) !== userId &&
        !(yield user_model_1.User.findOne({
            _id: userId,
            role: { $in: ["admin", "superAdmin"] },
        }))) {
        throw new ApiErrors_1.default(403, "You do not have permission to access these ride details.");
    }
    // Add driver search timing if ride is in searching state
    const rideObj = ride.toObject();
    if (ride.status === ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER) {
        rideObj.driverSearch = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
    }
    return rideObj;
});
/**
 * Find current ongoing/active ride for a passenger or a driver
 */
const getActiveRide = (userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const activeStates = [
        ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
        ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
        ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
        ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
        ride_constant_1.RIDE_STATUS.STARTED,
    ];
    const now = new Date();
    const imminentWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);
    const roleFilter = role === "driver"
        ? { driverId: new mongoose_1.Types.ObjectId(userId) }
        : { userId: new mongoose_1.Types.ObjectId(userId) };
    const query = {
        $and: [
            roleFilter,
            {
                $or: [
                    // Instant rides in active states
                    {
                        rideType: { $ne: ride_constant_1.RIDE_TYPE.SCHEDULED },
                        status: { $in: activeStates },
                    },
                    // Scheduled rides that are in progress
                    {
                        rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                        status: {
                            $in: [
                                ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                                ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                                ride_constant_1.RIDE_STATUS.STARTED,
                            ],
                        },
                    },
                    // Scheduled rides searching driver or driver accepted but imminent
                    {
                        rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                        status: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
                    },
                    {
                        rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                        status: ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                        scheduledAt: { $lte: imminentWindowEnd },
                    },
                ],
            },
        ],
    };
    // Get the user to determine their role
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiErrors_1.default(404, "User not found");
    }
    // Build populate fields based on user role
    // Drivers should never see passenger phone numbers
    const userFields = user.role === "driver" ? "name profileImage" : "name phone profileImage";
    const driverFields = user.role === "driver" ? "name phone profileImage" : "name profileImage";
    const ride = yield ride_model_1.Ride.findOne(query)
        .populate("userId", userFields)
        .populate("driverId", driverFields)
        .populate("carId");
    if (!ride) {
        return null;
    }
    // Add driver search timing if ride is in searching state
    const rideObj = ride.toObject();
    if (ride.status === ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER) {
        rideObj.driverSearch = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
    }
    return rideObj;
});
const getDriverRideHistory = (driverUserId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const page = Math.max(parseInt(String(query.page || "1"), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(query.limit || "10"), 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const driverObjectId = new mongoose_1.Types.ObjectId(driverUserId);
    // Driver participation constraint: Only include rides where driver actually accepted or was assigned
    const baseConditions = [
        {
            $or: [{ driverId: driverObjectId }, { assignedDriverId: driverObjectId }],
        },
        // Exclude incomplete ride statuses
        {
            status: {
                $nin: [
                    ride_constant_1.RIDE_STATUS.EXPIRED,
                    ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                    ride_constant_1.RIDE_STATUS.STARTED,
                    ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                    ride_constant_1.RIDE_STATUS.WAITING_USER_APPROVAL,
                    ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
                ],
            },
        },
    ];
    // Ride Type Filter
    if (query.rideType) {
        if (query.rideType === ride_constant_1.RIDE_TYPE.INSTANT ||
            query.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
            baseConditions.push({ rideType: query.rideType });
        }
        else {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid rideType provided. Must be 'instant' or 'scheduled'");
        }
    }
    // Status Filter
    if (query.status) {
        const rawStatus = String(query.status).trim();
        if (rawStatus === "cancelled") {
            baseConditions.push({
                status: {
                    $in: [
                        ride_constant_1.RIDE_STATUS.CANCELLED,
                        ride_constant_1.RIDE_STATUS.CANCELLED_BY_USER,
                        ride_constant_1.RIDE_STATUS.CANCELLED_BY_DRIVER,
                    ],
                },
            });
        }
        else if (Object.values(ride_constant_1.RIDE_STATUS).includes(rawStatus)) {
            baseConditions.push({ status: rawStatus });
        }
    }
    // Payment Status Filter
    if (query.paymentStatus) {
        baseConditions.push({ "payment.status": query.paymentStatus });
    }
    // Date Filtering
    const dateField = query.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED ? "scheduledAt" : "createdAt";
    let startDate;
    let endDate;
    const fromDateStr = query.fromDate
        ? String(query.fromDate).trim().toLowerCase()
        : undefined;
    const toDateStr = query.toDate
        ? String(query.toDate).trim().toLowerCase()
        : undefined;
    const now = new Date();
    // Get driver's service area timezone dynamically, fallback to system configuration
    const driver = yield driver_model_1.Driver.findOne({ userId: driverObjectId });
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const defaultTimezone = ((_a = systemConfig.driverRewards) === null || _a === void 0 ? void 0 : _a.timezone) || "Asia/Dhaka";
    let driverTimezone = defaultTimezone;
    if (driver === null || driver === void 0 ? void 0 : driver.serviceAreaId) {
        const serviceArea = yield serviceArea_model_1.ServiceArea.findById(driver.serviceAreaId);
        driverTimezone = (serviceArea === null || serviceArea === void 0 ? void 0 : serviceArea.timezone) || defaultTimezone;
    }
    if (fromDateStr === "today") {
        const range = (0, timezoneHelper_1.getDayRangeInTimezone)("today", driverTimezone);
        startDate = range.start;
        endDate = range.end;
    }
    else if (fromDateStr === "yesterday") {
        const range = (0, timezoneHelper_1.getDayRangeInTimezone)("yesterday", driverTimezone);
        startDate = range.start;
        endDate = range.end;
    }
    else if (fromDateStr === "last 7 days" ||
        fromDateStr === "last_7_days" ||
        fromDateStr === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    else if (fromDateStr === "last 30 days" ||
        fromDateStr === "last_30_days" ||
        fromDateStr === "30days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    else {
        if (query.fromDate && !isNaN(Date.parse(String(query.fromDate)))) {
            const { start } = (0, timezoneHelper_1.getDayRangeInTimezone)(String(query.fromDate), driverTimezone);
            startDate = start;
        }
        if (query.toDate && !isNaN(Date.parse(String(query.toDate)))) {
            const { end } = (0, timezoneHelper_1.getDayRangeInTimezone)(String(query.toDate), driverTimezone);
            endDate = end;
        }
    }
    if (startDate || endDate) {
        const dateRangeQuery = {};
        if (startDate)
            dateRangeQuery.$gte = startDate;
        if (endDate)
            dateRangeQuery.$lte = endDate;
        baseConditions.push({ [dateField]: dateRangeQuery });
    }
    // Search Filter
    let searchCondition;
    if (query.searchTerm) {
        const searchTerm = String(query.searchTerm).trim();
        const searchConditions = [
            { "pickup.address": { $regex: searchTerm, $options: "i" } },
            { "destination.address": { $regex: searchTerm, $options: "i" } },
        ];
        if (mongoose_1.Types.ObjectId.isValid(searchTerm)) {
            searchConditions.push({ _id: new mongoose_1.Types.ObjectId(searchTerm) });
        }
        const matchingUsers = yield user_model_1.User.find({
            name: { $regex: searchTerm, $options: "i" },
        })
            .select("_id")
            .lean();
        if (matchingUsers.length > 0) {
            searchConditions.push({
                userId: { $in: matchingUsers.map((u) => u._id) },
            });
        }
        searchCondition = { $or: searchConditions };
    }
    const filter = searchCondition
        ? { $and: [...baseConditions, searchCondition] }
        : { $and: baseConditions };
    // Sorting
    let sortField = "createdAt";
    if (query.sortBy) {
        const allowedSortFields = [
            "createdAt",
            "scheduledAt",
            "completedAt",
            "fare.total",
        ];
        if (allowedSortFields.includes(String(query.sortBy))) {
            sortField = String(query.sortBy);
        }
    }
    const sortOrderVal = String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrderVal };
    const total = yield ride_model_1.Ride.countDocuments(filter);
    const totalPage = Math.ceil(total / limit);
    const rides = yield ride_model_1.Ride.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("userId", "name profileImage phone email averageRating totalRatings")
        .populate("serviceCategoryId", "name description image")
        .lean();
    const data = rides.map((ride) => {
        var _a, _b, _c, _d;
        const passenger = ride.userId
            ? {
                id: ride.userId._id,
                name: ride.userId.name,
                profileImage: ride.userId.profileImage,
                phone: ride.userId.phone,
                email: ride.userId.email,
                rating: ride.userId.averageRating || 0,
                averageRating: ride.userId.averageRating || 0,
                totalRatings: ride.userId.totalRatings || 0,
            }
            : null;
        return {
            rideId: ride._id,
            rideType: ride.rideType,
            status: ride.status,
            passenger,
            pickup: ride.pickup,
            destination: ride.destination,
            stops: ride.stops || [],
            rideCategory: ride.rideCategory,
            serviceCategory: ride.serviceCategoryId,
            fare: ride.fare,
            payment: {
                method: (_a = ride.payment) === null || _a === void 0 ? void 0 : _a.method,
                status: (_b = ride.payment) === null || _b === void 0 ? void 0 : _b.status,
                paidAt: (_c = ride.payment) === null || _c === void 0 ? void 0 : _c.paidAt,
            },
            scheduledAt: ride.scheduledAt,
            acceptedAt: ride.acceptedAt,
            startedAt: ride.startedAt,
            completedAt: ride.completedAt,
            cancelledAt: (_d = ride.cancellation) === null || _d === void 0 ? void 0 : _d.cancelledAt,
            createdAt: ride.createdAt,
        };
    });
    return {
        meta: {
            page,
            limit,
            total,
            totalPage,
            hasNextPage: page < totalPage,
            hasPrevPage: page > 1,
        },
        data,
    };
});
/**
 * Retrieve specific ride details for driver history
 */
const getDriverRideHistoryDetails = (driverUserId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!mongoose_1.Types.ObjectId.isValid(rideId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid ride ID");
    }
    const driverObjectId = new mongoose_1.Types.ObjectId(driverUserId);
    const rideObjectId = new mongoose_1.Types.ObjectId(rideId);
    const ride = yield ride_model_1.Ride.findOne({
        _id: rideObjectId,
        $or: [{ driverId: driverObjectId }, { assignedDriverId: driverObjectId }],
    })
        .populate("userId", "name profileImage phone email averageRating totalRatings")
        .populate("serviceCategoryId", "name description image")
        .populate("carId")
        .lean();
    if (!ride) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Driver ride history details not found");
    }
    const passenger = ride.userId
        ? {
            id: ride.userId._id,
            name: ride.userId.name,
            profileImage: ride.userId.profileImage,
            phone: ride.userId.phone,
            email: ride.userId.email,
            rating: ride.userId.averageRating || 0,
            averageRating: ride.userId.averageRating || 0,
            totalRatings: ride.userId.totalRatings || 0,
        }
        : null;
    return {
        rideId: ride._id,
        rideType: ride.rideType,
        status: ride.status,
        passenger,
        pickup: ride.pickup,
        destination: ride.destination,
        stops: ride.stops || [],
        rideCategory: ride.rideCategory,
        serviceCategory: ride.serviceCategoryId,
        car: ride.carId,
        fare: ride.fare,
        payment: {
            method: (_a = ride.payment) === null || _a === void 0 ? void 0 : _a.method,
            status: (_b = ride.payment) === null || _b === void 0 ? void 0 : _b.status,
            paidAt: (_c = ride.payment) === null || _c === void 0 ? void 0 : _c.paidAt,
        },
        scheduledAt: ride.scheduledAt,
        acceptedAt: ride.acceptedAt,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
        cancelledAt: (_d = ride.cancellation) === null || _d === void 0 ? void 0 : _d.cancelledAt,
        cancellation: ride.cancellation,
        createdAt: ride.createdAt,
        updatedAt: ride.updatedAt,
    };
});
/**
 * Retrieve paginated ride history for a user (passenger)
 */
const getUserRideHistory = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    const baseConditions = [
        { userId: userObjectId },
        // Exclude incomplete ride statuses
        {
            status: {
                $nin: [
                    ride_constant_1.RIDE_STATUS.EXPIRED,
                    ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                    ride_constant_1.RIDE_STATUS.STARTED,
                    ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                    ride_constant_1.RIDE_STATUS.WAITING_USER_APPROVAL,
                    ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
                ],
            },
        },
    ];
    // Ride Type Filter
    if (query.rideType) {
        if (query.rideType === ride_constant_1.RIDE_TYPE.INSTANT ||
            query.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
            baseConditions.push({ rideType: query.rideType });
        }
        else {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid rideType provided. Must be 'instant' or 'scheduled'");
        }
    }
    // Status Filter
    if (query.status) {
        const rawStatus = String(query.status).trim();
        if (rawStatus === "cancelled") {
            baseConditions.push({
                status: {
                    $in: [
                        ride_constant_1.RIDE_STATUS.CANCELLED,
                        ride_constant_1.RIDE_STATUS.CANCELLED_BY_USER,
                        ride_constant_1.RIDE_STATUS.CANCELLED_BY_DRIVER,
                    ],
                },
            });
        }
        else if (Object.values(ride_constant_1.RIDE_STATUS).includes(rawStatus)) {
            baseConditions.push({ status: rawStatus });
        }
    }
    // Payment Status Filter
    if (query.paymentStatus) {
        baseConditions.push({ "payment.status": query.paymentStatus });
    }
    // Date Filtering
    const dateField = query.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED ? "scheduledAt" : "createdAt";
    let startDate;
    let endDate;
    const fromDateStr = query.fromDate
        ? String(query.fromDate).trim().toLowerCase()
        : undefined;
    const now = new Date();
    // Get system config default timezone dynamically
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const riderTimezone = ((_a = systemConfig.driverRewards) === null || _a === void 0 ? void 0 : _a.timezone) || "Asia/Dhaka";
    if (fromDateStr === "today") {
        const range = (0, timezoneHelper_1.getDayRangeInTimezone)("today", riderTimezone);
        startDate = range.start;
        endDate = range.end;
    }
    else if (fromDateStr === "yesterday") {
        const range = (0, timezoneHelper_1.getDayRangeInTimezone)("yesterday", riderTimezone);
        startDate = range.start;
        endDate = range.end;
    }
    else if (fromDateStr === "last 7 days" ||
        fromDateStr === "last_7_days" ||
        fromDateStr === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    else if (fromDateStr === "last 30 days" ||
        fromDateStr === "last_30_days" ||
        fromDateStr === "30days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    else {
        if (query.fromDate && !isNaN(Date.parse(String(query.fromDate)))) {
            const { start } = (0, timezoneHelper_1.getDayRangeInTimezone)(String(query.fromDate), riderTimezone);
            startDate = start;
        }
        if (query.toDate && !isNaN(Date.parse(String(query.toDate)))) {
            const { end } = (0, timezoneHelper_1.getDayRangeInTimezone)(String(query.toDate), riderTimezone);
            endDate = end;
        }
    }
    if (startDate || endDate) {
        const dateRangeQuery = {};
        if (startDate)
            dateRangeQuery.$gte = startDate;
        if (endDate)
            dateRangeQuery.$lte = endDate;
        baseConditions.push({ [dateField]: dateRangeQuery });
    }
    // Search Filter
    let searchCondition;
    if (query.searchTerm || query.search) {
        const rawSearch = query.searchTerm || query.search;
        const searchTerm = String(rawSearch).trim();
        const searchConditions = [
            { "pickup.address": { $regex: searchTerm, $options: "i" } },
            { "destination.address": { $regex: searchTerm, $options: "i" } },
        ];
        if (mongoose_1.Types.ObjectId.isValid(searchTerm)) {
            searchConditions.push({ _id: new mongoose_1.Types.ObjectId(searchTerm) });
        }
        const matchingDrivers = yield user_model_1.User.find({
            name: { $regex: searchTerm, $options: "i" },
        })
            .select("_id")
            .lean();
        if (matchingDrivers.length > 0) {
            searchConditions.push({
                driverId: { $in: matchingDrivers.map((u) => u._id) },
            });
        }
        searchCondition = { $or: searchConditions };
    }
    const filter = searchCondition
        ? { $and: [...baseConditions, searchCondition] }
        : { $and: baseConditions };
    // Sorting
    let sortField = "createdAt";
    if (query.sortBy) {
        const allowedSortFields = [
            "createdAt",
            "scheduledAt",
            "completedAt",
            "fare.total",
        ];
        if (allowedSortFields.includes(String(query.sortBy))) {
            sortField = String(query.sortBy);
        }
    }
    const sortOrderVal = String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrderVal };
    const total = yield ride_model_1.Ride.countDocuments(filter);
    const totalPage = Math.ceil(total / limit);
    const rides = yield ride_model_1.Ride.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("driverId", "name profileImage phone email averageRating totalRatings")
        .populate("serviceCategoryId", "name description image")
        .populate("carId", "brand model year licensePlate")
        .lean();
    const driverUserIds = rides
        .map((ride) => { var _a; return ((_a = ride.driverId) === null || _a === void 0 ? void 0 : _a._id) ? ride.driverId._id : ride.driverId; })
        .filter(Boolean);
    const driverDocMap = {};
    const driverTotalTripsMap = {};
    if (driverUserIds.length > 0) {
        const driverDocs = yield driver_model_1.Driver.find({
            userId: { $in: driverUserIds },
        })
            .select("userId averageRating totalRatings totalReviews")
            .lean();
        driverDocs.forEach((d) => {
            if (d.userId) {
                driverDocMap[d.userId.toString()] = d;
            }
        });
        const tripCounts = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    $or: [
                        { driverId: { $in: driverUserIds } },
                        { assignedDriverId: { $in: driverUserIds } },
                    ],
                    status: ride_constant_1.RIDE_STATUS.COMPLETED,
                },
            },
            {
                $group: {
                    _id: { $ifNull: ["$driverId", "$assignedDriverId"] },
                    totalTrips: { $sum: 1 },
                },
            },
        ]);
        tripCounts.forEach((tc) => {
            if (tc._id) {
                driverTotalTripsMap[tc._id.toString()] = tc.totalTrips;
            }
        });
    }
    const data = rides.map((ride) => {
        var _a, _b, _c, _d;
        const driverUser = ride.driverId;
        const driverIdStr = (driverUser === null || driverUser === void 0 ? void 0 : driverUser._id)
            ? driverUser._id.toString()
            : driverUser
                ? driverUser.toString()
                : null;
        const driverDoc = driverIdStr ? driverDocMap[driverIdStr] : null;
        const driver = driverUser
            ? {
                id: driverUser._id || driverUser,
                name: driverUser.name,
                profileImage: driverUser.profileImage,
                phone: driverUser.phone,
                email: driverUser.email,
                rating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
                averageRating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
                totalRatings: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.totalRatings) || driverUser.totalRatings || 0,
                totalTrips: driverIdStr ? driverTotalTripsMap[driverIdStr] || 0 : 0,
            }
            : null;
        return {
            rideId: ride._id,
            rideType: ride.rideType,
            status: ride.status,
            driver,
            car: ride.carId
                ? {
                    name: `${ride.carId.brand} ${ride.carId.model}`,
                    brand: ride.carId.brand,
                    model: ride.carId.model,
                    year: ride.carId.year,
                    licensePlate: ride.carId.licensePlate,
                }
                : null,
            pickup: ride.pickup,
            destination: ride.destination,
            stops: ride.stops || [],
            rideCategory: ride.rideCategory,
            serviceCategory: ride.serviceCategoryId,
            fare: ride.fare,
            payment: {
                method: (_a = ride.payment) === null || _a === void 0 ? void 0 : _a.method,
                status: (_b = ride.payment) === null || _b === void 0 ? void 0 : _b.status,
                paidAt: (_c = ride.payment) === null || _c === void 0 ? void 0 : _c.paidAt,
            },
            scheduledAt: ride.scheduledAt,
            acceptedAt: ride.acceptedAt,
            startedAt: ride.startedAt,
            completedAt: ride.completedAt,
            cancelledAt: (_d = ride.cancellation) === null || _d === void 0 ? void 0 : _d.cancelledAt,
            createdAt: ride.createdAt,
        };
    });
    return {
        meta: {
            page,
            limit,
            total,
            totalPage,
            hasNextPage: page < totalPage,
            hasPrevPage: page > 1,
        },
        data,
    };
});
/**
 * Retrieve specific ride details for user history
 */
const getUserRideHistoryDetails = (userId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!mongoose_1.Types.ObjectId.isValid(rideId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid ride ID");
    }
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    const rideObjectId = new mongoose_1.Types.ObjectId(rideId);
    const ride = yield ride_model_1.Ride.findOne({
        _id: rideObjectId,
        userId: userObjectId,
    })
        .populate("driverId", "name profileImage phone email averageRating totalRatings")
        .populate("serviceCategoryId", "name description image")
        .populate("carId")
        .lean();
    if (!ride) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User ride history details not found");
    }
    let driver = null;
    if (ride.driverId) {
        const driverUser = ride.driverId;
        const driverUserId = driverUser._id
            ? driverUser._id
            : new mongoose_1.Types.ObjectId(driverUser);
        const [driverDoc, completedTrips] = yield Promise.all([
            driver_model_1.Driver.findOne({ userId: driverUserId })
                .select("averageRating totalRatings totalReviews")
                .lean(),
            ride_model_1.Ride.countDocuments({
                $or: [{ driverId: driverUserId }, { assignedDriverId: driverUserId }],
                status: ride_constant_1.RIDE_STATUS.COMPLETED,
            }),
        ]);
        driver = {
            id: driverUser._id || driverUser,
            name: driverUser.name,
            profileImage: driverUser.profileImage,
            phone: driverUser.phone,
            email: driverUser.email,
            rating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
            averageRating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
            totalRatings: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.totalRatings) || driverUser.totalRatings || 0,
            totalTrips: completedTrips,
        };
    }
    return {
        rideId: ride._id,
        rideType: ride.rideType,
        status: ride.status,
        driver,
        pickup: ride.pickup,
        destination: ride.destination,
        stops: ride.stops || [],
        rideCategory: ride.rideCategory,
        serviceCategory: ride.serviceCategoryId,
        car: ride.carId,
        fare: ride.fare,
        payment: {
            method: (_a = ride.payment) === null || _a === void 0 ? void 0 : _a.method,
            status: (_b = ride.payment) === null || _b === void 0 ? void 0 : _b.status,
            paidAt: (_c = ride.payment) === null || _c === void 0 ? void 0 : _c.paidAt,
        },
        scheduledAt: ride.scheduledAt,
        acceptedAt: ride.acceptedAt,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
        cancelledAt: (_d = ride.cancellation) === null || _d === void 0 ? void 0 : _d.cancelledAt,
        cancellation: ride.cancellation,
        createdAt: ride.createdAt,
        updatedAt: ride.updatedAt,
    };
});
/**
 * Retrieve paginated reservation history for a user (passenger)
 */
const getMyReservations = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    const baseConditions = [
        { userId: userObjectId },
        { rideType: ride_constant_1.RIDE_TYPE.SCHEDULED },
    ];
    // Optional: filters for reservation status if passed in query
    if (query.reservationStatus) {
        baseConditions.push({
            reservationStatus: query.reservationStatus,
        });
    }
    // Optional: filters for status if passed in query
    if (query.status) {
        baseConditions.push({ status: query.status });
    }
    const filter = { $and: baseConditions };
    // Sort by createdAt descending so that the latest reservation shows first (sobar upore)
    const sortOption = { createdAt: -1 };
    const total = yield ride_model_1.Ride.countDocuments(filter);
    const totalPage = Math.ceil(total / limit);
    const rides = yield ride_model_1.Ride.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("driverId", "name profileImage phone email averageRating totalRatings")
        .populate("assignedDriverId", "name profileImage phone email averageRating totalRatings")
        .populate("serviceCategoryId", "name description image")
        .populate("carId", "brand model year licensePlate")
        .lean();
    const driverUserIds = rides
        .map((ride) => {
        var _a, _b;
        const activeDriver = ((_a = ride.driverId) === null || _a === void 0 ? void 0 : _a._id)
            ? ride.driverId._id
            : ride.driverId;
        const assignedDriver = ((_b = ride.assignedDriverId) === null || _b === void 0 ? void 0 : _b._id)
            ? ride.assignedDriverId._id
            : ride.assignedDriverId;
        return activeDriver || assignedDriver;
    })
        .filter(Boolean);
    const driverDocMap = {};
    const driverTotalTripsMap = {};
    if (driverUserIds.length > 0) {
        const driverDocs = yield driver_model_1.Driver.find({
            userId: { $in: driverUserIds },
        })
            .select("userId averageRating totalRatings totalReviews")
            .lean();
        driverDocs.forEach((d) => {
            if (d.userId) {
                driverDocMap[d.userId.toString()] = d;
            }
        });
        const tripCounts = yield ride_model_1.Ride.aggregate([
            {
                $match: {
                    $or: [
                        { driverId: { $in: driverUserIds } },
                        { assignedDriverId: { $in: driverUserIds } },
                    ],
                    status: ride_constant_1.RIDE_STATUS.COMPLETED,
                },
            },
            {
                $group: {
                    _id: { $ifNull: ["$driverId", "$assignedDriverId"] },
                    totalTrips: { $sum: 1 },
                },
            },
        ]);
        tripCounts.forEach((tc) => {
            if (tc._id) {
                driverTotalTripsMap[tc._id.toString()] = tc.totalTrips;
            }
        });
    }
    const data = rides.map((ride) => {
        var _a, _b, _c, _d;
        const activeDriver = ride.driverId;
        const assignedDriver = ride.assignedDriverId;
        const driverUser = activeDriver || assignedDriver;
        const driverIdStr = (driverUser === null || driverUser === void 0 ? void 0 : driverUser._id)
            ? driverUser._id.toString()
            : driverUser
                ? driverUser.toString()
                : null;
        const driverDoc = driverIdStr ? driverDocMap[driverIdStr] : null;
        const driver = driverUser
            ? {
                id: driverUser._id || driverUser,
                name: driverUser.name,
                profileImage: driverUser.profileImage,
                phone: driverUser.phone,
                email: driverUser.email,
                rating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
                averageRating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
                totalRatings: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.totalRatings) || driverUser.totalRatings || 0,
                totalTrips: driverIdStr ? driverTotalTripsMap[driverIdStr] || 0 : 0,
            }
            : null;
        return {
            rideId: ride._id,
            rideType: ride.rideType,
            status: ride.status,
            reservationStatus: ride.reservationStatus,
            driver,
            car: ride.carId
                ? {
                    name: `${ride.carId.brand} ${ride.carId.model}`,
                    brand: ride.carId.brand,
                    model: ride.carId.model,
                    year: ride.carId.year,
                    licensePlate: ride.carId.licensePlate,
                }
                : null,
            pickup: ride.pickup,
            destination: ride.destination,
            stops: ride.stops || [],
            rideCategory: ride.rideCategory,
            serviceCategory: ride.serviceCategoryId,
            fare: ride.fare,
            payment: {
                method: (_a = ride.payment) === null || _a === void 0 ? void 0 : _a.method,
                status: (_b = ride.payment) === null || _b === void 0 ? void 0 : _b.status,
                paidAt: (_c = ride.payment) === null || _c === void 0 ? void 0 : _c.paidAt,
            },
            scheduledAt: ride.scheduledAt,
            acceptedAt: ride.acceptedAt,
            startedAt: ride.startedAt,
            completedAt: ride.completedAt,
            cancelledAt: (_d = ride.cancellation) === null || _d === void 0 ? void 0 : _d.cancelledAt,
            createdAt: ride.createdAt,
        };
    });
    return {
        meta: {
            page,
            limit,
            total,
            totalPage,
            hasNextPage: page < totalPage,
            hasPrevPage: page > 1,
        },
        data,
    };
});
/**
 * Retrieve specific reservation details for user
 */
const getReservationDetails = (userId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!mongoose_1.Types.ObjectId.isValid(rideId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid reservation ID");
    }
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    const rideObjectId = new mongoose_1.Types.ObjectId(rideId);
    const ride = yield ride_model_1.Ride.findOne({
        _id: rideObjectId,
        userId: userObjectId,
        rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
    })
        .populate("driverId", "name profileImage phone email averageRating totalRatings")
        .populate("assignedDriverId", "name profileImage phone email averageRating totalRatings")
        .populate("serviceCategoryId", "name description image")
        .populate("carId")
        .lean();
    if (!ride) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Reservation details not found");
    }
    const driverUser = ride.driverId || ride.assignedDriverId;
    let driver = null;
    if (driverUser) {
        const driverUserId = driverUser._id
            ? driverUser._id
            : new mongoose_1.Types.ObjectId(driverUser);
        const [driverDoc, completedTrips] = yield Promise.all([
            driver_model_1.Driver.findOne({ userId: driverUserId })
                .select("averageRating totalRatings totalReviews")
                .lean(),
            ride_model_1.Ride.countDocuments({
                $or: [{ driverId: driverUserId }, { assignedDriverId: driverUserId }],
                status: ride_constant_1.RIDE_STATUS.COMPLETED,
            }),
        ]);
        driver = {
            id: driverUser._id || driverUser,
            name: driverUser.name,
            profileImage: driverUser.profileImage,
            phone: driverUser.phone,
            email: driverUser.email,
            rating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
            averageRating: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.averageRating) || driverUser.averageRating || 0,
            totalRatings: (driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.totalRatings) || driverUser.totalRatings || 0,
            totalTrips: completedTrips,
        };
    }
    return {
        rideId: ride._id,
        rideType: ride.rideType,
        status: ride.status,
        reservationStatus: ride.reservationStatus,
        driver,
        pickup: ride.pickup,
        destination: ride.destination,
        stops: ride.stops || [],
        rideCategory: ride.rideCategory,
        serviceCategory: ride.serviceCategoryId,
        car: ride.carId,
        fare: ride.fare,
        payment: {
            method: (_a = ride.payment) === null || _a === void 0 ? void 0 : _a.method,
            status: (_b = ride.payment) === null || _b === void 0 ? void 0 : _b.status,
            paidAt: (_c = ride.payment) === null || _c === void 0 ? void 0 : _c.paidAt,
        },
        scheduledAt: ride.scheduledAt,
        acceptedAt: ride.acceptedAt,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
        cancelledAt: (_d = ride.cancellation) === null || _d === void 0 ? void 0 : _d.cancelledAt,
        cancellation: ride.cancellation,
        createdAt: ride.createdAt,
        updatedAt: ride.updatedAt,
    };
});
exports.RideServices = {
    estimateFareAndRoute,
    requestRide,
    acceptRide,
    rejectRide,
    triggerImmediateRadiusExpansion,
    arriveAtPickup,
    requestStartVerification,
    startRide,
    requestEndVerification,
    completeRide,
    completeRidePayment,
    confirmCashPayment,
    cancelRide,
    getRideDetails,
    getActiveRide,
    addStopsDuringTrip,
    getDriverRideHistory,
    getDriverRideHistoryDetails,
    getUserRideHistory,
    getUserRideHistoryDetails,
    getMyReservations,
    getReservationDetails,
};
