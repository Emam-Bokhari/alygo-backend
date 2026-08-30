import ApiError from "../../../errors/ApiErrors";
import { Tracking } from "./tracking.model";
import { ITracking } from "./tracking.interface";
import { Ride } from "../ride/ride.model";
import { User } from "../user/user.model";
import { RIDE_STATUS, RIDE_TYPE } from "../ride/ride.constant";
import { rideDriverSocketHelper } from "../ride/socket/driver.socket";
import { rideUserSocketHelper } from "../ride/socket/user.socket";
import {
  validateLocationUpdate,
  shouldRefreshETA,
} from "../../../helpers/locationHelper";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { logger } from "../../../shared/logger";
import { GoogleRouteService } from "../../../services/googleRouteService";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import {
  buildDriverSummary,
  buildPassengerSummary,
} from "../ride/helpers/buildRideParticipantSummary";
import { getRideScheduleInfo } from "../../../shared/timezoneHelper";
import { CancellationPolicyService } from "../cancellationPolicy/cancellationPolicy.service";

const updatePromises = new Map<string, Promise<any>>();

const getHaversineDistanceKm = (
  coords1: [number, number],
  coords2: [number, number],
): number => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(3));
};

const getTargetDetails = (
  rideStatus: string,
  pickup: any,
  destination: any,
  stops: any[],
  currentStopOrder: number,
): {
  targetType: "pickup" | "stop" | "destination";
  targetLocation: [number, number];
  targetStopOrder: number | null;
} => {
  const preStartedStatuses = [
    "searching_driver",
    "driver_accepted",
    "waiting_user_approval",
    "driver_on_the_way",
    "driver_arrived",
  ];

  const statusLower = rideStatus.toLowerCase();

  if (preStartedStatuses.includes(statusLower)) {
    return {
      targetType: "pickup",
      targetLocation: pickup.location.coordinates,
      targetStopOrder: null,
    };
  }

  if (stops && stops.length > 0) {
    const sortedStops = [...stops].sort((a, b) => a.order - b.order);
    const nextStop = sortedStops.find(
      (stop) => !stop.isCompleted && stop.order > currentStopOrder,
    );

    if (nextStop) {
      return {
        targetType: "stop",
        targetLocation: nextStop.location.coordinates,
        targetStopOrder: nextStop.order,
      };
    }
  }

  return {
    targetType: "destination",
    targetLocation: destination.location.coordinates,
    targetStopOrder: null,
  };
};

const getTrackingByRideId = async (
  userId: string,
  rideId: string,
): Promise<ITracking> => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  // Ensure requester is passenger, driver, or admin
  const isPassenger = ride.userId.toString() === userId;
  const isDriver = ride.driverId?.toString() === userId;
  const adminUser = await User.findOne({
    _id: userId,
    role: { $in: ["admin", "superAdmin"] },
  });

  if (!isPassenger && !isDriver && !adminUser) {
    throw new ApiError(403, "You do not have permission to track this ride.");
  }

  const tracking = await Tracking.findOne({ rideId }).populate(
    "userId driverId",
  );
  if (!tracking) {
    throw new ApiError(404, "Tracking log not found for this ride yet.");
  }

  return tracking;
};

/**
 * Optimized driver location update with validation and ETA calculation
 */
