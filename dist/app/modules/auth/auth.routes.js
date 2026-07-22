"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const auth_controller_1 = require("./auth.controller");
const auth_validation_1 = require("./auth.validation");
const user_1 = require("../../../enums/user");
const router = express_1.default.Router();
router.post("/login", (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createLoginZodSchema), auth_controller_1.AuthController.loginUser);
router.post("/forget-password", (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createForgetPasswordZodSchema), auth_controller_1.AuthController.forgetPassword);
router.post("/refresh-token", auth_controller_1.AuthController.newAccessToken);
router.post("/resend-otp", auth_controller_1.AuthController.resendVerificationEmail);
router.post("/verify-email", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, oneTimeCode } = req.body;
        req.body = { email, oneTimeCode: Number(oneTimeCode) };
        next();
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Failed to convert string to number" });
    }
}), (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createVerifyEmailZodSchema), auth_controller_1.AuthController.verifyEmail);
router.post("/reset-password", (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createResetPasswordZodSchema), auth_controller_1.AuthController.resetPassword);
router.post("/change-password", (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createChangePasswordZodSchema), auth_controller_1.AuthController.changePassword);
router.post("/resend-otp", auth_controller_1.AuthController.resendVerificationEmail);
router.delete("/delete-account", (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), auth_controller_1.AuthController.deleteUser);
// google login
router.post("/google-login", auth_controller_1.AuthController.googleLogin);
exports.AuthRoutes = router;
