import { z } from "zod";

const passengerIdParamSchema = z.object({
  params: z.object({
    passengerId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid passengerId format. Must be a 24-character hex string.",
    }),
  }),
});

export const PassengerManagementValidation = {
  passengerIdParamSchema,
};