const validateStateConsistency = (ride: any, tracking: any): boolean => {
  const currentStopOrder = tracking.currentStopOrder ?? -1;

  // 1. Check stops completed lockstep
  if (ride.stops && ride.stops.length > 0) {
    for (const stop of ride.stops) {
      const shouldBeCompleted = stop.order <= currentStopOrder;
      if (stop.isCompleted !== shouldBeCompleted) {
        logger.warn(
          `Consistency mismatch: stop order ${stop.order} isCompleted is ${stop.isCompleted} but expected ${shouldBeCompleted}`,
        );
        return false;
      }
    }
  }

  // 2. Check target type alignment
  if (ride.status === RIDE_STATUS.STARTED) {
    const nextStop = [...(ride.stops || [])]
      .sort((a, b) => a.order - b.order)
      .find((stop) => !stop.isCompleted);

    if (nextStop) {
      if (
        tracking.targetType !== "stop" ||
        tracking.targetStopOrder !== nextStop.order
      ) {
        logger.warn(
          `Consistency mismatch: expected target stop order ${nextStop.order} but got targetType ${tracking.targetType} targetStopOrder ${tracking.targetStopOrder}`,
        );
        return false;
      }
    } else {
      if (tracking.targetType !== "destination") {
        logger.warn(
          `Consistency mismatch: expected target destination but got targetType ${tracking.targetType}`,
        );
        return false;
      }
    }
  } else {
    if (tracking.targetType !== "pickup") {
      logger.warn(
        `Consistency mismatch: expected target pickup but got targetType ${tracking.targetType}`,
      );
      return false;
    }
  }

  // 3. Check active leg is current
  if (!tracking.activeLeg || !tracking.activeLeg.isCurrent) {
    logger.warn(
      `Consistency mismatch: activeLeg is missing or isCurrent is not true`,
    );
    return false;
  }

  // 4. Check routeLegs has exactly one current leg matching activeLeg
  const routeLegs = tracking.routeLegs || [];
  const currentLegs = routeLegs.filter((leg: any) => leg.isCurrent);
  if (currentLegs.length !== 1) {
    logger.warn(
      `Consistency mismatch: expected 1 current leg in routeLegs but found ${currentLegs.length}`,
    );
    return false;
  }

  const currentLeg = currentLegs[0];
  if (
    currentLeg.from !== tracking.activeLeg.from ||
    currentLeg.to !== tracking.activeLeg.to ||
    currentLeg.distanceKm !== tracking.remainingDistanceKm ||
    currentLeg.durationMinutes !== tracking.estimatedArrivalMinutes
  ) {
    logger.warn(
      `Consistency mismatch: activeLeg details do not match the current leg in routeLegs`,
    );
    return false;
  }

  return true;
};

/**
 * Optimized driver location update with validation and ETA calculation
 */
