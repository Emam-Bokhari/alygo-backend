import { Model, Types } from "mongoose";

export interface IAiKnowledge {
  title: string;
  category: string; // e.g. "policy", "rewards", "driver_safety", "faq"
  content: string; // The official document text / answers
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AiKnowledgeModel = Model<IAiKnowledge>;
