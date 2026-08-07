import { z } from "zod";

const passengerIdParamSchema = z.object({
  params: z.object({
    passengerId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid passengerId format. Must be a 24-character hex string.",
    }),
  }),
});

const suspendPassengerZodSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const PassengerManagementValidation = {
  passengerIdParamSchema,
  suspendPassengerZodSchema,
};