const updateDriverLocation = async (
  driverUserId: string,
  payload: {
    rideId: string;
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
    heading?: number;
    speed?: number;
  },
): Promise<{
  tracking: ITracking;
  routeLegs?: any;
  isValid: boolean;
  reason?: string;
}> => {
  const ride = await Ride.findById(payload.rideId);
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  // Verify this is the assigned driver
  if (ride.driverId?.toString() !== driverUserId) {
    const driverDoc = await Driver.findOne({ userId: driverUserId });
    if (
      !driverDoc ||
      ride.driverId?.toString() !== driverDoc.userId.toString()
    ) {
      throw new ApiError(403, "You are not the assigned driver for this ride.");
    }
  }

  let tracking = await Tracking.findOne({ rideId: payload.rideId });
  const [longitude, latitude] = payload.coordinates;

  // Validate location update
  const validation = await validateLocationUpdate({
    newLat: latitude,
    newLon: longitude,
    oldLat: tracking?.driverLocation?.coordinates[1],
    oldLon: tracking?.driverLocation?.coordinates[0],
    lastUpdateTime: tracking?.lastDriverLocationUpdateAt,
    rideStatus: ride.status,
  });

  if (!validation.isValid) {
    logger.info(
      `Location update validation failed for ride ${payload.rideId}: ${validation.reason}`,
    );
    if (tracking) {
      return {
        tracking,
        routeLegs: undefined,
        isValid: false,
        reason: validation.reason,
      };
    }
    const newTracking = await Tracking.create({
      rideId: payload.rideId,
      driverId: ride.driverId,
      userId: ride.userId,
      driverLocation: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      heading: payload.heading,
      speed: payload.speed,
      lastUpdatedAt: new Date(),
      lastDriverLocationUpdateAt: new Date(),
    });
    return {
      tracking: newTracking,
      routeLegs: undefined,
      isValid: false,
      reason: validation.reason,
    };
  }

  if (!tracking) {
    tracking = new Tracking({
      rideId: payload.rideId,
      driverId: ride.driverId,
      userId: ride.userId,
      currentStopOrder: -1,
    });
  }

  // 1. Determine target details
  const expectedTarget = getTargetDetails(
    ride.status,
    ride.pickup,
    ride.destination,
    ride.stops || [],
    tracking.currentStopOrder ?? -1,
  );

  // 2. Check if target changed
  const targetChanged =
    !tracking.targetType ||
    tracking.targetType !== expectedTarget.targetType ||
    tracking.targetStopOrder !== expectedTarget.targetStopOrder ||
    !tracking.targetLocation ||
    !tracking.targetLocation.coordinates ||
    tracking.targetLocation.coordinates[0] !==
      expectedTarget.targetLocation[0] ||
    tracking.targetLocation.coordinates[1] !== expectedTarget.targetLocation[1];

  // 3. Check distance to target using haversine
  const distanceToTargetKm = getHaversineDistanceKm(
    [longitude, latitude],
    expectedTarget.targetLocation,
  );

  // Update tracking location coordinates, heading, speed & timestamps
  tracking.driverLocation = {
    type: "Point",
    coordinates: [longitude, latitude],
  };
  if (payload.heading !== undefined) {
    tracking.heading = payload.heading;
  }
  if (payload.speed !== undefined) {
    tracking.speed = payload.speed;
  }
  tracking.lastUpdatedAt = new Date();
  tracking.lastDriverLocationUpdateAt = new Date();

  // Also update driver's location in Driver collection
  await Driver.findOneAndUpdate(
    { userId: driverUserId },
    {
      $set: {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
          address: payload.address || "",
        },
      },
    },
    { new: true },
  );

  // Save the database states first
  await ride.save();
  await tracking.save();

  // Fetch driver summary and emit immediate GPS update
  const driverDoc = await Driver.findOne({ userId: driverUserId }).populate(
    "userId",
    "name profileImage",
  );
  const car = await Car.findOne({ driverId: driverDoc?._id });
  const driverSummary = await buildDriverSummary(driverDoc, car);
  const driverUser = driverDoc?.userId as any;

  const immediateEventPayload = {
    rideId: ride._id,
    driverId: ride.driverId,
    driverName: driverUser?.name || "",
    driverProfileImage: driverUser?.profileImage,
    driverLocation: {
      latitude,
      longitude,
    },
    heading: tracking.heading || 0,
    speed: tracking.speed || 0,
    remainingDistanceKm: tracking.remainingDistanceKm || 0,
    estimatedArrivalMinutes: tracking.estimatedArrivalMinutes || 0,
    routeLegs: tracking.routeLegs || [],
    totalDistanceKm: tracking.totalDistanceKm || 0,
    totalDurationMinutes: tracking.totalDurationMinutes || 0,
    polyline: tracking.polyline || "",
    status: ride.status,
    timestamp: new Date(),
    updatedAt: new Date(),
  };

  // Emit GPS update immediately
  if (ride.userId) {
    rideUserSocketHelper.emitDriverLocationUpdated(
      ride.userId.toString(),
      immediateEventPayload,
    );
  }
  if (ride.driverId) {
    rideDriverSocketHelper.emitDriverLocationUpdated(
      ride.driverId.toString(),
      immediateEventPayload,
    );
  }

  // Check if route recalculation / ETA update is required
  const systemConfig = await getSystemConfig();
  const arrivalRadiusKm =
    (systemConfig.tracking.arrivalRadiusMeters || 30) / 1000;

  const activeStatuses = [
    RIDE_STATUS.DRIVER_ACCEPTED,
    RIDE_STATUS.DRIVER_ON_THE_WAY,
    RIDE_STATUS.DRIVER_ARRIVED,
    RIDE_STATUS.STARTED,
  ];

  const isETARefreshNeeded = await shouldRefreshETA(tracking.etaCalculatedAt);
  const isCloseToArrival = distanceToTargetKm <= arrivalRadiusKm * 1.5;
  const isPolylineMissing = !tracking.polyline;

  const needsRouteRecalculation =
    targetChanged ||
    isETARefreshNeeded ||
    isCloseToArrival ||
    isPolylineMissing;

  let resolvedState: any = null;
  let transitions: any[] = [];

  if (
    activeStatuses.includes(ride.status as RIDE_STATUS) &&
    needsRouteRecalculation
  ) {
    try {
      // Resolve tracking state using resolveCurrentTrackingState()
      const resolution = await GoogleRouteService.resolveCurrentTrackingState({
        driverLocation: { lat: latitude, lng: longitude },
        ride,
        tracking,
        arrivalRadiusKm,
      });

      resolvedState = resolution.trackingState;
      transitions = resolution.transitions;

      // Map resolved state fields onto tracking document
      tracking.remainingDistanceKm = resolvedState.remainingDistanceKm;
      tracking.estimatedArrivalMinutes = resolvedState.estimatedArrivalMinutes;
      tracking.etaCalculatedAt = new Date();
      tracking.targetIsPickup = resolvedState.targetIsPickup;
      tracking.targetIsDestination = resolvedState.targetIsDestination;

      tracking.targetType = resolvedState.targetType;
      tracking.targetLocation = {
        type: "Point",
        coordinates: resolvedState.targetLocation,
      };
      tracking.targetStopOrder = resolvedState.targetStopOrder;
      tracking.activeLeg = resolvedState.activeLeg;
      tracking.totalDistanceKm = resolvedState.totalDistanceKm;
      tracking.totalDurationMinutes = resolvedState.totalDurationMinutes;
      tracking.routeLegs = resolvedState.routeLegs;
      tracking.polyline = resolvedState.polyline;

      await ride.save();
      await tracking.save();

      // Re-resolve tracking state after any transition
      if (transitions.length > 0) {
        const transResolution =
          await GoogleRouteService.resolveCurrentTrackingState({
            driverLocation: { lat: latitude, lng: longitude },
            ride,
            tracking,
            arrivalRadiusKm,
          });

        resolvedState = transResolution.trackingState;

        tracking.remainingDistanceKm = resolvedState.remainingDistanceKm;
        tracking.estimatedArrivalMinutes =
          resolvedState.estimatedArrivalMinutes;
        tracking.etaCalculatedAt = new Date();
        tracking.targetIsPickup = resolvedState.targetIsPickup;
        tracking.targetIsDestination = resolvedState.targetIsDestination;

        tracking.targetType = resolvedState.targetType;
        tracking.targetLocation = {
          type: "Point",
          coordinates: resolvedState.targetLocation,
        };
        tracking.targetStopOrder = resolvedState.targetStopOrder;
        tracking.activeLeg = resolvedState.activeLeg;
        tracking.totalDistanceKm = resolvedState.totalDistanceKm;
        tracking.totalDurationMinutes = resolvedState.totalDurationMinutes;
        tracking.routeLegs = resolvedState.routeLegs;
        tracking.polyline = resolvedState.polyline;

        await ride.save();
        await tracking.save();
      }

      // State Consistency Validation prior to emitting
      if (!validateStateConsistency(ride, tracking)) {
        logger.warn(
          `[TrackingService] State inconsistency detected before socket emit. Rebuilding...`,
        );
        const rebuildResolution =
          await GoogleRouteService.resolveCurrentTrackingState({
            driverLocation: { lat: latitude, lng: longitude },
            ride,
            tracking,
            arrivalRadiusKm,
          });

        resolvedState = rebuildResolution.trackingState;

        tracking.remainingDistanceKm = resolvedState.remainingDistanceKm;
        tracking.estimatedArrivalMinutes =
          resolvedState.estimatedArrivalMinutes;
        tracking.etaCalculatedAt = new Date();
        tracking.targetIsPickup = resolvedState.targetIsPickup;
        tracking.targetIsDestination = resolvedState.targetIsDestination;

        tracking.targetType = resolvedState.targetType;
        tracking.targetLocation = {
          type: "Point",
          coordinates: resolvedState.targetLocation,
        };
        tracking.targetStopOrder = resolvedState.targetStopOrder;
        tracking.activeLeg = resolvedState.activeLeg;
        tracking.totalDistanceKm = resolvedState.totalDistanceKm;
        tracking.totalDurationMinutes = resolvedState.totalDurationMinutes;
        tracking.routeLegs = resolvedState.routeLegs;
        tracking.polyline = resolvedState.polyline;

        await ride.save();
        await tracking.save();
      }

      // Emit transitions
      const userDoc = await User.findById(ride.userId).select(
        "name profileImage averageRating totalRatings",
      );
      const passengerSummary = userDoc
        ? buildPassengerSummary(userDoc)
        : undefined;
      const cancellationFeePreview =
        await CancellationPolicyService.calculateCancellationFeeForRide(ride);

      for (const transition of transitions) {
        if (transition.type === "driver-on-the-way") {
          const baseEventData = {
            rideId: ride._id,
            ...getRideScheduleInfo(ride),
            pickupLocation: ride.pickup,
            rideCategory: ride.rideCategory,
            price: ride.fare.total,
            cancellationFeePreview,
            estimatedArrivalMinutes: transition.payload.estimatedArrivalMinutes,
            remainingDistanceKm: transition.payload.remainingDistanceKm,
            polyline: tracking.polyline || "",
            driverLocation: tracking.driverLocation?.coordinates
              ? {
                  latitude: tracking.driverLocation.coordinates[1],
                  longitude: tracking.driverLocation.coordinates[0],
                }
              : undefined,
            status: ride.status,
            timestamp: new Date(),
          };
          rideUserSocketHelper.emitDriverOnTheWay(ride.userId.toString(), {
            ...baseEventData,
            driver: driverSummary,
          });
          rideDriverSocketHelper.emitDriverOnTheWay(driverUserId, {
            ...baseEventData,
            user: passengerSummary,
          });
          logger.info(
            `[TrackingService] Emitted driver-on-the-way for ride ${ride._id}`,
          );
        } else if (transition.type === "driver-arrived") {
          const baseEventData = {
            rideId: ride._id,
            ...getRideScheduleInfo(ride),
            automaticDetection: true,
            pickupLocation: ride.pickup,
            rideCategory: ride.rideCategory,
            price: ride.fare.total,
            cancellationFeePreview,
            estimatedArrivalMinutes: 0,
            remainingDistanceKm: 0,
            polyline: tracking.polyline || "",
            driverLocation: tracking.driverLocation?.coordinates
              ? {
                  latitude: tracking.driverLocation.coordinates[1],
                  longitude: tracking.driverLocation.coordinates[0],
                }
              : undefined,
            status: ride.status,
            timestamp: new Date(),
          };
          rideUserSocketHelper.emitDriverArrived(ride.userId.toString(), {
            ...baseEventData,
            driver: driverSummary,
          });
          rideDriverSocketHelper.emitDriverArrived(driverUserId, {
            ...baseEventData,
            user: passengerSummary,
          });
          logger.info(
            `[TrackingService] Emitted driver-arrived for ride ${ride._id}`,
          );
        } else if (transition.type === "stop-arrived") {
          rideUserSocketHelper.emitStopArrived(ride.userId.toString(), {
            rideId: ride._id,
            ...getRideScheduleInfo(ride),
            stopOrder: transition.payload.stopOrder,
            stopAddress: transition.payload.stopAddress,
            automaticDetection: true,
            driver: driverSummary,
            polyline: tracking.polyline || "",
            driverLocation: tracking.driverLocation?.coordinates
              ? {
                  latitude: tracking.driverLocation.coordinates[1],
                  longitude: tracking.driverLocation.coordinates[0],
                }
              : undefined,
            status: ride.status,
            timestamp: new Date(),
          });
          logger.info(
            `[TrackingService] Emitted stop-arrived for ride ${ride._id}, stop order ${transition.payload.stopOrder}`,
          );
        }
      }

      // Emit updated polyline/ETA
      const updatedEventPayload = {
        rideId: ride._id,
        driverId: ride.driverId,
        driverName: driverUser?.name || "",
        driverProfileImage: driverUser?.profileImage,
        driverLocation: {
          latitude,
          longitude,
        },
        heading: tracking.heading || 0,
        speed: tracking.speed || 0,
        remainingDistanceKm: tracking.remainingDistanceKm || 0,
        estimatedArrivalMinutes: tracking.estimatedArrivalMinutes || 0,
        routeLegs: tracking.routeLegs || [],
        totalDistanceKm: tracking.totalDistanceKm || 0,
        totalDurationMinutes: tracking.totalDurationMinutes || 0,
        polyline: tracking.polyline || "",
        status: ride.status,
        timestamp: new Date(),
        updatedAt: new Date(),
      };

      if (ride.userId) {
        rideUserSocketHelper.emitDriverLocationUpdated(
          ride.userId.toString(),
          updatedEventPayload,
        );
      }
      if (ride.driverId) {
        rideDriverSocketHelper.emitDriverLocationUpdated(
          ride.driverId.toString(),
          updatedEventPayload,
        );
      }
    } catch (err: any) {
      logger.error(
        `[TrackingService] Error calling Tracking State Resolver: ${err.message}`,
      );
      throw err;
    }
  }

  logger.info(
    `[TrackingService] DB successfully synchronized for ride ${ride._id}`,
  );

  return { tracking, routeLegs: resolvedState, isValid: true };
};

