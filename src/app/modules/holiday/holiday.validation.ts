import { z } from "zod";
import { STATUS } from "../../../constants/status";

const createHolidayValidationSchema = z.object({
  body: z
    .object({
      holidayName: z.string().min(1, "Holiday name is required"),
      timezone: z.string().min(1, "Timezone is required"),
      startDate: z
        .string()
        .or(z.date())
        .refine((val) => !isNaN(new Date(val).getTime()), "Invalid start date"),
      endDate: z
        .string()
        .or(z.date())
        .refine((val) => !isNaN(new Date(val).getTime()), "Invalid end date"),
      description: z.string().optional(),
      status: z
        .enum(Object.values(STATUS) as [string, ...string[]])
        .default(STATUS.ACTIVE),
    })
    .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }),
});

const updateHolidayValidationSchema = z.object({
  body: z
    .object({
      holidayName: z.string().min(1).optional(),
      timezone: z.string().min(1).optional(),
      startDate: z
        .string()
        .or(z.date())
        .refine((val) => !isNaN(new Date(val).getTime()))
        .optional(),
      endDate: z
        .string()
        .or(z.date())
        .refine((val) => !isNaN(new Date(val).getTime()))
        .optional(),
      description: z.string().optional(),
      status: z.enum(Object.values(STATUS) as [string, ...string[]]).optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
      },
      {
        message: "End date must be after or equal to start date",
        path: ["endDate"],
      },
    ),
});

const updateHolidayStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(STATUS) as [string, ...string[]]),
  }),
});

export const HolidayZodValidation = {
  createHolidayValidationSchema,
  updateHolidayValidationSchema,
  updateHolidayStatusValidationSchema,
};
