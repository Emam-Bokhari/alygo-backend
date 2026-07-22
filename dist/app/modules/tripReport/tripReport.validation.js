"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripReportValidations = void 0;
const zod_1 = require("zod");
const createTripReportValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        issueId: zod_1.z
            .string({
            required_error: "Issue ID is required",
        })
            .refine((val) => {
            // Validate ObjectId format (24 character hex string)
            return /^[0-9a-fA-F]{24}$/.test(val);
        }, "Invalid Issue ID format"),
        providedSummaryDetails: zod_1.z
            .string()
            .optional()
            .refine((val) => {
            if (val === undefined)
                return true;
            const trimmed = val.trim();
            return trimmed.length > 0 && trimmed.length <= 1000;
        }, {
            message: "Summary details cannot be empty and must be under 1000 characters",
        }),
    }),
});
const updateTripReportValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(["open", "investigating", "resolved"]).optional(),
        resolutionNotes: zod_1.z
            .string()
            .optional()
            .refine((val) => {
            if (val === undefined)
                return true;
            const trimmed = val.trim();
            return trimmed.length > 0 && trimmed.length <= 1000;
        }, {
            message: "Resolution notes cannot be empty and must be under 1000 characters",
        }),
    }),
});
exports.TripReportValidations = {
    createTripReportValidationSchema,
    updateTripReportValidationSchema,
};
