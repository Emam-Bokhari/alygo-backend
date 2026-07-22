import { z } from "zod";
import { STATUS } from "../../../constants/status";

const createRideCategoryValidationSchema = z.object({
  body: z.object({
    serviceCategoryId: z.string().optional(),
    name: z.string({
      required_error: "name is required",
    }),
    description: z.string().optional(),
    commissionRate: z
      .number({
        required_error: "commissionRate is required",
      })
      .min(0)
      .max(100),
    minimumDriverRating: z
      .number({
        required_error: "minimumDriverRating is required",
      })
      .min(0)
      .max(5),
    vehicleRequirements: z.object({
      vehicleTypes: z.array(z.string(), {
        required_error: "vehicleTypes is required",
      }),
      minimumSeats: z
        .number({
          required_error: "minimumSeats is required",
        })
        .min(1),
    }),
    status: z.nativeEnum(STATUS).optional(),
  }),
});

const updateRideCategoryValidationSchema = z.object({
  body: z.object({
    serviceCategoryId: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    minimumDriverRating: z.number().min(0).max(5).optional(),
    vehicleRequirements: z
      .object({
        vehicleTypes: z.array(z.string()).optional(),
        minimumSeats: z.number().min(1).optional(),
      })
      .optional(),
    status: z.nativeEnum(STATUS).optional(),
  }),
});

export const RideCategoryValidation = {
  createRideCategoryValidationSchema,
  updateRideCategoryValidationSchema,
};
