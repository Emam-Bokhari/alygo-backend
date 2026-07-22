"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewValidations = void 0;
const zod_1 = require("zod");
const review_constant_1 = require("./review.constant");
const config_1 = __importDefault(require("../../../config"));
const passengerReviewValidationSchema = zod_1.z.object({
  body: zod_1.z.object({
    rating: zod_1.z
      .number({
        required_error: "Rating is required",
      })
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    reviewText: zod_1.z
      .string()
      .optional()
      .refine(
        (val) => {
          if (val === undefined) return true;
          const trimmed = val.trim();
          return trimmed.length > 0 && trimmed.length <= 500;
        },
        {
          message:
            "Review text cannot be empty and must be under 500 characters",
        },
      ),
    selectedTags: zod_1.z
      .nativeEnum(review_constant_1.PASSENGER_REVIEW_TAG)
      .optional(),
    appreciation: zod_1.z
      .number()
      .optional()
      .refine(
        (val) => {
          var _a;
          if (val === undefined || val === 0) return true;
          const presets = [2, 5, 10];
          if (presets.includes(val)) return true;
          // Custom
          const min = 1;
          const max =
            ((_a = config_1.default.payment) === null || _a === void 0
              ? void 0
              : _a.maxDriverAppreciation) || 100;
          return val >= min && val <= max && !isNaN(val) && isFinite(val);
        },
        {
          message: `Appreciation must be a preset (2, 5, 10) or a custom amount between 1 and ${((_a = config_1.default.payment) === null || _a === void 0 ? void 0 : _a.maxDriverAppreciation) || 100} USD`,
        },
      ),
    paymentMethod: zod_1.z.enum(["stripe", "wallet", "skip"]).optional(),
  }),
});
const driverReviewValidationSchema = zod_1.z.object({
  body: zod_1.z.object({
    rating: zod_1.z
      .number({
        required_error: "Rating is required",
      })
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    reviewText: zod_1.z
      .string()
      .optional()
      .refine(
        (val) => {
          if (val === undefined) return true;
          const trimmed = val.trim();
          return trimmed.length > 0 && trimmed.length <= 500;
        },
        {
          message:
            "Review text cannot be empty and must be under 500 characters",
        },
      ),
    selectedTags: zod_1.z
      .nativeEnum(review_constant_1.DRIVER_REVIEW_TAG)
      .optional(),
  }),
});
exports.ReviewValidations = {
  passengerReviewValidationSchema,
  driverReviewValidationSchema,
};
