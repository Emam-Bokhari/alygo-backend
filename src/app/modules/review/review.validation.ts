import { z } from "zod";
import { PASSENGER_REVIEW_TAG, DRIVER_REVIEW_TAG } from "./review.constant";
import config from "../../../config";

const passengerReviewValidationSchema = z.object({
  body: z.object({
    rating: z
      .number({
        required_error: "Rating is required",
      })
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),

    reviewText: z
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

    selectedTags: z.nativeEnum(PASSENGER_REVIEW_TAG).optional(),

    appreciation: z
      .number()
      .optional()
      .refine(
        (val) => {
          if (val === undefined || val === 0) return true;
          const presets = [2, 5, 10];
          if (presets.includes(val)) return true;

          // Custom
          const min = 1;
          const max = config.payment?.maxDriverAppreciation || 100;
          return val >= min && val <= max && !isNaN(val) && isFinite(val);
        },
        {
          message: `Appreciation must be a preset (2, 5, 10) or a custom amount between 1 and ${config.payment?.maxDriverAppreciation || 100} USD`,
        },
      ),

    paymentMethod: z.enum(["stripe", "wallet", "skip"]).optional(),
  }),
});

const driverReviewValidationSchema = z.object({
  body: z.object({
    rating: z
      .number({
        required_error: "Rating is required",
      })
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),

    reviewText: z
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

    selectedTags: z.nativeEnum(DRIVER_REVIEW_TAG).optional(),
  }),
});

export const ReviewValidations = {
  passengerReviewValidationSchema,
  driverReviewValidationSchema,
};
