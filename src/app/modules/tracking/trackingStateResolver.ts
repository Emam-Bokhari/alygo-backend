import { GoogleRouteService } from "../../../services/googleRouteService";

export interface TrackingState {
  rideStatus: string;
  targetType: "pickup" | "stop" | "destination";
  targetLocation: [number, number];
  targetStopOrder?: number | null;
  activeStop?: any;
  targetIsPickup: boolean;
  targetIsDestination: boolean;
  activeLeg: any;
  remainingDistanceKm: number;
  estimatedArrivalMinutes: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  routeLegs: any[];
  polyline: string;
}

export interface TransitionEvent {
  type: "driver-on-the-way" | "driver-arrived" | "stop-arrived";
  payload: any;
}

export const resolveTrackingState = async (params: {
  driverLocation: { lat: number; lng: number };
  ride: any; // IRide model
  tracking: any; // ITracking model
  arrivalRadiusKm: number;
}): Promise<{
  trackingState: TrackingState;
  transitions: TransitionEvent[];
}> => {
  return GoogleRouteService.resolveCurrentTrackingState(params) as any;
};
