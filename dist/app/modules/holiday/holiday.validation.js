"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayZodValidation = void 0;
const zod_1 = require("zod");
const status_1 = require("../../../constants/status");
const createHolidayValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        holidayName: zod_1.z.string().min(1, "Holiday name is required"),
        timezone: zod_1.z.string().min(1, "Timezone is required"),
        startDate: zod_1.z
            .string()
            .or(zod_1.z.date())
            .refine((val) => !isNaN(new Date(val).getTime()), "Invalid start date"),
        endDate: zod_1.z
            .string()
            .or(zod_1.z.date())
            .refine((val) => !isNaN(new Date(val).getTime()), "Invalid end date"),
        description: zod_1.z.string().optional(),
        status: zod_1.z
            .enum(Object.values(status_1.STATUS))
            .default(status_1.STATUS.ACTIVE),
    })
        .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
        message: "End date must be after or equal to start date",
        path: ["endDate"],
    }),
});
const updateHolidayValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        holidayName: zod_1.z.string().min(1).optional(),
        timezone: zod_1.z.string().min(1).optional(),
        startDate: zod_1.z
            .string()
            .or(zod_1.z.date())
            .refine((val) => !isNaN(new Date(val).getTime()))
            .optional(),
        endDate: zod_1.z
            .string()
            .or(zod_1.z.date())
            .refine((val) => !isNaN(new Date(val).getTime()))
            .optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(Object.values(status_1.STATUS)).optional(),
    })
        .refine((data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
    }, {
        message: "End date must be after or equal to start date",
        path: ["endDate"],
    }),
});
const updateHolidayStatusValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(Object.values(status_1.STATUS)),
    }),
});
exports.HolidayZodValidation = {
    createHolidayValidationSchema,
    updateHolidayValidationSchema,
    updateHolidayStatusValidationSchema,
};
