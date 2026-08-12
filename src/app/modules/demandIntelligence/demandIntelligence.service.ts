import { Types } from "mongoose";
import { Ride } from "../ride/ride.model";
import { Driver } from "../driver/driver.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { SurgeRule } from "../surgeRule/surgeRule.model";
import { Event } from "../event/event.model";
import { Tracking } from "../tracking/tracking.model";
import { RIDE_STATUS, RIDE_TYPE } from "../ride/ride.constant";
import { SERVICE_AREA_TYPE } from "../serviceArea/serviceArea.constant";
import { STATUS } from "../../../constants/status";
import { DRIVER_AVAILABILITY_STATUS } from "../driver/driver.constant";
import {
  IDemandIntelligenceQuery,
  IDemandSummaryData,
  IDemandZoneItem,
  ILiveMapData,
  IUpcomingEventItem,
} from "./demandIntelligence.interface";

const ACTIVE_RIDE_STATUSES = [
  RIDE_STATUS.SEARCHING_DRIVER,
  RIDE_STATUS.DRIVER_ACCEPTED,
  RIDE_STATUS.WAITING_USER_APPROVAL,
  RIDE_STATUS.DRIVER_ON_THE_WAY,
  RIDE_STATUS.DRIVER_ARRIVED,
  RIDE_STATUS.STARTED,
];

const getSummaryFromDB = async (
  query: IDemandIntelligenceQuery,
): Promise<IDemandSummaryData> => {
  const rideMatch: any = {
    status: { $in: ACTIVE_RIDE_STATUSES },
    isDeleted: false,
  };
  const driverMatch: any = {
    driverAvailabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE,
    approvalStatus: "approved",
    isDeleted: false,
  };

  if (query.serviceAreaId) {
    const areaId = new Types.ObjectId(query.serviceAreaId);
    rideMatch.serviceAreaId = areaId;
    driverMatch.serviceAreaId = areaId;
  }

  if (query.startDate || query.endDate) {
    rideMatch.createdAt = {};
    if (query.startDate) {
      rideMatch.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      rideMatch.createdAt.$lte = new Date(query.endDate);
    }
  }

  const [
    activeRequests,
    availableDrivers,
    activeSurgeZones,
    upcomingEvents,
    trackingAvg,
    zonesData,
  ] = await Promise.all([
    Ride.countDocuments(rideMatch),
    Driver.countDocuments(driverMatch),
    SurgeRule.countDocuments({
      status: STATUS.ACTIVE,
      isDeleted: false,
    } as any),
    Event.countDocuments({
      status: STATUS.ACTIVE,
      endDateTime: { $gte: new Date() },
      isDeleted: false,
    } as any),
    Tracking.aggregate([
      {
        $match: {
          estimatedArrivalMinutes: { $exists: true, $ne: null, $gt: 0 },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          avgEta: { $avg: "$estimatedArrivalMinutes" },
        },
      },
    ]),
    getZonesFromDB(query),
  ]);

  const highDemandZones = zonesData.filter((z) => z.status === "high").length;
  const averageEtaMinutes =
    trackingAvg.length > 0 && trackingAvg[0].avgEta
      ? parseFloat(trackingAvg[0].avgEta.toFixed(1))
      : 0;

  return {
    activeRequests,
    availableDrivers,
    highDemandZones,
    activeSurgeZones,
    upcomingEvents,
    averageEtaMinutes,
  };
};