/**
 * Handle real-time driver location updates coming from the WebSocket connection.
 * Maps concurrently arriving updates onto a sequential execution queue per rideId.
 */
const processDriverLocationUpdate = async (
  driverUserId: string,
  payload: {
    coordinates: [number, number];
    address?: string;
    heading?: number;
    speed?: number;
  },
): Promise<void> => {
  const [longitude, latitude] = payload.coordinates;

  const driverDoc = await Driver.findOne({ userId: driverUserId });
  if (!driverDoc) {
    logger.warn(`[TrackingService] Driver not found for user: ${driverUserId}`);
    return;
  }

  // Check if driver has an active on-trip ride
  const now = new Date();
  const systemConfig = await getSystemConfig();
  const reservationWindowMinutes =
    systemConfig.reservation?.driverVisibleBeforeMinutes || 30;
  const imminentWindowEnd = new Date(
    now.getTime() + reservationWindowMinutes * 60 * 1000,
  );

  const activeRide = await Ride.findOne({
    driverId: driverDoc.userId,
    $or: [
      {
        rideType: { $ne: RIDE_TYPE.SCHEDULED },
        status: {
          $in: [
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
      {
        rideType: RIDE_TYPE.SCHEDULED,
        status: RIDE_STATUS.DRIVER_ACCEPTED,
        scheduledAt: { $lte: imminentWindowEnd },
      },
    ],
  });

  if (!activeRide) {
    // If no active ride, just update driver location in the Driver collection
    await Driver.findOneAndUpdate(
      { userId: driverUserId },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
            address: payload.address || "",
          },
        },
      },
      { new: true },
    );
    logger.info(
      `[TrackingService] Driver ${driverUserId} location updated in DB (no active ride)`,
    );

    // Find if the driver is a notified driver for any ride currently searching for a driver
    try {
      const searchingRides = await Ride.find({
        status: RIDE_STATUS.SEARCHING_DRIVER,
        "driverMatching.notifiedDrivers": {
          $elemMatch: {
            driverId: driverDoc.userId,
            status: "sent",
          },
        },
      });

      if (searchingRides.length > 0) {
        for (const ride of searchingRides) {
          rideUserSocketHelper.emitNearbyDriverLocationUpdated(
            ride.userId.toString(),
            {
              rideId: ride._id.toString(),
              driverId: driverDoc.userId.toString(),
              coordinates: [longitude, latitude],
              updatedAt: new Date(),
            },
          );
        }
      }
    } catch (err) {
      logger.error(
        `[TrackingService] Error emitting nearby driver location update: ${err}`,
      );
    }

    return;
  }

  const rideId = activeRide._id.toString();
  const currentPromise = updatePromises.get(rideId) || Promise.resolve();

  // Chain updates sequentially to avoid concurrent execution overlapping on the same rideId
  const nextPromise = currentPromise
    .then(async () => {
      await updateDriverLocation(driverUserId, {
        rideId,
        coordinates: payload.coordinates,
        address: payload.address,
        heading: payload.heading,
        speed: payload.speed,
      });
    })
    .catch((err) => {
      logger.error(
        `[TrackingService] Error in serialized tracking update for ride ${rideId}: ${err.message}`,
        err,
      );
    });

  updatePromises.set(rideId, nextPromise);

  nextPromise.finally(() => {
    if (updatePromises.get(rideId) === nextPromise) {
      updatePromises.delete(rideId);
    }
  });

  await nextPromise;
};

