import { z } from "zod";

const cancellationQuerySchema = z.object({
  query: z
    .object({
      startDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid startDate format. Must be a valid date string.",
        })
        .optional(),
      endDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid endDate format. Must be a valid date string.",
        })
        .optional(),
      filter: z
        .enum(
          [
            "today",
            "yesterday",
            "last7days",
            "last30days",
            "thisMonth",
            "lastMonth",
            "thisYear",
            "custom",
          ],
          {
            errorMap: () => ({
              message:
                "Invalid filter value. Allowed: today, yesterday, last7days, last30days, thisMonth, lastMonth, thisYear, custom",
            }),
          },
        )
        .optional(),
      timezone: z.string().optional(),
      serviceAreaId: z
        .string()
        .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
          message: "Invalid serviceAreaId. Must be a 24-character hex string.",
        })
        .optional(),
      city: z.string().optional(),
      rideCategoryId: z
        .string()
        .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
          message: "Invalid rideCategoryId. Must be a 24-character hex string.",
        })
        .optional(),
      limit: z
        .string()
        .refine((val) => !isNaN(Number(val)), {
          message: "Invalid limit. Must be a numeric string.",
        })
        .optional(),
    })
    .refine(
      (data) => {
        if (data.filter === "custom") {
          return !!data.startDate && !!data.endDate;
        }
        return true;
      },
      {
        message:
          "startDate and endDate are required when filter is set to 'custom'",
        path: ["startDate"],
      },
    ),
});

export const CancellationAnalyticsValidation = {
  cancellationQuerySchema,
};
