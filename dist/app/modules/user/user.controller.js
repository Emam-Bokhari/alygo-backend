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
var __rest =
  (this && this.__rest) ||
  function (s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (
          e.indexOf(p[i]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(s, p[i])
        )
          t[p[i]] = s[p[i]];
      }
    return t;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_codes_1 = require("http-status-codes");
const user_service_1 = require("./user.service");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const config_1 = __importDefault(require("../../../config"));
// register user
const createUser = (0, catchAsync_1.default)((req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userData = __rest(req.body, []);
    console.log(userData, "payload");
    const result = yield user_service_1.UserService.createUserToDB(userData);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message:
        "Your account has been successfully created. Verify Your Email By OTP. Check your email",
      data: result,
    });
  }),
);
// register admin
const createAdmin = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userData = req.body;
    console.log(userData, "payload");
    const result = yield user_service_1.UserService.createAdminToDB(userData);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Admin created successfully",
      data: result,
    });
  }),
);
const getAdmin = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield user_service_1.UserService.getAdminFromDB(req.query);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Admin retrieved Successfully",
      data: result,
    });
  }),
);
const deleteAdmin = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const payload = req.params.id;
    const result = yield user_service_1.UserService.deleteAdminFromDB(payload);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Admin Deleted Successfully",
      data: result,
    });
  }),
);
//update profile
const updateProfile = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    if ("role" in req.body) {
      delete req.body.role;
    }
    if ("phone" in req.body) {
      delete req.body.phone;
    }
    // If password is provided
    if (req.body.password) {
      req.body.password = yield bcrypt_1.default.hash(
        req.body.password,
        Number(config_1.default.bcrypt_salt_rounds),
      );
    }
    const result = yield user_service_1.UserService.updateProfileToDB(
      user,
      req.body,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Profile updated successfully",
      data: result,
    });
  }),
);
//register host
const createHost = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userData = req.body;
    console.log(userData, "payload");
    const result = yield user_service_1.UserService.createHostToDB(userData);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Host created successfully",
      data: result,
    });
  }),
);
const ghostLoginAsHost = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { hostId } = req.params;
    const user = req.user;
    const result = yield user_service_1.UserService.ghostLoginAsHost(
      user,
      hostId,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Ghost Host logged in successfully",
      data: result,
    });
  }),
);
const deleteHostById = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield user_service_1.UserService.deleteHostByIdFromD(id);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Host is deleted successfully",
      data: result,
    });
  }),
);
const getTotalUsersAndHosts = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield user_service_1.UserService.getTotalUsersAndHostsFromDB();
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieved total users and hosts",
      data: result,
    });
  }),
);
const switchProfile = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { role } = req.body;
    const { id: userId } = req.user;
    const result = yield user_service_1.UserService.switchProfileToDB(
      userId,
      role,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully switch the accounts",
      data: result,
    });
  }),
);
const getUserById = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield user_service_1.UserService.getUserByIdFromDB(id);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Successfully retrieve user by ID",
      data: result,
    });
  }),
);
const updateUserStatusById = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { status } = req.body;
    const result = yield user_service_1.UserService.updateUserStatusByIdToDB(
      id,
      status,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Status updated successfully",
      data: result,
    });
  }),
);
const updateAdminStatusById = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { status } = req.body;
    const result = yield user_service_1.UserService.updateAdminStatusByIdToDB(
      id,
      status,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Admin status updated successfully",
      data: result,
    });
  }),
);
const deleteUserById = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield user_service_1.UserService.deleteUserByIdFromD(id);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "User is deleted successfully",
      data: result,
    });
  }),
);
const deleteProfile = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    // console.log(id, "ID");
    const { password } = req.body;
    const result = yield user_service_1.UserService.deleteProfileFromDB(
      id,
      password,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Profile deleted successfully",
      data: result,
    });
  }),
);
exports.UserController = {
  createUser,
  createAdmin,
  getAdmin,
  deleteAdmin,
  updateProfile,
  switchProfile,
  getUserById,
  deleteHostById,
  getTotalUsersAndHosts,
  createHost,
  ghostLoginAsHost,
  updateUserStatusById,
  updateAdminStatusById,
  deleteUserById,
  deleteProfile,
};
