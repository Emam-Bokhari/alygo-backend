import { z } from "zod";

const getLiveTripByIdZodSchema = z.object({
  params: z.object({
    rideId: z
      .string({
        required_error: "Ride ID is required",
      })
      .regex(/^[0-9a-fA-F]{24}$/, {
        message: "Invalid Ride ID format",
      }),
  }),
});

export const LiveTripsValidation = {
  getLiveTripByIdZodSchema,
};
