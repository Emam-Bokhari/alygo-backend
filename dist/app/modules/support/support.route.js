"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportRoutes = void 0;
const express_1 = __importDefault(require("express"));
const support_controller_1 = require("./support.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAuthenticated,
    support_controller_1.SupportControllers.submitSupportRequest,
  )
  .get(
    authHelper_1.isAdmin,
    support_controller_1.SupportControllers.getAllSupports,
  );
router
  .route("/:id")
  .get(
    authHelper_1.isAdmin,
    support_controller_1.SupportControllers.getSupportById,
  )
  .delete(
    authHelper_1.isAdmin,
    support_controller_1.SupportControllers.deleteSupportById,
  );
exports.SupportRoutes = router;
