import axios from "axios";
import config from "../config";
import { logger } from "../shared/logger";
import { getContext } from "../shared/requestContext";
import { RIDE_STATUS } from "../app/modules/ride/ride.constant";

export interface ICoordinate {
  lat: number;
  lng: number;
}

export interface IRouteResult {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  polyline: string;
  googleRouteId?: string;
}

export interface ILeg {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
  isCurrent: boolean;
}

export interface IRouteLegsResult {
  legs: ILeg[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  polyline: string;
}

class GoogleRouteServiceClass {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = config.googleMapsApiKey;
  }

  private formatLocation(loc: string | ICoordinate): string {
    if (typeof loc === "string") return loc;
    return `${loc.lat},${loc.lng}`;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const ctx = getContext();
    if (ctx && ctx.googleRouteCache) {
      if (ctx.googleRouteCache.has(key)) {
        logger.info(`[GoogleRouteService] Cache hit for key: ${key}`);
        return ctx.googleRouteCache.get(key);
      }
      const promise = fn();
      ctx.googleRouteCache.set(key, promise);
      return promise;
    }
    return fn();
  }

  private async fetchRawRoute(
    origin: string | ICoordinate,
    destination: string | ICoordinate,
    stops: (string | ICoordinate)[] = [],
    bypassCache?: boolean,
  ): Promise<any> {
    const originStr = this.formatLocation(origin);
    const destStr = this.formatLocation(destination);
    const stopsStr = stops.map((s) => this.formatLocation(s)).join("|");
    const cacheKey = `rawRoute:${originStr}:${destStr}:${stopsStr}`;

    const fetchFn = async () => {
      if (!this.apiKey) {
        throw new Error(
          "Google Maps API Key is missing. Cannot calculate route.",
        );
      }

      const originStrEncoded = encodeURIComponent(originStr);
      const destStrEncoded = encodeURIComponent(destStr);
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStrEncoded}&destination=${destStrEncoded}&key=${this.apiKey}`;

      if (stops.length > 0) {
        url += `&waypoints=${encodeURIComponent(stopsStr)}`;
      }

      logger.info(
        `[GoogleRouteService] Fetching Directions API: Origin: ${originStr}, Dest: ${destStr}, Stops count: ${stops.length}${bypassCache ? " (Bypassing Cache)" : ""}`,
      );

      const response = await axios.get(url);
      const data = response.data;

      if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
        const errorMsg =
          data.error_message || `Directions API status: ${data.status}`;
        logger.error(`[GoogleRouteService] Directions API error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      return data;
    };

    if (bypassCache) {
      return fetchFn();
    }

