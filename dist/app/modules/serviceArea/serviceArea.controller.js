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
exports.ServiceAreaController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const serviceArea_service_1 = require("./serviceArea.service");
const createServiceArea = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield serviceArea_service_1.ServiceAreaServices.createServiceAreaToDB(
        req.body,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 201,
      message: "Service area created successfully",
      data: result,
    });
  }),
);
const getServiceArea = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { serviceAreaId } = req.params;
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getServiceAreaFromDB(
        serviceAreaId,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Service area retrieved successfully",
      data: result,
    });
  }),
);
const getAllServiceAreas = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getAllServiceAreasFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Service areas retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const getCountries = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getCountriesFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Countries retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const getStatesByCountry = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { countryId } = req.params;
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getStatesByCountryFromDB(
        countryId,
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "States retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const getStates = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getStatesFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "States retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const getCitiesByState = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { stateId } = req.params;
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getCitiesByStateFromDB(
        stateId,
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Cities retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const getZonesByCity = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { cityId } = req.params;
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getZonesByCityFromDB(
        cityId,
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Zones retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const getAirportsByCity = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { cityId } = req.params;
    const result =
      yield serviceArea_service_1.ServiceAreaServices.getAirportsByCityFromDB(
        cityId,
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Airports retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const updateServiceArea = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { serviceAreaId } = req.params;
    const result =
      yield serviceArea_service_1.ServiceAreaServices.updateServiceAreaFromDB(
        serviceAreaId,
        req.body,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Service area updated successfully",
      data: result,
    });
  }),
);
const deleteServiceArea = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { serviceAreaId } = req.params;
    const result =
      yield serviceArea_service_1.ServiceAreaServices.deleteServiceAreaFromDB(
        serviceAreaId,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Service area deleted successfully",
      data: result,
    });
  }),
);
const findServiceAreaByCoordinates = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) {
      return (0, sendResponse_1.default)(res, {
        success: false,
        statusCode: 400,
        message: "Longitude and latitude are required",
      });
    }
    const result =
      yield serviceArea_service_1.ServiceAreaServices.findServiceAreaByCoordinates(
        Number(longitude),
        Number(latitude),
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Service area found by coordinates",
      data: result,
    });
  }),
);
const findAllServiceAreasByCoordinates = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) {
      return (0, sendResponse_1.default)(res, {
        success: false,
        statusCode: 400,
        message: "Longitude and latitude are required",
      });
    }
    const result =
      yield serviceArea_service_1.ServiceAreaServices.findAllServiceAreasByCoordinates(
        Number(longitude),
        Number(latitude),
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Service areas found by coordinates",
      data: result,
    });
  }),
);
const isPointInServiceArea = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { serviceAreaId } = req.params;
    const { longitude, latitude } = req.query;
    if (!longitude || !latitude) {
      return (0, sendResponse_1.default)(res, {
        success: false,
        statusCode: 400,
        message: "Longitude and latitude are required",
      });
    }
    const result =
      yield serviceArea_service_1.ServiceAreaServices.isPointInServiceArea(
        serviceAreaId,
        Number(longitude),
        Number(latitude),
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Point in service area check completed",
      data: { isInServiceArea: result },
    });
  }),
);
exports.ServiceAreaController = {
  createServiceArea,
  getServiceArea,
  getAllServiceAreas,
  getCountries,
  getStatesByCountry,
  getStates,
  getCitiesByState,
  getZonesByCity,
  getAirportsByCity,
  updateServiceArea,
  deleteServiceArea,
  findServiceAreaByCoordinates,
  findAllServiceAreasByCoordinates,
  isPointInServiceArea,
};
