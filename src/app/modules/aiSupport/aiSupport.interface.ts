import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IAiSupport {
  _id?: Types.ObjectId;
  driverId: Types.ObjectId;
  conversationId: Types.ObjectId;
  knowledgeIds?: Types.ObjectId[];
  question: string;
  normalizedQuestion: string;
  answer: string;
  aiModel: string;
  promptVersion: string;
  confidenceScore: number;
  responseStatus: "success" | "no_match" | "disabled_module" | "blocked" | "error";
  responseSource: "knowledge_base" | "fallback";
  responseTimeMs: number;
  tokensUsed: number;
  language: string;
  feedback: "helpful" | "not_helpful" | null;
  helpful: boolean;
  adminReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AiSupportModel = ISoftDeleteModel<IAiSupport>;