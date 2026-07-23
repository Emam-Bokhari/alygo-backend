import { FilterQuery, Types } from "mongoose";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import config from "../../../config";
import { Ride } from "./ride.model";
import { IRide } from "./rider.interface";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { ServiceAreaServices } from "../serviceArea/serviceArea.service";
import { ServiceCategory } from "../serviceCategory/serviceCategory.model";
import { RideCategory } from "../rideCategory/rideCategory.model";
import { FareConfiguration } from "../fareConfiguration/fareConfiguration.model";
import { DriverDutyPolicy } from "../driverDutyPolicy/driverDutyPolicy.model";
import { DriverDutyPolicyServices } from "../driverDutyPolicy/driverDutyPolicy.service";
import { Transaction } from "../transaction/transaction.model";
import { Wallet } from "../wallet/wallet.model";
import { WalletService } from "../wallet/wallet.service";
import { ReferralService } from "../referral/referral.service";
import { Tracking } from "../tracking/tracking.model";
import { googleMapsHelper } from "../../../helpers/googleMapsHelper";
import { socketHelper } from "../../../helpers/socketHelper";
import { GoogleRouteService } from "../../../services/googleRouteService";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { CancellationPolicy } from "../cancellationPolicy/cancellationPolicy.model";
import { CancellationReason } from "../cancellationReason/cancellationReason.model";
import {
  CancellationPolicyService,
  CANCEL_SCENARIO_MAPPING,
} from "../cancellationPolicy/cancellationPolicy.service";
import { PendingPayment } from "../pendingPayment/pendingPayment.model";
import { STATUS } from "../../../constants/status";
import {
  RIDE_STATUS,
  DRIVER_MATCHING_STATUS,
  VERIFICATION_METHOD,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  CANCELLED_BY,
  RIDE_TYPE,
} from "./ride.constant";
import stripe from "../../../config/stripe";
import { logger } from "../../../shared/logger";
import { findEligibleDriversInRadius } from "../../../services/driverMatchingService";
import { SurgeCalculationService } from "../surgeRule/surgeCalculation.service";
import {
  rideExpirationQueue,
  driverVisibilityQueue,
  radiusExpansionQueue,
} from "../../../config/bullmq";
import { calculateDriverSearchTiming } from "../../../helpers/rideSearchTimingHelper";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { RecentDestinationServices } from "../recentDestination/recentDestination.service";
import {
  buildDriverSummary,
  buildPassengerSummary,
  buildPassengerSocketPayload,
  buildDriverSocketPayload,
} from "./helpers/buildRideParticipantSummary";
import {
  timezoneToUtc,
  utcToTimezone,
  getRideScheduleInfo,
  getDayRangeInTimezone,
} from "../../../shared/timezoneHelper";
import { PointsService } from "../tier/points.service";
import { PeakHour } from "../peakHour/peakHour.model";
import { isPeakHour } from "../surgeRule/surgeCalculation.service";
import { Tier } from "../tier/tier.model";

/**
 * Perform fare calculation based on distance, duration, and pricing configuration rules.
 */
