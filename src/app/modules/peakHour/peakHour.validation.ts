import { z } from "zod";
import { STATUS } from "../../../constants/status";
import { DAYS } from "../../../constants/days";

const createPeakHourValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    startTime: z
      .string()
      .regex(
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Start time must be in HH:mm format",
      ),
    endTime: z
      .string()
      .regex(
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "End time must be in HH:mm format",
      ),
    timezone: z.string().min(1, "Timezone is required"),
    applicableDays: z
      .array(z.enum(Object.values(DAYS) as [string, ...string[]]))
      .min(1, "At least one day is required"),
    status: z
      .enum(Object.values(STATUS) as [string, ...string[]])
      .default(STATUS.ACTIVE),
  }),
});

const updatePeakHourValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    startTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional(),
    timezone: z.string().min(1).optional(),
    applicableDays: z
      .array(z.enum(Object.values(DAYS) as [string, ...string[]]))
      .min(1)
      .optional(),
    status: z.enum(Object.values(STATUS) as [string, ...string[]]).optional(),
  }),
});

const updatePeakHourStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(STATUS) as [string, ...string[]]),
  }),
});

export const PeakHourZodValidation = {
  createPeakHourValidationSchema,
  updatePeakHourValidationSchema,
  updatePeakHourStatusValidationSchema,
};
