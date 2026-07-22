import { z } from "zod";

const createEmergencyContactValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    phone: z.string().trim().min(1, "Phone number is required"),
    relationship: z.string().trim().optional(),
  }),
});

const updateEmergencyContactValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required").optional(),
    phone: z.string().trim().min(1, "Phone number is required").optional(),
    relationship: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const EmergencyContactZodValidation = {
  createEmergencyContactValidationSchema,
  updateEmergencyContactValidationSchema,
};
