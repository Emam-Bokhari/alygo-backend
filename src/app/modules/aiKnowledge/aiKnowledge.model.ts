import { model, Schema } from "mongoose";
import { IAiKnowledge, AiKnowledgeModel } from "./aiKnowledge.interface";

const aiKnowledgeSchema = new Schema<IAiKnowledge, AiKnowledgeModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

// Create a compound text index for RAG retrieval search queries
aiKnowledgeSchema.index(
  { title: "text", content: "text", tags: "text" },
  { weights: { title: 10, content: 5, tags: 2 } },
);

export const AiKnowledge = model<IAiKnowledge, AiKnowledgeModel>(
  "AiKnowledge",
  aiKnowledgeSchema,
);
