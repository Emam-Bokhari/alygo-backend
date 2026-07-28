import { Ride } from "../ride/ride.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { RIDE_STATUS, RIDE_TYPE } from "../ride/ride.constant";
import {
  ILiveTripsQuery,
  ILiveTripsResponse,
  ILiveTrip,
} from "./liveTrips.interface";

const getLiveTripsFromDB = async (
  query: ILiveTripsQuery,
): Promise<ILiveTripsResponse> => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    status,
    rideCategoryId,
    driverId,
    passengerId,
    city,
    serviceAreaId,
    rideType,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Build match stage
  const matchStage: any = {};

  // Status filter
  if (status) {
    matchStage.status = status;
  }

  // Ride category filter
  if (rideCategoryId) {
    matchStage["rideCategory.categoryId"] = rideCategoryId;
  }

  // Driver filter
  if (driverId) {
    matchStage.driverId = driverId;
  }

  // Passenger filter
  if (passengerId) {
    matchStage.userId = passengerId;
  }

  // Service area filter
  if (serviceAreaId) {
    matchStage.serviceAreaId = serviceAreaId;
  }

  // Ride type filter
  if (rideType) {
    matchStage.rideType = rideType;
  }

  // Date range filter
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      matchStage.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchStage.createdAt.$lte = new Date(endDate);
    }
  }

  // Search filter - search across tripId, driver name, passenger name, pickup address, dropoff address
  const searchStage: any = {};
  if (searchTerm) {
    const searchRegex = new RegExp(searchTerm, "i");
    searchStage.$or = [
      { tripId: { $regex: searchRegex } },
      { "driver.name": { $regex: searchRegex } },
      { "passenger.name": { $regex: searchRegex } },
      { pickup: { $regex: searchRegex } },
      { dropoff: { $regex: searchRegex } },
    ];
  }

  // Build sort stage
  const sortStage: any = {};
  const validSortFields = ["createdAt", "fare", "status", "tripId"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sortStage[sortField] = sortOrder === "asc" ? 1 : -1;

  // Aggregation pipeline
  const pipeline: any[] = [
    // Match stage - filter rides first
    {
      $match: matchStage,
    },
    // Lookup driver (from User collection since driverId references User)
    {
      $lookup: {
        from: "users",
        localField: "driverId",
        foreignField: "_id",
        as: "driver",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$driver",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup passenger (from User collection)
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "passenger",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$passenger",
        preserveNullAndEmptyArrays: false,
      },
    },
    // Lookup service area for city
    {
      $lookup: {
        from: "serviceareas",
        localField: "serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
        pipeline: [
          {
            $project: {
              city: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$serviceArea",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Apply search filter after lookups
    ...(searchTerm ? [{ $match: searchStage }] : []),
    // Apply city filter after lookup
    ...(city
      ? [
          {
            $match: {
              "serviceArea.city": { $regex: city, $options: "i" },
            },
          },
        ]
      : []),
    // Project only required fields
    {
      $project: {
        _id: 1,
        tripId: 1,
        driver: {
          _id: "$driver._id",
          name: { $ifNull: ["$driver.name", ""] },
        },
        passenger: {
          _id: "$passenger._id",
          name: "$passenger.name",
        },
        category: "$rideCategory.name",
        pickup: "$pickup.address",
        dropoff: "$destination.address",
        city: { $ifNull: ["$serviceArea.city", ""] },
        status: 1,
        fare: "$fare.total",
        createdAt: 1,
      },
    },
    // Sort
    {
      $sort: sortStage,
    },
    // Facet for pagination
    {
      $facet: {
        items: [
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit,
          },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ];

  const result = await Ride.aggregate(pipeline);

  const data = result[0]?.items || [];
  const totalItems = result[0]?.totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: data as ILiveTrip[],
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
};

export const LiveTripsService = {
  getLiveTripsFromDB,
};
