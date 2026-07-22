import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { User } from "../user/user.model";
import { Driver } from "./driver.model";
import { IDriver } from "./driver.interface";
import { EXTRACTION_STATUS } from "./driver.constant";
import { DriverDutyPolicyServices } from "../driverDutyPolicy/driverDutyPolicy.service";

const createDriverToDB = async (userId: string, payload: Partial<IDriver>) => {
  const existingUser = await User.isExistUserById(userId);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const existingDriver = await Driver.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (existingDriver) {
    throw new ApiError(409, "Driver profile already exists for this user");
  }

  // Process taxDocuments to ensure they have required fields
  let processedTaxDocuments = payload.taxDocuments;
  if (processedTaxDocuments && Array.isArray(processedTaxDocuments)) {
    processedTaxDocuments = processedTaxDocuments.map((doc) => ({
      ...doc,
      extractionStatus: doc.extractionStatus || EXTRACTION_STATUS.PENDING,
      extractedData: doc.extractedData || {},
    }));
  }

  const driverPayload = {
    userId: new Types.ObjectId(userId),
    ...payload,
    taxDocuments: processedTaxDocuments || [],
  };

  const driver = await Driver.create(driverPayload);

  return driver;
};

const getDriverProfileFromDB = async (userId: string) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });

  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  return driver;
};

const updateDriverFromDB = async (
  userId: string,
  payload: Partial<IDriver>,
) => {
  const existingUser = await User.isExistUserById(userId);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const { userId: _, ...updatePayload } = payload as Partial<IDriver> & {
    userId?: Types.ObjectId;
  };

  // Process taxDocuments if present
  if (updatePayload.taxDocuments && Array.isArray(updatePayload.taxDocuments)) {
    updatePayload.taxDocuments = updatePayload.taxDocuments.map((doc) => ({
      ...doc,
      extractionStatus: doc.extractionStatus || EXTRACTION_STATUS.PENDING,
      extractedData: doc.extractedData || {},
    }));
  }

  const updatedDriver = await Driver.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    updatePayload,
    { new: true, runValidators: true },
  );

  if (!updatedDriver) {
    throw new ApiError(404, "Driver profile not found");
  }

  return updatedDriver;
};

const getDriverAvailability = async (userId: string) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  const availabilityData =
    await DriverDutyPolicyServices.getDriverAvailability(userId);

  // Update driver's availability in database
  await Driver.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    {
      $set: {
        "availability.canReceiveRide": availabilityData.canReceiveRide,
        "availability.blockedReason": availabilityData.blockedReason,
        "availability.blockedUntil": availabilityData.blockedUntil,
      },
    },
  );

  return availabilityData;
};

import { Ride } from "../ride/ride.model";
import { RIDE_TYPE, RIDE_STATUS } from "../ride/ride.constant";
import QueryBuilder from "../../builder/queryBuilder";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { getCurrentTimeInTimezone } from "../../../shared/timezoneHelper";
import { ServiceArea } from "../serviceArea/serviceArea.model";

const getDriverReservationsFromDB = async (
  driverUserId: string,
  query: Record<string, unknown>,
) => {
  const systemConfig = await getSystemConfig();
  const visibleBeforeMs =
    (systemConfig.reservation.driverVisibleBeforeMinutes || 60) * 60 * 1000;

  const now = new Date();
  const visibilityWindowMaxDate = new Date(now.getTime() + visibleBeforeMs);

  const statusFilter = query.status as string; // "upcoming", "today", "completed", "cancelled", "all"

  const filterQuery: Record<string, any> = {
    rideType: RIDE_TYPE.SCHEDULED,
    $or: [
      { assignedDriverId: new Types.ObjectId(driverUserId) },
      { driverId: new Types.ObjectId(driverUserId) },
    ],
  };

  // Get driver's service area for timezone-aware date calculations
  const driver = await Driver.findOne({
    userId: new Types.ObjectId(driverUserId),
  });
  let driverTimezone = "UTC";
  if (driver?.serviceAreaId) {
    const serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || "UTC";
  }

  // Calculate start/end of day in driver's timezone
  const startOfDay = getCurrentTimeInTimezone(driverTimezone)
    .startOf("day")
    .toUTC()
    .toJSDate();
  const endOfDay = getCurrentTimeInTimezone(driverTimezone)
    .endOf("day")
    .toUTC()
    .toJSDate();

  if (statusFilter === "upcoming") {
    filterQuery.status = {
      $in: [RIDE_STATUS.SEARCHING_DRIVER, RIDE_STATUS.DRIVER_ACCEPTED],
    };
    filterQuery.scheduledAt = {
      $gte: now,
      $lte: visibilityWindowMaxDate,
    };
  } else if (statusFilter === "today") {
    filterQuery.scheduledAt = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  } else if (statusFilter === "completed") {
    filterQuery.status = RIDE_STATUS.COMPLETED;
  } else if (statusFilter === "cancelled") {
    filterQuery.status = {
      $in: [
        RIDE_STATUS.CANCELLED,
        RIDE_STATUS.CANCELLED_BY_USER,
        RIDE_STATUS.CANCELLED_BY_DRIVER,
        RIDE_STATUS.EXPIRED,
      ],
    };
  } else {
    filterQuery.$and = [
      {
        $or: [
          { status: { $ne: RIDE_STATUS.SEARCHING_DRIVER } },
          { scheduledAt: { $lte: visibilityWindowMaxDate } },
        ],
      },
    ];
  }

  const reservationQuery = new QueryBuilder(
    Ride.find(filterQuery).populate("userId", "name profileImage phone"),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await reservationQuery.modelQuery;
  const meta = await reservationQuery.countTotal();

  return { data, meta };
};

export const DriverServices = {
  createDriverToDB,
  getDriverProfileFromDB,
  updateDriverFromDB,
  getDriverAvailability,
  getDriverReservationsFromDB,
};
