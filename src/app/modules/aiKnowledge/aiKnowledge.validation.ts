import { z } from "zod";

const createKnowledgeValidationSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: "Title is required",
    }),
    module: z.string({
      required_error: "Module name is required",
    }),
    category: z.string({
      required_error: "Category is required",
    }),
    content: z.string({
      required_error: "Content is required",
    }),
    searchableContent: z.string().optional(),
    tags: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    language: z.string().optional(),
    priority: z.number().optional(),
    isActive: z.boolean().optional(),
    aiEnabled: z.boolean().optional(),
    visibility: z.enum(["driver", "internal", "admin_only"]).optional(),
    status: z.enum(["draft", "under_review", "published", "archived"]).optional(),
    allowedRoles: z.array(z.enum(["driver", "passenger", "admin", "super_admin"])).optional(),
    changeLog: z.string().optional(),
  }),
});

const updateKnowledgeValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    module: z.string().optional(),
    category: z.string().optional(),
    content: z.string().optional(),
    searchableContent: z.string().optional(),
    tags: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    language: z.string().optional(),
    priority: z.number().optional(),
    isActive: z.boolean().optional(),
    aiEnabled: z.boolean().optional(),
    visibility: z.enum(["driver", "internal", "admin_only"]).optional(),
    status: z.enum(["draft", "under_review", "published", "archived"]).optional(),
    allowedRoles: z.array(z.enum(["driver", "passenger", "admin", "super_admin"])).optional(),
    changeLog: z.string().optional(),
  }),
});

export const AiKnowledgeValidation = {
  createKnowledgeValidationSchema,
  updateKnowledgeValidationSchema,
};
