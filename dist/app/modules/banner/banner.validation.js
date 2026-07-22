"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerZodValidation = void 0;
const zod_1 = require("zod");
const createBannerValidationSchema = zod_1.z.object({
  body: zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    image: zod_1.z.string(),
    status: zod_1.z.boolean().default(true),
  }),
});
exports.BannerZodValidation = {
  createBannerValidationSchema,
};
