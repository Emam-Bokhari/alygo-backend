import { z } from "zod";
import {
  BROADCAST_DELIVERY_TYPE,
  BROADCAST_TARGET,
  BROADCAST_TYPE,
} from "./broadcast.constant";

const createBroadcastValidationSchema = z.object({
  body: z
    .object({
      title: z.string({ required_error: "Title is required" }).trim().min(1, "Title is required"),
      message: z.string({ required_error: "Message is required" }).trim().min(1, "Message is required"),
      type: z.nativeEnum(BROADCAST_TYPE, {
        required_error: "Broadcast type is required",
        invalid_type_error: "Invalid broadcast type",
      }),
      deliveryType: z.nativeEnum(BROADCAST_DELIVERY_TYPE, {
        required_error: "Delivery type is required",
        invalid_type_error: "Invalid delivery type",
      }),
      targetAudience: z.nativeEnum(BROADCAST_TARGET, {
        required_error: "Target audience is required",
        invalid_type_error: "Invalid target audience",
      }),
      targetFilters: z
        .object({
          city: z.string().regex(/^[a-f\d]{24}$/i, "Invalid city ID").optional(),
          state: z.string().regex(/^[a-f\d]{24}$/i, "Invalid state ID").optional(),
          tier: z.string().regex(/^[a-f\d]{24}$/i, "Invalid tier ID").optional(),
        })
        .optional(),
      scheduledAt: z.string().datetime({ offset: true }).optional(),
    })
    .superRefine((data, ctx) => {
      // Scheduled delivery requires scheduledAt
      if (data.deliveryType === BROADCAST_DELIVERY_TYPE.SCHEDULED) {
        if (!data.scheduledAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Scheduled date is required for scheduled delivery",
            path: ["scheduledAt"],
          });
        } else {
          const scheduledDate = new Date(data.scheduledAt);
          if (scheduledDate <= new Date()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Scheduled date must be in the future",
              path: ["scheduledAt"],
            });
          }
        }
      }

      // City-based targeting requires city filter
      if (data.targetAudience === BROADCAST_TARGET.BY_CITY) {
        if (!data.targetFilters?.city) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "City is required for city-based targeting",
            path: ["targetFilters", "city"],
          });
        }
      }

      // State-based targeting requires state filter
      if (data.targetAudience === BROADCAST_TARGET.BY_STATE) {
        if (!data.targetFilters?.state) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "State is required for state-based targeting",
            path: ["targetFilters", "state"],
          });
        }
      }

      // Tier-based targeting requires tier filter
      if (data.targetAudience === BROADCAST_TARGET.BY_TIER) {
        if (!data.targetFilters?.tier) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Tier is required for tier-based targeting",
            path: ["targetFilters", "tier"],
          });
        }
      }
    }),
});

export const BroadcastValidation = {
  createBroadcastValidationSchema,
};
