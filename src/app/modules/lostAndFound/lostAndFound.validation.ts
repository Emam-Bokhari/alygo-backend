import { z } from "zod";
import { RECOVERY_METHOD } from "./lostAndFound.constant";

const locationSchema = z.object({
  address: z.string({
    required_error: "Address is required",
  }),
  location: z.object({
    type: z.literal("Point").default("Point"),
    coordinates: z.tuple([z.number(), z.number()], {
      required_error: "Coordinates [longitude, latitude] are required",
    }),
  }),
});

const reportLostItemSchema = z.object({
  body: z.object({
    rideId: z.string({
      required_error: "Ride ID is required",
    }),
    itemName: z
      .string({
        required_error: "Item name is required",
      })
      .trim()
      .min(1, "Item name cannot be empty"),
    itemCategory: z
      .string({
        required_error: "Item category is required",
      })
      .refine(
        (val) => /^[0-9a-fA-F]{24}$/.test(val),
        "Invalid category ID format",
      ),
    itemDescription: z
      .string({
        required_error: "Item description is required",
      })
      .trim()
      .min(1, "Item description cannot be empty"),
    lastSeenLocation: z
      .string({
        required_error: "Last seen location description is required",
      })
      .trim()
      .min(1, "Last seen location cannot be empty"),
    preferredRecoveryOption: z.nativeEnum(RECOVERY_METHOD).optional(),
    uploadedFiles: z
      .array(
        z.object({
          fileUrl: z.string({ required_error: "File URL is required" }),
          fileName: z.string().optional(),
        }),
      )
      .optional(),
  }),
});

const driverFoundSchema = z.object({
  body: z.object({
    driverNotes: z.string().optional(),
  }),
});

const driverNotFoundSchema = z.object({
  body: z.object({
    reason: z
      .string({
        required_error: "Reason is required",
      })
      .trim()
      .min(1, "Reason is required"),
    driverNotes: z.string().optional(),
  }),
});

const configureRecoverySchema = z.object({
  body: z.object({
    recoveryMethod: z.nativeEnum(RECOVERY_METHOD, {
      required_error: "Recovery method is required",
    }),
    // If DRIVER_DELIVERY
    address: z.string().optional(),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
    deliveryFee: z.number().min(0).optional(),
    scheduledAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format for scheduledAt",
      })
      .transform((val) => new Date(val))
      .optional(),
  }),
});

const rateDriverSchema = z.object({
  body: z.object({
    rating: z
      .number({
        required_error: "Rating is required",
      })
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot be more than 5"),
    review: z.string().optional(),
  }),
});

const adminUpdateSchema = z.object({
  body: z.object({
    reportStatus: z.string().optional(),
    foundStatus: z.string().optional(),
    deliveryFee: z.number().min(0).optional(),
    adminNotes: z.string().optional(),
    recoveryMethod: z.nativeEnum(RECOVERY_METHOD).optional(),
  }),
});

export const LostAndFoundValidation = {
  reportLostItemSchema,
  driverFoundSchema,
  driverNotFoundSchema,
  configureRecoverySchema,
  rateDriverSchema,
  adminUpdateSchema,
};
