import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { DriverDutyPolicy } from "./driverDutyPolicy.model";
import { IDriverDutyPolicy } from "./driverDutyPolicy.interface";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { ServiceAreaServices } from "../serviceArea/serviceArea.service";
import { STATUS } from "../../../constants/status";
import { Driver } from "../driver/driver.model";
import { User } from "../user/user.model";
import { Ride } from "../ride/ride.model";
import { DRIVER_BLOCK_REASON } from "../driver/driver.constant";
import { socketHelper } from "../../../helpers/socketHelper";
import {
  getCurrentTimeInTimezone,
  utcToTimezone,
} from "../../../shared/timezoneHelper";
import { DateTime } from "luxon";

const createDriverDutyPolicyToDB = async (
  payload: Partial<IDriverDutyPolicy>,
) => {
  // Auto-attach parent IDs based on scope type
  if (payload.scopeType && payload.airportId) {
    const airport = await ServiceArea.findById(payload.airportId);
    if (airport) {
      payload.cityId = airport.cityId;
      if (airport.cityId) {
        const city = await ServiceArea.findById(airport.cityId);
        if (city) {
          payload.stateId = city.stateId;
          if (city.stateId) {
            const state = await ServiceArea.findById(city.stateId);
            if (state) {
              payload.countryId = state.countryId;
            }
          }
        }
      }
    }
  } else if (payload.scopeType && payload.zoneId) {
    const zone = await ServiceArea.findById(payload.zoneId);
    if (zone) {
      payload.cityId = zone.cityId;
      if (zone.cityId) {
        const city = await ServiceArea.findById(zone.cityId);
        if (city) {
          payload.stateId = city.stateId;
          if (city.stateId) {
            const state = await ServiceArea.findById(city.stateId);
            if (state) {
              payload.countryId = state.countryId;
            }
          }
        }
      }
    }
  } else if (payload.scopeType && payload.cityId) {
    const city = await ServiceArea.findById(payload.cityId);
    if (city) {
      payload.stateId = city.stateId;
      if (city.stateId) {
        const state = await ServiceArea.findById(city.stateId);
        if (state) {
          payload.countryId = state.countryId;
        }
      }
    }
  } else if (payload.scopeType && payload.stateId) {
    const state = await ServiceArea.findById(payload.stateId);
    if (state) {
      payload.countryId = state.countryId;
    }
  }

  const driverDutyPolicy = await DriverDutyPolicy.create(payload);
  return driverDutyPolicy;
};

const getDriverDutyPolicyFromDB = async (driverDutyPolicyId: string) => {
  const driverDutyPolicy = await DriverDutyPolicy.findById(
    driverDutyPolicyId,
  )
    .populate([
      { path: "countryId", select: "country type maxDrivers" },
      { path: "stateId", select: "state type maxDrivers" },
      { path: "cityId", select: "city type maxDrivers" },
      { path: "zoneId", select: "zone type maxDrivers" },
      { path: "airportId", select: "airport type maxDrivers" },
    ])
    .setOptions({ withDeleted: true });

  if (!driverDutyPolicy) {
    throw new ApiError(404, "Driver duty policy not found");
  }

  return driverDutyPolicy;
};

const getAllDriverDutyPoliciesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IDriverDutyPolicy[]; meta: any }> => {
  const searchTerm = query.searchTerm as string;

  // Build aggregation pipeline
  const pipeline: any[] = [
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
  const queryObj = { ...query };
  const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];
  excludeFields.forEach((el) => delete queryObj[el]);

  if (Object.keys(queryObj).length > 0) {
    pipeline.push({ $match: queryObj });
  }

  // Get total count before pagination
  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await DriverDutyPolicy.aggregate(countPipeline).option({
    withDeleted: true,
  });
  const total = countResult[0]?.total || 0;

  // Add sort
  const sortStr = (query.sort as string) || "-createdAt";
  const sortObj: any = {};
  sortStr.split(",").forEach((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith("-")) {
      sortObj[trimmed.substring(1)] = -1;
    } else {
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
  const fieldsStr = (query.fields as string) || "-__v";
  const projectObj: any = {};
  fieldsStr.split(",").forEach((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith("-")) {
      projectObj[trimmed.substring(1)] = 0;
    } else {
      projectObj[trimmed] = 1;
    }
  });
  pipeline.push({ $project: projectObj });

  const result = await DriverDutyPolicy.aggregate(pipeline).option({
    withDeleted: true,
  });

  const totalPage = Math.ceil(total / limit);
  const meta = { page, limit, total, totalPage };

  return {
    data: result,
    meta,
  };
};

const updateDriverDutyPolicyFromDB = async (
  driverDutyPolicyId: string,
  payload: Partial<IDriverDutyPolicy>,
) => {
  // Auto-attach parent IDs if location IDs are being updated
  if (payload.airportId) {
    const airport = await ServiceArea.findById(payload.airportId);
    if (airport) {
      payload.cityId = airport.cityId;
      if (airport.cityId) {
        const city = await ServiceArea.findById(airport.cityId);
        if (city) {
          payload.stateId = city.stateId;
          if (city.stateId) {
            const state = await ServiceArea.findById(city.stateId);
            if (state) {
              payload.countryId = state.countryId;
            }
          }
        }
      }
    }
  } else if (payload.zoneId) {
    const zone = await ServiceArea.findById(payload.zoneId);
    if (zone) {
      payload.cityId = zone.cityId;
      if (zone.cityId) {
        const city = await ServiceArea.findById(zone.cityId);
        if (city) {
          payload.stateId = city.stateId;
          if (city.stateId) {
            const state = await ServiceArea.findById(city.stateId);
            if (state) {
              payload.countryId = state.countryId;
            }
          }
        }
      }
    }
  } else if (payload.cityId) {
    const city = await ServiceArea.findById(payload.cityId);
    if (city) {
      payload.stateId = city.stateId;
      if (city.stateId) {
        const state = await ServiceArea.findById(city.stateId);
        if (state) {
          payload.countryId = state.countryId;
        }
      }
    }
  } else if (payload.stateId) {
    const state = await ServiceArea.findById(payload.stateId);
    if (state) {
      payload.countryId = state.countryId;
    }
  }

  const updatedDriverDutyPolicy = await DriverDutyPolicy.findByIdAndUpdate(
    driverDutyPolicyId,
    payload,
    { new: true, runValidators: true },
  ).populate([
    { path: "countryId", select: "country type maxDrivers" },
    { path: "stateId", select: "state type maxDrivers" },
    { path: "cityId", select: "city type maxDrivers" },
    { path: "zoneId", select: "zone type maxDrivers" },
    { path: "airportId", select: "airport type maxDrivers" },
  ]);

  if (!updatedDriverDutyPolicy) {
    throw new ApiError(404, "Driver duty policy not found");
  }

  return updatedDriverDutyPolicy;
};

const deleteDriverDutyPolicyFromDB = async (driverDutyPolicyId: string) => {
  const deletedDriverDutyPolicy =
    await DriverDutyPolicy.softDeleteById(driverDutyPolicyId);

  if (!deletedDriverDutyPolicy) {
    throw new ApiError(404, "Driver duty policy not found");
  }

  return deletedDriverDutyPolicy;
};

const getActiveDriverDutyPoliciesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IDriverDutyPolicy[]; meta: any }> => {
  const searchTerm = query.searchTerm as string;

  // Build aggregation pipeline
  const pipeline: any[] = [
    {
      $match: { status: STATUS.ACTIVE },
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
  const queryObj = { ...query };
  const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];
  excludeFields.forEach((el) => delete queryObj[el]);

  if (Object.keys(queryObj).length > 0) {
    pipeline.push({ $match: queryObj });
  }

  // Get total count before pagination
  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await DriverDutyPolicy.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Add sort
  const sortStr = (query.sort as string) || "-createdAt";
  const sortObj: any = {};
  sortStr.split(",").forEach((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith("-")) {
      sortObj[trimmed.substring(1)] = -1;
    } else {
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
  const fieldsStr = (query.fields as string) || "-__v";
  const projectObj: any = {};
  fieldsStr.split(",").forEach((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith("-")) {
      projectObj[trimmed.substring(1)] = 0;
    } else {
      projectObj[trimmed] = 1;
    }
  });
  pipeline.push({ $project: projectObj });

  const result = await DriverDutyPolicy.aggregate(pipeline);

  const totalPage = Math.ceil(total / limit);
  const meta = { page, limit, total, totalPage };

  return {
    data: result,
    meta,
  };
};

const updateDriverDutyPolicyStatusFromDB = async (
  driverDutyPolicyId: string,
  status: STATUS,
) => {
  const updatedDriverDutyPolicy = await DriverDutyPolicy.findByIdAndUpdate(
    driverDutyPolicyId,
    { status },
    { new: true, runValidators: true },
  ).populate([
    { path: "countryId", select: "country type maxDrivers" },
    { path: "stateId", select: "state type maxDrivers" },
    { path: "cityId", select: "city type maxDrivers" },
    { path: "zoneId", select: "zone type maxDrivers" },
    { path: "airportId", select: "airport type maxDrivers" },
  ]);

  if (!updatedDriverDutyPolicy) {
    throw new ApiError(404, "Driver duty policy not found");
  }

  return updatedDriverDutyPolicy;
};

const getDriverAvailability = async (driverId: string) => {
  const driver = await Driver.findOne({ userId: driverId });
  if (!driver) {
    throw new Error("Driver not found");
  }

  // Default response - driver is available
  const defaultResponse = {
    canReceiveRide: true,
    blockedReason: null as DRIVER_BLOCK_REASON | null,
    blockedUntil: null as Date | null,
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
      await ServiceAreaServices.findServiceAreaByCoordinates(
        driverLongitude,
        driverLatitude,
      );

    if (driverLocServiceArea) {
      const query: any = { status: "active" };

      if (driverLocServiceArea.type === "city" && driverLocServiceArea._id) {
        query.cityId = driverLocServiceArea._id;
      } else if (
        driverLocServiceArea.type === "zone" &&
        driverLocServiceArea._id
      ) {
        query.zoneId = driverLocServiceArea._id;
      } else if (
        driverLocServiceArea.type === "airport" &&
        driverLocServiceArea._id
      ) {
        query.airportId = driverLocServiceArea._id;
      } else if (
        driverLocServiceArea.type === "state" &&
        driverLocServiceArea._id
      ) {
        query.stateId = driverLocServiceArea._id;
      } else if (
        driverLocServiceArea.type === "country" &&
        driverLocServiceArea._id
      ) {
        query.countryId = driverLocServiceArea._id;
      }

      policy = await DriverDutyPolicy.findOne(query);
    }
  }

  // If no policy exists, driver is available
  if (!policy) {
    return defaultResponse;
  }

  // Get timezone from service area (default to UTC if not set)
  const timezone = driverLocServiceArea?.timezone || "UTC";

  // Get start of day in the driver's timezone
  const startOfDay = getCurrentTimeInTimezone(timezone)
    .startOf("day")
    .toUTC()
    .toJSDate();

  // Get today's completed rides
  const completedRides = await Ride.find({
    driverId: driver.userId,
    status: "completed",
    completedAt: { $gte: startOfDay },
  }).sort({ completedAt: 1 });

  // Calculate total driving hours today
  let totalDrivingHoursToday = 0;
  for (const ride of completedRides) {
    if (ride.startedAt && ride.completedAt) {
      const durationHrs =
        (ride.completedAt.getTime() - ride.startedAt.getTime()) /
        (1000 * 60 * 60);
      totalDrivingHoursToday += durationHrs;
    }
  }

  // Check daily limit
  if (totalDrivingHoursToday >= policy.maxDrivingHoursPerDay) {
    // Calculate blocked until time in driver's timezone (next day midnight)
    const blockedUntil = getCurrentTimeInTimezone(timezone)
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
      blockedReason: DRIVER_BLOCK_REASON.DAILY_LIMIT,
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
        const rideDuration =
          (ride.completedAt.getTime() - ride.startedAt.getTime()) /
          (1000 * 60 * 60);

        // Check if there's a gap between rides (break)
        const gapHours =
          (lastRideEndTime.getTime() - ride.completedAt.getTime()) /
          (1000 * 60 * 60);

        if (gapHours > policy.breakAfterHours) {
          // Gap is large enough to reset continuous driving
          break;
        }

        continuousDrivingHours += rideDuration;
        lastRideEndTime = ride.completedAt;

        if (continuousDrivingHours >= policy.maxContinuousDrivingHours) {
          // Calculate blocked until time in driver's timezone
          const blockedUntil = DateTime.fromJSDate(ride.completedAt)
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
            blockedReason: DRIVER_BLOCK_REASON.CONTINUOUS_LIMIT,
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
    const breakEndTime = DateTime.fromJSDate(driver.lastOfflineAt)
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
        blockedReason: DRIVER_BLOCK_REASON.BREAK_REQUIRED,
        blockedUntil: breakEndTime,
        remainingHours,
        remainingMinutes: remainingMinutes % 60,
        remainingSeconds: remainingSeconds % 60,
      };
    }
  }

  return defaultResponse;
};

const updateDriverAvailability = async (driverId: string) => {
  const driver = await Driver.findOne({ userId: driverId });
  if (!driver) {
    throw new Error("Driver not found");
  }

  const availabilityData = await getDriverAvailability(driverId);

  const previousCanReceiveRide = driver.availability?.canReceiveRide ?? true;
  const newCanReceiveRide = availabilityData.canReceiveRide;

  // Update driver's availability in database
  await Driver.findOneAndUpdate(
    { userId: driverId },
    {
      $set: {
        "availability.canReceiveRide": availabilityData.canReceiveRide,
        "availability.blockedReason": availabilityData.blockedReason,
        "availability.blockedUntil": availabilityData.blockedUntil,
      },
    },
  );

  // Emit socket events if availability changed
  if (previousCanReceiveRide !== newCanReceiveRide) {
    if (newCanReceiveRide) {
      // Driver became available
      socketHelper.sendToUser(driverId, "driver-available", {
        canReceiveRide: true,
        blockedReason: null,
        blockedUntil: null,
      });
    } else {
      // Driver became unavailable due to duty limit
      socketHelper.sendToUser(driverId, "driver-duty-limit-reached", {
        canReceiveRide: false,
        blockedReason: availabilityData.blockedReason,
        blockedUntil: availabilityData.blockedUntil,
        remainingHours: availabilityData.remainingHours,
        remainingMinutes: availabilityData.remainingMinutes,
      });
    }
  }

  // Return availability data and whether it changed
  return {
    ...availabilityData,
    availabilityChanged: previousCanReceiveRide !== newCanReceiveRide,
  };
};

const parseSort = (sortStr?: string) => {
  if (!sortStr) return { createdAt: -1 };
  const sortObj: any = {};
  sortStr.split(",").forEach((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith("-")) {
      sortObj[trimmed.substring(1)] = -1;
    } else {
      sortObj[trimmed] = 1;
    }
  });
  return sortObj;
};

