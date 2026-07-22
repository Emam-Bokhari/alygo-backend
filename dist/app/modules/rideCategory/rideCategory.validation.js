"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideCategoryValidation = void 0;
const zod_1 = require("zod");
const status_1 = require("../../../constants/status");
const createRideCategoryValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        serviceCategoryId: zod_1.z.string().optional(),
        name: zod_1.z.string({
            required_error: "name is required",
        }),
        description: zod_1.z.string().optional(),
        commissionRate: zod_1.z
            .number({
            required_error: "commissionRate is required",
        })
            .min(0)
            .max(100),
        minimumDriverRating: zod_1.z
            .number({
            required_error: "minimumDriverRating is required",
        })
            .min(0)
            .max(5),
        vehicleRequirements: zod_1.z.object({
            vehicleTypes: zod_1.z.array(zod_1.z.string(), {
                required_error: "vehicleTypes is required",
            }),
            minimumSeats: zod_1.z
                .number({
                required_error: "minimumSeats is required",
            })
                .min(1),
        }),
        status: zod_1.z.nativeEnum(status_1.STATUS).optional(),
    }),
});
const updateRideCategoryValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        serviceCategoryId: zod_1.z.string().optional(),
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        commissionRate: zod_1.z.number().min(0).max(100).optional(),
        minimumDriverRating: zod_1.z.number().min(0).max(5).optional(),
        vehicleRequirements: zod_1.z
            .object({
            vehicleTypes: zod_1.z.array(zod_1.z.string()).optional(),
            minimumSeats: zod_1.z.number().min(1).optional(),
        })
            .optional(),
        status: zod_1.z.nativeEnum(status_1.STATUS).optional(),
    }),
});
exports.RideCategoryValidation = {
    createRideCategoryValidationSchema,
    updateRideCategoryValidationSchema,
};