const calculateFare = async (
  distanceKm: number,
  durationMinutes: number,
  categoryId: string,
  serviceAreaId?: string | Types.ObjectId,
  serviceCategoryId?: string | Types.ObjectId,
): Promise<IRide["fare"]> => {
  // Query Cascading Lookup:
  // 1. ServiceArea + ServiceCategory + RideCategory (Reservation Booking specific)
  // 2. ServiceArea + RideCategory (Normal Booking, serviceCategoryId is null)
  // 3. Global (serviceAreaId = null) + RideCategory

  let fareConfig = null;

  if (serviceAreaId) {
    if (serviceCategoryId) {
      fareConfig = await FareConfiguration.findOne({
        serviceAreaId,
        serviceCategoryId,
        rideCategoryId: categoryId,
        status: "active",
      });
    }

    if (!fareConfig) {
      // Normal Booking fallback (where serviceCategoryId is optional/null)
      fareConfig = await FareConfiguration.findOne({
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
      fareConfig = await FareConfiguration.findOne({
        serviceAreaId: { $exists: false },
        serviceCategoryId,
        rideCategoryId: categoryId,
        status: "active",
      });
    }

    if (!fareConfig) {
      fareConfig = await FareConfiguration.findOne({
        serviceAreaId: { $exists: false },
        serviceCategoryId: { $exists: false },
        rideCategoryId: categoryId,
        status: "active",
      });
    }
  }

  console.log(fareConfig, "Fare Config");

  if (!fareConfig) {
    throw new ApiError(
      404,
      `Fare configuration not found for Ride Category: ${categoryId} in Service Area: ${serviceAreaId || "Global"}`,
    );
  }

  const rideCategory = await RideCategory.findById(categoryId);
  if (!rideCategory) {
    throw new ApiError(404, "Selected Ride Category not found");
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
      multiplier = await SurgeCalculationService.calculateSurgeMultiplier(
        serviceAreaId.toString(),
      );
    } catch (err: any) {
      logger.error(`Error calculating surge multiplier: ${err.message}`);
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
};

/**
 * Route details estimation for display
 */
const estimateFareAndRoute = async (payload: {
  pickup: {
    address: string;
    location: { type: string; coordinates: [number, number] };
  };
  stops?: {
    order: number;
    address: string;
    location: { type: string; coordinates: [number, number] };
  }[];
  destination: {
    address: string;
    location: { type: string; coordinates: [number, number] };
  };
  serviceCategoryId?: string;
  rideType?: RIDE_TYPE | string;
  scheduledAt?: Date;
  timezone?: string;
}) => {
  const {
    pickup,
    stops,
    destination,
    serviceCategoryId,
    rideType,
    scheduledAt,
    timezone,
  } = payload;

  // Convert scheduledAt from local timezone to UTC if timezone is provided
  let scheduledAtUtc = scheduledAt;
  if (scheduledAt && timezone) {
    scheduledAtUtc = timezoneToUtc(scheduledAt, timezone).toJSDate();
  }

  const isReservation =
    rideType === RIDE_TYPE.SCHEDULED || rideType === "reservation";

  let serviceCategoryDoc: any = null;
  if (serviceCategoryId || isReservation) {
    if (isReservation && !serviceCategoryId) {
      throw new ApiError(
        400,
        "serviceCategoryId is required for Scheduled (Reservation) rides",
      );
    }

    if (serviceCategoryId) {
      if (!mongoose.Types.ObjectId.isValid(serviceCategoryId)) {
        throw new ApiError(400, "Invalid Service Category ID");
      }
      serviceCategoryDoc = await ServiceCategory.findById(serviceCategoryId);
      if (!serviceCategoryDoc) {
        throw new ApiError(404, "Service Category not found");
      }
      if (serviceCategoryDoc.status !== STATUS.ACTIVE) {
        throw new ApiError(400, "Service Category is disabled or inactive");
      }
      if (isReservation && serviceCategoryDoc.supportsReservation === false) {
        throw new ApiError(
          400,
          "Service Category does not support reservation rides",
        );
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

  const routeInfo = await googleMapsHelper.getRoute(
    originCoord,
    destCoord,
    stopsCoords,
  );

  // 2. Resolve Service Area dynamically from Pickup location using coordinate-based matching
  const [longitude, latitude] = pickup.location.coordinates;

  console.log("🔍 Finding service area for coordinates:", {
    longitude,
    latitude,
  });

  let serviceArea = await ServiceAreaServices.findServiceAreaByCoordinates(
    longitude,
    latitude,
  );

  console.log("🔍 Found service area:", serviceArea);

  let serviceAreaId = serviceArea?._id;

  // Fallback: If no service area found by coordinates, try reverse geocoding for backward compatibility
  if (!serviceArea) {
    console.log(
      "🔍 No service area found by coordinates, trying fallback reverse geocoding",
    );
    const geoDetails = await googleMapsHelper.reverseGeocode(
      latitude,
      longitude,
    );

    const fallbackServiceArea = await ServiceArea.findOne({
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
    throw new ApiError(
      400,
      "Pickup location is outside of active service areas",
    );
  }

  // 3. Load active ride categories under the selected Service Category
  const query: Record<string, any> = { status: STATUS.ACTIVE };
  if (serviceCategoryId) {
    query.serviceCategoryId = serviceCategoryId;
  }
  if (isReservation) {
    query.supportsReservation = { $ne: false };
  }

  const categories = await RideCategory.find(query);

  if (serviceCategoryId && categories.length === 0) {
    throw new ApiError(
      404,
      "No active ride categories found under the selected service category",
    );
  }

  const categoryEstimations = [];
  const baseTime = scheduledAtUtc ? new Date(scheduledAtUtc) : new Date();

  // 4. Loop through categories and calculate fare for each
  for (const cat of categories) {
    try {
      const fare = await calculateFare(
        routeInfo.totalDistanceKm,
        routeInfo.totalDurationMinutes,
        cat._id.toString(),
        serviceAreaId,
        serviceCategoryId,
      );

      const estimatedArrivalTime = new Date(
        baseTime.getTime() + routeInfo.totalDurationMinutes * 60 * 1000,
      ).toISOString();

      categoryEstimations.push({
        rideCategoryId: cat._id.toString(),
        categoryName: cat.name,
        categoryDescription: cat.description || "",
        vehicleType: cat.vehicleRequirements?.vehicleTypes || [],
        vehicleCapacity: cat.vehicleRequirements?.minimumSeats || 0,
        luggageCapacity: cat.vehicleRequirements?.luggageCapacity || 0,
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
    } catch (err: any) {
      // Skip categories that don't have fare configurations set up
      logger.warn(
        `Skipping estimation for category ${cat.name}: ${err.message}`,
      );
    }
  }

  // 5. Return error if no valid ride category can be estimated
  if (categoryEstimations.length === 0) {
    throw new ApiError(
      404,
      "No valid ride categories found with fare configurations for this route in the selected Service Area",
    );
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
};

/**
 * Request a ride immediately (Normal) or reservation (Scheduled)
 */
const requestRide = async (
  userId: string,
  payload: {
    pickup: {
      address: string;
      location: { type: string; coordinates: [number, number] };
    };
    stops?: {
      order: number;
      address: string;
      location: { type: string; coordinates: [number, number] };
    }[];
    destination: {
      address: string;
      location: { type: string; coordinates: [number, number] };
    };
    rideCategoryId: string;
    serviceCategoryId?: string;
    rideType: RIDE_TYPE;
    scheduledAt?: Date;
    timezone?: string;
    paymentMethod: PAYMENT_METHOD;
  },
): Promise<IRide> => {
  // Convert scheduledAt from local timezone to UTC if timezone is provided
  let scheduledAtUtc = payload.scheduledAt;
  if (payload.scheduledAt && payload.timezone) {
    scheduledAtUtc = timezoneToUtc(
      payload.scheduledAt,
      payload.timezone,
    ).toJSDate();
  }

  // 1. Prevent duplicate active booking for the user
  if (payload.rideType === RIDE_TYPE.INSTANT) {
    const activeRide = await Ride.findOne({
      userId,
      $or: [
        {
          rideType: RIDE_TYPE.INSTANT,
          status: {
            $in: [
              RIDE_STATUS.SEARCHING_DRIVER,
              RIDE_STATUS.DRIVER_ACCEPTED,
              RIDE_STATUS.DRIVER_ON_THE_WAY,
              RIDE_STATUS.DRIVER_ARRIVED,
              RIDE_STATUS.STARTED,
            ],
          },
        },
        {
          rideType: RIDE_TYPE.SCHEDULED,
          status: {
            $in: [
              RIDE_STATUS.DRIVER_ON_THE_WAY,
              RIDE_STATUS.DRIVER_ARRIVED,
              RIDE_STATUS.STARTED,
            ],
          },
        },
      ],
    });

    if (activeRide) {
      throw new ApiError(
        400,
        "You already have an active ride request or booking.",
      );
    }
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "Passenger user not found");
  }

  // 2. Validate Service Category and Ride Category relationship for Scheduled (Reservation) Rides
  const isReservation = payload.rideType === RIDE_TYPE.SCHEDULED;

  if (isReservation) {
    if (!payload.serviceCategoryId) {
      throw new ApiError(
        400,
        "serviceCategoryId is required for Scheduled (Reservation) rides",
      );
    }
    if (!scheduledAtUtc) {
      throw new ApiError(
        400,
        "scheduledAt is required for Scheduled (Reservation) rides",
      );
    }
    if (new Date(scheduledAtUtc).getTime() <= Date.now()) {
      throw new ApiError(400, "scheduledAt must be a future date and time");
    }

    if (!mongoose.Types.ObjectId.isValid(payload.serviceCategoryId)) {
      throw new ApiError(400, "Invalid Service Category ID");
    }

    const serviceCategory = await ServiceCategory.findById(
      payload.serviceCategoryId,
    );
    if (!serviceCategory) {
      throw new ApiError(404, "Service Category not found");
    }
    if (serviceCategory.status !== STATUS.ACTIVE) {
      throw new ApiError(400, "Service Category is disabled or inactive");
    }
    if (serviceCategory.supportsReservation === false) {
      throw new ApiError(
        400,
        "Service Category does not support reservation rides",
      );
    }

    const systemConfig = await getSystemConfig();
    const minAdvanceMinutes =
      serviceCategory.minimumAdvanceBookingMinutes ??
      systemConfig.reservation.minAdvanceMinutes;
    const maxAdvanceDays =
      serviceCategory.maximumAdvanceBookingDays ??
      systemConfig.reservation.maxAdvanceDays;

    const scheduledTime = new Date(scheduledAtUtc).getTime();
    const now = Date.now();

    if (scheduledTime < now + minAdvanceMinutes * 60 * 1000) {
      throw new ApiError(
        400,
        `Reservation must be booked at least ${minAdvanceMinutes} minutes in advance`,
      );
    }

    if (scheduledTime > now + maxAdvanceDays * 24 * 60 * 60 * 1000) {
      throw new ApiError(
        400,
        `Reservation cannot be booked more than ${maxAdvanceDays} days in advance`,
      );
    }

    // Check for conflicting reservation around the same time
    const windowMs = 30 * 60 * 1000;
    const conflictingReservation = await Ride.findOne({
      userId,
      rideType: RIDE_TYPE.SCHEDULED,
      status: {
        $in: [
          RIDE_STATUS.SEARCHING_DRIVER,
          RIDE_STATUS.DRIVER_ACCEPTED,
          RIDE_STATUS.DRIVER_ON_THE_WAY,
          RIDE_STATUS.DRIVER_ARRIVED,
          RIDE_STATUS.STARTED,
        ],
      },
      scheduledAt: {
        $gte: new Date(scheduledTime - windowMs),
        $lte: new Date(scheduledTime + windowMs),
      },
    });

    if (conflictingReservation) {
      throw new ApiError(
        400,
        "You already have a reservation ride scheduled around this time.",
      );
    }
  }

  const category = await RideCategory.findById(payload.rideCategoryId);
  if (!category) {
    throw new ApiError(404, "Ride category not found");
  }
  if (category.status !== STATUS.ACTIVE) {
    throw new ApiError(400, "Selected ride category is disabled or inactive");
  }
  if (isReservation && category.supportsReservation === false) {
    throw new ApiError(
      400,
      "Selected ride category does not support reservation rides",
    );
  }

  if (
    payload.serviceCategoryId &&
    category.serviceCategoryId &&
    category.serviceCategoryId.toString() !== payload.serviceCategoryId
  ) {
    throw new ApiError(
      400,
      "Selected Ride Category does not belong to the selected Service Category",
    );
  }

  // 3. Perform route estimation
  const routeEstimation = await estimateFareAndRoute({
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

  const systemConfig = await getSystemConfig();
  const initialSearchRadiusKm =
    systemConfig.driverMatching.initialSearchRadiusKm;

  // Find eligible drivers within initial radius
  const eligibleDrivers = await findEligibleDriversInRadius({
    pickupLocation: payload.pickup.location,
    radiusKm: initialSearchRadiusKm,
    rideCategoryId: payload.rideCategoryId,
    serviceCategoryId: payload.serviceCategoryId,
    rideServiceAreaId: routeEstimation.serviceArea?._id?.toString(),
    rideDestination: payload.destination.location,
    rideType: payload.rideType,
    scheduledAt: scheduledAtUtc,
  });

  const selectedDrivers = eligibleDrivers.slice(0, 10); // Limit to nearest 10 drivers

  const pendingPayments = await PendingPayment.find({
    userId,
    status: "pending",
    type: "cancellation_fee",
  });
  const outstandingCancellationFee = pendingPayments.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  // Find the fare for the selected category from the categories array
  const selectedCategoryEstimation = routeEstimation.categories.find(
    (cat) => cat.rideCategoryId === payload.rideCategoryId,
  );

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
        driverEarning:
          selectedCategoryEstimation.pricingBreakdown.driverEarning,
        total: selectedCategoryEstimation.pricingBreakdown.total,
        surgeMultiplier:
          selectedCategoryEstimation.pricingBreakdown.surgeMultiplier,
        surgeApplied: selectedCategoryEstimation.pricingBreakdown.surge,
      }
    : await calculateFare(
        routeEstimation.routeInfo.totalDistanceKm,
        routeEstimation.routeInfo.totalDurationMinutes,
        category._id.toString(),
        routeEstimation.serviceArea?._id,
        payload.serviceCategoryId,
      );

  const fareSnapshot = {
    ...baseCalculatedFare,
    rideFare: baseCalculatedFare.total,
    pendingCancellationFee: outstandingCancellationFee,
    total: baseCalculatedFare.total + outstandingCancellationFee,
  };

  const ridePayload: Partial<IRide> = {
    userId: new Types.ObjectId(userId),
    serviceAreaId: routeEstimation.serviceArea?._id,
    serviceCategoryId: payload.serviceCategoryId
      ? new Types.ObjectId(payload.serviceCategoryId)
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
    stops: payload.stops?.map((s) => ({
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
      requestExpireSeconds:
        systemConfig.driverMatching.rideRequestLifetimeSeconds,
      searchRadiusKm: initialSearchRadiusKm,
      requiredDriverCount: 1,
      notifiedDrivers: selectedDrivers.map((d) => ({
        driverId: d.driverId,
        sentAt: new Date(),
        status: DRIVER_MATCHING_STATUS.SENT,
      })),
    },
    rideType: payload.rideType,
    scheduledAt: scheduledAtUtc,
    timezone: payload.timezone,
    reservationStatus: isReservation ? "pending" : undefined,
    reservationExpiresAt:
      isReservation && scheduledAtUtc ? new Date(scheduledAtUtc) : undefined,
    status: RIDE_STATUS.SEARCHING_DRIVER,
    pickupVerification: {
      method: VERIFICATION_METHOD.OTP,
      phoneLastFourDigits: {
        value: user.phone.slice(-4),
        verified: false,
      },
    },
    dropVerification: {
      method: VERIFICATION_METHOD.OTP,
      phoneLastFourDigits: {
        value: user.phone.slice(-4),
        verified: false,
      },
    },
    fare: fareSnapshot,
    payment: {
      method: payload.paymentMethod,
      status: PAYMENT_STATUS.PENDING,
    },
    requestedAt: new Date(),
  };

  const ride = await Ride.create(ridePayload);

  if (isReservation) {
    // Convert scheduledAt from UTC to user's timezone for display
    const scheduledAtDisplay =
      ride.timezone && ride.scheduledAt
        ? utcToTimezone(ride.scheduledAt, ride.timezone).toISO()
        : ride.scheduledAt;

    socketHelper.sendToUser(userId, "reservation-created", {
      ride,
      message: "Reservation ride created successfully",
    });
    socketHelper.sendToUser(userId, "reservation-searching-driver", {
      rideId: ride._id,
      ...getRideScheduleInfo(ride),
    });
  }

  // Calculate driver search timing information for response
  const driverSearchTiming = calculateDriverSearchTiming(ride);

  // Initialize live tracking record for the ride
  await Tracking.create({
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
  const passengerSummary = buildPassengerSummary(user);

  logger.info(
    `Attempting to send ride-request to ${selectedDrivers.length} drivers`,
  );
  selectedDrivers.forEach((driver) => {
    logger.info(
      `Sending ride-request to driver: ${driver.driverId.toString()}`,
    );
    const sent = socketHelper.sendToUser(
      driver.driverId.toString(),
      "ride-request",
      {
        rideId: ride._id,
        ...getRideScheduleInfo(ride),
        pickup: ride.pickup,
        destination: ride.destination,
        stops: ride.stops,
        fare: ride.fare.total,
        routeInfo: ride.routeInfo,
        driverSearch: driverSearchTiming,
        user: passengerSummary,
      },
    );
    logger.info(
      `Ride-request to driver ${driver.driverId.toString()} - ${sent ? "SENT" : "FAILED"}`,
    );
  });

  // 6. Schedule BullMQ jobs for progressive matching
  // A. Schedule overall ride expiration (5-minute lifetime)
  await rideExpirationQueue.add(
    `ride-expiration-${ride._id}`,
    {
      rideId: ride._id.toString(),
      userId,
    },
    {
      delay: systemConfig.driverMatching.rideRequestLifetimeSeconds * 1000,
      jobId: `ride-expiration-${ride._id}`,
    },
  );

  // B. Schedule driver visibility timeouts (60 seconds per driver)
  selectedDrivers.forEach((driver) => {
    driverVisibilityQueue.add(
      `driver-visibility-${ride._id}-${driver.driverId}`,
      {
        rideId: ride._id.toString(),
        driverId: driver.driverId.toString(),
        userId,
      },
      {
        delay:
          systemConfig.driverMatching.driverVisibilityDurationSeconds * 1000,
        jobId: `driver-visibility-${ride._id}-${driver.driverId}`,
      },
    );
  });

  // C. Schedule first radius expansion if no drivers found in initial radius
  if (selectedDrivers.length === 0) {
    await radiusExpansionQueue.add(
      `radius-expansion-${ride._id}`,
      {
        rideId: ride._id.toString(),
        userId,
        pickupLocation: payload.pickup.location,
        currentRadiusKm: initialSearchRadiusKm,
        rideCategoryId: payload.rideCategoryId,
        serviceCategoryId: payload.serviceCategoryId,
        expansionCount: 0,
      },
      {
        jobId: `radius-expansion-${ride._id}-0`,
      },
    );
  }

  // Add driver search timing to response
  const rideWithTiming = ride.toObject();
  (rideWithTiming as any).driverSearch = driverSearchTiming;

  return rideWithTiming as IRide;
};

/**
 * Driver accepts the ride (Atomic to prevent race conditions)
 */
const acceptRide = async (
  driverUserId: string,
  rideId: string,
): Promise<IRide> => {
  const driverDoc = await Driver.findOne({ userId: driverUserId }).populate(
    "userId",
    "name profileImage",
  );
  if (!driverDoc) {
    throw new ApiError(404, "Driver profile not found");
  }

  // Verify driver is active/online
  if (driverDoc.driverAvailabilityStatus !== "online") {
    throw new ApiError(400, "You must be online to accept rides.");
  }

  const rideToAccept = await Ride.findById(rideId);
  if (!rideToAccept) {
    throw new ApiError(404, "Ride request not found");
  }

  // Verify reservation access if ride is scheduled
  if (rideToAccept.rideType === RIDE_TYPE.SCHEDULED) {
    const activeTier = await Tier.findById(driverDoc.currentTier);
    if (!activeTier || !activeTier.benefits?.reservationAccess?.enabled) {
      throw new ApiError(
        403,
        "Your current tier does not support accepting scheduled reservations.",
      );
    }
    const maxAdvanceHours =
      activeTier.benefits.reservationAccess.maxAdvanceHours || 0;
    if (maxAdvanceHours > 0 && rideToAccept.scheduledAt) {
      const scheduledTime = new Date(rideToAccept.scheduledAt).getTime();
      const advanceHours = (scheduledTime - Date.now()) / (1000 * 60 * 60);
      if (advanceHours > maxAdvanceHours) {
        throw new ApiError(
          403,
          `Your tier only supports reservation bookings up to ${maxAdvanceHours} hours in advance.`,
        );
      }
    }
  }

  // Extract user ObjectId from populated userId
  const userObjectId =
    typeof driverDoc.userId === "object"
      ? driverDoc.userId._id
      : driverDoc.userId;

  if (rideToAccept.status !== RIDE_STATUS.SEARCHING_DRIVER) {
    throw new ApiError(
      409,
      "This ride request is no longer available or was accepted by another driver.",
    );
  }

  // Verify driver was notified and request is still active
  const driverNotification = rideToAccept.driverMatching?.notifiedDrivers?.find(
    (d: any) => d.driverId.toString() === userObjectId.toString(),
  );

  if (!driverNotification) {
    throw new ApiError(400, "You were not notified for this ride request.");
  }

  if (driverNotification.status !== DRIVER_MATCHING_STATUS.SENT) {
    if (driverNotification.status === DRIVER_MATCHING_STATUS.EXPIRED) {
      throw new ApiError(400, "This ride request offer has expired for you.");
    }
    if (driverNotification.status === DRIVER_MATCHING_STATUS.REJECTED) {
      throw new ApiError(400, "You have already rejected this ride request.");
    }
    if (driverNotification.status === DRIVER_MATCHING_STATUS.ACCEPTED) {
      throw new ApiError(400, "You have already accepted this ride request.");
    }
    throw new ApiError(400, "This ride request offer is no longer valid.");
  }

  // Double check request time expiration in case background worker hasn't marked it yet
  if (
    driverNotification.sentAt &&
    rideToAccept.driverMatching?.requestExpireSeconds
  ) {
    const expireTime =
      new Date(driverNotification.sentAt).getTime() +
      rideToAccept.driverMatching.requestExpireSeconds * 1000;
    if (Date.now() > expireTime) {
      throw new ApiError(400, "This ride request offer has expired for you.");
    }
  }

  if (
    rideToAccept.rideType === RIDE_TYPE.SCHEDULED &&
    rideToAccept.scheduledAt
  ) {
    const scheduledTime = new Date(rideToAccept.scheduledAt).getTime();
    const windowMs = 30 * 60 * 1000;
    const driverConflict = await Ride.findOne({
      $or: [{ driverId: userObjectId }, { assignedDriverId: userObjectId }],
      status: {
        $in: [
          RIDE_STATUS.SEARCHING_DRIVER,
          RIDE_STATUS.DRIVER_ACCEPTED,
          RIDE_STATUS.DRIVER_ON_THE_WAY,
          RIDE_STATUS.DRIVER_ARRIVED,
          RIDE_STATUS.STARTED,
        ],
      },
      scheduledAt: {
        $gte: new Date(scheduledTime - windowMs),
        $lte: new Date(scheduledTime + windowMs),
      },
    });

    if (driverConflict) {
      throw new ApiError(
        400,
        "You have a schedule conflict with another active trip or reservation assignment.",
      );
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isReservationRide = rideToAccept.rideType === RIDE_TYPE.SCHEDULED;
    const updateFields: Record<string, any> = {
      status: RIDE_STATUS.DRIVER_ACCEPTED,
      driverId: userObjectId,
      acceptedAt: new Date(),
      "driverMatching.notifiedDrivers.$[elem].status":
        DRIVER_MATCHING_STATUS.ACCEPTED,
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
    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        status: RIDE_STATUS.SEARCHING_DRIVER,
        driverId: { $exists: false },
        "driverMatching.notifiedDrivers": {
          $elemMatch: {
            driverId: userObjectId,
            status: DRIVER_MATCHING_STATUS.SENT,
          },
        },
      },
      {
        $set: updateFields,
      },
      {
        new: true,
        session,
        arrayFilters: [
          {
            "elem.driverId": userObjectId,
            "elem.status": DRIVER_MATCHING_STATUS.SENT,
          },
        ],
      },
    );

    if (!ride) {
      throw new ApiError(
        409,
        "This ride request is no longer available or was accepted by another driver.",
      );
    }

    // Find driver's verified vehicle
    const car = await Car.findOne({
      driverId: driverDoc._id,
      isVerified: true,
    }).session(session);
    if (car) {
      ride.carId = car._id;
      await ride.save({ session });
    }

    // Set driver availability status to ON_TRIP only for immediate/instant rides
    if (!isReservationRide) {
      driverDoc.driverAvailabilityStatus = "on_trip" as any;
      await driverDoc.save({ session });
    }

    // Set driver details in the Tracking record with enhanced tracking fields and initial Google route
    let initialRemainingDistanceKm = 0;
    let initialEstimatedArrivalMinutes = 0;
    if (driverDoc.location && driverDoc.location.coordinates) {
      try {
        const route = await GoogleRouteService.calculateRoute(
          {
            lat: driverDoc.location.coordinates[1],
            lng: driverDoc.location.coordinates[0],
          },
          {
            lat: ride.pickup.location.coordinates[1],
            lng: ride.pickup.location.coordinates[0],
          },
        );
        initialRemainingDistanceKm = route.totalDistanceKm;
        initialEstimatedArrivalMinutes = route.totalDurationMinutes;
      } catch (err: any) {
        logger.error(
          `[RideService] Error calculating initial driver-to-pickup route: ${err.message}`,
        );
        throw err;
      }
    }

    await Tracking.findOneAndUpdate(
      { rideId: ride._id },
      {
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
      },
      { session, upsert: true },
    );

    await session.commitTransaction();
    session.endSession();

    // Update driver availability after accepting ride (outside transaction to prevent blocking)
    await DriverDutyPolicyServices.updateDriverAvailability(
      userObjectId.toString(),
    );

    // Cancel all BullMQ jobs for this ride since it's been accepted
    try {
      // Remove ride expiration job
      const expirationJob = await rideExpirationQueue.getJob(
        `ride-expiration-${ride._id}`,
      );
      if (expirationJob) await expirationJob.remove();

      // Remove all driver visibility jobs for this ride
      const visibilityJobs = await driverVisibilityQueue.getJobs(
        ["waiting", "delayed"],
        0,
        100,
      );
      for (const job of visibilityJobs) {
        if (job.name.startsWith(`driver-visibility-${ride._id}`)) {
          await job.remove();
        }
      }

      // Remove all radius expansion jobs for this ride
      const expansionJobs = await radiusExpansionQueue.getJobs(
        ["waiting", "delayed"],
        0,
        100,
      );
      for (const job of expansionJobs) {
        if (job.name.startsWith(`radius-expansion-${ride._id}`)) {
          await job.remove();
        }
      }

      logger.info(`Cancelled all BullMQ jobs for accepted ride ${ride._id}`);
    } catch (error) {
      logger.error(`Error cancelling BullMQ jobs for ride ${ride._id}:`, error);
    }

    // Populate user and car info for the socket payloads
    // Note: phone is excluded from userId populate to protect passenger privacy
    const populatedRide = await Ride.findById(ride._id)
      .populate("userId", "name profileImage averageRating totalRatings")
      .populate("carId");

    // Build enriched driver summary with ratings, total trips, and car info
    const driverSummary = await buildDriverSummary(driverDoc, car);

    // Real-time socket events:
    // A. Notify Passenger that ride is accepted
    const driverSearchTiming = calculateDriverSearchTiming(ride);

    // Get tracking info for ETA
    const tracking = await Tracking.findOne({ rideId: ride._id });

    socketHelper.sendToUser(ride.userId.toString(), "ride-accepted", {
      ride: populatedRide,
      ...getRideScheduleInfo(ride),
      driver: driverSummary,
      driverSearch: driverSearchTiming,
      pickupLocation: ride.pickup,
      rideCategory: ride.rideCategory,
      price: ride.fare.total,
      estimatedArrivalMinutes: tracking?.estimatedArrivalMinutes,
      remainingDistanceKm: tracking?.remainingDistanceKm,
    });

    if (ride.rideType === RIDE_TYPE.SCHEDULED) {
      socketHelper.sendToUser(ride.userId.toString(), "reservation-confirmed", {
        ride: populatedRide,
        driver: driverSummary,
      });
      socketHelper.sendToUser(
        ride.userId.toString(),
        "reservation-driver-assigned",
        {
          rideId: ride._id,
          ...getRideScheduleInfo(ride),
          driver: driverSummary,
        },
      );
    }

    // B. Send push notification to passenger
    await sendNotifications({
      title: "Ride Confirmed",
      text: `${driverSummary.name || "Driver"} has accepted your ride request and is on the way.`,
      receiver: ride.userId,
      type: NOTIFICATION_TYPE.USER,
      referenceId: ride._id,
      referenceModel: "Ride" as any,
    });

    // C. Cancel the request for all other notified drivers
    const otherDrivers = ride.driverMatching.notifiedDrivers
      .filter((d) => d.driverId.toString() !== driverUserId)
      .map((d) => d.driverId.toString());

    socketHelper.sendToUsers(otherDrivers, "ride-request-cancelled", {
      rideId: ride._id,
      message: "This ride request has been accepted by another driver.",
      driverSearch: driverSearchTiming,
    });

    return populatedRide as IRide;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw error;
  }
};

/**
 * Driver rejects the ride request
 */
const rejectRide = async (
  driverUserId: string,
  rideId: string,
): Promise<IRide> => {
  const driverDoc = await Driver.findOne({ userId: driverUserId }).populate(
    "userId",
    "name profileImage",
  );
  if (!driverDoc) {
    throw new ApiError(404, "Driver profile not found");
  }

  const ride = await Ride.findOne({
    _id: rideId,
    status: RIDE_STATUS.SEARCHING_DRIVER,
  });

  if (!ride) {
    throw new ApiError(404, "Ride not found or no longer accepting drivers.");
  }

  // Check if this driver was actually notified
  const driverNotification = ride.driverMatching.notifiedDrivers.find(
    (d) => d.driverId.toString() === driverUserId,
  );

  if (!driverNotification) {
    throw new ApiError(400, "You were not notified for this ride request.");
  }

  if (driverNotification.status !== DRIVER_MATCHING_STATUS.SENT) {
    throw new ApiError(400, "You have already responded to this ride request.");
  }

  // Update driver notification status to REJECTED
  driverNotification.status = DRIVER_MATCHING_STATUS.REJECTED;
  driverNotification.respondedAt = new Date();
  await ride.save();

  // Check if all drivers have responded (accepted, rejected, or expired)
  const allDriversResponded = ride.driverMatching.notifiedDrivers.every(
    (d) => d.status !== DRIVER_MATCHING_STATUS.SENT,
  );

  // If all drivers have responded and no one accepted, trigger immediate radius expansion
  if (allDriversResponded && ride.status === RIDE_STATUS.SEARCHING_DRIVER) {
    await triggerImmediateRadiusExpansion(ride);
  }

  logger.info(`Driver ${driverUserId} rejected ride ${rideId}`);

  return ride;
};

/**
 * Trigger immediate radius expansion when all drivers have responded
 */
const triggerImmediateRadiusExpansion = async (ride: any) => {
  const currentRadius = ride.driverMatching.searchRadiusKm;
  const systemConfig = await getSystemConfig();
  const maxRadius = systemConfig.driverMatching.maxSearchRadiusKm;

  if (currentRadius >= maxRadius) {
    logger.info(
      `Ride ${ride._id} reached maximum search radius, no further expansion`,
    );
    return;
  }

  const newRadius =
    currentRadius + systemConfig.driverMatching.radiusExpansionDistanceKm;

  // Cancel any existing radius expansion jobs
  try {
    const existingJobs = await radiusExpansionQueue.getJobs(
      ["waiting", "delayed"],
      0,
      100,
    );
    for (const job of existingJobs) {
      if (job.name.startsWith(`radius-expansion-${ride._id}`)) {
        await job.remove();
      }
    }
  } catch (error) {
    logger.error(`Error cancelling existing radius expansion jobs:`, error);
  }

  // Trigger immediate expansion
  await radiusExpansionQueue.add(
    `radius-expansion-${ride._id}`,
    {
      rideId: ride._id.toString(),
      userId: ride.userId.toString(),
      pickupLocation: ride.pickup.location,
      currentRadiusKm: newRadius,
      rideCategoryId: ride.rideCategory.categoryId.toString(),
      serviceCategoryId: ride.serviceCategoryId,
      expansionCount: (ride.driverMatching.expansionCount || 0) + 1,
    },
    {
      jobId: `radius-expansion-${ride._id}-immediate`,
    },
  );

  logger.info(
    `Triggered immediate radius expansion for ride ${ride._id} from ${currentRadius}km to ${newRadius}km`,
  );
};

/**
 * Driver arrived at pickup point
 */
const arriveAtPickup = async (
  driverUserId: string,
  rideId: string,
): Promise<IRide> => {
  const ride = await Ride.findOne({ _id: rideId, driverId: driverUserId });

  if (!ride) {
    throw new ApiError(
      404,
      "Ride not found or you are not the assigned driver.",
    );
  }

  if (
    ride.status !== RIDE_STATUS.DRIVER_ACCEPTED &&
    ride.status !== RIDE_STATUS.DRIVER_ON_THE_WAY
  ) {
    throw new ApiError(400, "Invalid ride status transition to Arrived.");
  }

  // Only update status to DRIVER_ARRIVED - OTP will be generated when driver requests it
  ride.status = RIDE_STATUS.DRIVER_ARRIVED;
  ride.arrivedAt = new Date();

  await ride.save();

  // Build enriched driver summary for passenger
  const driverDoc = await Driver.findOne({ userId: driverUserId }).populate(
    "userId",
    "name profileImage",
  );

  // Ensure driver availability status is set to ON_TRIP when arriving at pickup
  if (driverDoc && driverDoc.driverAvailabilityStatus !== "on_trip") {
    driverDoc.driverAvailabilityStatus = "on_trip" as any;
    await driverDoc.save();
  }
  const car = await Car.findOne({ driverId: driverDoc?._id, isVerified: true });
  const driverSummary = await buildDriverSummary(driverDoc, car);

  // Send real-time updates with enriched driver summary
  socketHelper.sendToUser(ride.userId.toString(), "driver-arrived", {
    rideId: ride._id,
    ...getRideScheduleInfo(ride),
    driver: driverSummary,
    pickupLocation: ride.pickup,
    rideCategory: ride.rideCategory,
    price: ride.fare.total,
    estimatedArrivalMinutes: 0,
    remainingDistanceKm: 0,
  });

  await sendNotifications({
    title: "Driver Arrived",
    text: "Your driver has arrived at the pickup location.",
    receiver: ride.userId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: ride._id,
    referenceModel: "Ride" as any,
  });

  return ride;
};

/**
 * Request start verification - Generate and send OTP to passenger
 */
const requestStartVerification = async (
  driverUserId: string,
  rideId: string,
): Promise<{ ride: IRide; otpSent: boolean }> => {
  const ride = await Ride.findOne({ _id: rideId, driverId: driverUserId });

  if (!ride) {
    throw new ApiError(
      404,
      "Ride not found or you are not the assigned driver.",
    );
  }

  if (ride.status !== RIDE_STATUS.DRIVER_ARRIVED) {
    throw new ApiError(
      400,
      "Start verification can only be requested after driver has arrived.",
    );
  }

  // Check if OTP already exists and is not expired
  if (ride.pickupVerification.otp && ride.pickupVerification.otp.expiresAt) {
    const now = new Date();
    if (
      ride.pickupVerification.otp.expiresAt > now &&
      !ride.pickupVerification.otp.verified
    ) {
      // OTP is still valid, resend it
      socketHelper.sendToUser(ride.userId.toString(), "start-otp-generated", {
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
    method: VERIFICATION_METHOD.OTP,
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

  await ride.save();

  // Send OTP ONLY to passenger via Socket.IO
  // Note: phoneLastFourDigits is NOT sent - driver must ask passenger verbally
  socketHelper.sendToUser(ride.userId.toString(), "start-otp-generated", {
    rideId: ride._id,
    otp: otpCode,
  });

  await sendNotifications({
    title: "Start Ride Verification",
    text: `Share OTP ${otpCode} with your driver to start the ride.`,
    receiver: ride.userId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: ride._id,
    referenceModel: "Ride" as any,
  });

  return { ride, otpSent: true };
};

/**
 * Verify OTP / Phone and start ride
 */
const startRide = async (
  driverUserId: string,
  rideId: string,
  verification: { otp?: string; phoneLastFourDigits?: string },
  ipAddress?: string,
): Promise<IRide> => {
  const ride = await Ride.findOne({ _id: rideId, driverId: driverUserId });

  if (!ride) {
    throw new ApiError(
      404,
      "Ride not found or you are not the assigned driver.",
    );
  }

  if (ride.status !== RIDE_STATUS.DRIVER_ARRIVED) {
    throw new ApiError(
      400,
      "Ride can only be started after driver has arrived at pickup.",
    );
  }

  // Prevent duplicate verification
  if (
    ride.pickupVerification.otp?.verified ||
    ride.pickupVerification.phoneLastFourDigits?.verified
  ) {
    throw new ApiError(400, "Ride has already been verified and started.");
  }

  const { otp, phoneLastFourDigits } = verification;
  let verified = false;
  let methodUsed = VERIFICATION_METHOD.OTP;

  if (otp) {
    const savedOtp = ride.pickupVerification.otp;
    if (!savedOtp) {
      throw new ApiError(
        400,
        "No OTP has been generated. Please request start verification first.",
      );
    }

    // Check OTP expiration
    if (savedOtp.expiresAt && new Date() > savedOtp.expiresAt) {
      throw new ApiError(400, "OTP has expired. Please request a new OTP.");
    }

    // Verify OTP
    if (savedOtp.code === otp) {
      savedOtp.verified = true;
      savedOtp.verifiedAt = new Date();
      methodUsed = VERIFICATION_METHOD.OTP;
      verified = true;
    } else {
      savedOtp.attempts = (savedOtp.attempts || 0) + 1;

      // Log failed attempt
      ride.pickupVerification.verificationAttempts =
        ride.pickupVerification.verificationAttempts || [];
      ride.pickupVerification.verificationAttempts.push({
        method: VERIFICATION_METHOD.OTP,
        attemptedAt: new Date(),
        success: false,
        ipAddress: ipAddress || "unknown",
      });

      await ride.save();
      throw new ApiError(400, "Incorrect verification OTP.");
    }
  } else if (phoneLastFourDigits) {
    const savedPhone = ride.pickupVerification.phoneLastFourDigits;
    if (savedPhone && savedPhone.value === phoneLastFourDigits) {
      savedPhone.verified = true;
      savedPhone.verifiedAt = new Date();
      methodUsed = VERIFICATION_METHOD.PHONE_LAST_4_DIGITS;
      verified = true;
    } else {
      // Log failed attempt
      ride.pickupVerification.verificationAttempts =
        ride.pickupVerification.verificationAttempts || [];
      ride.pickupVerification.verificationAttempts.push({
        method: VERIFICATION_METHOD.PHONE_LAST_4_DIGITS,
        attemptedAt: new Date(),
        success: false,
        ipAddress: ipAddress || "unknown",
      });

      await ride.save();
      throw new ApiError(400, "Incorrect phone number digits verification.");
    }
  }

  if (!verified) {
    throw new ApiError(400, "Ride start verification failed.");
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
  ride.status = RIDE_STATUS.STARTED;
  ride.startedAt = new Date();
  ride.pickupVerification.method = methodUsed;

  // Clear drop verification OTP (will be generated when needed)
  ride.dropVerification = {
    method: VERIFICATION_METHOD.OTP,
    phoneLastFourDigits: ride.pickupVerification.phoneLastFourDigits,
    verificationAttempts: ride.dropVerification.verificationAttempts || [],
  };

  await ride.save();

  // Build enriched summaries for both passenger and driver
  const driverDoc = await Driver.findOne({ userId: driverUserId }).populate(
    "userId",
    "name profileImage",
  );
  const car = await Car.findOne({ driverId: driverDoc?._id, isVerified: true });
  const driverSummary = await buildDriverSummary(driverDoc, car);

  const userDoc = await User.findById(ride.userId).select(
    "name profileImage averageRating totalRatings",
  );
  const passengerSummary = buildPassengerSummary(userDoc);

  // Socket update - notify both passenger and driver with enriched summaries
  socketHelper.sendToUser(ride.userId.toString(), "ride-started", {
    rideId: ride._id,
    ...getRideScheduleInfo(ride),
    verificationMethod: methodUsed,
    driver: driverSummary,
  });

  socketHelper.sendToUser(driverUserId, "ride-started", {
    rideId: ride._id,
    ...getRideScheduleInfo(ride),
    user: passengerSummary,
  });

  await sendNotifications({
    title: "Ride Started",
    text: "Your ride has started. Have a safe journey!",
    receiver: ride.userId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: ride._id,
    referenceModel: "Ride" as any,
  });

  return ride;
};

/**
 * Request end verification - Generate and send OTP to passenger
 */
const requestEndVerification = async (
  driverUserId: string,
  rideId: string,
): Promise<{ ride: IRide; otpSent: boolean }> => {
  const ride = await Ride.findOne({ _id: rideId, driverId: driverUserId });

  if (!ride) {
    throw new ApiError(
      404,
      "Ride not found or you are not the assigned driver.",
    );
  }

  if (ride.status !== RIDE_STATUS.STARTED) {
    throw new ApiError(
      400,
      "End verification can only be requested for ongoing rides.",
    );
  }

  // Check if OTP already exists and is not expired
  if (ride.dropVerification.otp && ride.dropVerification.otp.expiresAt) {
    const now = new Date();
    if (
      ride.dropVerification.otp.expiresAt > now &&
      !ride.dropVerification.otp.verified
    ) {
      // OTP is still valid, resend it
      socketHelper.sendToUser(ride.userId.toString(), "end-otp-generated", {
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
    method: VERIFICATION_METHOD.OTP,
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

  await ride.save();

  // Send OTP ONLY to passenger via Socket.IO
  // Note: phoneLastFourDigits is NOT sent - driver must ask passenger verbally
  socketHelper.sendToUser(ride.userId.toString(), "end-otp-generated", {
    rideId: ride._id,
    otp: otpCode,
  });

  await sendNotifications({
    title: "Complete Ride Verification",
    text: `Share OTP ${otpCode} with your driver to complete the ride.`,
    receiver: ride.userId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: ride._id,
    referenceModel: "Ride" as any,
  });

  return { ride, otpSent: true };
};

/**
 * Verify OTP / Phone and end ride (transitions driver availability back to online)
 */
const completeRide = async (
  driverUserId: string,
  rideId: string,
  verification: { otp?: string; phoneLastFourDigits?: string },
  ipAddress?: string,
): Promise<IRide> => {
  const ride = await Ride.findOne({ _id: rideId, driverId: driverUserId });

  if (!ride) {
    throw new ApiError(
      404,
      "Ride not found or you are not the assigned driver.",
    );
  }

  if (ride.status !== RIDE_STATUS.STARTED) {
    throw new ApiError(400, "Only ongoing rides can be completed.");
  }

  // Prevent duplicate verification
  if (
    ride.dropVerification.otp?.verified ||
    ride.dropVerification.phoneLastFourDigits?.verified
  ) {
    throw new ApiError(400, "Ride has already been verified and completed.");
  }

  const { otp, phoneLastFourDigits } = verification;
  let verified = false;
  let methodUsed = VERIFICATION_METHOD.OTP;

  if (otp) {
    const savedOtp = ride.dropVerification.otp;
    if (!savedOtp) {
      throw new ApiError(
        400,
        "No OTP has been generated. Please request end verification first.",
      );
    }

    // Check OTP expiration
    if (savedOtp.expiresAt && new Date() > savedOtp.expiresAt) {
      throw new ApiError(400, "OTP has expired. Please request a new OTP.");
    }

    // Verify OTP
    if (savedOtp.code === otp) {
      savedOtp.verified = true;
      savedOtp.verifiedAt = new Date();
      methodUsed = VERIFICATION_METHOD.OTP;
      verified = true;
    } else {
      savedOtp.attempts = (savedOtp.attempts || 0) + 1;

      // Log failed attempt
      ride.dropVerification.verificationAttempts =
        ride.dropVerification.verificationAttempts || [];
      ride.dropVerification.verificationAttempts.push({
        method: VERIFICATION_METHOD.OTP,
        attemptedAt: new Date(),
        success: false,
        ipAddress: ipAddress || "unknown",
      });

      await ride.save();
      throw new ApiError(400, "Incorrect drop verification OTP.");
    }
  } else if (phoneLastFourDigits) {
    const savedPhone = ride.dropVerification.phoneLastFourDigits;
    if (savedPhone && savedPhone.value === phoneLastFourDigits) {
      savedPhone.verified = true;
      savedPhone.verifiedAt = new Date();
      methodUsed = VERIFICATION_METHOD.PHONE_LAST_4_DIGITS;
      verified = true;
    } else {
      // Log failed attempt
      ride.dropVerification.verificationAttempts =
        ride.dropVerification.verificationAttempts || [];
      ride.dropVerification.verificationAttempts.push({
        method: VERIFICATION_METHOD.PHONE_LAST_4_DIGITS,
        attemptedAt: new Date(),
        success: false,
        ipAddress: ipAddress || "unknown",
      });

      await ride.save();
      throw new ApiError(400, "Incorrect passenger phone verification digits.");
    }
  }

  if (!verified) {
    throw new ApiError(400, "Ride end completion verification failed.");
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Transition ride status to COMPLETED (will be changed to PAYMENT_PENDING after payment processing)
    ride.status = RIDE_STATUS.COMPLETED;
    ride.completedAt = new Date();
    ride.dropVerification.method = methodUsed;

    // Reset consecutive cancellations for passenger and driver upon successful trip completion
    await User.findByIdAndUpdate(
      ride.userId,
      { $set: { consecutiveCancellations: 0 } },
      { session },
    );
    if (ride.driverId) {
      await Driver.findOneAndUpdate(
        { userId: ride.driverId },
        { $set: { consecutiveCancellations: 0 } },
        { session },
      );
    }

    // Recalculate duration & distances dynamically if actual route values deviated (future addition),
    // but for now finalize current estimated prices.
    await ride.save({ session });

    // Mark driver status back to online
    await Driver.findOneAndUpdate(
      { userId: driverUserId },
      { $set: { driverAvailabilityStatus: "online" } },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Update driver availability after completing ride (outside transaction to prevent blocking)
    await DriverDutyPolicyServices.updateDriverAvailability(driverUserId);

    // Trigger referral checks
    ReferralService.handleDriverRideCompletion(driverUserId).catch((err) => {
      logger.error("Driver referral completed ride progress error:", err);
    });

    // Award Points to Driver for Ride Completion
    PointsService.awardPoints(
      driverUserId,
      "ride_completed",
      "ride",
      ride._id,
      { notes: `Completed Ride ${ride._id}` }
    ).then(async () => {
      // Award additional bonuses
      const sa = await ServiceArea.findById(ride.serviceAreaId);
      if (sa && sa.type === "airport") {
        await PointsService.awardPoints(driverUserId, "airport_ride", "ride", ride._id, { notes: `Airport Ride Bonus for Ride ${ride._id}` });
      }
      if (ride.rideType === RIDE_TYPE.SCHEDULED) {
        await PointsService.awardPoints(driverUserId, "scheduled_ride", "ride", ride._id, { notes: `Scheduled Ride Bonus for Ride ${ride._id}` });
      }
      const activePeakHours = await PeakHour.find({ status: STATUS.ACTIVE });
      const isPeak = await isPeakHour(ride.completedAt || new Date(), activePeakHours);
      if (isPeak) {
        await PointsService.awardPoints(driverUserId, "peak_hour_ride", "ride", ride._id, { notes: `Peak Hour Ride Bonus for Ride ${ride._id}` });
      }
    }).catch((err) => {
      logger.error("Error awarding ride completion points:", err);
    });

    ReferralService.checkAndProcessPassengerReferral(
      ride.userId.toString(),
    ).catch((err) => {
      logger.error("Passenger referral completed ride check error:", err);
    });

    // Save destination to recent destinations (fire and forget, don't block the flow)
    // Only for passengers, not drivers
    RecentDestinationServices.saveOrUpdateRecentDestination(
      ride.userId.toString(),
      ride.destination.address,
      undefined, // placeName can be extracted from address if needed
      ride.destination.location.coordinates,
    ).catch((error) => {
      // Log error but don't break the ride completion flow
      logger.error(
        `Failed to save recent destination for ride ${ride._id}:`,
        error,
      );
    });

    // Build enriched summaries for both passenger and driver
    const driverDoc = await Driver.findOne({ userId: driverUserId }).populate(
      "userId",
      "name profileImage",
    );
    const car = await Car.findOne({
      driverId: driverDoc?._id,
      isVerified: true,
    });
    const driverSummary = await buildDriverSummary(driverDoc, car);

    const userDoc = await User.findById(ride.userId).select(
      "name profileImage averageRating totalRatings",
    );
    const passengerSummary = buildPassengerSummary(userDoc);

    // Socket notify - notify both passenger and driver with enriched summaries
    socketHelper.sendToUser(ride.userId.toString(), "ride-completed", {
      rideId: ride._id,
      ...getRideScheduleInfo(ride),
      finalFare: ride.fare,
      verificationMethod: methodUsed,
      driver: driverSummary,
    });

    socketHelper.sendToUser(driverUserId, "ride-completed", {
      rideId: ride._id,
      ...getRideScheduleInfo(ride),
      user: passengerSummary,
    });

    await sendNotifications({
      title: "Ride Completed",
      text: "You have arrived at your destination. Please pay the invoice.",
      receiver: ride.userId,
      type: NOTIFICATION_TYPE.USER,
      referenceId: ride._id,
      referenceModel: "Ride" as any,
    });

    return ride;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw error;
  }
};

/**
 * Unified processor for completed ride payments (Stripe/Wallet)
 * Handles ride status update, commission split, driver wallet credit, transaction records, and alerts.
 */
const completeRidePayment = async (
  rideId: string,
  paymentMethod: PAYMENT_METHOD,
  paymentIntent?: any, // optional Stripe PaymentIntent object (if paid via Stripe)
  stripeCheckoutSessionId?: string, // optional Checkout Session ID
): Promise<{ ride: IRide; transaction: any; invoice: any }> => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  if (ride.payment.status === PAYMENT_STATUS.PAID) {
    const transaction = await Transaction.findOne({
      rideId: ride._id,
      transactionType: TRANSACTION_TYPE.BOOKING_PAYMENT,
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

  if (paymentMethod === PAYMENT_METHOD.WALLET) {
    useWallet = true;
    walletAmount = ride.fare.total;
    chargeAmount = 0;
  } else if (paymentIntent && paymentIntent.metadata) {
    useWallet = paymentIntent.metadata.useWallet === "true";
    walletAmount = parseFloat(paymentIntent.metadata.walletAmount || "0");
    chargeAmount = paymentIntent.amount / 100;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Process partial/full wallet deduction if applicable
    if (useWallet && walletAmount > 0) {
      const passengerWallet = await WalletService.getOrCreateWallet(
        ride.userId,
        session,
      );
      if (passengerWallet.balance < walletAmount) {
        throw new ApiError(400, "Insufficient wallet balance.");
      }

      passengerWallet.balance = parseFloat(
        (passengerWallet.balance - walletAmount).toFixed(2),
      );
      await passengerWallet.save({ session });

      // Record transaction for wallet deduction portion
      await Transaction.create(
        [
          {
            transactionId: `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
            userId: ride.userId,
            rideId: ride._id,
            bookingId: ride._id,
            walletId: passengerWallet._id,
            amount: walletAmount,
            currency: config.stripe.currency || "USD",
            paymentMethod: PAYMENT_METHOD.WALLET,
            paymentStatus: PAYMENT_STATUS.PAID,
            transactionType: TRANSACTION_TYPE.BOOKING_PAYMENT,
            description:
              paymentMethod === PAYMENT_METHOD.WALLET
                ? `Full ride payment of ${walletAmount} via passenger wallet.`
                : `Partial payment of ${walletAmount} via passenger wallet.`,
          },
        ],
        { session },
      );

      socketHelper.sendToUser(ride.userId.toString(), "wallet-updated", {
        balance: passengerWallet.balance,
      });
    }

    // 2. Mark ride payment details
    ride.payment.method = paymentMethod;
    ride.payment.status = PAYMENT_STATUS.PAID;
    ride.payment.paidAt = new Date();
    if (paymentIntent) {
      ride.payment.stripePaymentIntentId = paymentIntent.id;
    }
    if (stripeCheckoutSessionId) {
      ride.payment.stripeCheckoutSessionId = stripeCheckoutSessionId;
    }
    await ride.save({ session });

    if (
      ride.fare?.pendingCancellationFee &&
      ride.fare.pendingCancellationFee > 0
    ) {
      await PendingPayment.updateMany(
        { userId: ride.userId, status: "pending", type: "cancellation_fee" },
        { $set: { status: "paid", paidWithRideId: ride._id } },
        { session },
      );
    }

    // 3. Create transaction record for the Stripe/Card payment portion
    let cardTransaction = null;
    const uniqueTxnRef = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;

    if (chargeAmount > 0) {
      const [cardTxn] = await Transaction.create(
        [
          {
            transactionId: uniqueTxnRef,
            userId: ride.userId,
            driverId: ride.driverId
              ? new Types.ObjectId(ride.driverId)
              : undefined,
            bookingId: ride._id,
            rideId: ride._id,
            amount: chargeAmount,
            currency: config.stripe.currency || "USD",
            paymentMethod,
            paymentStatus: PAYMENT_STATUS.PAID,
            transactionType: TRANSACTION_TYPE.BOOKING_PAYMENT,
            stripeCustomerId: paymentIntent?.customer || undefined,
            stripePaymentIntentId: paymentIntent?.id || undefined,
            stripeCheckoutSessionId: stripeCheckoutSessionId || undefined,
            gatewayTransactionId: paymentIntent?.id || undefined,
            gatewayResponse: paymentIntent || undefined,
            description: `Ride complete fare payment of ${chargeAmount} via ${paymentMethod}.`,
          },
        ],
        { session },
      );
      cardTransaction = cardTxn;
    }

    // 4. Credit Driver's Wallet automatically with Driver Earnings
    if (ride.driverId) {
      const driverWallet = await WalletService.getOrCreateWallet(
        ride.driverId,
        session,
      );

      // Fetch driver profile ID
      const driverProfile = await Driver.findOne({
        userId: ride.driverId,
      }).session(session);

      let driverEarning = ride.fare.driverEarning;
      const commission = ride.fare.commission;

      // Apply tier bonus multiplier to driver earnings if enabled
      let multiplier = 1.0;
      if (driverProfile && driverProfile.currentTier) {
        const activeTier = await Tier.findById(driverProfile.currentTier);
        if (activeTier && activeTier.benefits?.bonusMultiplier?.enabled) {
          multiplier = activeTier.benefits.bonusMultiplier.multiplierValue || 1.0;
          driverEarning = parseFloat((driverEarning * multiplier).toFixed(2));
        }
      }

      driverWallet.balance = parseFloat(
        (driverWallet.balance + driverEarning).toFixed(2),
      );
      await driverWallet.save({ session });

      // Create Driver Earnings Credit Transaction record
      await Transaction.create(
        [
          {
            transactionId: `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
            userId: ride.driverId,
            driverId: driverProfile?._id || undefined,
            bookingId: ride._id,
            rideId: ride._id,
            walletId: driverWallet._id,
            amount: driverEarning,
            totalFare: ride.fare.total,
            commission,
            currency: config.stripe.currency || "USD",
            paymentMethod,
            paymentStatus: PAYMENT_STATUS.PAID,
            transactionType: TRANSACTION_TYPE.BOOKING_PAYMENT,
            description: `Driver earnings of ${driverEarning} credited (Total fare: ${ride.fare.total}, Commission: ${commission}${multiplier > 1.0 ? `, Tier Multiplier: ${multiplier}x` : ""}) for Ride: ${ride._id}.`,
          },
        ],
        { session },
      );

      socketHelper.sendToUser(ride.driverId.toString(), "wallet-updated", {
        balance: driverWallet.balance,
      });
      socketHelper.sendToUser(
        ride.driverId.toString(),
        "driver-wallet-credited",
        {
          amount: driverEarning,
          rideId: ride._id,
        },
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Trigger Passenger referral check upon payment completion
    ReferralService.checkAndProcessPassengerReferral(
      ride.userId.toString(),
    ).catch((err) => {
      logger.error("Passenger referral payment check error:", err);
    });

    // Build enriched summaries for both passenger and driver
    let driverSummary;
    let passengerSummary;

    if (ride.driverId) {
      const driverDoc = await Driver.findOne({
        userId: ride.driverId,
      }).populate("userId", "name profileImage");
      const car = await Car.findOne({
        driverId: driverDoc?._id,
        isVerified: true,
      });
      driverSummary = await buildDriverSummary(driverDoc, car);
    }

    const userDoc = await User.findById(ride.userId).select(
      "name profileImage averageRating totalRatings",
    );
    passengerSummary = buildPassengerSummary(userDoc);

    // 5. Send Realtime alerts, notifications, and events
    const receipt = {
      rideId: ride._id,
      amount: ride.fare.total,
      paymentMethod,
      transactionId: uniqueTxnRef,
      paidAt: ride.payment.paidAt,
      driver: driverSummary,
    };

    socketHelper.sendToUser(
      ride.userId.toString(),
      "payment-completed",
      receipt,
    );
    socketHelper.sendToUser(ride.userId.toString(), "payment-success", receipt);

    if (ride.driverId) {
      const driverReceipt = {
        ...receipt,
        user: passengerSummary,
      };
      socketHelper.sendToUser(
        ride.driverId.toString(),
        "payment-completed",
        driverReceipt,
      );
      socketHelper.sendToUser(
        ride.driverId.toString(),
        "payment-success",
        driverReceipt,
      );
    }

    // Push notifications
    await sendNotifications({
      title: "Payment Successful",
      text: `Your payment of ${ride.fare.total} via ${paymentMethod} was processed successfully.`,
      receiver: ride.userId,
      type: NOTIFICATION_TYPE.USER,
      referenceId: ride._id,
      referenceModel: "Ride" as any,
    });

    if (ride.driverId) {
      await sendNotifications({
        title: "Earnings Received",
        text: `Passenger paid ${ride.fare.total}. Your earning of ${ride.fare.driverEarning} has been added.`,
        receiver: ride.driverId,
        type: NOTIFICATION_TYPE.DRIVER,
        referenceId: ride._id,
        referenceModel: "Ride" as any,
      });
    }

    return {
      ride,
      transaction: cardTransaction || { transactionId: uniqueTxnRef },
      invoice: receipt,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Driver confirms receiving cash payment from passenger
 */
const confirmCashPayment = async (
  driverUserId: string,
  rideId: string,
): Promise<IRide> => {
  const ride = await Ride.findOne({ _id: rideId, driverId: driverUserId });

  if (!ride) {
    throw new ApiError(
      404,
      "Ride not found or you are not the assigned driver.",
    );
  }

  if (ride.status !== RIDE_STATUS.COMPLETED) {
    throw new ApiError(
      400,
      "Payments can only be confirmed for completed rides.",
    );
  }

  if (ride.payment.status === PAYMENT_STATUS.PAID) {
    throw new ApiError(400, "This ride has already been paid.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    ride.payment.status = PAYMENT_STATUS.PAID;
    ride.payment.paidAt = new Date();
    await ride.save({ session });

    if (
      ride.fare?.pendingCancellationFee &&
      ride.fare.pendingCancellationFee > 0
    ) {
      await PendingPayment.updateMany(
        { userId: ride.userId, status: "pending", type: "cancellation_fee" },
        { $set: { status: "paid", paidWithRideId: ride._id } },
        { session },
      );
    }

    const uniqueTxnRef = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;

    await Transaction.create(
      [
        {
          transactionId: uniqueTxnRef,
          userId: ride.userId,
          driverId: new Types.ObjectId(driverUserId),
          bookingId: ride._id,
          amount: ride.fare.total,
          paymentMethod: PAYMENT_METHOD.CARD, // maps to hand cash collection in backend transaction model
          paymentStatus: PAYMENT_STATUS.PAID,
          transactionType: TRANSACTION_TYPE.BOOKING_PAYMENT,
          description: "Cash collected by Driver.",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Build enriched summaries for both passenger and driver
    const driverDoc = await Driver.findOne({ userId: driverUserId }).populate(
      "userId",
      "name profileImage",
    );
    const car = await Car.findOne({
      driverId: driverDoc?._id,
      isVerified: true,
    });
    const driverSummary = await buildDriverSummary(driverDoc, car);

    const userDoc = await User.findById(ride.userId).select(
      "name profileImage averageRating totalRatings",
    );
    const passengerSummary = buildPassengerSummary(userDoc);

    const receipt = {
      rideId: ride._id,
      amount: ride.fare.total,
      paymentMethod: "CASH",
      paidAt: ride.payment.paidAt,
      driver: driverSummary,
    };

    const driverReceipt = {
      ...receipt,
      user: passengerSummary,
    };

    socketHelper.sendToUser(
      ride.userId.toString(),
      "payment-completed",
      receipt,
    );
    socketHelper.sendToUser(driverUserId, "payment-completed", driverReceipt);

    await sendNotifications({
      title: "Cash Payment Confirmed",
      text: `Driver confirmed cash payment of ${ride.fare.total}.`,
      receiver: ride.userId,
      type: NOTIFICATION_TYPE.USER,
      referenceId: ride._id,
      referenceModel: "Ride" as any,
    });

    return ride;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw error;
  }
};

/**
 * Cancel ride
 */
const cancelRide = async (
  userId: string,
  role: string,
  rideId: string,
  payload: {
    cancellationReasonId?: string;
    cancellationReasonName?: string;
    paymentTiming?: string;
  },
): Promise<IRide> => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  // Prevent cancellation if ride already completed, started, or cancelled
  if (
    ride.status === RIDE_STATUS.COMPLETED ||
    ride.status === RIDE_STATUS.STARTED ||
    ride.status === RIDE_STATUS.CANCELLED ||
    ride.status === RIDE_STATUS.CANCELLED_BY_USER ||
    ride.status === RIDE_STATUS.CANCELLED_BY_DRIVER
  ) {
    throw new ApiError(400, "Cannot cancel ride in its current state.");
  }

  const isUserPassenger = ride.userId.toString() === userId;
  const isUserDriver = ride.driverId?.toString() === userId;

  // Check if user is a notified driver (for rides in SEARCHING_DRIVER status)
  const isNotifiedDriver =
    ride.driverMatching?.notifiedDrivers?.some(
      (d: any) => d.driverId.toString() === userId,
    ) || false;

  if (
    !isUserPassenger &&
    !isUserDriver &&
    !isNotifiedDriver &&
    role !== "admin" &&
    role !== "superAdmin"
  ) {
    throw new ApiError(403, "You do not have permission to cancel this ride.");
  }

  if (!payload.cancellationReasonId) {
    throw new ApiError(400, "Cancellation reason ID is required.");
  }

  const cancellationReason = await CancellationReason.findById(
    payload.cancellationReasonId,
  );
  if (!cancellationReason) {
    throw new ApiError(404, "Cancellation reason not found");
  }

  const cancelledBy = isUserPassenger
    ? CANCELLED_BY.USER
    : isUserDriver || isNotifiedDriver
      ? CANCELLED_BY.DRIVER
      : CANCELLED_BY.ADMIN;

  // Fetch the simplified cancellation policy configuration document
  const policyConfig = await CancellationPolicyService.getPolicyConfig();

  // If Passenger (User) cancels:
  if (cancelledBy === CANCELLED_BY.USER || cancelledBy === CANCELLED_BY.ADMIN) {
    const isDriverAccepted = !!ride.driverId;
    const isDriverArrived = ride.status === RIDE_STATUS.DRIVER_ARRIVED;

    let scenarioName: string;
    let scenario: any;

    if (!isDriverAccepted) {
      scenarioName = "passenger.beforeDriverAccepted";
      scenario = policyConfig.passenger.beforeDriverAccepted;
    } else if (isDriverArrived) {
      scenarioName = "passenger.afterDriverArrived";
      scenario = policyConfig.passenger.afterDriverArrived;
    } else {
      scenarioName = "passenger.afterDriverAccepted";
      scenario = policyConfig.passenger.afterDriverAccepted;
    }

    const mapped = CANCEL_SCENARIO_MAPPING[scenarioName] || {
      scenario: scenarioName.replace(".", "_"),
      policyName: scenarioName,
    };

    const surgeMultiplier = ride.fare?.surgeMultiplier || 1.0;
    const cancellationFee = scenario.cancellationFee * surgeMultiplier;
    const platformShare = scenario.platformShare * surgeMultiplier;
    const driverCompensation = scenario.driverCompensation * surgeMultiplier;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const rideStatusBefore = ride.status;

      // Release driver immediately if exists
      if (ride.driverId) {
        await Driver.findOneAndUpdate(
          { userId: ride.driverId },
          { $set: { driverAvailabilityStatus: "online" } },
          { session },
        );

        // Update driver availability after cancellation
        await DriverDutyPolicyServices.updateDriverAvailability(
          ride.driverId.toString(),
        );
      }

      ride.status =
        cancelledBy === CANCELLED_BY.USER
          ? RIDE_STATUS.CANCELLED_BY_USER
          : RIDE_STATUS.CANCELLED;

      ride.cancellation = {
        cancelledBy,
        cancellationReasonId: cancellationReason._id,
        cancellationReasonName:
          payload.cancellationReasonName || cancellationReason.reasonName,
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
        paymentStatus:
          cancellationFee > 0
            ? payload.paymentTiming === "now"
              ? "pending"
              : "pending"
            : "paid",
        paymentCollectionMode:
          cancellationFee > 0
            ? payload.paymentTiming === "now"
              ? "immediate"
              : "next_ride"
            : undefined,
        rideStatusBeforeCancellation: rideStatusBefore,
        surgeSnapshot: {
          multiplier: ride.fare?.surgeMultiplier || 1.0,
          amount: ride.fare?.surgeApplied || 0.0,
        },
        fareSnapshot: ride.fare,
        cancelledAt: new Date(),
      };

      let pendingPaymentId: string | undefined;

      if (cancellationFee > 0) {
        const [createdPendingPayment] = await PendingPayment.create(
          [
            {
              userId: ride.userId,
              rideId: ride._id,
              type: "cancellation_fee",
              amount: cancellationFee,
              driverCompensation: driverCompensation || 0,
              platformShare: platformShare || 0,
              status: "pending",
            },
          ],
          { session },
        );
        if (createdPendingPayment) {
          pendingPaymentId = createdPendingPayment._id.toString();
        }
      }

      if (ride.rideType === RIDE_TYPE.SCHEDULED) {
        ride.reservationStatus = "cancelled";
        ride.reservationCancelledReason =
          payload.cancellationReasonName || cancellationReason.reasonName;
      }

      await ride.save({ session });

      // Only increment user cancellation statistics when passenger actively cancels
      if (cancelledBy === CANCELLED_BY.USER) {
        await User.findByIdAndUpdate(
          ride.userId,
          {
            $inc: { totalCancellations: 1, consecutiveCancellations: 1 },
            $set: { lastCancellationTime: new Date() },
          },
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();

      // Cancel all matching jobs
      try {
        const expirationJob = await rideExpirationQueue.getJob(
          `ride-expiration-${ride._id}`,
        );
        if (expirationJob) await expirationJob.remove();

        const visibilityJobs = await driverVisibilityQueue.getJobs(
          ["waiting", "delayed"],
          0,
          100,
        );
        for (const job of visibilityJobs) {
          if (job.name.startsWith(`driver-visibility-${ride._id}`)) {
            await job.remove();
          }
        }

        const expansionJobs = await radiusExpansionQueue.getJobs(
          ["waiting", "delayed"],
          0,
          100,
        );
        for (const job of expansionJobs) {
          if (job.name.startsWith(`radius-expansion-${ride._id}`)) {
            await job.remove();
          }
        }
      } catch (err) {
        logger.error("Error clearing match queues on cancellation:", err);
      }

      // Build enriched summaries for both passenger and driver
      let driverSummary;
      let passengerSummary;

      if (ride.driverId) {
        const driverDoc = await Driver.findOne({
          userId: ride.driverId,
        }).populate("userId", "name profileImage");
        const car = await Car.findOne({
          driverId: driverDoc?._id,
          isVerified: true,
        });
        driverSummary = await buildDriverSummary(driverDoc, car);
      }

      const userDoc = await User.findById(ride.userId).select(
        "name profileImage averageRating totalRatings",
      );
      passengerSummary = buildPassengerSummary(userDoc);

      // Notify User and Driver with enriched summaries
      const cancelPayload = {
        rideId: ride._id,
        ...getRideScheduleInfo(ride),
        cancelledBy,
        reason: payload.cancellationReasonName || cancellationReason.reasonName,
        cancellationFee,
        driverCompensation,
        pendingPaymentId,
        driver: driverSummary,
      };

      socketHelper.sendToUser(
        ride.userId.toString(),
        "ride-cancelled",
        cancelPayload,
      );

      if (ride.rideType === RIDE_TYPE.SCHEDULED) {
        socketHelper.sendToUser(
          ride.userId.toString(),
          "reservation-cancelled",
          cancelPayload,
        );
        if (ride.driverId) {
          socketHelper.sendToUser(
            ride.driverId.toString(),
            "reservation-cancelled",
            {
              ...cancelPayload,
              user: passengerSummary,
            },
          );
        }
      }

      // Notify all notified drivers whose status is "sent"
      ride.driverMatching?.notifiedDrivers?.forEach((d: any) => {
        if (d.status === DRIVER_MATCHING_STATUS.SENT) {
          socketHelper.sendToUser(
            d.driverId.toString(),
            "ride-request-expired",
            {
              rideId: ride._id,
              message: "Ride request cancelled by passenger.",
            },
          );
        }
      });

      // Push Notifications
      if (ride.driverId) {
        await sendNotifications({
          title: "Ride Cancelled",
          text: "The passenger has cancelled this ride request.",
          receiver: ride.driverId,
          type: NOTIFICATION_TYPE.DRIVER,
          referenceId: ride._id,
          referenceModel: "Ride" as any,
        });
      }

      await sendNotifications({
        title: "Ride Cancelled",
        text: "You have cancelled your ride.",
        receiver: ride.userId,
        type: NOTIFICATION_TYPE.USER,
        referenceId: ride._id,
        referenceModel: "Ride" as any,
      });

      if (cancellationFee > 0) {
        await sendNotifications({
          title: "Cancellation Fee Applied",
          text: `A cancellation fee of ${cancellationFee.toFixed(2)} has been applied to your account.`,
          receiver: ride.userId,
          type: NOTIFICATION_TYPE.USER,
          referenceId: ride._id,
          referenceModel: "Ride" as any,
        });
      }

      return ride;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // If Driver cancels:
  if (cancelledBy === CANCELLED_BY.DRIVER) {
    const cancellingDriverUserId = userId;

    // Find driver profile
    const driverDoc = await Driver.findOne({
      userId: cancellingDriverUserId,
    }).populate("userId", "name profileImage");
    if (!driverDoc) {
      throw new ApiError(404, "Driver profile not found");
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

    const mapped = CANCEL_SCENARIO_MAPPING[internalScenarioName] || {
      scenario: internalScenarioName.replace(".", "_"),
      policyName: internalScenarioName,
    };

    const surgeMultiplier = ride.fare?.surgeMultiplier || 1.0;
    const cancellationFee = scenario.cancellationFee * surgeMultiplier;
    const platformShare = scenario.platformShare * surgeMultiplier;
    const driverCompensation = 0;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Release the cancelling driver and make online
      await Driver.findOneAndUpdate(
        { userId: cancellingDriverUserId },
        {
          $set: {
            driverAvailabilityStatus: "online",
            lastCancellationTime: new Date(),
          },
          $inc: { totalCancellations: 1, consecutiveCancellations: 1 },
          $push: {
            cancellationHistory: {
              rideId: ride._id,
              cancellationReasonId: cancellationReason._id,
              cancellationReasonName:
                payload.cancellationReasonName || cancellationReason.reasonName,
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
        },
        { session },
      );

      // Update driver availability after cancellation
      await DriverDutyPolicyServices.updateDriverAvailability(
        cancellingDriverUserId,
      );

      // 2. Update Ride details
      // Remove driverId and carId, revert status to SEARCHING_DRIVER
      ride.status = RIDE_STATUS.SEARCHING_DRIVER;
      ride.driverId = undefined;
      ride.carId = undefined;

      // Update matching history for the driver who cancelled
      // Find the driver in notifiedDrivers and update status to REJECTED
      const driverNotification = ride.driverMatching.notifiedDrivers.find(
        (d) => d.driverId.toString() === cancellingDriverUserId,
      );
      if (driverNotification) {
        driverNotification.status = DRIVER_MATCHING_STATUS.REJECTED;
        driverNotification.respondedAt = new Date();
      } else {
        ride.driverMatching.notifiedDrivers.push({
          driverId: new Types.ObjectId(cancellingDriverUserId),
          sentAt: new Date(),
          respondedAt: new Date(),
          status: DRIVER_MATCHING_STATUS.REJECTED,
        });
      }

      await ride.save({ session });
      await session.commitTransaction();
      session.endSession();

      // Deduct points for accepted ride cancellation
      PointsService.deductPoints(
        cancellingDriverUserId,
        "accepted_ride_cancelled",
        "ride",
        ride._id,
        { notes: `Cancelled Accepted Ride ${ride._id}` }
      ).catch((err) => logger.error("Error deducting points for cancellation:", err));

      // 3. Resume Driver Matching automatically
      // Original timer calculation
      const systemConfig = await getSystemConfig();
      const elapsedMs = Date.now() - new Date(ride.requestedAt).getTime();
      const lifetimeMs =
        systemConfig.driverMatching.rideRequestLifetimeSeconds * 1000;
      const remainingMs = lifetimeMs - elapsedMs;

      if (remainingMs <= 0) {
        // Expire ride request immediately
        ride.status = RIDE_STATUS.EXPIRED;
        ride.cancellation = {
          cancelledBy: CANCELLED_BY.ADMIN,
          cancellationReasonName:
            "Ride request expired. No driver accepted within the maximum time limit.",
          cancellationFee: 0,
          driverCompensation: 0,
          platformShare: 0,
          cancelledAt: new Date(),
        };
        await ride.save();

        socketHelper.sendToUser(ride.userId.toString(), "ride-expired", {
          rideId: ride._id,
          message: "Request expired. No driver found within the time limit.",
          driverSearch: calculateDriverSearchTiming(ride),
        });
      } else {
        // Schedule overall expiration with remaining timer
        try {
          const expJob = await rideExpirationQueue.getJob(
            `ride-expiration-${ride._id}`,
          );
          if (expJob) await expJob.remove();
        } catch (e) {}

        await rideExpirationQueue.add(
          `ride-expiration-${ride._id}`,
          {
            rideId: ride._id.toString(),
            userId: ride.userId.toString(),
          },
          {
            delay: remainingMs,
            jobId: `ride-expiration-${ride._id}`,
          },
        );

        // Find eligible drivers in search radius, excluding previously notified/rejected/cancelled ones
        const eligibleDrivers = await findEligibleDriversInRadius({
          pickupLocation: ride.pickup.location,
          radiusKm: ride.driverMatching.searchRadiusKm,
          rideCategoryId: ride.rideCategory.categoryId.toString(),
          serviceCategoryId: (ride as any).serviceCategoryId?.toString(),
          excludeDriverIds: ride.driverMatching.notifiedDrivers.map((d: any) =>
            d.driverId.toString(),
          ),
          rideServiceAreaId: ride.serviceAreaId?.toString(),
          rideDestination: ride.destination.location,
          rideType: ride.rideType,
          scheduledAt: ride.scheduledAt,
        });

        const newDrivers = eligibleDrivers.slice(0, 10);

        if (newDrivers.length > 0) {
          const newDriverNotifications = newDrivers.map((driver: any) => ({
            driverId: driver.driverId,
            sentAt: new Date(),
            status: DRIVER_MATCHING_STATUS.SENT,
          }));

          ride.driverMatching.notifiedDrivers.push(...newDriverNotifications);
          await ride.save();

          const driverSearchTiming = calculateDriverSearchTiming(ride);

          // Build passenger summary for new drivers
          const userDoc = await User.findById(ride.userId).select(
            "name profileImage averageRating totalRatings",
          );
          const passengerSummary = buildPassengerSummary(userDoc);

          newDrivers.forEach((driver: any) => {
            socketHelper.sendToUser(
              driver.driverId.toString(),
              "ride-request",
              {
                rideId: ride._id,
                ...getRideScheduleInfo(ride),
                pickup: ride.pickup,
                destination: ride.destination,
                stops: ride.stops,
                fare: ride.fare.total,
                routeInfo: ride.routeInfo,
                driverSearch: driverSearchTiming,
                user: passengerSummary,
              },
            );

            driverVisibilityQueue.add(
              `driver-visibility-${ride._id}-${driver.driverId}`,
              {
                rideId: ride._id.toString(),
                driverId: driver.driverId.toString(),
                userId: ride.userId.toString(),
              },
              {
                delay:
                  systemConfig.driverMatching.driverVisibilityDurationSeconds *
                  1000,
                jobId: `driver-visibility-${ride._id}-${driver.driverId}`,
              },
            );
          });
        } else {
          // If no new drivers are found, trigger immediate radius expansion
          await triggerImmediateRadiusExpansion(ride);
        }
      }

      // Notify passenger of driver cancellation, but ride continues searching
      const cancelPayload = {
        rideId: ride._id,
        cancelledBy: CANCELLED_BY.DRIVER,
        reason: payload.cancellationReasonName || cancellationReason.reasonName,
        cancellationFee,
        driverCompensation,
      };

      // Emit ride-cancelled socket event to user/cancelling driver to signal cancellation of current acceptance
      socketHelper.sendToUser(
        ride.userId.toString(),
        "ride-cancelled",
        cancelPayload,
      );
      socketHelper.sendToUser(
        cancellingDriverUserId,
        "ride-cancelled",
        cancelPayload,
      );

      // Send push notification to passenger
      await sendNotifications({
        title: "Ride Cancelled by Driver",
        text: "The driver has cancelled this ride. We are looking for another driver.",
        receiver: ride.userId,
        type: NOTIFICATION_TYPE.USER,
        referenceId: ride._id,
        referenceModel: "Ride" as any,
      });

      // Send push notification to driver
      await sendNotifications({
        title: "Ride Cancelled",
        text: "You have cancelled this ride.",
        receiver: new Types.ObjectId(cancellingDriverUserId),
        type: NOTIFICATION_TYPE.DRIVER,
        referenceId: ride._id,
        referenceModel: "Ride" as any,
      });

      return ride;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  throw new ApiError(400, "Invalid cancellation actor.");
};

/**
 * Add stops during an active trip
 * Only allowed after ride has started and before completion
 */
const addStopsDuringTrip = async (
  userId: string,
  rideId: string,
  payload: {
    stops: {
      order: number;
      address: string;
      location: { type: string; coordinates: [number, number] };
    }[];
  },
): Promise<IRide> => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  // Verify user is the passenger
  if (ride.userId.toString() !== userId) {
    throw new ApiError(403, "Only the passenger can add stops to this ride");
  }

  // Validate ride status - must be STARTED
  if (ride.status !== RIDE_STATUS.STARTED) {
    throw new ApiError(
      400,
      "Stops can only be added during an ongoing trip (status: STARTED)",
    );
  }

  // Get current tracking to determine completed stops
  const tracking = await Tracking.findOne({ rideId });
  const currentStopOrder = tracking?.currentStopOrder ?? -1;

  // Validate each new stop
  for (const newStop of payload.stops) {
    // Validate coordinates
    const [longitude, latitude] = newStop.location.coordinates;
    if (
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new ApiError(
        400,
        `Invalid coordinates for stop at order ${newStop.order}`,
      );
    }

    // Validate stop order - must be greater than current completed stop order
    if (newStop.order <= currentStopOrder) {
      throw new ApiError(
        400,
        `Stop order ${newStop.order} conflicts with already completed stops (current: ${currentStopOrder})`,
      );
    }

    // Check if stop with same order already exists
    const existingStop = ride.stops?.find((s) => s.order === newStop.order);
    if (existingStop) {
      throw new ApiError(
        400,
        `Stop with order ${newStop.order} already exists`,
      );
    }

    // Check if stop is a duplicate of existing stops
    const isDuplicate = ride.stops?.some((s) => {
      const [existingLon, existingLat] = s.location.coordinates;
      const distance = Math.sqrt(
        Math.pow(existingLat - latitude, 2) +
          Math.pow(existingLon - longitude, 2),
      );
      return distance < 0.0001; // Very small tolerance for duplicate detection
    });
    if (isDuplicate) {
      throw new ApiError(
        400,
        `Stop at order ${newStop.order} is a duplicate of an existing stop`,
      );
    }
  }

  // Get current driver location for route recalculation
  const driverLocation = tracking?.driverLocation;
  if (!driverLocation) {
    throw new ApiError(
      400,
      "Driver location not available for route recalculation",
    );
  }

  // Build the remaining route points
  // Start from current driver location
  const originCoord = {
    lat: driverLocation.coordinates[1],
    lng: driverLocation.coordinates[0],
  };

  // Get all uncompleted existing stops (order > currentStopOrder AND !isCompleted)
  const uncompletedExistingStops =
    ride.stops
      ?.filter((s) => s.order > currentStopOrder && !s.isCompleted)
      .sort((a, b) => a.order - b.order) || [];

  // Merge new stops with existing uncompleted stops, preserving order
  const allStops = [...uncompletedExistingStops, ...payload.stops].sort(
    (a, b) => a.order - b.order,
  );

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
  console.log(
    "  Driver Location (MongoDB [lng, lat]):",
    driverLocation.coordinates,
  );
  console.log("  Origin (Google Maps lat, lng):", originCoord);
  console.log(
    "  Destination (MongoDB [lng, lat]):",
    ride.destination.location.coordinates,
  );
  console.log("  Destination (Google Maps lat, lng):", destCoord);
  console.log("  Current Stop Order:", currentStopOrder);
  console.log("  Uncompleted Existing Stops:", uncompletedExistingStops.length);
  console.log("  New Stops:", payload.stops.length);
  console.log(
    "  All Stops (sorted):",
    allStops.map((s) => ({
      order: s.order,
      address: s.address,
      coords: s.location.coordinates,
    })),
  );
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
  const newRouteInfo = await googleMapsHelper.getRoute(
    originCoord,
    destCoord,
    waypoints,
  );

  // Calculate remaining fare based on new route
  const remainingFare = await calculateFare(
    newRouteInfo.totalDistanceKm,
    newRouteInfo.totalDurationMinutes,
    ride.rideCategory.categoryId.toString(),
    ride.serviceAreaId,
    undefined, // serviceCategoryId
  );

  // Update ride with new stops and route info
  ride.stops = [
    ...(ride.stops || []),
    ...payload.stops.map((s) => ({
      order: s.order,
      address: s.address,
      location: {
        type: "Point" as const,
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

  await ride.save();

  // Update tracking with new ETA and distance
  if (tracking) {
    tracking.remainingDistanceKm = newRouteInfo.totalDistanceKm;
    tracking.estimatedArrivalMinutes = newRouteInfo.totalDurationMinutes;
    tracking.etaCalculatedAt = new Date();
    await tracking.save();
  }

  // Notify passenger about updated route and fare
  socketHelper.sendToUser(ride.userId.toString(), "stops-added", {
    rideId: ride._id,
    newStops: payload.stops,
    updatedRouteInfo: ride.routeInfo,
    updatedFare: ride.fare,
    remainingDistanceKm: tracking?.remainingDistanceKm,
    estimatedArrivalMinutes: tracking?.estimatedArrivalMinutes,
  });

  // Notify driver about updated route
  if (ride.driverId) {
    socketHelper.sendToUser(ride.driverId.toString(), "stops-added", {
      rideId: ride._id,
      newStops: payload.stops,
      updatedRouteInfo: ride.routeInfo,
      remainingDistanceKm: tracking?.remainingDistanceKm,
      estimatedArrivalMinutes: tracking?.estimatedArrivalMinutes,
    });
  }

  // Send push notification to passenger
  await sendNotifications({
    title: "Route Updated",
    text: `${payload.stops.length} new stop(s) added to your trip. Fare and ETA have been updated.`,
    receiver: ride.userId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: ride._id,
    referenceModel: "Ride" as any,
  });

  return ride;
};

/**
 * Retrieve specific ride details
 */
const getRideDetails = async (
  userId: string,
  rideId: string,
): Promise<IRide> => {
  // Get the user to determine their role
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Build populate fields based on user role
  // Drivers should never see passenger phone numbers
  const userFields =
    user.role === "driver"
      ? "name profileImage averageRating totalRatings"
      : "name phone profileImage averageRating totalRatings";
  const driverFields =
    user.role === "driver" ? "name phone profileImage" : "name profileImage";

  const ride = await Ride.findById(rideId)
    .populate("userId", userFields)
    .populate("driverId", driverFields)
    .populate("carId");

  if (!ride) {
    throw new ApiError(404, "Ride booking not found");
  }

  if (
    ride.userId._id.toString() !== userId &&
    ride.driverId?._id.toString() !== userId &&
    !(await User.findOne({
      _id: userId,
      role: { $in: ["admin", "superAdmin"] },
    }))
  ) {
    throw new ApiError(
      403,
      "You do not have permission to access these ride details.",
    );
  }

  // Add driver search timing if ride is in searching state
  const rideObj = ride.toObject();
  if (ride.status === RIDE_STATUS.SEARCHING_DRIVER) {
    (rideObj as any).driverSearch = calculateDriverSearchTiming(ride);
  }

  return rideObj as IRide;
};

/**
 * Find current ongoing/active ride for a passenger or a driver
 */
const getActiveRide = async (
  userId: string,
  role: string,
): Promise<IRide | null> => {
  const activeStates = [
    RIDE_STATUS.SEARCHING_DRIVER,
    RIDE_STATUS.DRIVER_ACCEPTED,
    RIDE_STATUS.DRIVER_ON_THE_WAY,
    RIDE_STATUS.DRIVER_ARRIVED,
    RIDE_STATUS.STARTED,
  ];

  const now = new Date();
  const imminentWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const roleFilter =
    role === "driver"
      ? { driverId: new Types.ObjectId(userId) }
      : { userId: new Types.ObjectId(userId) };

  const query: any = {
    $and: [
      roleFilter,
      {
        $or: [
          // Instant rides in active states
          {
            rideType: { $ne: RIDE_TYPE.SCHEDULED },
            status: { $in: activeStates },
          },
          // Scheduled rides that are in progress
          {
            rideType: RIDE_TYPE.SCHEDULED,
            status: {
              $in: [
                RIDE_STATUS.DRIVER_ON_THE_WAY,
                RIDE_STATUS.DRIVER_ARRIVED,
                RIDE_STATUS.STARTED,
              ],
            },
          },
          // Scheduled rides searching driver or driver accepted but imminent
          {
            rideType: RIDE_TYPE.SCHEDULED,
            status: RIDE_STATUS.SEARCHING_DRIVER,
          },
          {
            rideType: RIDE_TYPE.SCHEDULED,
            status: RIDE_STATUS.DRIVER_ACCEPTED,
            scheduledAt: { $lte: imminentWindowEnd },
          },
        ],
      },
    ],
  };

  // Get the user to determine their role
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Build populate fields based on user role
  // Drivers should never see passenger phone numbers
  const userFields =
    user.role === "driver" ? "name profileImage" : "name phone profileImage";
  const driverFields =
    user.role === "driver" ? "name phone profileImage" : "name profileImage";

  const ride = await Ride.findOne(query)
    .populate("userId", userFields)
    .populate("driverId", driverFields)
    .populate("carId");

  if (!ride) {
    return null;
  }

  // Add driver search timing if ride is in searching state
  const rideObj = ride.toObject();
  if (ride.status === RIDE_STATUS.SEARCHING_DRIVER) {
    (rideObj as any).driverSearch = calculateDriverSearchTiming(ride);
  }

  return rideObj as IRide;
};

const getDriverRideHistory = async (
  driverUserId: string,
  query: Record<string, any>,
) => {
  const page = Math.max(parseInt(String(query.page || "1"), 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(String(query.limit || "10"), 10) || 10, 1),
    100,
  );
  const skip = (page - 1) * limit;

  const driverObjectId = new Types.ObjectId(driverUserId);

  // Driver participation constraint: Only include rides where driver actually accepted or was assigned
  const baseConditions: FilterQuery<IRide>[] = [
    {
      $or: [{ driverId: driverObjectId }, { assignedDriverId: driverObjectId }],
    },
    // Exclude incomplete ride statuses
    {
      status: {
        $nin: [
          RIDE_STATUS.EXPIRED,
          RIDE_STATUS.DRIVER_ARRIVED,
          RIDE_STATUS.STARTED,
          RIDE_STATUS.DRIVER_ON_THE_WAY,
          RIDE_STATUS.WAITING_USER_APPROVAL,
          RIDE_STATUS.SEARCHING_DRIVER,
        ],
      },
    },
  ];

  // Ride Type Filter
  if (query.rideType) {
    if (
      query.rideType === RIDE_TYPE.INSTANT ||
      query.rideType === RIDE_TYPE.SCHEDULED
    ) {
      baseConditions.push({ rideType: query.rideType as RIDE_TYPE });
    } else {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Invalid rideType provided. Must be 'instant' or 'scheduled'",
      );
    }
  }

  // Status Filter
  if (query.status) {
    const rawStatus = String(query.status).trim();
    if (rawStatus === "cancelled") {
      baseConditions.push({
        status: {
          $in: [
            RIDE_STATUS.CANCELLED,
            RIDE_STATUS.CANCELLED_BY_USER,
            RIDE_STATUS.CANCELLED_BY_DRIVER,
          ],
        },
      });
    } else if (Object.values(RIDE_STATUS).includes(rawStatus as RIDE_STATUS)) {
      baseConditions.push({ status: rawStatus as RIDE_STATUS });
    }
  }

  // Payment Status Filter
  if (query.paymentStatus) {
    baseConditions.push({ "payment.status": query.paymentStatus });
  }

  // Date Filtering
  const dateField =
    query.rideType === RIDE_TYPE.SCHEDULED ? "scheduledAt" : "createdAt";

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  const fromDateStr = query.fromDate
    ? String(query.fromDate).trim().toLowerCase()
    : undefined;
  const toDateStr = query.toDate
    ? String(query.toDate).trim().toLowerCase()
    : undefined;

  const now = new Date();

  // Get driver's service area timezone dynamically, fallback to system configuration
  const driver = await Driver.findOne({ userId: driverObjectId });
  const systemConfig = await getSystemConfig();
  const defaultTimezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";
  let driverTimezone = defaultTimezone;
  if (driver?.serviceAreaId) {
    const serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || defaultTimezone;
  }

  if (fromDateStr === "today") {
    const range = getDayRangeInTimezone("today", driverTimezone);
    startDate = range.start;
    endDate = range.end;
  } else if (fromDateStr === "yesterday") {
    const range = getDayRangeInTimezone("yesterday", driverTimezone);
    startDate = range.start;
    endDate = range.end;
  } else if (
    fromDateStr === "last 7 days" ||
    fromDateStr === "last_7_days" ||
    fromDateStr === "7days"
  ) {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endDate = now;
  } else if (
    fromDateStr === "last 30 days" ||
    fromDateStr === "last_30_days" ||
    fromDateStr === "30days"
  ) {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    endDate = now;
  } else {
    if (query.fromDate && !isNaN(Date.parse(String(query.fromDate)))) {
      const { start } = getDayRangeInTimezone(String(query.fromDate), driverTimezone);
      startDate = start;
    }
    if (query.toDate && !isNaN(Date.parse(String(query.toDate)))) {
      const { end } = getDayRangeInTimezone(String(query.toDate), driverTimezone);
      endDate = end;
    }
  }

  if (startDate || endDate) {
    const dateRangeQuery: Record<string, any> = {};
    if (startDate) dateRangeQuery.$gte = startDate;
    if (endDate) dateRangeQuery.$lte = endDate;
    baseConditions.push({ [dateField]: dateRangeQuery });
  }

  // Search Filter
  let searchCondition: FilterQuery<IRide> | undefined;
  if (query.searchTerm) {
    const searchTerm = String(query.searchTerm).trim();
    const searchConditions: FilterQuery<IRide>[] = [
      { "pickup.address": { $regex: searchTerm, $options: "i" } },
      { "destination.address": { $regex: searchTerm, $options: "i" } },
    ];

    if (Types.ObjectId.isValid(searchTerm)) {
      searchConditions.push({ _id: new Types.ObjectId(searchTerm) });
    }

    const matchingUsers = await User.find({
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

  const filter: FilterQuery<IRide> = searchCondition
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

  const sortOrderVal =
    String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sortOption: Record<string, 1 | -1> = { [sortField]: sortOrderVal };

  const total = await Ride.countDocuments(filter);
  const totalPage = Math.ceil(total / limit);

  const rides = await Ride.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate(
      "userId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate("serviceCategoryId", "name description image")
    .lean();

  const data = rides.map((ride: any) => {
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
        method: ride.payment?.method,
        status: ride.payment?.status,
        paidAt: ride.payment?.paidAt,
      },
      scheduledAt: ride.scheduledAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancellation?.cancelledAt,
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
};

/**
 * Retrieve specific ride details for driver history
 */
const getDriverRideHistoryDetails = async (
  driverUserId: string,
  rideId: string,
) => {
  if (!Types.ObjectId.isValid(rideId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ride ID");
  }

  const driverObjectId = new Types.ObjectId(driverUserId);
  const rideObjectId = new Types.ObjectId(rideId);

  const ride = await Ride.findOne({
    _id: rideObjectId,
    $or: [{ driverId: driverObjectId }, { assignedDriverId: driverObjectId }],
  })
    .populate(
      "userId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate("serviceCategoryId", "name description image")
    .populate("carId")
    .lean();

  if (!ride) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Driver ride history details not found",
    );
  }

  const passenger = ride.userId
    ? {
        id: (ride.userId as any)._id,
        name: (ride.userId as any).name,
        profileImage: (ride.userId as any).profileImage,
        phone: (ride.userId as any).phone,
        email: (ride.userId as any).email,
        rating: (ride.userId as any).averageRating || 0,
        averageRating: (ride.userId as any).averageRating || 0,
        totalRatings: (ride.userId as any).totalRatings || 0,
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
      method: ride.payment?.method,
      status: ride.payment?.status,
      paidAt: ride.payment?.paidAt,
    },
    scheduledAt: ride.scheduledAt,
    acceptedAt: ride.acceptedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    cancelledAt: ride.cancellation?.cancelledAt,
    cancellation: ride.cancellation,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  };
};

/**
 * Retrieve paginated ride history for a user (passenger)
 */
const getUserRideHistory = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const userObjectId = new Types.ObjectId(userId);

  const baseConditions: FilterQuery<IRide>[] = [
    { userId: userObjectId },
    // Exclude incomplete ride statuses
    {
      status: {
        $nin: [
          RIDE_STATUS.EXPIRED,
          RIDE_STATUS.DRIVER_ARRIVED,
          RIDE_STATUS.STARTED,
          RIDE_STATUS.DRIVER_ON_THE_WAY,
          RIDE_STATUS.WAITING_USER_APPROVAL,
          RIDE_STATUS.SEARCHING_DRIVER,
        ],
      },
    },
  ];

  // Ride Type Filter
  if (query.rideType) {
    if (
      query.rideType === RIDE_TYPE.INSTANT ||
      query.rideType === RIDE_TYPE.SCHEDULED
    ) {
      baseConditions.push({ rideType: query.rideType as RIDE_TYPE });
    } else {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Invalid rideType provided. Must be 'instant' or 'scheduled'",
      );
    }
  }

  // Status Filter
  if (query.status) {
    const rawStatus = String(query.status).trim();
    if (rawStatus === "cancelled") {
      baseConditions.push({
        status: {
          $in: [
            RIDE_STATUS.CANCELLED,
            RIDE_STATUS.CANCELLED_BY_USER,
            RIDE_STATUS.CANCELLED_BY_DRIVER,
          ],
        },
      });
    } else if (Object.values(RIDE_STATUS).includes(rawStatus as RIDE_STATUS)) {
      baseConditions.push({ status: rawStatus as RIDE_STATUS });
    }
  }

  // Payment Status Filter
  if (query.paymentStatus) {
    baseConditions.push({ "payment.status": query.paymentStatus });
  }

  // Date Filtering
  const dateField =
    query.rideType === RIDE_TYPE.SCHEDULED ? "scheduledAt" : "createdAt";

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  const fromDateStr = query.fromDate
    ? String(query.fromDate).trim().toLowerCase()
    : undefined;

  const now = new Date();

  // Get system config default timezone dynamically
  const systemConfig = await getSystemConfig();
  const riderTimezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";

  if (fromDateStr === "today") {
    const range = getDayRangeInTimezone("today", riderTimezone);
    startDate = range.start;
    endDate = range.end;
  } else if (fromDateStr === "yesterday") {
    const range = getDayRangeInTimezone("yesterday", riderTimezone);
    startDate = range.start;
    endDate = range.end;
  } else if (
    fromDateStr === "last 7 days" ||
    fromDateStr === "last_7_days" ||
    fromDateStr === "7days"
  ) {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endDate = now;
  } else if (
    fromDateStr === "last 30 days" ||
    fromDateStr === "last_30_days" ||
    fromDateStr === "30days"
  ) {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    endDate = now;
  } else {
    if (query.fromDate && !isNaN(Date.parse(String(query.fromDate)))) {
      const { start } = getDayRangeInTimezone(String(query.fromDate), riderTimezone);
      startDate = start;
    }
    if (query.toDate && !isNaN(Date.parse(String(query.toDate)))) {
      const { end } = getDayRangeInTimezone(String(query.toDate), riderTimezone);
      endDate = end;
    }
  }

  if (startDate || endDate) {
    const dateRangeQuery: Record<string, any> = {};
    if (startDate) dateRangeQuery.$gte = startDate;
    if (endDate) dateRangeQuery.$lte = endDate;
    baseConditions.push({ [dateField]: dateRangeQuery });
  }

  // Search Filter
  let searchCondition: FilterQuery<IRide> | undefined;
  if (query.searchTerm || query.search) {
    const rawSearch = query.searchTerm || query.search;
    const searchTerm = String(rawSearch).trim();
    const searchConditions: FilterQuery<IRide>[] = [
      { "pickup.address": { $regex: searchTerm, $options: "i" } },
      { "destination.address": { $regex: searchTerm, $options: "i" } },
    ];

    if (Types.ObjectId.isValid(searchTerm)) {
      searchConditions.push({ _id: new Types.ObjectId(searchTerm) });
    }

    const matchingDrivers = await User.find({
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

  const filter: FilterQuery<IRide> = searchCondition
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

  const sortOrderVal =
    String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sortOption: Record<string, 1 | -1> = { [sortField]: sortOrderVal };

  const total = await Ride.countDocuments(filter);
  const totalPage = Math.ceil(total / limit);

  const rides = await Ride.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate(
      "driverId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate("serviceCategoryId", "name description image")
    .populate("carId", "brand model year licensePlate")
    .lean();

  const driverUserIds = rides
    .map((ride: any) =>
      ride.driverId?._id ? ride.driverId._id : ride.driverId,
    )
    .filter(Boolean);

  const driverDocMap: Record<string, any> = {};
  const driverTotalTripsMap: Record<string, number> = {};

  if (driverUserIds.length > 0) {
    const driverDocs = await Driver.find({
      userId: { $in: driverUserIds },
    })
      .select("userId averageRating totalRatings totalReviews")
      .lean();

    driverDocs.forEach((d: any) => {
      if (d.userId) {
        driverDocMap[d.userId.toString()] = d;
      }
    });

    const tripCounts = await Ride.aggregate([
      {
        $match: {
          $or: [
            { driverId: { $in: driverUserIds } },
            { assignedDriverId: { $in: driverUserIds } },
          ],
          status: RIDE_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$driverId", "$assignedDriverId"] },
          totalTrips: { $sum: 1 },
        },
      },
    ]);

    tripCounts.forEach((tc: any) => {
      if (tc._id) {
        driverTotalTripsMap[tc._id.toString()] = tc.totalTrips;
      }
    });
  }

  const data = rides.map((ride: any) => {
    const driverUser = ride.driverId;
    const driverIdStr = driverUser?._id
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
          rating: driverDoc?.averageRating || driverUser.averageRating || 0,
          averageRating:
            driverDoc?.averageRating || driverUser.averageRating || 0,
          totalRatings: driverDoc?.totalRatings || driverUser.totalRatings || 0,
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
        method: ride.payment?.method,
        status: ride.payment?.status,
        paidAt: ride.payment?.paidAt,
      },
      scheduledAt: ride.scheduledAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancellation?.cancelledAt,
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
};

/**
 * Retrieve specific ride details for user history
 */
const getUserRideHistoryDetails = async (userId: string, rideId: string) => {
  if (!Types.ObjectId.isValid(rideId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ride ID");
  }

  const userObjectId = new Types.ObjectId(userId);
  const rideObjectId = new Types.ObjectId(rideId);

  const ride = await Ride.findOne({
    _id: rideObjectId,
    userId: userObjectId,
  })
    .populate(
      "driverId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate("serviceCategoryId", "name description image")
    .populate("carId")
    .lean();

  if (!ride) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "User ride history details not found",
    );
  }

  let driver = null;
  if (ride.driverId) {
    const driverUser: any = ride.driverId;
    const driverUserId = driverUser._id
      ? driverUser._id
      : new Types.ObjectId(driverUser);

    const [driverDoc, completedTrips] = await Promise.all([
      Driver.findOne({ userId: driverUserId })
        .select("averageRating totalRatings totalReviews")
        .lean(),
      Ride.countDocuments({
        $or: [{ driverId: driverUserId }, { assignedDriverId: driverUserId }],
        status: RIDE_STATUS.COMPLETED,
      }),
    ]);

    driver = {
      id: driverUser._id || driverUser,
      name: driverUser.name,
      profileImage: driverUser.profileImage,
      phone: driverUser.phone,
      email: driverUser.email,
      rating: driverDoc?.averageRating || driverUser.averageRating || 0,
      averageRating: driverDoc?.averageRating || driverUser.averageRating || 0,
      totalRatings: driverDoc?.totalRatings || driverUser.totalRatings || 0,
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
      method: ride.payment?.method,
      status: ride.payment?.status,
      paidAt: ride.payment?.paidAt,
    },
    scheduledAt: ride.scheduledAt,
    acceptedAt: ride.acceptedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    cancelledAt: ride.cancellation?.cancelledAt,
    cancellation: ride.cancellation,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  };
};

/**
 * Retrieve paginated reservation history for a user (passenger)
 */
const getMyReservations = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const userObjectId = new Types.ObjectId(userId);

  const baseConditions: FilterQuery<IRide>[] = [
    { userId: userObjectId },
    { rideType: RIDE_TYPE.SCHEDULED },
  ];

  // Optional: filters for reservation status if passed in query
  if (query.reservationStatus) {
    baseConditions.push({
      reservationStatus: query.reservationStatus as string,
    });
  }

  // Optional: filters for status if passed in query
  if (query.status) {
    baseConditions.push({ status: query.status as string });
  }

  const filter: FilterQuery<IRide> = { $and: baseConditions };

  // Sort by createdAt descending so that the latest reservation shows first (sobar upore)
  const sortOption: Record<string, 1 | -1> = { createdAt: -1 };

  const total = await Ride.countDocuments(filter);
  const totalPage = Math.ceil(total / limit);

  const rides = await Ride.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate(
      "driverId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate(
      "assignedDriverId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate("serviceCategoryId", "name description image")
    .populate("carId", "brand model year licensePlate")
    .lean();

  const driverUserIds = rides
    .map((ride: any) => {
      const activeDriver = ride.driverId?._id
        ? ride.driverId._id
        : ride.driverId;
      const assignedDriver = ride.assignedDriverId?._id
        ? ride.assignedDriverId._id
        : ride.assignedDriverId;
      return activeDriver || assignedDriver;
    })
    .filter(Boolean);

  const driverDocMap: Record<string, any> = {};
  const driverTotalTripsMap: Record<string, number> = {};

  if (driverUserIds.length > 0) {
    const driverDocs = await Driver.find({
      userId: { $in: driverUserIds },
    })
      .select("userId averageRating totalRatings totalReviews")
      .lean();

    driverDocs.forEach((d: any) => {
      if (d.userId) {
        driverDocMap[d.userId.toString()] = d;
      }
    });

    const tripCounts = await Ride.aggregate([
      {
        $match: {
          $or: [
            { driverId: { $in: driverUserIds } },
            { assignedDriverId: { $in: driverUserIds } },
          ],
          status: RIDE_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$driverId", "$assignedDriverId"] },
          totalTrips: { $sum: 1 },
        },
      },
    ]);

    tripCounts.forEach((tc: any) => {
      if (tc._id) {
        driverTotalTripsMap[tc._id.toString()] = tc.totalTrips;
      }
    });
  }

  const data = rides.map((ride: any) => {
    const activeDriver = ride.driverId;
    const assignedDriver = ride.assignedDriverId;
    const driverUser = activeDriver || assignedDriver;
    const driverIdStr = driverUser?._id
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
          rating: driverDoc?.averageRating || driverUser.averageRating || 0,
          averageRating:
            driverDoc?.averageRating || driverUser.averageRating || 0,
          totalRatings: driverDoc?.totalRatings || driverUser.totalRatings || 0,
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
        method: ride.payment?.method,
        status: ride.payment?.status,
        paidAt: ride.payment?.paidAt,
      },
      scheduledAt: ride.scheduledAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancellation?.cancelledAt,
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
};

/**
 * Retrieve specific reservation details for user
 */
const getReservationDetails = async (userId: string, rideId: string) => {
  if (!Types.ObjectId.isValid(rideId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid reservation ID");
  }

  const userObjectId = new Types.ObjectId(userId);
  const rideObjectId = new Types.ObjectId(rideId);

  const ride = await Ride.findOne({
    _id: rideObjectId,
    userId: userObjectId,
    rideType: RIDE_TYPE.SCHEDULED,
  })
    .populate(
      "driverId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate(
      "assignedDriverId",
      "name profileImage phone email averageRating totalRatings",
    )
    .populate("serviceCategoryId", "name description image")
    .populate("carId")
    .lean();

  if (!ride) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Reservation details not found");
  }

  const driverUser: any = ride.driverId || ride.assignedDriverId;
  let driver = null;
  if (driverUser) {
    const driverUserId = driverUser._id
      ? driverUser._id
      : new Types.ObjectId(driverUser);

    const [driverDoc, completedTrips] = await Promise.all([
      Driver.findOne({ userId: driverUserId })
        .select("averageRating totalRatings totalReviews")
        .lean(),
      Ride.countDocuments({
        $or: [{ driverId: driverUserId }, { assignedDriverId: driverUserId }],
        status: RIDE_STATUS.COMPLETED,
      }),
    ]);

    driver = {
      id: driverUser._id || driverUser,
      name: driverUser.name,
      profileImage: driverUser.profileImage,
      phone: driverUser.phone,
      email: driverUser.email,
      rating: driverDoc?.averageRating || driverUser.averageRating || 0,
      averageRating: driverDoc?.averageRating || driverUser.averageRating || 0,
      totalRatings: driverDoc?.totalRatings || driverUser.totalRatings || 0,
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
      method: ride.payment?.method,
      status: ride.payment?.status,
      paidAt: ride.payment?.paidAt,
    },
    scheduledAt: ride.scheduledAt,
    acceptedAt: ride.acceptedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    cancelledAt: ride.cancellation?.cancelledAt,
    cancellation: ride.cancellation,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  };
};

export const RideServices = {
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
