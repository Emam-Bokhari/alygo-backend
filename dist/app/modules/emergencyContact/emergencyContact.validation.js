"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyContactZodValidation = void 0;
const zod_1 = require("zod");
const createEmergencyContactValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1, "Name is required"),
        phone: zod_1.z.string().trim().min(1, "Phone number is required"),
        relationship: zod_1.z.string().trim().optional(),
    }),
});
const updateEmergencyContactValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(1, "Name is required").optional(),
        phone: zod_1.z.string().trim().min(1, "Phone number is required").optional(),
        relationship: zod_1.z.string().trim().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.EmergencyContactZodValidation = {
    createEmergencyContactValidationSchema,
    updateEmergencyContactValidationSchema,
};
