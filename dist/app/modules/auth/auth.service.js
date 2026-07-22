"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_codes_1 = require("http-status-codes");
const config_1 = __importDefault(require("../../../config"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const jwtHelper_1 = require("../../../helpers/jwtHelper");
const user_model_1 = require("../user/user.model");
const cryptoToken_1 = __importDefault(require("../../../util/cryptoToken"));
const resetToken_model_1 = require("../resetToken/resetToken.model");
const emailHelper_1 = require("../../../helpers/emailHelper");
const generateOTP_1 = __importDefault(require("../../../util/generateOTP"));
const emailTemplate_1 = require("../../../shared/emailTemplate");
const user_1 = require("../../../enums/user");
const firebase_1 = require("../../../config/firebase");
const fcmService_1 = require("../fcmToken/fcmService");
const loginUserFromDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, fcmToken, deviceId, deviceType } = payload;
    const isExistUser = yield user_model_1.User.findOne({ email }).select(
      "+password",
    );
    if (!isExistUser) {
      throw new ApiErrors_1.default(400, "User doesn't exist!");
    }
    // check verified and status
    if (!isExistUser.verified) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Please verify your account, then try to login again",
      );
    }
    // check user status
    if (isExistUser.status === user_1.STATUS.INACTIVE) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "You don’t have permission to access this content. It looks like your account has been deactivated.",
      );
    }
    // check match password
    if (
      password &&
      !(yield user_model_1.User.isMatchPassword(password, isExistUser.password))
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Password is incorrect!",
      );
    }
    // Save device token if provided
    if (fcmToken && deviceId && deviceType) {
      yield fcmService_1.FcmTokenService.saveDeviceToken(isExistUser._id, {
        fcmToken,
        deviceId,
        deviceType,
      });
    }
    // create token
    const createToken = jwtHelper_1.jwtHelper.createToken(
      { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
      config_1.default.jwt.jwt_secret,
      config_1.default.jwt.jwt_expire_in,
    );
    const result = {
      token: createToken,
      user: isExistUser,
    };
    return result;
  });
// ========================== forget password ===========================
const forgetPasswordToDB = (email) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isExistUser = yield user_model_1.User.isExistUserByEmail(email);
    if (!isExistUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "User doesn't exist!",
      );
    }
    //send mail
    const otp = (0, generateOTP_1.default)();
    const value = {
      otp: Number(otp),
      email: isExistUser.email,
    };
    const forgetPassword = emailTemplate_1.emailTemplate.resetPassword(value);
    emailHelper_1.emailHelper.sendEmail(forgetPassword);
    //save to DB
    const authentication = {
      oneTimeCode: otp,
      expireAt: new Date(Date.now() + 3 * 60000),
    };
    yield user_model_1.User.findOneAndUpdate(
      { email },
      { $set: { authentication } },
    );
  });
// ======================================= afriksms verify phone otp============================
const verifyEmailToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { email, oneTimeCode } = payload;
    const isExistUser = yield user_model_1.User.findOne({ email }).select(
      "+authentication",
    );
    if (!isExistUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "User doesn't exist!",
      );
    }
    if (!oneTimeCode) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Please give the otp, check your email we send a code",
      );
    }
    if (
      ((_a = isExistUser.authentication) === null || _a === void 0
        ? void 0
        : _a.oneTimeCode) !== oneTimeCode
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "You provided wrong otp",
      );
    }
    const date = new Date();
    if (
      date >
      ((_b = isExistUser.authentication) === null || _b === void 0
        ? void 0
        : _b.expireAt)
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Otp already expired, Please try again",
      );
    }
    let message;
    let data;
    if (!isExistUser.verified) {
      yield user_model_1.User.findOneAndUpdate(
        { _id: isExistUser._id },
        {
          verified: true,
          authentication: { oneTimeCode: null, expireAt: null },
        },
      );
      message = "Email verify successfully";
    } else {
      yield user_model_1.User.findOneAndUpdate(
        { _id: isExistUser._id },
        {
          authentication: {
            isResetPassword: true,
            oneTimeCode: null,
            expireAt: null,
          },
        },
      );
      // create token ;
      const createToken = (0, cryptoToken_1.default)();
      yield resetToken_model_1.ResetToken.create({
        user: isExistUser._id,
        token: createToken,
        expireAt: new Date(Date.now() + 5 * 60000),
      });
      message =
        "Verification Successful: Please securely store and utilize this code for reset password";
      data = createToken;
    }
    return { data, message };
  });
