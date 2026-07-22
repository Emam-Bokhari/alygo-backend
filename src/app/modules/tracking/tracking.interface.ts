import { Model, Types } from "mongoose";

export interface ITracking {
  rideId: Types.ObjectId;
  driverId?: Types.ObjectId;
  userId?: Types.ObjectId;
  driverLocation?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  userLocation?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  lastUpdatedAt: Date;
  // Live tracking enhancements
  remainingDistanceKm?: number;
  estimatedArrivalMinutes?: number;
  etaCalculatedAt?: Date;
  lastDriverLocationUpdateAt?: Date;
  driverOnTheWayAt?: Date;
  driverArrivedAt?: Date;
  // Target location tracking
  targetIsPickup?: boolean;
  targetIsDestination?: boolean;
  currentStopOrder?: number; // Tracks which stop the driver is currently at/completed
  // New tracking state fields
  targetType?: "pickup" | "stop" | "destination";
  targetLocation?: {
    type: "Point";
    coordinates: [number, number];
  };
  targetStopOrder?: number | null;
  activeLeg?: {
    from: string;
    to: string;
    distanceKm: number;
    durationMinutes: number;
    isCurrent: boolean;
  };
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  routeLegs?: Array<{
    from: string;
    to: string;
    distanceKm: number;
    durationMinutes: number;
    isCurrent: boolean;
  }>;
  polyline?: string;
}

export type TrackingModel = Model<ITracking>;
