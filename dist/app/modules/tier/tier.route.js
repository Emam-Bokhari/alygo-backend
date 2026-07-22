"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierRoutes = void 0;
const express_1 = __importDefault(require("express"));
const tier_controller_1 = require("./tier.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
  .route("/")
  .post(authHelper_1.isAdmin, tier_controller_1.TierController.createTier)
  .get(
    authHelper_1.isAuthenticated,
    tier_controller_1.TierController.getAllTiers,
  );
router
  .route("/:tierId")
  .get(
    authHelper_1.isAuthenticated,
    tier_controller_1.TierController.getTierById,
  )
  .patch(authHelper_1.isAdmin, tier_controller_1.TierController.updateTier)
  .delete(authHelper_1.isAdmin, tier_controller_1.TierController.deleteTier);
router.patch(
  "/status/:tierId",
  authHelper_1.isAdmin,
  tier_controller_1.TierController.updateTierStatus,
);
exports.TierRoutes = router;
