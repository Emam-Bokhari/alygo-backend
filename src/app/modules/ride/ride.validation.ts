import { z } from "zod";
import { PAYMENT_METHOD, RIDE_TYPE } from "./ride.constant";

const locationSchema = z.object({
  address: z.string({
    required_error: "Address is required",
  }),
  location: z.object({
    type: z.string(),
    coordinates: z.tuple([z.number(), z.number()], {
      required_error: "Coordinates [longitude, latitude] are required",
    }),
  }),
});

const stopSchema = z.object({
  order: z.number({
    required_error: "Stop order is required",
  }),
  address: z.string({
    required_error: "Stop address is required",
  }),
  location: z.object({
    type: z.string(),
    coordinates: z.tuple([z.number(), z.number()], {
      required_error: "Stop coordinates [longitude, latitude] are required",
    }),
  }),
});

const rideTypeSchema = z
  .union([z.nativeEnum(RIDE_TYPE), z.literal("reservation")])
  .transform((val) => (val === "reservation" ? RIDE_TYPE.SCHEDULED : val));

const estimateRideZodSchema = z.object({
  body: z
    .object({
      pickup: locationSchema,
      stops: z.array(stopSchema).optional(),
      destination: locationSchema,
      serviceCategoryId: z.string().optional(),
      rideType: rideTypeSchema.default(RIDE_TYPE.INSTANT),
      scheduledAt: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format for scheduledAt",
        })
        .transform((val) => new Date(val))
        .optional(),
      timezone: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.rideType === RIDE_TYPE.SCHEDULED && !data.serviceCategoryId) {
          return false;
        }
        return true;
      },
      {
        message:
          "serviceCategoryId is required for Scheduled (Reservation) rides",
        path: ["serviceCategoryId"],
      },
    ),
});

const requestRideZodSchema = z.object({
  body: z
    .object({
      pickup: locationSchema,
      stops: z.array(stopSchema).optional(),
      destination: locationSchema,
      rideCategoryId: z.string({
        required_error: "Ride category ID is required",
      }),
      serviceCategoryId: z.string().optional(),
      rideType: rideTypeSchema.default(RIDE_TYPE.INSTANT),
      scheduledAt: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format for scheduledAt",
        })
        .transform((val) => new Date(val))
        .optional(),
      timezone: z.string().optional(),
      paymentMethod: z
        .nativeEnum(PAYMENT_METHOD)
        .default(PAYMENT_METHOD.STRIPE),
    })
    .refine(
      (data) => {
        if (data.rideType === RIDE_TYPE.SCHEDULED) {
          if (!data.scheduledAt) return false;
          if (new Date(data.scheduledAt).getTime() <= Date.now()) return false;
        }
        return true;
      },
      {
        message:
          "scheduledAt is required and must be a future date/time for scheduled rides",
        path: ["scheduledAt"],
      },
    )
    .refine(
      (data) => {
        if (data.rideType === RIDE_TYPE.SCHEDULED && !data.serviceCategoryId) {
          return false;
        }
        return true;
      },
      {
        message:
          "serviceCategoryId is required for Scheduled (Reservation) rides",
        path: ["serviceCategoryId"],
      },
    ),
});

const verifyRideSecurityZodSchema = z.object({
  body: z
    .object({
      otp: z.string().length(6, "OTP must be exactly 6 digits").optional(),
      phoneLastFourDigits: z
        .string()
        .length(4, "Phone last 4 digits must be exactly 4 characters")
        .optional(),
    })
    .refine(
      (data) => {
        return data.otp || data.phoneLastFourDigits;
      },
      {
        message:
          "Either otp or phoneLastFourDigits must be provided for verification",
        path: ["otp"],
      },
    ),
});

const cancelRideZodSchema = z.object({
  body: z.object({
    cancellationReasonId: z.string({
      required_error: "Cancellation reason ID is required",
    }),
    cancellationReasonName: z.string().optional(),
    paymentTiming: z.enum(["now", "later"]).default("later"),
  }),
});

const addStopsZodSchema = z.object({
  body: z.object({
    stops: z
      .array(stopSchema, {
        required_error: "Stops array is required",
      })
      .min(1, "At least one stop must be provided"),
  }),
});

const driverRideHistoryQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    rideType: z
      .enum(["instant", "scheduled"], {
        errorMap: () => ({
          message:
            "Invalid rideType provided. Must be 'instant' or 'scheduled'",
        }),
      })
      .optional(),
    paymentStatus: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc", "ASC", "DESC"]).optional(),
  }),
});

const userRideHistoryQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    rideType: z
      .enum(["instant", "scheduled"], {
        errorMap: () => ({
          message:
            "Invalid rideType provided. Must be 'instant' or 'scheduled'",
        }),
      })
      .optional(),
    paymentStatus: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc", "ASC", "DESC"]).optional(),
  }),
});

export const RideValidations = {
  estimateRideZodSchema,
  requestRideZodSchema,
  verifyRideSecurityZodSchema,
  cancelRideZodSchema,
  addStopsZodSchema,
  driverRideHistoryQuerySchema,
  userRideHistoryQuerySchema,
};
