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
exports.LostAndFoundItemCategoryController = void 0;
const lostAndFoundItemCategory_service_1 = require("./lostAndFoundItemCategory.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createLostAndFoundItemCategory = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const lostAndFoundItemCategoryData = req.body;
    const result =
      yield lostAndFoundItemCategory_service_1.LostAndFoundItemCategoryService.createLostAndFoundItemCategoryToDB(
        lostAndFoundItemCategoryData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Lost and found item category created successfully",
      data: result,
    });
  }),
);
const getLostAndFoundItemCategory = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { lostAndFoundItemCategoryId } = req.params;
    const result =
      yield lostAndFoundItemCategory_service_1.LostAndFoundItemCategoryService.getLostAndFoundItemCategoryFromDB(
        lostAndFoundItemCategoryId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Lost and found item category retrieved successfully",
      data: result,
    });
  }),
);
const getAllLostAndFoundItemCategories = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield lostAndFoundItemCategory_service_1.LostAndFoundItemCategoryService.getAllLostAndFoundItemCategoriesFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Lost and found item categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
const getActiveLostAndFoundItemCategories = (0, catchAsync_1.default)(
  (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const result =
        yield lostAndFoundItemCategory_service_1.LostAndFoundItemCategoryService.getActiveLostAndFoundItemCategoriesFromDB(
          req.query,
        );
      (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Active lost and found item categories retrieved successfully",
        data: result.data,
        meta: result.meta,
      });
    }),
);
const updateLostAndFoundItemCategory = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { lostAndFoundItemCategoryId } = req.params;
    const updateData = req.body;
    const result =
      yield lostAndFoundItemCategory_service_1.LostAndFoundItemCategoryService.updateLostAndFoundItemCategoryToDB(
        lostAndFoundItemCategoryId,
        updateData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Lost and found item category updated successfully",
      data: result,
    });
  }),
);
const updateLostAndFoundItemCategoryStatus = (0, catchAsync_1.default)(
  (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const { lostAndFoundItemCategoryId } = req.params;
      const { status } = req.body;
      const result =
        yield lostAndFoundItemCategory_service_1.LostAndFoundItemCategoryService.updateLostAndFoundItemCategoryStatusToDB(
          lostAndFoundItemCategoryId,
          status,
        );
      (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Lost and found item category status updated successfully",
        data: result,
      });
    }),
);
const deleteLostAndFoundItemCategory = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { lostAndFoundItemCategoryId } = req.params;
    const result =
      yield lostAndFoundItemCategory_service_1.LostAndFoundItemCategoryService.deleteLostAndFoundItemCategoryToDB(
        lostAndFoundItemCategoryId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Lost and found item category deleted successfully",
      data: result,
    });
  }),
);
exports.LostAndFoundItemCategoryController = {
  createLostAndFoundItemCategory,
  getLostAndFoundItemCategory,
  getAllLostAndFoundItemCategories,
  getActiveLostAndFoundItemCategories,
  updateLostAndFoundItemCategory,
  deleteLostAndFoundItemCategory,
  updateLostAndFoundItemCategoryStatus,
};