const getZonesFromDB = async (
  query: IDemandIntelligenceQuery,
): Promise<IDemandZoneItem[]> => {
  const serviceAreaFilter: any = {
    status: STATUS.ACTIVE,
    type: {
      $in: [
        SERVICE_AREA_TYPE.ZONE,
        SERVICE_AREA_TYPE.CITY,
        SERVICE_AREA_TYPE.AIRPORT,
      ],
    },
    isDeleted: false,
  };

  if (query.serviceAreaId) {
    serviceAreaFilter._id = new Types.ObjectId(query.serviceAreaId);
  }

  if (query.city) {
    serviceAreaFilter.city = { $regex: new RegExp(query.city, "i") };
  }

  if (query.state) {
    serviceAreaFilter.state = { $regex: new RegExp(query.state, "i") };
  }

  if (query.search) {
    const searchRegex = new RegExp(query.search, "i");
    serviceAreaFilter.$or = [
      { zone: { $regex: searchRegex } },
      { city: { $regex: searchRegex } },
      { airport: { $regex: searchRegex } },
    ];
  }

  const serviceAreas = await ServiceArea.find(serviceAreaFilter).lean();

  if (!serviceAreas.length) {
    return [];
  }

  const areaIds = serviceAreas.map((sa) => sa._id);

  // Parallel aggregations for active requests, drivers, and ETAs grouped by serviceAreaId
  const [requestsByArea, driversByArea, etasByArea] = await Promise.all([
    Ride.aggregate([
      {
        $match: {
          serviceAreaId: { $in: areaIds },
          status: { $in: ACTIVE_RIDE_STATUSES },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$serviceAreaId",
          count: { $sum: 1 },
        },
      },
    ]),
    Driver.aggregate([
      {
        $match: {
          serviceAreaId: { $in: areaIds },
          driverAvailabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE,
          approvalStatus: "approved",
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$serviceAreaId",
          count: { $sum: 1 },
        },
      },
    ]),
    Tracking.aggregate([
      {
        $match: {
          estimatedArrivalMinutes: { $exists: true, $ne: null, $gt: 0 },
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "rides",
          localField: "rideId",
          foreignField: "_id",
          as: "ride",
        },
      },
      { $unwind: "$ride" },
      {
        $match: {
          "ride.serviceAreaId": { $in: areaIds },
          "ride.status": { $in: ACTIVE_RIDE_STATUSES },
        },
      },
      {
        $group: {
          _id: "$ride.serviceAreaId",
          avgEta: { $avg: "$estimatedArrivalMinutes" },
        },
      },
    ]),
  ]);

  const requestMap = new Map<string, number>();
  requestsByArea.forEach((item) => {
    if (item._id) requestMap.set(item._id.toString(), item.count);
  });

  const driverMap = new Map<string, number>();
  driversByArea.forEach((item) => {
    if (item._id) driverMap.set(item._id.toString(), item.count);
  });

  const etaMap = new Map<string, number>();
  etasByArea.forEach((item) => {
    if (item._id) etaMap.set(item._id.toString(), item.avgEta);
  });

  return serviceAreas.map((sa) => {
    const idStr = sa._id.toString();
    const zoneName =
      sa.zone || sa.airport || sa.city || sa.state || "Unnamed Zone";
    const activeRequests = requestMap.get(idStr) || 0;
    const availableDrivers = driverMap.get(idStr) || 0;
    const rawAvgEta = etaMap.get(idStr) || 0;
    const averageEtaMinutes = parseFloat(rawAvgEta.toFixed(1));

    // Handle division-by-zero safely
    let demandRatio: number | null = null;
    if (availableDrivers > 0) {
      demandRatio = parseFloat((activeRequests / availableDrivers).toFixed(2));
    } else if (activeRequests > 0) {
      demandRatio = activeRequests; // Safe numeric representation when supply is 0 but demand > 0
    }

    let status: "high" | "medium" | "normal" = "normal";
    if (demandRatio !== null && demandRatio >= 3.0) {
      status = "high";
    } else if (demandRatio !== null && demandRatio >= 1.5) {
      status = "medium";
    }

    return {
      zoneId: idStr,
      zone: zoneName,
      activeRequests,
      availableDrivers,
      demandRatio,
      averageEtaMinutes,
      status,
    };
  });
};

