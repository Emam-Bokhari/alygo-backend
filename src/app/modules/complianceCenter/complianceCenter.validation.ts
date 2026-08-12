import { z } from "zod";
import {
  FEE_STATUS,
  DOCUMENT_EXPIRATION_STATUS,
} from "./complianceCenter.constant";

const createBackgroundCheckFeeZodSchema = z.object({
  body: z.object({
    feeName: z.string({
      required_error: "Fee name is required",
    }).min(1, "Fee name cannot be empty"),
    amount: z.number({
      required_error: "Amount is required",
    }).min(0, "Amount must be a positive number"),
    applicableState: z.string().optional(),
    serviceAreaId: z.string().optional(),
    location: z
      .object({
        type: z.enum(["Point"]).optional(),
        coordinates: z.tuple([z.number(), z.number()]).optional(),
      })
      .optional(),
    status: z.enum([FEE_STATUS.ACTIVE, FEE_STATUS.INACTIVE] as [string, ...string[]]).optional(),
    description: z.string().optional(),
  }),
});

const updateBackgroundCheckFeeZodSchema = z.object({
  body: z.object({
    feeName: z.string().min(1).optional(),
    amount: z.number().min(0).optional(),
    applicableState: z.string().optional(),
    serviceAreaId: z.string().optional(),
    location: z
      .object({
        type: z.enum(["Point"]).optional(),
        coordinates: z.tuple([z.number(), z.number()]).optional(),
      })
      .optional(),
    status: z.enum([FEE_STATUS.ACTIVE, FEE_STATUS.INACTIVE] as [string, ...string[]]).optional(),
    description: z.string().optional(),
  }),
});

const updateFeeStatusZodSchema = z.object({
  body: z.object({
    status: z.enum([FEE_STATUS.ACTIVE, FEE_STATUS.INACTIVE] as [string, ...string[]], {
      required_error: "Status is required",
    }),
  }),
});

const documentMonitoringQueryZodSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
    driverId: z.string().optional(),
    documentType: z.string().optional(),
    status: z.string().optional(),
    expirationStatus: z
      .enum(
        Object.values(DOCUMENT_EXPIRATION_STATUS) as [string, ...string[]],
      )
      .optional(),
  }).optional(),
});

export const ComplianceCenterValidation = {
  createBackgroundCheckFeeZodSchema,
  updateBackgroundCheckFeeZodSchema,
  updateFeeStatusZodSchema,
  documentMonitoringQueryZodSchema,
};
