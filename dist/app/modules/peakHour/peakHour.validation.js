"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeakHourZodValidation = void 0;
const zod_1 = require("zod");
const status_1 = require("../../../constants/status");
const days_1 = require("../../../constants/days");
const createPeakHourValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name is required"),
        startTime: zod_1.z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:mm format"),
        endTime: zod_1.z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:mm format"),
        timezone: zod_1.z.string().min(1, "Timezone is required"),
        applicableDays: zod_1.z
            .array(zod_1.z.enum(Object.values(days_1.DAYS)))
            .min(1, "At least one day is required"),
        status: zod_1.z
            .enum(Object.values(status_1.STATUS))
            .default(status_1.STATUS.ACTIVE),
    }),
});
const updatePeakHourValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        startTime: zod_1.z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .optional(),
        endTime: zod_1.z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .optional(),
        timezone: zod_1.z.string().min(1).optional(),
        applicableDays: zod_1.z
            .array(zod_1.z.enum(Object.values(days_1.DAYS)))
            .min(1)
            .optional(),
        status: zod_1.z.enum(Object.values(status_1.STATUS)).optional(),
    }),
});
const updatePeakHourStatusValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(Object.values(status_1.STATUS)),
    }),
});
exports.PeakHourZodValidation = {
    createPeakHourValidationSchema,
    updatePeakHourValidationSchema,
    updatePeakHourStatusValidationSchema,
};