const resetPasswordToDB = (token, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { newPassword, confirmPassword } = payload;
    // isExist token
    const isExistToken =
      yield resetToken_model_1.ResetToken.isExistToken(token);
    if (!isExistToken) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.UNAUTHORIZED,
        "You are not authorized",
      );
    }
    // user permission check
    const isExistUser = yield user_model_1.User.findById(
      isExistToken.user,
    ).select("+authentication");
    if (
      !((_a =
        isExistUser === null || isExistUser === void 0
          ? void 0
          : isExistUser.authentication) === null || _a === void 0
        ? void 0
        : _a.isResetPassword)
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.UNAUTHORIZED,
        "You don't have permission to change the password. Please click again to 'Forgot Password'",
      );
    }
    // validity check
    const isValid = yield resetToken_model_1.ResetToken.isExpireToken(token);
    if (!isValid) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Token expired, Please click again to the forget password",
      );
    }
    // check password
    if (newPassword !== confirmPassword) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "New password and Confirm password doesn't match!",
      );
    }
    const hashPassword = yield bcrypt_1.default.hash(
      newPassword,
      Number(config_1.default.bcrypt_salt_rounds),
    );
    const updateData = {
      password: hashPassword,
      authentication: { isResetPassword: false },
    };
    yield user_model_1.User.findOneAndUpdate(
      { _id: isExistToken.user },
      updateData,
      {
        new: true,
      },
    );
  });
const changePasswordToDB = (user, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { currentPassword, newPassword, confirmPassword } = payload;
    const isExistUser = yield user_model_1.User.findById(user.id).select(
      "+password",
    );
    if (!isExistUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "User doesn't exist!",
      );
    }
    // current password match
    if (
      currentPassword &&
      !(yield user_model_1.User.isMatchPassword(
        currentPassword,
        isExistUser.password,
      ))
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Password is incorrect",
      );
    }
    // newPassword and current password
    if (currentPassword === newPassword) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Please give different password from current password",
      );
    }
    // new password and confirm password check
    if (newPassword !== confirmPassword) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Password and Confirm password doesn't matched",
      );
    }
    // hash password
    const hashPassword = yield bcrypt_1.default.hash(
      newPassword,
      Number(config_1.default.bcrypt_salt_rounds),
    );
    const updateData = {
      password: hashPassword,
    };
    yield user_model_1.User.findOneAndUpdate({ _id: user.id }, updateData, {
      new: true,
    });
  });
const newAccessTokenToUser = (token) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Check if the token is provided
    if (!token) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Token is required!",
      );
    }
    const verifyUser = jwtHelper_1.jwtHelper.verifyToken(
      token,
      config_1.default.jwt.jwtRefreshSecret,
    );
    const isExistUser = yield user_model_1.User.findById(
      verifyUser === null || verifyUser === void 0 ? void 0 : verifyUser.id,
    );
    if (!isExistUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.UNAUTHORIZED,
        "Unauthorized access",
      );
    }
    // create token
    const accessToken = jwtHelper_1.jwtHelper.createToken(
      { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
      config_1.default.jwt.jwt_secret,
      config_1.default.jwt.jwt_expire_in,
    );
    return { accessToken };
  });
