"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyHelplineZodValidation = void 0;
const zod_1 = require("zod");
const updateEmergencyHelplineValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        callNumber: zod_1.z.string().trim(),
        textNumber: zod_1.z.string().trim(),
    }),
});
exports.EmergencyHelplineZodValidation = {
    updateEmergencyHelplineValidationSchema,
};
