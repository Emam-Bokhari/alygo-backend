import { z } from "zod";
import { STATUS } from "../../../constants/status";

const createEventValidationSchema = z.object({
  body: z
    .object({
      eventName: z.string().min(1, "Event name is required"),
      description: z.string().optional(),
      timezone: z.string().min(1, "Timezone is required"),
      startDateTime: z
        .string()
        .or(z.date())
        .refine(
          (val) => !isNaN(new Date(val).getTime()),
          "Invalid start date time",
        ),
      endDateTime: z
        .string()
        .or(z.date())
        .refine(
          (val) => !isNaN(new Date(val).getTime()),
          "Invalid end date time",
        ),
      serviceAreaId: z.string().optional(),
      location: z
        .object({
          type: z.literal("Point"),
          coordinates: z.tuple([z.number(), z.number()]),
        })
        .optional(),
      coverageRadiusKm: z.number().min(0).optional(),
      status: z
        .enum(Object.values(STATUS) as [string, ...string[]])
        .default(STATUS.ACTIVE),
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

const updateEventValidationSchema = z.object({
  body: z
    .object({
      eventName: z.string().min(1).optional(),
      description: z.string().optional(),
      timezone: z.string().min(1).optional(),
      startDateTime: z
        .string()
        .or(z.date())
        .refine((val) => !isNaN(new Date(val).getTime()))
        .optional(),
      endDateTime: z
        .string()
        .or(z.date())
        .refine((val) => !isNaN(new Date(val).getTime()))
        .optional(),
      serviceAreaId: z.string().optional(),
      location: z
        .object({
          type: z.literal("Point"),
          coordinates: z.tuple([z.number(), z.number()]),
        })
        .optional(),
      coverageRadiusKm: z.number().min(0).optional(),
      status: z.enum(Object.values(STATUS) as [string, ...string[]]).optional(),
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

const updateEventStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(STATUS) as [string, ...string[]]),
  }),
});

export const EventZodValidation = {
  createEventValidationSchema,
  updateEventValidationSchema,
  updateEventStatusValidationSchema,
};