/**
 * Check and handle automatic driver arrival detection (deprecated: now atomic inside updateDriverLocation)
 */
const checkDriverArrival = async (
  rideId: string,
): Promise<{ arrived: boolean; tracking?: ITracking }> => {
  const tracking = await Tracking.findOne({ rideId });
  return { arrived: false, tracking: tracking || undefined };
};

/**
 * Check and handle automatic DRIVER_ON_THE_WAY status transition (deprecated: now atomic inside updateDriverLocation)
 */
const checkDriverOnTheWay = async (
  rideId: string,
): Promise<{ onTheWay: boolean; tracking?: ITracking }> => {
  const tracking = await Tracking.findOne({ rideId });
  return { onTheWay: false, tracking: tracking || undefined };
};

/**
 * Check and handle automatic stop arrival detection (deprecated: now atomic inside updateDriverLocation)
 */
const checkStopArrival = async (
  rideId: string,
): Promise<{
  stopArrived: boolean;
  stopOrder?: number;
  tracking?: ITracking;
}> => {
  const tracking = await Tracking.findOne({ rideId });
  return { stopArrived: false, tracking: tracking || undefined };
};

const createOrUpdateTracking = async (
  userId: string,
  payload: {
    rideId: string;
    driverLocation?: { coordinates: [number, number] };
    userLocation?: { coordinates: [number, number] };
  },
): Promise<ITracking> => {
  const ride = await Ride.findById(payload.rideId);
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  const isPassenger = ride.userId.toString() === userId;
  const isDriver = ride.driverId?.toString() === userId;

  if (!isPassenger && !isDriver) {
    throw new ApiError(
      403,
      "You do not have permission to update tracking for this ride.",
    );
  }

  const updateObj: any = {
    rideId: payload.rideId,
    driverId: ride.driverId,
    userId: ride.userId,
    lastUpdatedAt: new Date(),
  };

  if (payload.driverLocation) {
    updateObj.driverLocation = {
      type: "Point",
      coordinates: payload.driverLocation.coordinates,
    };
  }

  if (payload.userLocation) {
    updateObj.userLocation = {
      type: "Point",
      coordinates: payload.userLocation.coordinates,
    };
  }

  const tracking = await Tracking.findOneAndUpdate(
    { rideId: payload.rideId },
    { $set: updateObj },
    { upsert: true, new: true },
  );

  if (payload.driverLocation && ride.userId) {
    rideUserSocketHelper.emitDriverLocationUpdated(ride.userId.toString(), {
      rideId: ride._id,
      driverId: ride.driverId,
      coordinates: payload.driverLocation.coordinates,
      driverLocation: {
        latitude: payload.driverLocation.coordinates[1],
        longitude: payload.driverLocation.coordinates[0],
      },
      polyline: tracking.polyline,
      updatedAt: new Date(),
    });
  }

  if (payload.driverLocation && ride.driverId) {
    rideDriverSocketHelper.emitDriverLocationUpdated(ride.driverId.toString(), {
      rideId: ride._id,
      driverId: ride.driverId,
      coordinates: payload.driverLocation.coordinates,
      driverLocation: {
        latitude: payload.driverLocation.coordinates[1],
        longitude: payload.driverLocation.coordinates[0],
      },
      polyline: tracking.polyline,
      updatedAt: new Date(),
    });
  }

  if (payload.userLocation && ride.driverId) {
    rideDriverSocketHelper.emitUserLocationUpdated(ride.driverId.toString(), {
      rideId: ride._id,
      userId: ride.userId,
      coordinates: payload.userLocation.coordinates,
      updatedAt: new Date(),
    });
  }

  return tracking;
};

export const TrackingServices = {
  getTrackingByRideId,
  createOrUpdateTracking,
  updateDriverLocation,
  processDriverLocationUpdate,
  checkDriverArrival,
  checkDriverOnTheWay,
  checkStopArrival,
};
