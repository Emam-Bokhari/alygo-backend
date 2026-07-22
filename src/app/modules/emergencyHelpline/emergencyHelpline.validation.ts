import { z } from "zod";

const updateEmergencyHelplineValidationSchema = z.object({
  body: z.object({
    callNumber: z.string().trim(),
    textNumber: z.string().trim(),
  }),
});

export const EmergencyHelplineZodValidation = {
  updateEmergencyHelplineValidationSchema,
};
