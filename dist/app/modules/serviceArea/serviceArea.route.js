"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAreaRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authHelper_1 = require("../../../helpers/authHelper");
const serviceArea_controller_1 = require("./serviceArea.controller");
const router = express_1.default.Router();
router
    .route("/")
    .post(authHelper_1.isAdmin, serviceArea_controller_1.ServiceAreaController.createServiceArea)
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getAllServiceAreas);
router
    .route("/countries")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getCountries);
router
    .route("/states/:countryId")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getStatesByCountry);
router.route("/states").get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getStates);
router
    .route("/cities/:stateId")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getCitiesByState);
router
    .route("/zones/:cityId")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getZonesByCity);
router
    .route("/airports/:cityId")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getAirportsByCity);
router
    .route("/by-coordinates")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.findServiceAreaByCoordinates);
router
    .route("/all-by-coordinates")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.findAllServiceAreasByCoordinates);
router
    .route("/:serviceAreaId/check-point")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.isPointInServiceArea);
router
    .route("/:serviceAreaId")
    .get(authHelper_1.isAuthenticated, serviceArea_controller_1.ServiceAreaController.getServiceArea)
    .patch(authHelper_1.isAdmin, serviceArea_controller_1.ServiceAreaController.updateServiceArea)
    .delete(authHelper_1.isAdmin, serviceArea_controller_1.ServiceAreaController.deleteServiceArea);
exports.ServiceAreaRoutes = router;
