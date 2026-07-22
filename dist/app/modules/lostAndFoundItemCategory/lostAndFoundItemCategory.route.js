"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.LostAndFoundItemCategoryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const lostAndFoundItemCategory_controller_1 = require("./lostAndFoundItemCategory.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    lostAndFoundItemCategory_controller_1.LostAndFoundItemCategoryController
      .createLostAndFoundItemCategory,
  )
  .get(
    authHelper_1.isAdmin,
    lostAndFoundItemCategory_controller_1.LostAndFoundItemCategoryController
      .getAllLostAndFoundItemCategories,
  );
router.get(
  "/active",
  authHelper_1.isAuthenticated,
  lostAndFoundItemCategory_controller_1.LostAndFoundItemCategoryController
    .getActiveLostAndFoundItemCategories,
);
router.patch(
  "/status/:lostAndFoundItemCategoryId",
  authHelper_1.isAdmin,
  lostAndFoundItemCategory_controller_1.LostAndFoundItemCategoryController
    .updateLostAndFoundItemCategoryStatus,
);
router
  .route("/:lostAndFoundItemCategoryId")
  .get(
    authHelper_1.isAuthenticated,
    lostAndFoundItemCategory_controller_1.LostAndFoundItemCategoryController
      .getLostAndFoundItemCategory,
  )
  .patch(
    authHelper_1.isAdmin,
    lostAndFoundItemCategory_controller_1.LostAndFoundItemCategoryController
      .updateLostAndFoundItemCategory,
  )
  .delete(
    authHelper_1.isAdmin,
    lostAndFoundItemCategory_controller_1.LostAndFoundItemCategoryController
      .deleteLostAndFoundItemCategory,
  );
exports.LostAndFoundItemCategoryRoutes = router;
