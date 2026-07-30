import { z } from "zod";

const createRoleZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Role name is required",
    }).min(1, "Role name cannot be empty"),
    description: z.string().optional(),
    permissions: z.array(z.string(), {
      required_error: "Permissions array is required",
    }),
    status: z.enum(["active", "inactive"]).optional(),
  }),
});

const updateRoleZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  }),
});

const assignRoleZodSchema = z.object({
  body: z.object({
    roleId: z.string({
      required_error: "roleId is required",
    }),
  }),
});

export const RbacValidation = {
  createRoleZodSchema,
  updateRoleZodSchema,
  assignRoleZodSchema,
};
