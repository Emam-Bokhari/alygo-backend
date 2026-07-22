"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventZodValidation = void 0;
const zod_1 = require("zod");
const status_1 = require("../../../constants/status");
const createEventValidationSchema = zod_1.z.object({
  body: zod_1.z
    .object({
      eventName: zod_1.z.string().min(1, "Event name is required"),
      description: zod_1.z.string().optional(),
      timezone: zod_1.z.string().min(1, "Timezone is required"),
      startDateTime: zod_1.z
        .string()
        .or(zod_1.z.date())
        .refine(
          (val) => !isNaN(new Date(val).getTime()),
          "Invalid start date time",
        ),
      endDateTime: zod_1.z
        .string()
        .or(zod_1.z.date())
        .refine(
          (val) => !isNaN(new Date(val).getTime()),
          "Invalid end date time",
        ),
      serviceAreaId: zod_1.z.string().optional(),
      location: zod_1.z
        .object({
          type: zod_1.z.literal("Point"),
          coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
        })
        .optional(),
      coverageRadiusKm: zod_1.z.number().min(0).optional(),
      status: zod_1.z
        .enum(Object.values(status_1.STATUS))
        .default(status_1.STATUS.ACTIVE),
    })
    .refine(
      (data) => new Date(data.startDateTime) <= new Date(data.endDateTime),
      {
        message: "End date time must be after or equal to start date time",
        path: ["endDateTime"],
      },
    )
    .refine(
      (data) => {
        if (data.location && !data.coverageRadiusKm) {
          return false;
        }
        return true;
      },
      {
        message: "Coverage radius is required when location is specified",
        path: ["coverageRadiusKm"],
      },
    ),
});
const updateEventValidationSchema = zod_1.z.object({
  body: zod_1.z
    .object({
      eventName: zod_1.z.string().min(1).optional(),
      description: zod_1.z.string().optional(),
      timezone: zod_1.z.string().min(1).optional(),
      startDateTime: zod_1.z
        .string()
        .or(zod_1.z.date())
        .refine((val) => !isNaN(new Date(val).getTime()))
        .optional(),
      endDateTime: zod_1.z
        .string()
        .or(zod_1.z.date())
        .refine((val) => !isNaN(new Date(val).getTime()))
        .optional(),
      serviceAreaId: zod_1.z.string().optional(),
      location: zod_1.z
        .object({
          type: zod_1.z.literal("Point"),
          coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
        })
        .optional(),
      coverageRadiusKm: zod_1.z.number().min(0).optional(),
      status: zod_1.z.enum(Object.values(status_1.STATUS)).optional(),
    })
    .refine(
      (data) => {
        if (data.startDateTime && data.endDateTime) {
          return new Date(data.startDateTime) <= new Date(data.endDateTime);
        }
        return true;
      },
      {
        message: "End date time must be after or equal to start date time",
        path: ["endDateTime"],
      },
    )
    .refine(
      (data) => {
        if (data.location && !data.coverageRadiusKm) {
          return false;
        }
        return true;
      },
      {
        message: "Coverage radius is required when location is specified",
        path: ["coverageRadiusKm"],
      },
    ),
});
const updateEventStatusValidationSchema = zod_1.z.object({
  body: zod_1.z.object({
    status: zod_1.z.enum(Object.values(status_1.STATUS)),
  }),
});
exports.EventZodValidation = {
  createEventValidationSchema,
  updateEventValidationSchema,
  updateEventStatusValidationSchema,
};
