import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { ServiceArea } from "./serviceArea.model";
import { IServiceArea } from "./serviceArea.interface";
import QueryBuilder from "../../builder/queryBuilder";
import { GoogleRouteService } from "../../../services/googleRouteService";
import { logger } from "../../../shared/logger";

const createServiceAreaToDB = async (payload: Partial<IServiceArea>) => {
  const serviceArea = await ServiceArea.create(payload);
  return serviceArea;
};

const getServiceAreaFromDB = async (serviceAreaId: string) => {
  const serviceArea = await ServiceArea.findById(serviceAreaId);

  if (!serviceArea) {
    throw new ApiError(404, "Service area not found");
  }

  return serviceArea;
};

const getAllServiceAreasFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IServiceArea[]; meta: any }> => {
  const serviceAreaQuery = new QueryBuilder(ServiceArea.find(), query)
    .search(["country", "state", "city", "zone", "airport"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await serviceAreaQuery.modelQuery;
  const meta = await serviceAreaQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const getCountriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IServiceArea[]; meta: any }> => {
  const countriesQuery = new QueryBuilder(
    ServiceArea.find({ type: "country" }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await countriesQuery.modelQuery;
  const meta = await countriesQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const getStatesByCountryFromDB = async (
  countryId: string,
  query: Record<string, unknown>,
): Promise<{ data: IServiceArea[]; meta: any }> => {
  const statesQuery = new QueryBuilder(
    ServiceArea.find({
      type: "state",
      countryId: new Types.ObjectId(countryId),
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await statesQuery.modelQuery;
  const meta = await statesQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const getStatesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IServiceArea[]; meta: any }> => {
  const statesQuery = new QueryBuilder(
    ServiceArea.find({ type: "state" }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await statesQuery.modelQuery;
  const meta = await statesQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const getCitiesByStateFromDB = async (
  stateId: string,
  query: Record<string, unknown>,
): Promise<{ data: IServiceArea[]; meta: any }> => {
  const citiesQuery = new QueryBuilder(
    ServiceArea.find({
      type: "city",
      stateId: new Types.ObjectId(stateId),
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await citiesQuery.modelQuery;
  const meta = await citiesQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const getZonesByCityFromDB = async (
  cityId: string,
  query: Record<string, unknown>,
): Promise<{ data: IServiceArea[]; meta: any }> => {
  const zonesQuery = new QueryBuilder(
    ServiceArea.find({
      type: "zone",
      cityId: new Types.ObjectId(cityId),
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await zonesQuery.modelQuery;
  const meta = await zonesQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const getAirportsByCityFromDB = async (
  cityId: string,
  query: Record<string, unknown>,
): Promise<{ data: IServiceArea[]; meta: any }> => {
  const airportsQuery = new QueryBuilder(
    ServiceArea.find({
      type: "airport",
      cityId: new Types.ObjectId(cityId),
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await airportsQuery.modelQuery;
  const meta = await airportsQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const updateServiceAreaFromDB = async (
  serviceAreaId: string,
  payload: Partial<IServiceArea>,
) => {
  const updatedServiceArea = await ServiceArea.findByIdAndUpdate(
    serviceAreaId,
    payload,
    { new: true, runValidators: true },
  );

  if (!updatedServiceArea) {
    throw new ApiError(404, "Service area not found");
  }

  return updatedServiceArea;
};

const deleteServiceAreaFromDB = async (serviceAreaId: string) => {
  const deletedServiceArea = await ServiceArea.softDeleteById(serviceAreaId);

  if (!deletedServiceArea) {
    throw new ApiError(404, "Service area not found");
  }

  return deletedServiceArea;
};

/**
 * Find Service Area by coordinates using geospatial query
 * Returns the most specific active service area that covers the given coordinates
 * Priority: airport > zone > city > state > country
 */
const findServiceAreaByCoordinates = async (
  longitude: number,
  latitude: number,
): Promise<IServiceArea | null> => {
  // Find service areas that contain this point within their coverage radius
  const serviceAreas = await ServiceArea.find({
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: 50000, // 50km default max search radius (will be filtered by coverageRadiusKm)
      },
    },
    status: "active",
  });

  // Filter by actual coverage radius and collect matching areas using road distance matrix
  const matchingAreas: IServiceArea[] = [];
  if (serviceAreas.length > 0) {
    try {
      const validServiceAreas = serviceAreas.filter(
        (sa) => sa.location && sa.location.coordinates,
      );
      if (validServiceAreas.length > 0) {
        const origins = [{ lat: latitude, lng: longitude }];
        const destinations = validServiceAreas.map((sa) => ({
          lat: sa.location!.coordinates[1],
          lng: sa.location!.coordinates[0],
        }));

        const matrix = await GoogleRouteService.calculateDistanceMatrix(
          origins,
          destinations,
        );

        for (let i = 0; i < validServiceAreas.length; i++) {
          const serviceArea = validServiceAreas[i];
          const result = matrix[0]?.[i];
          if (
            result &&
            result.status === "OK" &&
            serviceArea.coverageRadiusKm !== undefined
          ) {
            if (result.distanceKm <= serviceArea.coverageRadiusKm) {
              matchingAreas.push(serviceArea);
            }
          }
        }
      }
    } catch (err) {
      logger.error(
        `[ServiceAreaService] Error checking service area coverage via Google: ${err}`,
      );
      throw err;
    }
  }

  if (matchingAreas.length === 0) {
    return null;
  }

  // Priority order: airport > zone > city > state > country
  const typePriority = {
    airport: 1,
    zone: 2,
    city: 3,
    state: 4,
    country: 5,
  };

  // Sort by priority and return the most specific
  matchingAreas.sort((a, b) => {
    const priorityA = typePriority[a.type as keyof typeof typePriority] || 99;
    const priorityB = typePriority[b.type as keyof typeof typePriority] || 99;
    return priorityA - priorityB;
  });

  return matchingAreas[0];
};

/**
 * Find all Service Areas that cover the given coordinates
 */
const findAllServiceAreasByCoordinates = async (
  longitude: number,
  latitude: number,
): Promise<IServiceArea[]> => {
  const serviceAreas = await ServiceArea.find({
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: 50000, // 50km default max search radius
      },
    },
    status: "active",
  });

  const matchingAreas: IServiceArea[] = [];
  if (serviceAreas.length > 0) {
    try {
      const validServiceAreas = serviceAreas.filter(
        (sa) => sa.location && sa.location.coordinates,
      );
      if (validServiceAreas.length > 0) {
        const origins = [{ lat: latitude, lng: longitude }];
        const destinations = validServiceAreas.map((sa) => ({
          lat: sa.location!.coordinates[1],
          lng: sa.location!.coordinates[0],
        }));

        const matrix = await GoogleRouteService.calculateDistanceMatrix(
          origins,
          destinations,
        );

        for (let i = 0; i < validServiceAreas.length; i++) {
          const serviceArea = validServiceAreas[i];
          const result = matrix[0]?.[i];
          if (
            result &&
            result.status === "OK" &&
            serviceArea.coverageRadiusKm !== undefined
          ) {
            if (result.distanceKm <= serviceArea.coverageRadiusKm) {
              matchingAreas.push(serviceArea);
            }
          }
        }
      }
    } catch (err) {
      logger.error(
        `[ServiceAreaService] Error checking service area coverage via Google: ${err}`,
      );
      throw err;
    }
  }

  return matchingAreas;
};

/**
 * Check if a point is within a Service Area's coverage
 */
const isPointInServiceArea = async (
  serviceAreaId: string,
  longitude: number,
  latitude: number,
): Promise<boolean> => {
  const serviceArea = await ServiceArea.findById(serviceAreaId);
  if (!serviceArea || !serviceArea.location || !serviceArea.coverageRadiusKm) {
    return false;
  }

  try {
    const distance = await GoogleRouteService.getRoadDistance(
      { lat: latitude, lng: longitude },
      {
        lat: serviceArea.location.coordinates[1],
        lng: serviceArea.location.coordinates[0],
      },
    );
    return distance <= serviceArea.coverageRadiusKm;
  } catch (err) {
    logger.error(
      `[ServiceAreaService] Error checking point inside service area coverage: ${err}`,
    );
    throw err;
  }
};

export const ServiceAreaServices = {
  createServiceAreaToDB,
  getServiceAreaFromDB,
  getAllServiceAreasFromDB,
  getCountriesFromDB,
  getStatesByCountryFromDB,
  getStatesFromDB,
  getCitiesByStateFromDB,
  getZonesByCityFromDB,
  getAirportsByCityFromDB,
  updateServiceAreaFromDB,
  deleteServiceAreaFromDB,
  findServiceAreaByCoordinates,
  findAllServiceAreasByCoordinates,
  isPointInServiceArea,
};
