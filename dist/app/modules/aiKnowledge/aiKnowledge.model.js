"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiKnowledge = void 0;
const mongoose_1 = require("mongoose");
const aiKnowledgeSchema = new mongoose_1.Schema(
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
exports.AiKnowledge = (0, mongoose_1.model)("AiKnowledge", aiKnowledgeSchema);
