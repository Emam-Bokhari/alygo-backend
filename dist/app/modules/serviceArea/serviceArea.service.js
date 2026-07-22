"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAreaServices = void 0;
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const serviceArea_model_1 = require("./serviceArea.model");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const googleRouteService_1 = require("../../../services/googleRouteService");
const logger_1 = require("../../../shared/logger");
const createServiceAreaToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const serviceArea = yield serviceArea_model_1.ServiceArea.create(payload);
    return serviceArea;
  });
const getServiceAreaFromDB = (serviceAreaId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const serviceArea =
      yield serviceArea_model_1.ServiceArea.findById(serviceAreaId);
    if (!serviceArea) {
      throw new ApiErrors_1.default(404, "Service area not found");
    }
    return serviceArea;
  });
const getAllServiceAreasFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const serviceAreaQuery = new queryBuilder_1.default(
      serviceArea_model_1.ServiceArea.find(),
      query,
    )
      .search(["country", "state", "city", "zone", "airport"])
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield serviceAreaQuery.modelQuery;
    const meta = yield serviceAreaQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const getCountriesFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const countriesQuery = new queryBuilder_1.default(
      serviceArea_model_1.ServiceArea.find({ type: "country" }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield countriesQuery.modelQuery;
    const meta = yield countriesQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const getStatesByCountryFromDB = (countryId, query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const statesQuery = new queryBuilder_1.default(
      serviceArea_model_1.ServiceArea.find({
        type: "state",
        countryId: new mongoose_1.Types.ObjectId(countryId),
      }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield statesQuery.modelQuery;
    const meta = yield statesQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const getStatesFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const statesQuery = new queryBuilder_1.default(
      serviceArea_model_1.ServiceArea.find({ type: "state" }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield statesQuery.modelQuery;
    const meta = yield statesQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const getCitiesByStateFromDB = (stateId, query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const citiesQuery = new queryBuilder_1.default(
      serviceArea_model_1.ServiceArea.find({
        type: "city",
        stateId: new mongoose_1.Types.ObjectId(stateId),
      }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield citiesQuery.modelQuery;
    const meta = yield citiesQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const getZonesByCityFromDB = (cityId, query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const zonesQuery = new queryBuilder_1.default(
      serviceArea_model_1.ServiceArea.find({
        type: "zone",
        cityId: new mongoose_1.Types.ObjectId(cityId),
      }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield zonesQuery.modelQuery;
    const meta = yield zonesQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const getAirportsByCityFromDB = (cityId, query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const airportsQuery = new queryBuilder_1.default(
      serviceArea_model_1.ServiceArea.find({
        type: "airport",
        cityId: new mongoose_1.Types.ObjectId(cityId),
      }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield airportsQuery.modelQuery;
    const meta = yield airportsQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const updateServiceAreaFromDB = (serviceAreaId, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const updatedServiceArea =
      yield serviceArea_model_1.ServiceArea.findByIdAndUpdate(
        serviceAreaId,
        payload,
        { new: true, runValidators: true },
      );
    if (!updatedServiceArea) {
      throw new ApiErrors_1.default(404, "Service area not found");
    }
    return updatedServiceArea;
  });
const deleteServiceAreaFromDB = (serviceAreaId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const deletedServiceArea =
      yield serviceArea_model_1.ServiceArea.softDeleteById(serviceAreaId);
    if (!deletedServiceArea) {
      throw new ApiErrors_1.default(404, "Service area not found");
    }
    return deletedServiceArea;
  });
/**
 * Find Service Area by coordinates using geospatial query
 * Returns the most specific active service area that covers the given coordinates
 * Priority: airport > zone > city > state > country
 */
const findServiceAreaByCoordinates = (longitude, latitude) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Find service areas that contain this point within their coverage radius
    const serviceAreas = yield serviceArea_model_1.ServiceArea.find({
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
    const matchingAreas = [];
    if (serviceAreas.length > 0) {
      try {
        const validServiceAreas = serviceAreas.filter(
          (sa) => sa.location && sa.location.coordinates,
        );
        if (validServiceAreas.length > 0) {
          const origins = [{ lat: latitude, lng: longitude }];
          const destinations = validServiceAreas.map((sa) => ({
            lat: sa.location.coordinates[1],
            lng: sa.location.coordinates[0],
          }));
          const matrix =
            yield googleRouteService_1.GoogleRouteService.calculateDistanceMatrix(
              origins,
              destinations,
            );
          for (let i = 0; i < validServiceAreas.length; i++) {
            const serviceArea = validServiceAreas[i];
            const result =
              (_a = matrix[0]) === null || _a === void 0 ? void 0 : _a[i];
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
        logger_1.logger.error(
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
      const priorityA = typePriority[a.type] || 99;
      const priorityB = typePriority[b.type] || 99;
      return priorityA - priorityB;
    });
    return matchingAreas[0];
  });
/**
 * Find all Service Areas that cover the given coordinates
 */
const findAllServiceAreasByCoordinates = (longitude, latitude) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serviceAreas = yield serviceArea_model_1.ServiceArea.find({
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
    const matchingAreas = [];
    if (serviceAreas.length > 0) {
      try {
        const validServiceAreas = serviceAreas.filter(
          (sa) => sa.location && sa.location.coordinates,
        );
        if (validServiceAreas.length > 0) {
          const origins = [{ lat: latitude, lng: longitude }];
          const destinations = validServiceAreas.map((sa) => ({
            lat: sa.location.coordinates[1],
            lng: sa.location.coordinates[0],
          }));
          const matrix =
            yield googleRouteService_1.GoogleRouteService.calculateDistanceMatrix(
              origins,
              destinations,
            );
          for (let i = 0; i < validServiceAreas.length; i++) {
            const serviceArea = validServiceAreas[i];
            const result =
              (_a = matrix[0]) === null || _a === void 0 ? void 0 : _a[i];
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
        logger_1.logger.error(
          `[ServiceAreaService] Error checking service area coverage via Google: ${err}`,
        );
        throw err;
      }
    }
    return matchingAreas;
  });
/**
 * Check if a point is within a Service Area's coverage
 */
const isPointInServiceArea = (serviceAreaId, longitude, latitude) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const serviceArea =
      yield serviceArea_model_1.ServiceArea.findById(serviceAreaId);
    if (
      !serviceArea ||
      !serviceArea.location ||
      !serviceArea.coverageRadiusKm
    ) {
      return false;
    }
    try {
      const distance =
        yield googleRouteService_1.GoogleRouteService.getRoadDistance(
          { lat: latitude, lng: longitude },
          {
            lat: serviceArea.location.coordinates[1],
            lng: serviceArea.location.coordinates[0],
          },
        );
      return distance <= serviceArea.coverageRadiusKm;
    } catch (err) {
      logger_1.logger.error(
        `[ServiceAreaService] Error checking point inside service area coverage: ${err}`,
      );
      throw err;
    }
  });
exports.ServiceAreaServices = {
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
