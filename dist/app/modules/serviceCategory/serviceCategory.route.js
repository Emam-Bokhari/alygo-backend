"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceCategoryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const serviceCategory_controller_1 = require("./serviceCategory.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const parseFileData_1 = require("../../middlewares/parseFileData");
const flieUploadHandler_1 = __importDefault(
  require("../../middlewares/flieUploadHandler"),
);
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    (0, flieUploadHandler_1.default)(),
    (0, parseFileData_1.parseFileData)({
      fieldName: "image",
      mode: "single",
    }),
    serviceCategory_controller_1.ServiceCategoryController
      .createServiceCategory,
  )
  .get(
    authHelper_1.isAdmin,
    serviceCategory_controller_1.ServiceCategoryController
      .getAllServiceCategory,
  );
router.get(
  "/active",
  authHelper_1.isAuthenticated,
  serviceCategory_controller_1.ServiceCategoryController
    .getActiveServiceCategories,
);
router.patch(
  "/status/:serviceCategoryId",
  authHelper_1.isAdmin,
  serviceCategory_controller_1.ServiceCategoryController
    .updateServiceCategoryStatus,
);
router
  .route("/:serviceCategoryId")
  .get(
    authHelper_1.isAuthenticated,
    serviceCategory_controller_1.ServiceCategoryController.getServiceCategory,
  )
  .patch(
    authHelper_1.isAdmin,
    (0, flieUploadHandler_1.default)(),
    (0, parseFileData_1.parseFileData)({ fieldName: "image", mode: "single" }),
    serviceCategory_controller_1.ServiceCategoryController
      .updateServiceCategory,
  )
  .delete(
    authHelper_1.isAdmin,
    serviceCategory_controller_1.ServiceCategoryController
      .deleteServiceCategory,
  );
exports.ServiceCategoryRoutes = router;
