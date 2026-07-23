import { model, Schema } from "mongoose";
import { IAiKnowledge, AiKnowledgeModel } from "./aiKnowledge.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const aiKnowledgeSchema = new Schema<IAiKnowledge, AiKnowledgeModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    searchableContent: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    language: {
      type: String,
      required: true,
      default: "en",
    },
    priority: {
      type: Number,
      required: true,
      default: 0,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    aiEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    visibility: {
      type: String,
      required: true,
      enum: ["driver", "internal", "admin_only"],
      default: "driver",
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "under_review", "published", "archived"],
      default: "draft",
      index: true,
    },
    allowedRoles: {
      type: [String],
      required: true,
      default: ["driver"],
    },
    previousVersionId: {
      type: Schema.Types.ObjectId,
      ref: "AiKnowledge",
      required: false,
    },
    publishedAt: {
      type: Date,
      required: false,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    changeLog: {
      type: String,
      required: false,
    },
    isLatest: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
aiKnowledgeSchema.plugin(softDeletePlugin);

// Create compound text index for search
aiKnowledgeSchema.index(
  { title: "text", content: "text", searchableContent: "text", tags: "text", keywords: "text" },
  { weights: { title: 10, content: 5, searchableContent: 4, keywords: 3, tags: 2 } },
);

export const AiKnowledge = model<IAiKnowledge, AiKnowledgeModel>(
  "AiKnowledge",
  aiKnowledgeSchema,
);
