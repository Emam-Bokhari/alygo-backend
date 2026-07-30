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

const createAdminWithRoleZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }),
    email: z.string({ required_error: "Email is required" }).email("Invalid email format"),
    phone: z.string().optional(),
    countryCode: z.string().optional(),
    password: z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters long"),
    roleId: z.string().optional(),
    roleName: z.string().optional(),
    permissions: z.array(z.string()).optional(),
  }).refine(
    (data) => data.roleId || data.roleName,
    {
      message: "Either roleId or roleName must be provided to assign a role",
      path: ["roleId"],
    }
  ),
});

export const RbacValidation = {
  createRoleZodSchema,
  updateRoleZodSchema,
  assignRoleZodSchema,
  createAdminWithRoleZodSchema,
};
