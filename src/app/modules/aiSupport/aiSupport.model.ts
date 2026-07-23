import { model, Schema } from "mongoose";
import { IAiSupport, AiSupportModel } from "./aiSupport.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const aiSupportSchema = new Schema<IAiSupport, AiSupportModel>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "AiConversation",
      required: true,
      index: true,
    },
    knowledgeIds: {
      type: [Schema.Types.ObjectId],
      ref: "AiKnowledge",
      default: [],
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedQuestion: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    aiModel: {
      type: String,
      required: true,
      trim: true,
    },
    promptVersion: {
      type: String,
      required: true,
      trim: true,
      default: "1.0",
    },
    confidenceScore: {
      type: Number,
      required: true,
      default: 1.0,
    },
    responseStatus: {
      type: String,
      required: true,
      enum: ["success", "no_match", "disabled_module", "blocked", "error"],
      default: "success",
    },
    responseSource: {
      type: String,
      required: true,
      enum: ["knowledge_base", "fallback"],
      default: "knowledge_base",
    },
    responseTimeMs: {
      type: Number,
      required: true,
      default: 0,
    },
    tokensUsed: {
      type: Number,
      required: true,
      default: 0,
    },
    language: {
      type: String,
      required: true,
      default: "en",
    },
    feedback: {
      type: String,
      enum: ["helpful", "not_helpful", null],
      default: null,
    },
    helpful: {
      type: Boolean,
      required: true,
      default: false,
    },
    adminReviewed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  },
);

// Apply soft delete plugin
aiSupportSchema.plugin(softDeletePlugin);

// Compound index to query a conversation's messages in chronologically ascending order
aiSupportSchema.index({ conversationId: 1, createdAt: 1 });

// Helper indexes for statistics/dashboard sorting
aiSupportSchema.index({ driverId: 1, createdAt: -1 });
aiSupportSchema.index({ createdAt: -1 });

export const AiSupport = model<IAiSupport, AiSupportModel>(
  "AiSupport",
  aiSupportSchema,
);
