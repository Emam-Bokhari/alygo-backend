import { z } from "zod";

const rejectDriverZodSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});

const suspendDriverZodSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
    note: z.string().optional(),
  }),
});

const getDriverDetailsZodSchema = z.object({
  params: z.object({
    driverId: z
      .string({
        required_error: "Driver ID is required",
      })
      .regex(/^[0-9a-fA-F]{24}$/, {
        message: "Invalid Driver ID format",
      }),
  }),
});

export const DriverManagementValidation = {
  rejectDriverZodSchema,
  suspendDriverZodSchema,
  getDriverDetailsZodSchema,
};
