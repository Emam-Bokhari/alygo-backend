import { z } from "zod";

const drivingHoursHistoryQueryValidationSchema = z.object({
  query: z.object({
    cycle: z.enum(["daily", "weekly", "monthly"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sort: z.string().optional(),
    startDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format for startDate",
      }),
    endDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format for endDate",
      }),
  }),
});

const drivingHoursLedgerQueryValidationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sort: z.string().optional(),
    startDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format for startDate",
      }),
    endDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format for endDate",
      }),
  }),
});

export const DriverValidations = {
  drivingHoursHistoryQueryValidationSchema,
  drivingHoursLedgerQueryValidationSchema,
};
