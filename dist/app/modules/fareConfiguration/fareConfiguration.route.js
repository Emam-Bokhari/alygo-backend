"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.FareConfigurationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const fareConfiguration_controller_1 = require("./fareConfiguration.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    fareConfiguration_controller_1.FareConfigurationController
      .createFareConfiguration,
  )
  .get(
    authHelper_1.isAdmin,
    fareConfiguration_controller_1.FareConfigurationController
      .getAllFareConfiguration,
  );
router.get(
  "/active",
  authHelper_1.isAuthenticated,
  fareConfiguration_controller_1.FareConfigurationController
    .getActiveFareConfigurations,
);
router.get(
  "/category/:serviceCategoryId/:rideCategoryId",
  authHelper_1.isAuthenticated,
  fareConfiguration_controller_1.FareConfigurationController
    .getFareConfigurationByCategory,
);
router.patch(
  "/status/:fareConfigurationId",
  authHelper_1.isAdmin,
  fareConfiguration_controller_1.FareConfigurationController
    .updateFareConfigurationStatus,
);
router
  .route("/:fareConfigurationId")
  .get(
    authHelper_1.isAuthenticated,
    fareConfiguration_controller_1.FareConfigurationController
      .getFareConfiguration,
  )
  .patch(
    authHelper_1.isAdmin,
    fareConfiguration_controller_1.FareConfigurationController
      .updateFareConfiguration,
  )
  .delete(
    authHelper_1.isAdmin,
    fareConfiguration_controller_1.FareConfigurationController
      .deleteFareConfiguration,
  );
exports.FareConfigurationRoutes = router;