const getLiveMapFromDB = async (
  query: IDemandIntelligenceQuery,
): Promise<ILiveMapData> => {
  const driverMatch: any = {
    driverAvailabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE,
    approvalStatus: "approved",
    isDeleted: false,
    "location.coordinates": { $exists: true, $ne: [0, 0] },
  };

  if (query.serviceAreaId) {
    driverMatch.serviceAreaId = new Types.ObjectId(query.serviceAreaId);
  }

  const reservationMatch: any = {
    rideType: RIDE_TYPE.SCHEDULED,
    status: {
      $in: [
        RIDE_STATUS.SEARCHING_DRIVER,
        RIDE_STATUS.DRIVER_ACCEPTED,
        RIDE_STATUS.WAITING_USER_APPROVAL,
      ],
    },
    isDeleted: false,
  };

  if (query.serviceAreaId) {
    reservationMatch.serviceAreaId = new Types.ObjectId(query.serviceAreaId);
  }

  const [driversRaw, reservationsRaw, airportsRaw, surgeZonesRaw] =
    await Promise.all([
      Driver.find(driverMatch)
        .populate<{ userId: { name?: string } }>("userId", "name")
        .select("userId location driverAvailabilityStatus")
        .lean(),
      Ride.find(reservationMatch)
        .select("pickup destination scheduledAt status")
        .limit(100)
        .lean(),
      ServiceArea.find({
        type: SERVICE_AREA_TYPE.AIRPORT,
        status: STATUS.ACTIVE,
        isDeleted: false,
      } as any)
        .select("airport city location zone")
        .lean(),
      SurgeRule.find({
        status: STATUS.ACTIVE,
        isDeleted: false,
      } as any)
        .select(
          "ruleName ruleType minMultiplier maxMultiplier demandThreshold supplyThreshold status",
        )
        .lean(),
    ]);

  const drivers: ILiveMapData["drivers"] = driversRaw
    .filter(
      (d) =>
        d.location &&
        Array.isArray(d.location.coordinates) &&
        d.location.coordinates.length === 2,
    )
    .map((d) => ({
      driverId: d._id.toString(),
      driverName: (d.userId as any)?.name || "Driver",
      longitude: d.location!.coordinates[0],
      latitude: d.location!.coordinates[1],
      status: "available",
    }));

  const reservations: ILiveMapData["reservations"] = reservationsRaw.map(
    (r) => ({
      reservationId: r._id.toString(),
      pickupAddress: r.pickup?.address || "",
      pickupLocation: r.pickup?.location,
      destinationAddress: r.destination?.address,
      scheduledAt: r.scheduledAt,
      status: r.status,
    }),
  );

  const airports: ILiveMapData["airports"] = airportsRaw.map((a) => ({
    serviceAreaId: a._id.toString(),
    name: a.airport || a.zone || a.city || "Airport",
    location: a.location,
    code: a.airport ? a.airport.slice(0, 3).toUpperCase() : "APT",
  }));

  const surgeZones: ILiveMapData["surgeZones"] = surgeZonesRaw.map((s) => ({
    surgeRuleId: s._id.toString(),
    ruleName: s.ruleName,
    ruleType: s.ruleType,
    minMultiplier: s.minMultiplier,
    maxMultiplier: s.maxMultiplier,
    demandThreshold: s.demandThreshold,
    supplyThreshold: s.supplyThreshold,
    status: s.status,
  }));

  return {
    availableDriverCount: drivers.length,
    surgeZoneCount: surgeZones.length,
    reservationCount: reservations.length,
    airportCount: airports.length,
    drivers,
    reservations,
    airports,
    surgeZones,
  };
};

const getUpcomingEventsFromDB = async (
  query: IDemandIntelligenceQuery,
): Promise<IUpcomingEventItem[]> => {
  const eventFilter: any = {
    status: STATUS.ACTIVE,
    isDeleted: false,
  };

  if (query.serviceAreaId) {
    eventFilter.serviceAreaId = new Types.ObjectId(query.serviceAreaId);
  }

  if (query.search) {
    const searchRegex = new RegExp(query.search, "i");
    eventFilter.$or = [
      { eventName: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
    ];
  }

  const events = await Event.find(eventFilter)
    .sort({ startDateTime: 1 })
    .lean();

  if (!events.length) {
    return [];
  }

  const now = new Date();

  const eventsWithReservations = await Promise.all(
    events.map(async (event) => {
      const reservationMatch: any = {
        rideType: RIDE_TYPE.SCHEDULED,
        scheduledAt: {
          $gte: event.startDateTime,
          $lte: event.endDateTime,
        },
        isDeleted: false,
      };

      if (event.serviceAreaId) {
        reservationMatch.serviceAreaId = event.serviceAreaId;
      }

      const relatedReservations = await Ride.countDocuments(reservationMatch);

      let status: "active" | "upcoming" | "completed" = "upcoming";
      if (
        now >= new Date(event.startDateTime) &&
        now <= new Date(event.endDateTime)
      ) {
        status = "active";
      } else if (now > new Date(event.endDateTime)) {
        status = "completed";
      }

      const locationName =
        event.description ||
        (event.location?.coordinates
          ? `Lat: ${event.location.coordinates[1]}, Lng: ${event.location.coordinates[0]}`
          : "Event Location");

      return {
        eventId: event._id.toString(),
        eventName: event.eventName,
        description: event.description,
        locationName,
        location: event.location,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        relatedReservations,
        status,
      };
    }),
  );

  return eventsWithReservations;
};

export const DemandIntelligenceService = {
  getSummaryFromDB,
  getZonesFromDB,
  getLiveMapFromDB,
  getUpcomingEventsFromDB,
};
