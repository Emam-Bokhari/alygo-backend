"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideValidations = void 0;
const zod_1 = require("zod");
const ride_constant_1 = require("./ride.constant");
const locationSchema = zod_1.z.object({
  address: zod_1.z.string({
    required_error: "Address is required",
  }),
  location: zod_1.z.object({
    type: zod_1.z.string(),
    coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()], {
      required_error: "Coordinates [longitude, latitude] are required",
    }),
  }),
});
const stopSchema = zod_1.z.object({
  order: zod_1.z.number({
    required_error: "Stop order is required",
  }),
  address: zod_1.z.string({
    required_error: "Stop address is required",
  }),
  location: zod_1.z.object({
    type: zod_1.z.string(),
    coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()], {
      required_error: "Stop coordinates [longitude, latitude] are required",
    }),
  }),
});
const rideTypeSchema = zod_1.z
  .union([
    zod_1.z.nativeEnum(ride_constant_1.RIDE_TYPE),
    zod_1.z.literal("reservation"),
  ])
  .transform((val) =>
    val === "reservation" ? ride_constant_1.RIDE_TYPE.SCHEDULED : val,
  );
const estimateRideZodSchema = zod_1.z.object({
  body: zod_1.z
    .object({
      pickup: locationSchema,
      stops: zod_1.z.array(stopSchema).optional(),
      destination: locationSchema,
      serviceCategoryId: zod_1.z.string().optional(),
      rideType: rideTypeSchema.default(ride_constant_1.RIDE_TYPE.INSTANT),
      scheduledAt: zod_1.z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format for scheduledAt",
        })
        .transform((val) => new Date(val))
        .optional(),
      timezone: zod_1.z.string().optional(),
    })
    .refine(
      (data) => {
        if (
          data.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED &&
          !data.serviceCategoryId
        ) {
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
const requestRideZodSchema = zod_1.z.object({
  body: zod_1.z
    .object({
      pickup: locationSchema,
      stops: zod_1.z.array(stopSchema).optional(),
      destination: locationSchema,
      rideCategoryId: zod_1.z.string({
        required_error: "Ride category ID is required",
      }),
      serviceCategoryId: zod_1.z.string().optional(),
      rideType: rideTypeSchema.default(ride_constant_1.RIDE_TYPE.INSTANT),
      scheduledAt: zod_1.z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format for scheduledAt",
        })
        .transform((val) => new Date(val))
        .optional(),
      timezone: zod_1.z.string().optional(),
      paymentMethod: zod_1.z
        .nativeEnum(ride_constant_1.PAYMENT_METHOD)
        .default(ride_constant_1.PAYMENT_METHOD.STRIPE),
    })
    .refine(
      (data) => {
        if (data.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
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
        if (
          data.rideType === ride_constant_1.RIDE_TYPE.SCHEDULED &&
          !data.serviceCategoryId
        ) {
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
const verifyRideSecurityZodSchema = zod_1.z.object({
  body: zod_1.z
    .object({
      otp: zod_1.z
        .string()
        .length(6, "OTP must be exactly 6 digits")
        .optional(),
      phoneLastFourDigits: zod_1.z
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
const cancelRideZodSchema = zod_1.z.object({
  body: zod_1.z.object({
    cancellationReasonId: zod_1.z.string({
      required_error: "Cancellation reason ID is required",
    }),
    cancellationReasonName: zod_1.z.string().optional(),
    paymentTiming: zod_1.z.enum(["now", "later"]).default("later"),
  }),
});
const addStopsZodSchema = zod_1.z.object({
  body: zod_1.z.object({
    stops: zod_1.z
      .array(stopSchema, {
        required_error: "Stops array is required",
      })
      .min(1, "At least one stop must be provided"),
  }),
});
const driverRideHistoryQuerySchema = zod_1.z.object({
  query: zod_1.z.object({
    status: zod_1.z.string().optional(),
    rideType: zod_1.z
      .enum(["instant", "scheduled"], {
        errorMap: () => ({
          message:
            "Invalid rideType provided. Must be 'instant' or 'scheduled'",
        }),
      })
      .optional(),
    paymentStatus: zod_1.z.string().optional(),
    fromDate: zod_1.z.string().optional(),
    toDate: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(["asc", "desc", "ASC", "DESC"]).optional(),
  }),
});
exports.RideValidations = {
  estimateRideZodSchema,
  requestRideZodSchema,
  verifyRideSecurityZodSchema,
  cancelRideZodSchema,
  addStopsZodSchema,
  driverRideHistoryQuerySchema,
};
