import { z } from "zod";

const createTripReportValidationSchema = z.object({
  body: z.object({
    issueId: z
      .string({
        required_error: "Issue ID is required",
      })
      .refine((val) => {
        // Validate ObjectId format (24 character hex string)
        return /^[0-9a-fA-F]{24}$/.test(val);
      }, "Invalid Issue ID format"),

    providedSummaryDetails: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (val === undefined) return true;
          const trimmed = val.trim();
          return trimmed.length > 0 && trimmed.length <= 1000;
        },
        {
          message:
            "Summary details cannot be empty and must be under 1000 characters",
        },
      ),
  }),
});

const updateTripReportValidationSchema = z.object({
  body: z.object({
    status: z.enum(["open", "investigating", "resolved"]).optional(),
    resolutionNotes: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (val === undefined) return true;
          const trimmed = val.trim();
          return trimmed.length > 0 && trimmed.length <= 1000;
        },
        {
          message:
            "Resolution notes cannot be empty and must be under 1000 characters",
        },
      ),
  }),
});

export const TripReportValidations = {
  createTripReportValidationSchema,
  updateTripReportValidationSchema,
};