// ==================resend otp phone afriksms=======================
const resendVerificationEmailToDB = (email) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Find the user by ID
    const existingUser = yield user_model_1.User.findOne({
      email: email,
    }).lean();
    if (!existingUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "User with this email does not exist!",
      );
    }
    if (
      existingUser === null || existingUser === void 0
        ? void 0
        : existingUser.isVerified
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "User is already verified!",
      );
    }
    // Generate OTP and prepare email
    const otp = (0, generateOTP_1.default)();
    const emailValues = {
      name: existingUser.name,
      otp: Number(otp),
      email: existingUser.email,
    };
    const accountEmailTemplate =
      emailTemplate_1.emailTemplate.createAccount(emailValues);
    emailHelper_1.emailHelper.sendEmail(accountEmailTemplate);
    // Update user with authentication details
    const authentication = {
      oneTimeCode: otp,
      expireAt: new Date(Date.now() + 3 * 60000),
    };
    yield user_model_1.User.findOneAndUpdate(
      { email: email },
      { $set: { authentication } },
      { new: true },
    );
  });
const deleteUserFromDB = (user, password) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isExistUser = yield user_model_1.User.findById(user.id).select(
      "+password",
    );
    if (!isExistUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "User doesn't exist!",
      );
    }
    // check match password
    if (
      password &&
      !(yield user_model_1.User.isMatchPassword(password, isExistUser.password))
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Password is incorrect",
      );
    }
    const updateUser = yield user_model_1.User.findByIdAndDelete(user.id);
    if (!updateUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "User doesn't exist!",
      );
    }
    return;
  });
const googleLoginService = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { token, fcmToken, deviceId, deviceType } = payload;
    console.log(token, fcmToken, "Token and device token");
    if (!token) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Firebase ID token is required",
      );
    }
    let decoded;
    try {
      decoded = yield firebase_1.firebaseAdmin.auth().verifyIdToken(token);
    } catch (error) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.UNAUTHORIZED,
        "Invalid or expired Firebase token",
      );
    }
    const { uid: firebaseUid, email, name, picture, email_verified } = decoded;
    // Email must exist for Google login
    if (!email) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Email not found in Google account",
      );
    }
    // Optionally enforce email verification
    if (!email_verified) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.FORBIDDEN,
        "Please verify your email address with Google",
      );
    }
    // Check if user exists
    let user = yield user_model_1.User.findOne({
      firebaseUid,
    });
    if (user) {
      // Check user status
      if (user.status === user_1.STATUS.INACTIVE) {
        throw new ApiErrors_1.default(
          http_status_codes_1.StatusCodes.FORBIDDEN,
          "Your account has been blocked. Please contact support.",
        );
      }
      // Update user info if changed
      if (user.email !== email || user.profileImage !== picture) {
        user.email = email;
        user.profileImage = picture || user.profileImage;
        user.verified = email_verified;
        yield user.save();
      }
    } else {
      const [firstName, ...rest] = (name || "").trim().split(" ");
      const lastName = rest.join(" ");
      // create full name
      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      // Generate unique username
      const baseUsername = email.split("@")[0];
      let userName = baseUsername;
      let counter = 1;
      while (yield user_model_1.User.findOne({ userName })) {
        userName = `${baseUsername}${counter}`;
        counter++;
      }
      user = yield user_model_1.User.create({
        firebaseUid,
        email,
        userName,
        name: fullName,
        profileImage: picture,
        verified: email_verified,
        status: user_1.STATUS.ACTIVE,
      });
    }
    // Save device token if provided
    if (fcmToken && deviceId && deviceType) {
      yield fcmService_1.FcmTokenService.saveDeviceToken(user._id, {
        fcmToken,
        deviceId,
        deviceType,
      });
    }
    // create token
    const createToken = jwtHelper_1.jwtHelper.createToken(
      { id: user._id, role: user.role, email: user.email },
      config_1.default.jwt.jwt_secret,
      config_1.default.jwt.jwt_expire_in,
    );
    return {
      token: createToken,
      user,
    };
  });
exports.AuthService = {
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  verifyEmailToDB,
  changePasswordToDB,
  newAccessTokenToUser,
  resendVerificationEmailToDB,
  deleteUserFromDB,
  googleLoginService,
};