const getGlobalRuleFromDB = async () => {
  const policy = await DriverDutyPolicy.findOne({
    scopeType: "global",
  });

  return {
    maxHours: policy?.maxContinuousDrivingHours ?? 0,
    resetHours: policy?.minimumRestHours ?? 0,
    dailyLimit: policy?.maxDrivingHoursPerDay ?? 0,
    weeklyLimit: 0,
    breakMinutes: policy?.breakDurationMinutes ?? 0,
    status: policy?.status ? policy.status.toLowerCase() : "active",
  };
};

const getStateRulesFromDB = async (query: Record<string, unknown>) => {
  const pipeline: any[] = [
    { $match: { type: "state", isDeleted: { $ne: true } } },
  ];

  if (query.state) {
    pipeline.push({
      $match: { state: { $regex: query.state as string, $options: "i" } },
    });
  }

  if (query.searchTerm) {
    pipeline.push({
      $match: { state: { $regex: query.searchTerm as string, $options: "i" } },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { stateId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "state"] },
                  { $eq: ["$stateId", "$$stateId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "customPolicy",
      },
    },
    { $unwind: { path: "$customPolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        pipeline: [
          {
            $match: {
              scopeType: "global",
              $expr: { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
            },
          },
        ],
        as: "globalPolicy",
      },
    },
    { $unwind: { path: "$globalPolicy", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        state: "$state",
        inheritance: {
          $cond: {
            if: "$customPolicy",
            then: "CUSTOM",
            else: "GLOBAL",
          },
        },
        maxHours: {
          $cond: {
            if: "$customPolicy",
            then: "$customPolicy.maxContinuousDrivingHours",
            else: { $ifNull: ["$globalPolicy.maxContinuousDrivingHours", 0] },
          },
        },
        resetHours: {
          $cond: {
            if: "$customPolicy",
            then: "$customPolicy.minimumRestHours",
            else: { $ifNull: ["$globalPolicy.minimumRestHours", 0] },
          },
        },
        dailyLimit: {
          $cond: {
            if: "$customPolicy",
            then: "$customPolicy.maxDrivingHoursPerDay",
            else: { $ifNull: ["$globalPolicy.maxDrivingHoursPerDay", 0] },
          },
        },
        weeklyLimit: { $literal: 0 },
        breakMinutes: {
          $cond: {
            if: "$customPolicy",
            then: "$customPolicy.breakDurationMinutes",
            else: { $ifNull: ["$globalPolicy.breakDurationMinutes", 0] },
          },
        },
        status: {
          $toLower: {
            $cond: {
              if: "$customPolicy",
              then: "$customPolicy.status",
              else: { $ifNull: ["$globalPolicy.status", "active"] },
            },
          },
        },
      },
    },
  );

  if (query.status) {
    pipeline.push({
      $match: { status: (query.status as string).toLowerCase() },
    });
  }

  // Count total before skip/limit
  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await ServiceArea.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Sorting
  const sortObj = parseSort(query.sort as string);
  pipeline.push({ $sort: sortObj });

  // Pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  const result = await ServiceArea.aggregate(pipeline);
  const totalPage = Math.ceil(total / limit);

  return {
    data: result,
    meta: { page, limit, total, totalPage },
  };
};

const getCityRulesFromDB = async (query: Record<string, unknown>) => {
  const pipeline: any[] = [
    { $match: { type: "city", isDeleted: { $ne: true } } },
  ];

  if (query.city) {
    pipeline.push({
      $match: { city: { $regex: query.city as string, $options: "i" } },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "serviceareas",
        localField: "stateId",
        foreignField: "_id",
        as: "stateDoc",
      },
    },
    { $unwind: { path: "$stateDoc", preserveNullAndEmptyArrays: true } },
  );

  if (query.state) {
    pipeline.push({
      $match: {
        "stateDoc.state": { $regex: query.state as string, $options: "i" },
      },
    });
  }

  if (query.searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { city: { $regex: query.searchTerm as string, $options: "i" } },
          {
            "stateDoc.state": {
              $regex: query.searchTerm as string,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { cityId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "city"] },
                  { $eq: ["$cityId", "$$cityId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "cityPolicy",
      },
    },
    { $unwind: { path: "$cityPolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { stateId: "$stateId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "state"] },
                  { $eq: ["$stateId", "$$stateId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "statePolicy",
      },
    },
    { $unwind: { path: "$statePolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        pipeline: [
          {
            $match: {
              scopeType: "global",
              $expr: { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
            },
          },
        ],
        as: "globalPolicy",
      },
    },
    { $unwind: { path: "$globalPolicy", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        city: "$city",
        state: { $ifNull: ["$stateDoc.state", ""] },
        inheritance: {
          $cond: {
            if: "$cityPolicy",
            then: "CUSTOM",
            else: {
              $cond: {
                if: "$statePolicy",
                then: "STATE",
                else: "GLOBAL",
              },
            },
          },
        },
        maxHours: {
          $cond: {
            if: "$cityPolicy",
            then: "$cityPolicy.maxContinuousDrivingHours",
            else: {
              $cond: {
                if: "$statePolicy",
                then: "$statePolicy.maxContinuousDrivingHours",
                else: {
                  $ifNull: ["$globalPolicy.maxContinuousDrivingHours", 0],
                },
              },
            },
          },
        },
        resetHours: {
          $cond: {
            if: "$cityPolicy",
            then: "$cityPolicy.minimumRestHours",
            else: {
              $cond: {
                if: "$statePolicy",
                then: "$statePolicy.minimumRestHours",
                else: { $ifNull: ["$globalPolicy.minimumRestHours", 0] },
              },
            },
          },
        },
        dailyLimit: {
          $cond: {
            if: "$cityPolicy",
            then: "$cityPolicy.maxDrivingHoursPerDay",
            else: {
              $cond: {
                if: "$statePolicy",
                then: "$statePolicy.maxDrivingHoursPerDay",
                else: { $ifNull: ["$globalPolicy.maxDrivingHoursPerDay", 0] },
              },
            },
          },
        },
        weeklyLimit: { $literal: 0 },
        breakMinutes: {
          $cond: {
            if: "$cityPolicy",
            then: "$cityPolicy.breakDurationMinutes",
            else: {
              $cond: {
                if: "$statePolicy",
                then: "$statePolicy.breakDurationMinutes",
                else: { $ifNull: ["$globalPolicy.breakDurationMinutes", 0] },
              },
            },
          },
        },
        status: {
          $toLower: {
            $cond: {
              if: "$cityPolicy",
              then: "$cityPolicy.status",
              else: {
                $cond: {
                  if: "$statePolicy",
                  then: "$statePolicy.status",
                  else: { $ifNull: ["$globalPolicy.status", "active"] },
                },
              },
            },
          },
        },
      },
    },
  );

  if (query.status) {
    pipeline.push({
      $match: { status: (query.status as string).toLowerCase() },
    });
  }

  // Count total before skip/limit
  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await ServiceArea.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Sorting
  const sortObj = parseSort(query.sort as string);
  pipeline.push({ $sort: sortObj });

  // Pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  const result = await ServiceArea.aggregate(pipeline);
  const totalPage = Math.ceil(total / limit);

  return {
    data: result,
    meta: { page, limit, total, totalPage },
  };
};

const getZoneRulesFromDB = async (query: Record<string, unknown>) => {
  const pipeline: any[] = [
    { $match: { type: "zone", isDeleted: { $ne: true } } },
  ];

  if (query.zone) {
    pipeline.push({
      $match: { zone: { $regex: query.zone as string, $options: "i" } },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "serviceareas",
        localField: "cityId",
        foreignField: "_id",
        as: "cityDoc",
      },
    },
    { $unwind: { path: "$cityDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "serviceareas",
        let: { stateId: { $ifNull: ["$stateId", "$cityDoc.stateId"] } },
        pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$stateId"] } } }],
        as: "stateDoc",
      },
    },
    { $unwind: { path: "$stateDoc", preserveNullAndEmptyArrays: true } },
  );

  if (query.city) {
    pipeline.push({
      $match: {
        "cityDoc.city": { $regex: query.city as string, $options: "i" },
      },
    });
  }

  if (query.state) {
    pipeline.push({
      $match: {
        "stateDoc.state": { $regex: query.state as string, $options: "i" },
      },
    });
  }

  if (query.searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { zone: { $regex: query.searchTerm as string, $options: "i" } },
          {
            "cityDoc.city": {
              $regex: query.searchTerm as string,
              $options: "i",
            },
          },
          {
            "stateDoc.state": {
              $regex: query.searchTerm as string,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { zoneId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "zone"] },
                  { $eq: ["$zoneId", "$$zoneId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "zonePolicy",
      },
    },
    { $unwind: { path: "$zonePolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { cityId: "$cityId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "city"] },
                  { $eq: ["$cityId", "$$cityId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "cityPolicy",
      },
    },
    { $unwind: { path: "$cityPolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { stateId: { $ifNull: ["$stateId", "$cityDoc.stateId"] } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "state"] },
                  { $eq: ["$stateId", "$$stateId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "statePolicy",
      },
    },
    { $unwind: { path: "$statePolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        pipeline: [
          {
            $match: {
              scopeType: "global",
              $expr: { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
            },
          },
        ],
        as: "globalPolicy",
      },
    },
    { $unwind: { path: "$globalPolicy", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        zone: "$zone",
        city: { $ifNull: ["$cityDoc.city", ""] },
        state: { $ifNull: ["$stateDoc.state", ""] },
        inheritance: {
          $cond: {
            if: "$zonePolicy",
            then: "CUSTOM",
            else: {
              $cond: {
                if: "$cityPolicy",
                then: "CITY",
                else: {
                  $cond: {
                    if: "$statePolicy",
                    then: "STATE",
                    else: "GLOBAL",
                  },
                },
              },
            },
          },
        },
        maxHours: {
          $cond: {
            if: "$zonePolicy",
            then: "$zonePolicy.maxContinuousDrivingHours",
            else: {
              $cond: {
                if: "$cityPolicy",
                then: "$cityPolicy.maxContinuousDrivingHours",
                else: {
                  $cond: {
                    if: "$statePolicy",
                    then: "$statePolicy.maxContinuousDrivingHours",
                    else: {
                      $ifNull: ["$globalPolicy.maxContinuousDrivingHours", 0],
                    },
                  },
                },
              },
            },
          },
        },
        resetHours: {
          $cond: {
            if: "$zonePolicy",
            then: "$zonePolicy.minimumRestHours",
            else: {
              $cond: {
                if: "$cityPolicy",
                then: "$cityPolicy.minimumRestHours",
                else: {
                  $cond: {
                    if: "$statePolicy",
                    then: "$statePolicy.minimumRestHours",
                    else: { $ifNull: ["$globalPolicy.minimumRestHours", 0] },
                  },
                },
              },
            },
          },
        },
        dailyLimit: {
          $cond: {
            if: "$zonePolicy",
            then: "$zonePolicy.maxDrivingHoursPerDay",
            else: {
              $cond: {
                if: "$cityPolicy",
                then: "$cityPolicy.maxDrivingHoursPerDay",
                else: {
                  $cond: {
                    if: "$statePolicy",
                    then: "$statePolicy.maxDrivingHoursPerDay",
                    else: {
                      $ifNull: ["$globalPolicy.maxDrivingHoursPerDay", 0],
                    },
                  },
                },
              },
            },
          },
        },
        weeklyLimit: { $literal: 0 },
        breakMinutes: {
          $cond: {
            if: "$zonePolicy",
            then: "$zonePolicy.breakDurationMinutes",
            else: {
              $cond: {
                if: "$cityPolicy",
                then: "$cityPolicy.breakDurationMinutes",
                else: {
                  $cond: {
                    if: "$statePolicy",
                    then: "$statePolicy.breakDurationMinutes",
                    else: {
                      $ifNull: ["$globalPolicy.breakDurationMinutes", 0],
                    },
                  },
                },
              },
            },
          },
        },
        status: {
          $toLower: {
            $cond: {
              if: "$zonePolicy",
              then: "$zonePolicy.status",
              else: {
                $cond: {
                  if: "$cityPolicy",
                  then: "$cityPolicy.status",
                  else: {
                    $cond: {
                      if: "$statePolicy",
                      then: "$statePolicy.status",
                      else: { $ifNull: ["$globalPolicy.status", "active"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  );

  if (query.status) {
    pipeline.push({
      $match: { status: (query.status as string).toLowerCase() },
    });
  }

  // Count total before skip/limit
  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await ServiceArea.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Sorting
  const sortObj = parseSort(query.sort as string);
  pipeline.push({ $sort: sortObj });

  // Pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  const result = await ServiceArea.aggregate(pipeline);
  const totalPage = Math.ceil(total / limit);

  return {
    data: result,
    meta: { page, limit, total, totalPage },
  };
};

const getAirportRulesFromDB = async (query: Record<string, unknown>) => {
  const pipeline: any[] = [
    { $match: { type: "airport", isDeleted: { $ne: true } } },
  ];

  if (query.airport) {
    pipeline.push({
      $match: { airport: { $regex: query.airport as string, $options: "i" } },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "serviceareas",
        localField: "cityId",
        foreignField: "_id",
        as: "cityDoc",
      },
    },
    { $unwind: { path: "$cityDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "serviceareas",
        let: { stateId: { $ifNull: ["$stateId", "$cityDoc.stateId"] } },
        pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$stateId"] } } }],
        as: "stateDoc",
      },
    },
    { $unwind: { path: "$stateDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "serviceareas",
        localField: "zoneId",
        foreignField: "_id",
        as: "zoneDoc",
      },
    },
    { $unwind: { path: "$zoneDoc", preserveNullAndEmptyArrays: true } },
  );

  if (query.city) {
    pipeline.push({
      $match: {
        "cityDoc.city": { $regex: query.city as string, $options: "i" },
      },
    });
  }

  if (query.state) {
    pipeline.push({
      $match: {
        "stateDoc.state": { $regex: query.state as string, $options: "i" },
      },
    });
  }

  if (query.searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { airport: { $regex: query.searchTerm as string, $options: "i" } },
          {
            "cityDoc.city": {
              $regex: query.searchTerm as string,
              $options: "i",
            },
          },
          {
            "stateDoc.state": {
              $regex: query.searchTerm as string,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { airportId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "airport"] },
                  { $eq: ["$airportId", "$$airportId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "airportPolicy",
      },
    },
    { $unwind: { path: "$airportPolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { zoneId: "$zoneId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "zone"] },
                  { $eq: ["$zoneId", "$$zoneId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "zonePolicy",
      },
    },
    { $unwind: { path: "$zonePolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { cityId: "$cityId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "city"] },
                  { $eq: ["$cityId", "$$cityId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "cityPolicy",
      },
    },
    { $unwind: { path: "$cityPolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        let: { stateId: { $ifNull: ["$stateId", "$cityDoc.stateId"] } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$scopeType", "state"] },
                  { $eq: ["$stateId", "$$stateId"] },
                  { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
                ],
              },
            },
          },
        ],
        as: "statePolicy",
      },
    },
    { $unwind: { path: "$statePolicy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "driverdutypolicies",
        pipeline: [
          {
            $match: {
              scopeType: "global",
              $expr: { $eq: [{ $ifNull: ["$isDeleted", false] }, false] },
            },
          },
        ],
        as: "globalPolicy",
      },
    },
    { $unwind: { path: "$globalPolicy", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        airport: "$airport",
        city: { $ifNull: ["$cityDoc.city", ""] },
        state: { $ifNull: ["$stateDoc.state", ""] },
        inheritance: {
          $cond: {
            if: "$airportPolicy",
            then: "CUSTOM",
            else: {
              $cond: {
                if: "$zonePolicy",
                then: "ZONE",
                else: {
                  $cond: {
                    if: "$cityPolicy",
                    then: "CITY",
                    else: {
                      $cond: {
                        if: "$statePolicy",
                        then: "STATE",
                        else: "GLOBAL",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        maxHours: {
          $cond: {
            if: "$airportPolicy",
            then: "$airportPolicy.maxContinuousDrivingHours",
            else: {
              $cond: {
                if: "$zonePolicy",
                then: "$zonePolicy.maxContinuousDrivingHours",
                else: {
                  $cond: {
                    if: "$cityPolicy",
                    then: "$cityPolicy.maxContinuousDrivingHours",
                    else: {
                      $cond: {
                        if: "$statePolicy",
                        then: "$statePolicy.maxContinuousDrivingHours",
                        else: {
                          $ifNull: [
                            "$globalPolicy.maxContinuousDrivingHours",
                            0,
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        resetHours: {
          $cond: {
            if: "$airportPolicy",
            then: "$airportPolicy.minimumRestHours",
            else: {
              $cond: {
                if: "$zonePolicy",
                then: "$zonePolicy.minimumRestHours",
                else: {
                  $cond: {
                    if: "$cityPolicy",
                    then: "$cityPolicy.minimumRestHours",
                    else: {
                      $cond: {
                        if: "$statePolicy",
                        then: "$statePolicy.minimumRestHours",
                        else: {
                          $ifNull: ["$globalPolicy.minimumRestHours", 0],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        dailyLimit: {
          $cond: {
            if: "$airportPolicy",
            then: "$airportPolicy.maxDrivingHoursPerDay",
            else: {
              $cond: {
                if: "$zonePolicy",
                then: "$zonePolicy.maxDrivingHoursPerDay",
                else: {
                  $cond: {
                    if: "$cityPolicy",
                    then: "$cityPolicy.maxDrivingHoursPerDay",
                    else: {
                      $cond: {
                        if: "$statePolicy",
                        then: "$statePolicy.maxDrivingHoursPerDay",
                        else: {
                          $ifNull: ["$globalPolicy.maxDrivingHoursPerDay", 0],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        weeklyLimit: { $literal: 0 },
        breakMinutes: {
          $cond: {
            if: "$airportPolicy",
            then: "$airportPolicy.breakDurationMinutes",
            else: {
              $cond: {
                if: "$zonePolicy",
                then: "$zonePolicy.breakDurationMinutes",
                else: {
                  $cond: {
                    if: "$cityPolicy",
                    then: "$cityPolicy.breakDurationMinutes",
                    else: {
                      $cond: {
                        if: "$statePolicy",
                        then: "$statePolicy.breakDurationMinutes",
                        else: {
                          $ifNull: ["$globalPolicy.breakDurationMinutes", 0],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        status: {
          $toLower: {
            $cond: {
              if: "$airportPolicy",
              then: "$airportPolicy.status",
              else: {
                $cond: {
                  if: "$zonePolicy",
                  then: "$zonePolicy.status",
                  else: {
                    $cond: {
                      if: "$cityPolicy",
                      then: "$cityPolicy.status",
                      else: {
                        $cond: {
                          if: "$statePolicy",
                          then: "$statePolicy.status",
                          else: { $ifNull: ["$globalPolicy.status", "active"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  );

  if (query.status) {
    pipeline.push({
      $match: { status: (query.status as string).toLowerCase() },
    });
  }

  // Count total before skip/limit
  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await ServiceArea.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Sorting
  const sortObj = parseSort(query.sort as string);
  pipeline.push({ $sort: sortObj });

  // Pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  const result = await ServiceArea.aggregate(pipeline);
  const totalPage = Math.ceil(total / limit);

  return {
    data: result,
    meta: { page, limit, total, totalPage },
  };
};

const getMonitoringCardsFromDB = async () => {
  const [totalDrivers, activeDrivers, onBreakDrivers, restrictedDrivers] =
    await Promise.all([
      Driver.countDocuments({}),
      Driver.countDocuments({
        driverAvailabilityStatus: "online",
        "availability.canReceiveRide": true,
      }),
      Driver.countDocuments({
        driverAvailabilityStatus: "break",
      }),
      Driver.countDocuments({
        "availability.canReceiveRide": false,
      }),
    ]);

  return {
    totalDrivers,
    activeDrivers,
    onBreakDrivers,
    restrictedDrivers,
  };
};

const getDriverMonitoringListFromDB = async (
  query: Record<string, unknown>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // 1. Build user query for searchTerm
  const userConditions: any[] = [];
  if (query.searchTerm) {
    userConditions.push({
      name: { $regex: query.searchTerm as string, $options: "i" },
    });
    userConditions.push({
      email: { $regex: query.searchTerm as string, $options: "i" },
    });
    userConditions.push({
      phone: { $regex: query.searchTerm as string, $options: "i" },
    });
  }

  let matchedUserIds: any[] = [];
  if (userConditions.length > 0) {
    const matchingUsers = await User.find({ $or: userConditions }).select(
      "_id",
    );
    matchedUserIds = matchingUsers.map((u) => u._id);
  }

  // 2. Build driver query
  const driverQuery: any = {};

  if (query.searchTerm) {
    driverQuery.userId = { $in: matchedUserIds };
  }

  // City and State filtering
  if (query.city || query.state) {
    const saQuery: any = { isDeleted: { $ne: true } };
    if (query.city) {
      saQuery.city = { $regex: query.city as string, $options: "i" };
    }
    if (query.state) {
      saQuery.state = { $regex: query.state as string, $options: "i" };
    }
    const matchingSAs = await ServiceArea.find(saQuery).select("_id");
    driverQuery.serviceAreaId = { $in: matchingSAs.map((sa) => sa._id) };
  }

  // Status filtering
  if (query.status) {
    const statusStr = (query.status as string).toLowerCase();
    if (statusStr === "restricted" || statusStr === "blocked") {
      driverQuery["availability.canReceiveRide"] = false;
    } else if (statusStr === "online") {
      driverQuery.driverAvailabilityStatus = "online";
      driverQuery["availability.canReceiveRide"] = true;
    } else {
      driverQuery.driverAvailabilityStatus = statusStr;
    }
  }

  // 3. Count total drivers
  const total = await Driver.countDocuments(driverQuery);

  // 4. Query drivers page
  // Sort
  const sortObj = parseSort(query.sort as string);

  const drivers = await Driver.find(driverQuery)
    .populate({
      path: "userId",
      select: "name email phone profileImage",
    })
    .populate({
      path: "serviceAreaId",
      select: "city state zone airport timezone cityId stateId type",
      populate: [
        {
          path: "cityId",
          select: "city stateId type",
          populate: {
            path: "stateId",
            select: "state type",
          },
        },
        {
          path: "stateId",
          select: "state type",
        },
      ],
    })
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // 5. Calculate duty stats for each driver dynamically
  const items = [];
  for (const driver of drivers) {
    const user = driver.userId as any;
    const serviceArea = driver.serviceAreaId as any;

    let city = "";
    let state = "";
    if (serviceArea) {
      if (serviceArea.type === "city") {
        city = serviceArea.city || "";
        state = serviceArea.state || serviceArea.stateId?.state || "";
      } else if (serviceArea.type === "state") {
        city = "";
        state = serviceArea.state || "";
      } else if (
        serviceArea.type === "airport" ||
        serviceArea.type === "zone"
      ) {
        const parentCity = serviceArea.cityId as any;
        city = parentCity?.city || "";
        const parentState =
          (serviceArea.stateId as any) || (parentCity?.stateId as any);
        state = parentState?.state || "";
      }
    }

    let maxHours = 0;
    let resetHours = 0;
    let dailyLimit = 0;
    let weeklyLimit = 0;
    let breakMinutes = 0;
    let drivingHoursToday = 0;
    let remainingHoursToday = 0;
    let continuousDrivingHours = 0;

    // Resolve timezone
    const timezone = serviceArea?.timezone || "UTC";

    // Resolve policy limits
    // Use the same coordinate-based lookup first if location exists
    let policy = null;
    if (driver.location && driver.location.coordinates) {
      const [lon, lat] = driver.location.coordinates;
      const driverLocServiceArea =
        await ServiceAreaServices.findServiceAreaByCoordinates(lon, lat);
      if (driverLocServiceArea) {
        const pQuery: any = { status: "active" };
        if (driverLocServiceArea.type === "city")
          pQuery.cityId = driverLocServiceArea._id;
        else if (driverLocServiceArea.type === "zone")
          pQuery.zoneId = driverLocServiceArea._id;
        else if (driverLocServiceArea.type === "airport")
          pQuery.airportId = driverLocServiceArea._id;
        else if (driverLocServiceArea.type === "state")
          pQuery.stateId = driverLocServiceArea._id;
        else if (driverLocServiceArea.type === "country")
          pQuery.countryId = driverLocServiceArea._id;
        policy = await DriverDutyPolicy.findOne(pQuery);
      }
    }

    // Fallback to driver's registered serviceArea policy if coordinate-based policy not found
    if (!policy && driver.serviceAreaId) {
      const pQuery: any = { status: "active" };
      if (serviceArea?.type === "city") pQuery.cityId = driver.serviceAreaId;
      else if (serviceArea?.type === "zone")
        pQuery.zoneId = driver.serviceAreaId;
      else if (serviceArea?.type === "airport")
        pQuery.airportId = driver.serviceAreaId;
      else if (serviceArea?.type === "state")
        pQuery.stateId = driver.serviceAreaId;
      else if (serviceArea?.type === "country")
        pQuery.countryId = driver.serviceAreaId;
      policy = await DriverDutyPolicy.findOne(pQuery);
    }

    // Fallback to global policy if still not found
    if (!policy) {
      policy = await DriverDutyPolicy.findOne({ scopeType: "global" });
    }

    if (policy) {
      maxHours = policy.maxContinuousDrivingHours || 0;
      resetHours = policy.minimumRestHours || 0;
      dailyLimit = policy.maxDrivingHoursPerDay || 0;
      breakMinutes = policy.breakDurationMinutes || 0;
    }

    // Calculate today's driving hours starting at local midnight
    const startOfDay = getCurrentTimeInTimezone(timezone)
      .startOf("day")
      .toUTC()
      .toJSDate();

    const completedRides = await Ride.find({
      driverId: driver.userId,
      status: "completed",
      completedAt: { $gte: startOfDay },
    }).sort({ completedAt: 1 });

    for (const ride of completedRides) {
      if (ride.startedAt && ride.completedAt) {
        const durationHrs =
          (ride.completedAt.getTime() - ride.startedAt.getTime()) /
          (1000 * 60 * 60);
        drivingHoursToday += durationHrs;
      }
    }

    remainingHoursToday = Math.max(0, dailyLimit - drivingHoursToday);

    // Calculate continuous driving hours going backward
    if (policy && policy.maxContinuousDrivingHours > 0) {
      let lastRideEndTime = new Date();
      for (let i = completedRides.length - 1; i >= 0; i--) {
        const ride = completedRides[i];
        if (ride.startedAt && ride.completedAt) {
          const rideDuration =
            (ride.completedAt.getTime() - ride.startedAt.getTime()) /
            (1000 * 60 * 60);
          const gapHours =
            (lastRideEndTime.getTime() - ride.completedAt.getTime()) /
            (1000 * 60 * 60);

          if (gapHours > policy.breakAfterHours) {
            break;
          }

          continuousDrivingHours += rideDuration;
          lastRideEndTime = ride.completedAt;
        }
      }
    }

    // Determine status
    let status = "offline";
    if (driver.driverAvailabilityStatus === "offline") {
      status = "offline";
    } else if (driver.driverAvailabilityStatus === "break") {
      status = "break";
    } else if (driver.driverAvailabilityStatus === "on_trip") {
      status = "on_trip";
    } else if (driver.driverAvailabilityStatus === "online") {
      if (driver.availability?.canReceiveRide === false) {
        status = driver.availability?.blockedReason?.toLowerCase() || "blocked";
      } else {
        status = "online";
      }
    }

    items.push({
      driverId: driver._id,
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      profileImage: user?.profileImage || "",
      city,
      state,
      maxHours,
      resetHours,
      dailyLimit,
      weeklyLimit,
      breakMinutes,
      drivingHoursToday: Number(drivingHoursToday.toFixed(2)),
      remainingHoursToday: Number(remainingHoursToday.toFixed(2)),
      continuousDrivingHours: Number(continuousDrivingHours.toFixed(2)),
      status,
    });
  }

  const totalPage = Math.ceil(total / limit);

  return {
    data: items,
    meta: { page, limit, total, totalPage },
  };
};

export const DriverDutyPolicyServices = {
  createDriverDutyPolicyToDB,
  getDriverDutyPolicyFromDB,
  getAllDriverDutyPoliciesFromDB,
  updateDriverDutyPolicyFromDB,
  deleteDriverDutyPolicyFromDB,
  getActiveDriverDutyPoliciesFromDB,
  updateDriverDutyPolicyStatusFromDB,
  getDriverAvailability,
  updateDriverAvailability,
  getGlobalRuleFromDB,
  getStateRulesFromDB,
  getCityRulesFromDB,
  getZoneRulesFromDB,
  getAirportRulesFromDB,
  getMonitoringCardsFromDB,
  getDriverMonitoringListFromDB,
};
