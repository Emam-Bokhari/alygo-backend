"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const referral_controller_1 = require("./referral.controller");
const router = express_1.default.Router();
// --- NEW PASSENGER ROUTES ---
router.get("/user/dashboard", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), referral_controller_1.ReferralController.getUserDashboard);
router.get("/user/history", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), referral_controller_1.ReferralController.getReferredUsersHistory);
router.get("/user/reward-history", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), referral_controller_1.ReferralController.getUserRewardHistory);
// --- NEW DRIVER ROUTES ---
router.get("/driver/dashboard", (0, auth_1.default)(user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), referral_controller_1.ReferralController.getDriverDashboard);
router.get("/driver/progress", (0, auth_1.default)(user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), referral_controller_1.ReferralController.getDriverReferralProgress);
router.get("/driver/reward-history", (0, auth_1.default)(user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), referral_controller_1.ReferralController.getDriverRewardHistory);
// --- OTHER ROUTES ---
router.get("/rules", referral_controller_1.ReferralController.getRules);
router.post("/verify", referral_controller_1.ReferralController.verifyCode);
exports.ReferralRoutes = router;
