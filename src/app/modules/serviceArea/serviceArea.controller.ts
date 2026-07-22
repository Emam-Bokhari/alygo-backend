import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceAreaServices } from "./serviceArea.service";

const createServiceArea = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.createServiceAreaToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Service area created successfully",
    data: result,
  });
});

const getServiceArea = catchAsync(async (req, res) => {
  const { serviceAreaId } = req.params;
  const result = await ServiceAreaServices.getServiceAreaFromDB(serviceAreaId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service area retrieved successfully",
    data: result,
  });
});

const getAllServiceAreas = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.getAllServiceAreasFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service areas retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getCountries = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.getCountriesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Countries retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getStatesByCountry = catchAsync(async (req, res) => {
  const { countryId } = req.params;
  const result = await ServiceAreaServices.getStatesByCountryFromDB(
    countryId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "States retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getStates = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.getStatesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "States retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getCitiesByState = catchAsync(async (req, res) => {
  const { stateId } = req.params;
  const result = await ServiceAreaServices.getCitiesByStateFromDB(
    stateId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cities retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getZonesByCity = catchAsync(async (req, res) => {
  const { cityId } = req.params;
  const result = await ServiceAreaServices.getZonesByCityFromDB(
    cityId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Zones retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getAirportsByCity = catchAsync(async (req, res) => {
  const { cityId } = req.params;
  const result = await ServiceAreaServices.getAirportsByCityFromDB(
    cityId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Airports retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateServiceArea = catchAsync(async (req, res) => {
  const { serviceAreaId } = req.params;
  const result = await ServiceAreaServices.updateServiceAreaFromDB(
    serviceAreaId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service area updated successfully",
    data: result,
  });
});

const deleteServiceArea = catchAsync(async (req, res) => {
  const { serviceAreaId } = req.params;
  const result =
    await ServiceAreaServices.deleteServiceAreaFromDB(serviceAreaId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service area deleted successfully",
    data: result,
  });
});

const findServiceAreaByCoordinates = catchAsync(async (req, res) => {
  const { longitude, latitude } = req.query;

  if (!longitude || !latitude) {
    return sendResponse(res, {
      success: false,
      statusCode: 400,
      message: "Longitude and latitude are required",
    });
  }

  const result = await ServiceAreaServices.findServiceAreaByCoordinates(
    Number(longitude),
    Number(latitude),
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service area found by coordinates",
    data: result,
  });
});

const findAllServiceAreasByCoordinates = catchAsync(async (req, res) => {
  const { longitude, latitude } = req.query;

  if (!longitude || !latitude) {
    return sendResponse(res, {
      success: false,
      statusCode: 400,
      message: "Longitude and latitude are required",
    });
  }

  const result = await ServiceAreaServices.findAllServiceAreasByCoordinates(
    Number(longitude),
    Number(latitude),
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service areas found by coordinates",
    data: result,
  });
});

const isPointInServiceArea = catchAsync(async (req, res) => {
  const { serviceAreaId } = req.params;
  const { longitude, latitude } = req.query;

  if (!longitude || !latitude) {
    return sendResponse(res, {
      success: false,
      statusCode: 400,
      message: "Longitude and latitude are required",
    });
  }

  const result = await ServiceAreaServices.isPointInServiceArea(
    serviceAreaId,
    Number(longitude),
    Number(latitude),
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Point in service area check completed",
    data: { isInServiceArea: result },
  });
});

export const ServiceAreaController = {
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
