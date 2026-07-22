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
exports.FaqService = void 0;
const http_status_codes_1 = require("http-status-codes");
const faq_model_1 = require("./faq.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const createFaqToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const faq = yield faq_model_1.Faq.create(payload);
    if (!faq) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Failed to created Faq",
      );
    }
    return faq;
  });
const faqsFromDB = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const faqs = yield faq_model_1.Faq.find({});
    if (!faqs || faqs.length === 0) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "No Faqs found",
      );
    }
    return faqs;
  });
const deleteFaqToDB = (id) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Invalid ID",
      );
    }
    const result = yield faq_model_1.Faq.softDeleteById(id);
    if (!result) {
      throw new ApiErrors_1.default(404, "No faq found by this ID");
    }
    return result;
  });
const updateFaqToDB = (id, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Invalid ID",
      );
    }
    const updatedFaq = yield faq_model_1.Faq.findByIdAndUpdate(
      { _id: id },
      payload,
      {
        new: true,
      },
    );
    if (!updatedFaq) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Failed to updated Faq",
      );
    }
    return updatedFaq;
  });
exports.FaqService = {
  createFaqToDB,
  updateFaqToDB,
  faqsFromDB,
  deleteFaqToDB,
};
