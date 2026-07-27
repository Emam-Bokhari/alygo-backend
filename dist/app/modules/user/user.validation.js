"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = void 0;
const zod_1 = require("zod");
const createAdminZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" }),
        email: zod_1.z.string().optional(),
        phone: zod_1.z.string({ required_error: "Phone is required" }),
        countryCode: zod_1.z.string({ required_error: "Country code is required" }),
        password: zod_1.z.string({ required_error: "Password is required" }),
        role: zod_1.z.string({ required_error: "Role is required" }),
    }),
});
exports.UserValidation = { createAdminZodSchema };
