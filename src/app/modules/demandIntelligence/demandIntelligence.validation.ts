import { z } from "zod";

export const demandIntelligenceQuerySchema = z.object({
  query: z.object({
    serviceAreaId: z
      .string()
      .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
        message: "Invalid serviceAreaId format. Must be a 24-character hex string.",
      })
      .optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid startDate format. Must be a valid date string.",
      })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid endDate format. Must be a valid date string.",
      })
      .optional(),
    search: z.string().optional(),
    limit: z
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "Invalid limit. Must be a numeric string.",
      })
      .optional(),
    page: z
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "Invalid page. Must be a numeric string.",
      })
      .optional(),
  }),
});

export const DemandIntelligenceValidation = {
  demandIntelligenceQuerySchema,
};
