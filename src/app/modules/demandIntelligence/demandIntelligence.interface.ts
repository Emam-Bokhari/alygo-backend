import { Types } from "mongoose";

export interface IDemandIntelligenceQuery {
  serviceAreaId?: string;
  city?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: string;
  page?: string;
}

export interface IDemandSummaryData {
  activeRequests: number;
  availableDrivers: number;
  highDemandZones: number;
  activeSurgeZones: number;
  upcomingEvents: number;
  averageEtaMinutes: number;
}

export interface IDemandZoneItem {
  zoneId?: string;
  zone: string;
  activeRequests: number;
  availableDrivers: number;
  demandRatio: number | null;
  averageEtaMinutes: number;
  status: "high" | "medium" | "normal";
}

export interface ILiveMapDriver {
  driverId: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  status: "available" | "on_trip";
}

export interface ILiveMapReservation {
  reservationId: string;
  pickupAddress: string;
  pickupLocation?: {
    type: string;
    coordinates: [number, number];
  };
  destinationAddress?: string;
  scheduledAt?: Date;
  status: string;
}

export interface ILiveMapAirport {
  serviceAreaId: string;
  name: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  code?: string;
}

export interface ILiveMapSurgeZone {
  surgeRuleId: string;
  ruleName: string;
  ruleType: string;
  minMultiplier: number;
  maxMultiplier: number;
  demandThreshold?: number;
  supplyThreshold?: number;
  status: string;
}

export interface ILiveMapData {
  availableDriverCount: number;
  surgeZoneCount: number;
  reservationCount: number;
  airportCount: number;
  drivers: ILiveMapDriver[];
  reservations: ILiveMapReservation[];
  airports: ILiveMapAirport[];
  surgeZones: ILiveMapSurgeZone[];
}

export interface IUpcomingEventItem {
  eventId: string;
  eventName: string;
  description?: string;
  locationName: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  startDateTime: Date;
  endDateTime: Date;
  relatedReservations: number;
  status: "active" | "upcoming" | "completed";
}
