"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverDutyPolicyRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authHelper_1 = require("../../../helpers/authHelper");
const driverDutyPolicy_controller_1 = require("./driverDutyPolicy.controller");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    driverDutyPolicy_controller_1.DriverDutyPolicyController
      .createDriverDutyPolicy,
  )
  .get(
    authHelper_1.isAuthenticated,
    driverDutyPolicy_controller_1.DriverDutyPolicyController
      .getAllDriverDutyPolicies,
  );
router.get(
  "/active",
  authHelper_1.isAuthenticated,
  driverDutyPolicy_controller_1.DriverDutyPolicyController
    .getActiveDriverDutyPolicies,
);
router.patch(
  "/status/:driverDutyPolicyId",
  authHelper_1.isAdmin,
  driverDutyPolicy_controller_1.DriverDutyPolicyController
    .updateDriverDutyPolicyStatus,
);
router
  .route("/:driverDutyPolicyId")
  .get(
    authHelper_1.isAuthenticated,
    driverDutyPolicy_controller_1.DriverDutyPolicyController
      .getDriverDutyPolicy,
  )
  .patch(
    authHelper_1.isAdmin,
    driverDutyPolicy_controller_1.DriverDutyPolicyController
      .updateDriverDutyPolicy,
  )
  .delete(
    authHelper_1.isAdmin,
    driverDutyPolicy_controller_1.DriverDutyPolicyController
      .deleteDriverDutyPolicy,
  );
exports.DriverDutyPolicyRoutes = router;
