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

export const DriverManagementValidation = {
  rejectDriverZodSchema,
  suspendDriverZodSchema,
};
