import { z } from "zod";

const askQuestionValidationSchema = z.object({
  body: z.object({
    conversationId: z.string({
      required_error: "Conversation ID is required",
    }),
    question: z.string({
      required_error: "Question is required",
    }).min(1, "Question cannot be empty"),
    language: z.string().optional(),
  }),
});

const submitFeedbackValidationSchema = z.object({
  body: z.object({
    feedback: z.enum(["helpful", "not_helpful"], {
      required_error: "Feedback status is required",
    }),
  }),
});

const conversationValidationSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: "Conversation title is required",
    }).min(1, "Title cannot be empty"),
  }),
});

const updateConfigValidationSchema = z.object({
  body: z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(["google", "openai"]).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).optional(),
    historyLength: z.number().min(0).optional(),
    enableConversationMemory: z.boolean().optional(),
    minimumConfidence: z.number().min(0).max(1).optional(),
    allowFallbackAnswer: z.boolean().optional(),
    defaultLanguage: z.string().optional(),
    enabledModules: z.array(z.string()).optional(),
    suggestedQuestions: z.array(z.string()).optional(),
    rateLimit: z.object({
      maxQuestionsPerMinute: z.number().min(1),
      maxQuestionsPerHour: z.number().min(1),
      dailyLimit: z.number().min(1),
    }).optional(),
    prompts: z.object({
      systemPrompt: z.string(),
      fallbackPrompt: z.string(),
      safetyPrompt: z.string(),
      noMatchPrompt: z.string(),
    }).optional(),
  }),
});

export const AiSupportValidation = {
  askQuestionValidationSchema,
  submitFeedbackValidationSchema,
  conversationValidationSchema,
  updateConfigValidationSchema,
};
