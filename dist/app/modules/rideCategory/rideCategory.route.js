"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideCategoryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const rideCategory_controller_1 = require("./rideCategory.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const validateRequest_1 = __importDefault(
  require("../../middlewares/validateRequest"),
);
const rideCategory_validation_1 = require("./rideCategory.validation");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    (0, validateRequest_1.default)(
      rideCategory_validation_1.RideCategoryValidation
        .createRideCategoryValidationSchema,
    ),
    rideCategory_controller_1.RideCategoryController.createRideCategory,
  )
  .get(
    authHelper_1.isAdmin,
    rideCategory_controller_1.RideCategoryController.getAllRideCategories,
  );
router.get(
  "/active",
  authHelper_1.isAuthenticated,
  rideCategory_controller_1.RideCategoryController.getActiveRideCategories,
);
router.patch(
  "/status/:rideCategoryId",
  authHelper_1.isAdmin,
  rideCategory_controller_1.RideCategoryController.updateRideCategoryStatus,
);
router
  .route("/:rideCategoryId")
  .get(
    authHelper_1.isAuthenticated,
    rideCategory_controller_1.RideCategoryController.getRideCategory,
  )
  .patch(
    authHelper_1.isAdmin,
    (0, validateRequest_1.default)(
      rideCategory_validation_1.RideCategoryValidation
        .updateRideCategoryValidationSchema,
    ),
    rideCategory_controller_1.RideCategoryController.updateRideCategory,
  )
  .delete(
    authHelper_1.isAdmin,
    rideCategory_controller_1.RideCategoryController.deleteRideCategory,
  );
exports.RideCategoryRoutes = router;
