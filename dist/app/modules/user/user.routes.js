"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("./user.controller");
const user_validation_1 = require("./user.validation");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const parseFileData_1 = require("../../middlewares/parseFileData");
const review_controller_1 = require("../review/review.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const flieUploadHandler_1 = __importDefault(require("../../middlewares/flieUploadHandler"));
const router = express_1.default.Router();
/* ---------------------------- PROFILE ROUTES ---------------------------- */
router.route("/profile").delete(authHelper_1.isAuthenticated, user_controller_1.UserController.deleteProfile);
/* ---------------------------- ADMIN CREATE ------------------------------ */
router.post("/create-admin", authHelper_1.isSuperAdmin, (0, validateRequest_1.default)(user_validation_1.UserValidation.createAdminZodSchema), user_controller_1.UserController.createAdmin);
/* ---------------------------- ADMINS LIST ------------------------------- */
router.get("/admins", authHelper_1.isSuperAdmin, user_controller_1.UserController.getAdmin);
router.delete("/admins/:id", authHelper_1.isSuperAdmin, user_controller_1.UserController.deleteAdmin);
/* ---------------------------- HOST LIST ------------------------------ */
router.post("/create-host", authHelper_1.isSuperAdmin, user_controller_1.UserController.createHost);
router.post("/ghost-login/:hostId", authHelper_1.isSuperAdmin, user_controller_1.UserController.ghostLoginAsHost);
router.delete("/hosts/:id", authHelper_1.isAdmin, user_controller_1.UserController.deleteHostById);
router.get("/total-users-hosts", authHelper_1.isAdmin, user_controller_1.UserController.getTotalUsersAndHosts);
/* ---------------------------- USER CREATE & UPDATE ---------------------- */
router
    .route("/")
    .post(user_controller_1.UserController.createUser)
    .patch(authHelper_1.isAuthenticated, (0, flieUploadHandler_1.default)(), (0, parseFileData_1.parseFileData)({
    fieldName: "profileImage",
    mode: "single",
}, {
    fieldName: "coverImage",
    mode: "single",
}), user_controller_1.UserController.updateProfile);
/* ---------------------------- SWITCH PROFILE ---------------------------- */
router.patch("/switch-profile", authHelper_1.isAuthenticated, user_controller_1.UserController.switchProfile);
/* ---------------------------- STATUS UPDATE ----------------------------- */
router.patch("/admin/status/:id", authHelper_1.isAdmin, user_controller_1.UserController.updateAdminStatusById);
router.patch("/status/:id", authHelper_1.isAdmin, user_controller_1.UserController.updateUserStatusById);
router.get("/:userId/reviews", authHelper_1.isAuthenticated, review_controller_1.ReviewController.getUserReviews);
/* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
router
    .route("/:id")
    .get(authHelper_1.isAdmin, user_controller_1.UserController.getUserById)
    .delete(authHelper_1.isAdmin, user_controller_1.UserController.deleteUserById);
exports.UserRoutes = router;