    return this.withCache(cacheKey, fetchFn);
  }

  /**
   * Calculate route details (distance, duration, polyline) between origin and destination,
   * passing through any intermediate stops.
   */
  async calculateRoute(
    origin: string | ICoordinate,
    destination: string | ICoordinate,
    stops: (string | ICoordinate)[] = [],
  ): Promise<IRouteResult> {
    const data = await this.fetchRawRoute(origin, destination, stops);
    const route = data.routes[0];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    for (const leg of route.legs) {
      totalDistanceMeters += leg.distance.value;
      totalDurationSeconds += leg.duration.value;
    }

    return {
      totalDistanceKm: parseFloat((totalDistanceMeters / 1000).toFixed(2)),
      totalDurationMinutes: Math.round(totalDurationSeconds / 60) || 1,
      polyline: route.overview_polyline ? route.overview_polyline.points : "",
      googleRouteId: route.waypoint_order
        ? route.waypoint_order.join(",")
        : undefined,
    };
  }

  /**
   * Calculate route legs for live driver tracking in a single Directions API call.
   */
  private getHaversineDistanceKm(
    coords1: [number, number],
    coords2: [number, number],
  ): number {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    const R = 6371; // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return parseFloat(d.toFixed(2));
  }

  /**
   * Calculate route legs for live driver tracking in a single Directions API call.
   */
  async calculateRouteLegs(
    driverLocation: ICoordinate,
    pickup: ICoordinate,
    destination: ICoordinate,
    stops: Array<{
      order: number;
      location: { coordinates: [number, number] };
      isCompleted?: boolean;
    }> = [],
    currentStopOrder?: number,
    rideStatus?: string,
    bypassCache?: boolean,
  ): Promise<IRouteLegsResult> {
    const isRideStarted =
      rideStatus?.toLowerCase() === "started" ||
      (currentStopOrder !== undefined && currentStopOrder >= 0);

    const sortedStops = [...stops].sort((a, b) => a.order - b.order);

    if (!isRideStarted) {
      const waypoints: ICoordinate[] = [pickup];
      for (const stop of sortedStops) {
        waypoints.push({
          lat: stop.location.coordinates[1],
          lng: stop.location.coordinates[0],
        });
      }

      const data = await this.fetchRawRoute(
        driverLocation,
        destination,
        waypoints,
        bypassCache,
      );
      const route = data.routes[0];

      const legs: ILeg[] = [];
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;

      for (let i = 0; i < route.legs.length; i++) {
        const googleLeg = route.legs[i];
        totalDistanceMeters += googleLeg.distance.value;
        totalDurationSeconds += googleLeg.duration.value;

        let fromName = "";
        let toName = "";

        if (i === 0) {
          fromName = "driver";
          toName = "pickup";
        } else {
          const prevStopIndex = i - 2;
          const currentStopIndex = i - 1;
          fromName =
            prevStopIndex < 0
              ? "pickup"
              : `stop_${sortedStops[prevStopIndex].order}`;
          toName =
            currentStopIndex < sortedStops.length
              ? `stop_${sortedStops[currentStopIndex].order}`
              : "destination";
        }

        legs.push({
          from: fromName,
          to: toName,
          distanceKm: parseFloat((googleLeg.distance.value / 1000).toFixed(2)),
          durationMinutes: Math.round(googleLeg.duration.value / 60) || 1,
          isCurrent: i === 0,
        });
      }

      return {
        legs,
        totalDistanceKm: parseFloat((totalDistanceMeters / 1000).toFixed(2)),
        totalDurationMinutes: Math.round(totalDurationSeconds / 60) || 1,
        polyline: route.overview_polyline ? route.overview_polyline.points : "",
      };
    } else {
      // Filter active/incomplete stops
      const activeStops = sortedStops.filter(
        (stop) =>
          !stop.isCompleted &&
          (currentStopOrder === undefined || stop.order > currentStopOrder),
      );

      const activeWaypoints: ICoordinate[] = [];
      for (const stop of activeStops) {
        activeWaypoints.push({
          lat: stop.location.coordinates[1],
          lng: stop.location.coordinates[0],
        });
      }

      const data = await this.fetchRawRoute(
        driverLocation,
        destination,
        activeWaypoints,
        bypassCache,
      );
      const route = data.routes[0];

      const fullLegsDefs: Array<{
        fromName: string;
        toName: string;
        fromCoords: [number, number];
        toCoords: [number, number];
        isDriverToPickup: boolean;
        targetStopOrder?: number;
        targetIsDestination: boolean;
      }> = [];

      // driver -> pickup (completed)
      fullLegsDefs.push({
        fromName: "driver",
        toName: "pickup",
        fromCoords: [pickup.lng, pickup.lat],
        toCoords: [pickup.lng, pickup.lat],
        isDriverToPickup: true,
        targetIsDestination: false,
      });

      let prevName = "pickup";
      let prevCoords: [number, number] = [pickup.lng, pickup.lat];

      for (const stop of sortedStops) {
        fullLegsDefs.push({
          fromName: prevName,
          toName: `stop_${stop.order}`,
          fromCoords: prevCoords,
          toCoords: stop.location.coordinates,
          isDriverToPickup: false,
          targetStopOrder: stop.order,
          targetIsDestination: false,
        });
        prevName = `stop_${stop.order}`;
        prevCoords = stop.location.coordinates;
      }

      fullLegsDefs.push({
        fromName: prevName,
        toName: "destination",
        fromCoords: prevCoords,
        toCoords: [destination.lng, destination.lat],
        isDriverToPickup: false,
        targetIsDestination: true,
      });

      const activeStopOrder =
        currentStopOrder !== undefined ? currentStopOrder : -1;
      let activeLegIndex = -1;

      for (let idx = 0; idx < fullLegsDefs.length; idx++) {
        const def = fullLegsDefs[idx];
        if (def.isDriverToPickup) {
          continue;
        }
        if (def.targetStopOrder !== undefined) {
          if (def.targetStopOrder > activeStopOrder) {
            activeLegIndex = idx;
            break;
          }
        } else if (def.targetIsDestination) {
          activeLegIndex = idx;
          break;
        }
      }

      const legs: ILeg[] = [];
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;

      for (let idx = 0; idx < fullLegsDefs.length; idx++) {
        const def = fullLegsDefs[idx];
        let distanceKm = 0;
        let durationMinutes = 0;
        let isCurrent = false;

        if (idx < activeLegIndex) {
          // Completed/past leg
          distanceKm = this.getHaversineDistanceKm(
            def.fromCoords,
            def.toCoords,
          );
          durationMinutes = Math.round((distanceKm / 30) * 60) || 1;
        } else if (idx === activeLegIndex) {
          // Active leg (Google maps Leg 0: driver -> activeStops[0])
          isCurrent = true;
          const googleLeg = route.legs[0];
          distanceKm = parseFloat((googleLeg.distance.value / 1000).toFixed(2));
          durationMinutes = Math.round(googleLeg.duration.value / 60) || 1;
          totalDistanceMeters += googleLeg.distance.value;
          totalDurationSeconds += googleLeg.duration.value;
        } else {
          // Future leg
          const googleLegIndex = idx - activeLegIndex;
          if (googleLegIndex < route.legs.length) {
            const googleLeg = route.legs[googleLegIndex];
            distanceKm = parseFloat(
              (googleLeg.distance.value / 1000).toFixed(2),
            );
            durationMinutes = Math.round(googleLeg.duration.value / 60) || 1;
            totalDistanceMeters += googleLeg.distance.value;
            totalDurationSeconds += googleLeg.duration.value;
          } else {
            distanceKm = this.getHaversineDistanceKm(
              def.fromCoords,
              def.toCoords,
            );
            durationMinutes = Math.round((distanceKm / 30) * 60) || 1;
          }
        }

        legs.push({
          from: def.fromName,
          to: def.toName,
          distanceKm,
          durationMinutes,
          isCurrent,
        });
      }

      return {
        legs,
        totalDistanceKm: parseFloat((totalDistanceMeters / 1000).toFixed(2)),
        totalDurationMinutes: Math.round(totalDurationSeconds / 60) || 1,
        polyline: route.overview_polyline ? route.overview_polyline.points : "",
      };
    }
  }

  /**
   * Get distance matrix (durations/distances) between list of origins and destinations.
   * Handles chunking automatically for origins length > 25.
   */
  async calculateDistanceMatrix(
    origins: (string | ICoordinate)[],
    destinations: (string | ICoordinate)[],
  ): Promise<
    {
      distanceKm: number;
      durationMinutes: number;
      status: string;
    }[][]
  > {
    if (origins.length === 0 || destinations.length === 0) {
      return [];
    }

    const originsStrList = origins.map((o) => this.formatLocation(o));
    const destinationsStrList = destinations.map((d) => this.formatLocation(d));

    const cacheKey = `matrix:${originsStrList.join("|")}:${destinationsStrList.join("|")}`;

    return this.withCache(cacheKey, async () => {
      if (!this.apiKey) {
        throw new Error(
          "Google Maps API Key is missing. Cannot calculate distance matrix.",
        );
      }

      const originChunks: string[][] = [];
      const chunkSize = 25;
      for (let i = 0; i < originsStrList.length; i += chunkSize) {
        originChunks.push(originsStrList.slice(i, i + chunkSize));
      }

      const allRows: any[] = [];

      for (const chunk of originChunks) {
        const originsParam = chunk.join("|");
        const destinationsParam = destinationsStrList.join("|");
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
          originsParam,
        )}&destinations=${encodeURIComponent(
          destinationsParam,
        )}&key=${this.apiKey}`;

        logger.info(
          `[GoogleRouteService] Fetching Distance Matrix API: Origins count: ${chunk.length}, Destinations count: ${destinationsStrList.length}`,
        );

        const response = await axios.get(url);
        const data = response.data;

        if (data.status !== "OK") {
          const errorMsg =
            data.error_message || `Distance Matrix API status: ${data.status}`;
          logger.error(
            `[GoogleRouteService] Distance Matrix API error: ${errorMsg}`,
          );
          throw new Error(errorMsg);
        }

        allRows.push(...data.rows);
      }

      return allRows.map((row: any) =>
        row.elements.map((elem: any) => {
          if (elem.status !== "OK") {
            return {
              distanceKm: 9999,
              durationMinutes: 9999,
              status: elem.status,
            };
          }
          return {
            distanceKm: parseFloat((elem.distance.value / 1000).toFixed(2)),
            durationMinutes: Math.round(elem.duration.value / 60) || 1,
            status: "OK",
          };
        }),
      );
    });
  }

  async geocode(address: string): Promise<ICoordinate> {
    if (!this.apiKey) {
      throw new Error("Google Maps API Key is missing. Cannot geocode.");
    }
    const cacheKey = `geocode:${address}`;
    return this.withCache(cacheKey, async () => {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address,
      )}&key=${this.apiKey}`;
      const response = await axios.get(url);
      const data = response.data;

      if (data.status !== "OK" || !data.results || data.results.length === 0) {
        throw new Error(
          data.error_message || `Geocoding API status: ${data.status}`,
        );
      }

      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    });
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<{
    address: string;
    city: string;
    state: string;
    country: string;
  }> {
    if (!this.apiKey) {
      throw new Error(
        "Google Maps API Key is missing. Cannot reverse geocode.",
      );
    }
    const cacheKey = `reverseGeocode:${lat},${lng}`;
    return this.withCache(cacheKey, async () => {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      const response = await axios.get(url);
      const data = response.data;

      if (data.status !== "OK" || !data.results || data.results.length === 0) {
        throw new Error(
          data.error_message || `Reverse Geocoding API status: ${data.status}`,
        );
      }

      const result = data.results[0];
      const address = result.formatted_address;
      let city = "";
      let state = "";
      let country = "";

      for (const component of result.address_components) {
        const types = component.types;
        if (types.includes("locality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = component.long_name;
        } else if (types.includes("country")) {
          country = component.long_name;
        }
      }

      return { address, city, state, country };
    });
  }

  async getRoadDistance(
    origin: ICoordinate,
    destination: ICoordinate,
  ): Promise<number> {
    const matrix = await this.calculateDistanceMatrix([origin], [destination]);
    if (matrix[0] && matrix[0][0] && matrix[0][0].status === "OK") {
      return matrix[0][0].distanceKm;
    }
    throw new Error(`Could not calculate road distance between coordinates.`);
  }

  /**
   * Single production-grade method responsible for resolving live tracking state,
   * calculating route legs, validating active legs, and detecting state transitions.
   */
  async resolveCurrentTrackingState(params: {
    driverLocation: ICoordinate;
    ride: any;
    tracking: any;
    arrivalRadiusKm: number;
  }): Promise<{
    trackingState: {
      rideStatus: string;
      targetType: "pickup" | "stop" | "destination";
      targetLocation: [number, number];
      targetStopOrder?: number | null;
      activeStop?: any;
      targetIsPickup: boolean;
      targetIsDestination: boolean;
      activeLeg: ILeg | null;
      remainingDistanceKm: number;
      estimatedArrivalMinutes: number;
      totalDistanceKm: number;
      totalDurationMinutes: number;
      routeLegs: ILeg[];
      polyline: string;
    };
    transitions: Array<{
      type: "driver-on-the-way" | "driver-arrived" | "stop-arrived";
      payload: any;
    }>;
  }> {
    const { driverLocation, ride, tracking, arrivalRadiusKm } = params;
    const transitions: Array<{
      type: "driver-on-the-way" | "driver-arrived" | "stop-arrived";
      payload: any;
    }> = [];

    let currentStopOrder = tracking.currentStopOrder ?? -1;
    let rideStatus = ride.status;

    const pickupCoord = {
      lat: ride.pickup.location.coordinates[1],
      lng: ride.pickup.location.coordinates[0],
    };
    const destCoord = {
      lat: ride.destination.location.coordinates[1],
      lng: ride.destination.location.coordinates[0],
    };

    let maxIterations = 3;
    let iteration = 0;
    let currentTargetDetails = getTargetDetails(
      rideStatus,
      ride.pickup,
      ride.destination,
      ride.stops,
      currentStopOrder,
    );
    let routeLegsResult: IRouteLegsResult | null = null;
    let remainingDistanceKm = 0;
    let estimatedArrivalMinutes = 0;
    let activeLeg: ILeg | null = null;

    while (iteration < maxIterations) {
      iteration++;

      // Calculate route legs using Google Routes API
      routeLegsResult = await this.calculateRouteLegs(
        driverLocation,
        pickupCoord,
        destCoord,
        ride.stops,
        currentStopOrder,
        rideStatus,
        true, // bypassCache
      );

      const routeLegs = routeLegsResult.legs;
      const activeLegs = routeLegs.filter((leg) => leg.isCurrent);

      // Route Legs Validation
      if (activeLegs.length > 1) {
        throw new Error(
          `Inconsistent tracking state: Multiple active legs detected (${activeLegs.length})`,
        );
      }

      let transitionDetected = false;

      if (activeLegs.length === 0) {
        if (iteration < maxIterations) {
          transitionDetected = true;
        } else {
          if (routeLegs.length > 0) {
            routeLegs[0].isCurrent = true;
            activeLeg = routeLegs[0];
          } else {
            throw new Error(
              "Inconsistent tracking state: No route legs calculated.",
            );
          }
        }
      } else {
        activeLeg = activeLegs[0];
      }

      remainingDistanceKm = activeLeg ? activeLeg.distanceKm : 0;
      estimatedArrivalMinutes = activeLeg ? activeLeg.durationMinutes : 0;

      if (transitionDetected) {
        continue;
      }

      // Detect transitions
      // 1. DRIVER_ACCEPTED -> DRIVER_ON_THE_WAY
      if (rideStatus === RIDE_STATUS.DRIVER_ACCEPTED) {
        rideStatus = RIDE_STATUS.DRIVER_ON_THE_WAY;
        ride.status = RIDE_STATUS.DRIVER_ON_THE_WAY;
        tracking.driverOnTheWayAt = new Date();
        transitions.push({
          type: "driver-on-the-way",
          payload: {
            remainingDistanceKm,
            estimatedArrivalMinutes,
          },
        });
        transitionDetected = true;
      }
      // 2. DRIVER_ON_THE_WAY -> DRIVER_ARRIVED
      else if (rideStatus === RIDE_STATUS.DRIVER_ON_THE_WAY) {
        if (remainingDistanceKm <= arrivalRadiusKm) {
          rideStatus = RIDE_STATUS.DRIVER_ARRIVED;
          ride.status = RIDE_STATUS.DRIVER_ARRIVED;
          ride.arrivedAt = new Date();
          tracking.driverArrivedAt = new Date();
          remainingDistanceKm = 0;
          estimatedArrivalMinutes = 0;
          transitions.push({
            type: "driver-arrived",
            payload: {},
          });
          transitionDetected = true;
        }
      }
      // 3. STARTED -> Stop completed
      else if (
        rideStatus === RIDE_STATUS.STARTED &&
        ride.stops &&
        ride.stops.length > 0
      ) {
        const nextStop = [...ride.stops]
          .sort((a: any, b: any) => a.order - b.order)
          .find((stop: any) => stop.order > currentStopOrder);

        if (nextStop && !nextStop.isCompleted) {
          if (
            currentTargetDetails.targetType === "stop" &&
            currentTargetDetails.targetStopOrder === nextStop.order &&
            remainingDistanceKm <= arrivalRadiusKm
          ) {
            nextStop.isCompleted = true;
            nextStop.completedAt = new Date();
            currentStopOrder = nextStop.order;
            tracking.currentStopOrder = nextStop.order;

            transitions.push({
              type: "stop-arrived",
              payload: {
                stopOrder: nextStop.order,
                stopAddress: nextStop.address,
              },
            });
            transitionDetected = true;
          }
        }
      }

      currentTargetDetails = getTargetDetails(
        rideStatus,
        ride.pickup,
        ride.destination,
        ride.stops,
        currentStopOrder,
      );

      if (!transitionDetected) {
        break;
      }
    }

    const finalTrackingState = {
      rideStatus,
      targetType: currentTargetDetails.targetType,
      targetLocation: currentTargetDetails.targetLocation,
      targetStopOrder: currentTargetDetails.targetStopOrder,
      activeStop: currentTargetDetails.activeStop,
      targetIsPickup: currentTargetDetails.targetIsPickup,
      targetIsDestination: currentTargetDetails.targetIsDestination,
      activeLeg,
      remainingDistanceKm,
      estimatedArrivalMinutes,
      totalDistanceKm: routeLegsResult ? routeLegsResult.totalDistanceKm : 0,
      totalDurationMinutes: routeLegsResult
        ? routeLegsResult.totalDurationMinutes
        : 0,
      routeLegs: routeLegsResult ? routeLegsResult.legs : [],
      polyline: routeLegsResult ? routeLegsResult.polyline : "",
    };

    return {
      trackingState: finalTrackingState,
      transitions,
    };
  }
}

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
  activeStop: any;
  targetIsPickup: boolean;
  targetIsDestination: boolean;
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
      activeStop: null,
      targetIsPickup: true,
      targetIsDestination: false,
    };
  }

  if (statusLower === "started") {
    if (stops && stops.length > 0) {
      const nextStop = [...stops]
        .sort((a, b) => a.order - b.order)
        .find((stop) => stop.order > currentStopOrder);
      if (nextStop) {
        return {
          targetType: "stop",
          targetLocation: nextStop.location.coordinates,
          targetStopOrder: nextStop.order,
          activeStop: nextStop,
          targetIsPickup: false,
          targetIsDestination: false,
        };
      }
    }

    return {
      targetType: "destination",
      targetLocation: destination.location.coordinates,
      targetStopOrder: null,
      activeStop: null,
      targetIsPickup: false,
      targetIsDestination: true,
    };
  }

  return {
    targetType: "pickup",
    targetLocation: pickup.location.coordinates,
    targetStopOrder: null,
    activeStop: null,
    targetIsPickup: true,
    targetIsDestination: false,
  };
};

export const GoogleRouteService = new GoogleRouteServiceClass();
