import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { ServiceAreaController } from "./serviceArea.controller";

const router = express.Router();

router
  .route("/")
  .post(isAdmin, ServiceAreaController.createServiceArea)
  .get(isAuthenticated, ServiceAreaController.getAllServiceAreas);

router
  .route("/countries")
  .get(isAuthenticated, ServiceAreaController.getCountries);

router
  .route("/states/:countryId")
  .get(isAuthenticated, ServiceAreaController.getStatesByCountry);

router.route("/states").get(isAuthenticated, ServiceAreaController.getStates);

router
  .route("/cities/:stateId")
  .get(isAuthenticated, ServiceAreaController.getCitiesByState);

router
  .route("/zones/:cityId")
  .get(isAuthenticated, ServiceAreaController.getZonesByCity);

router
  .route("/airports/:cityId")
  .get(isAuthenticated, ServiceAreaController.getAirportsByCity);

router
  .route("/by-coordinates")
  .get(isAuthenticated, ServiceAreaController.findServiceAreaByCoordinates);

router
  .route("/all-by-coordinates")
  .get(isAuthenticated, ServiceAreaController.findAllServiceAreasByCoordinates);

router
  .route("/:serviceAreaId/check-point")
  .get(isAuthenticated, ServiceAreaController.isPointInServiceArea);

router
  .route("/:serviceAreaId")
  .get(isAuthenticated, ServiceAreaController.getServiceArea)
  .patch(isAdmin, ServiceAreaController.updateServiceArea)
  .delete(isAdmin, ServiceAreaController.deleteServiceArea);

export const ServiceAreaRoutes = router;
