import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";
import {
  AiKnowledgeModule,
  AiKnowledgeCategory,
  AiKnowledgeTag,
} from "./aiKnowledge.constant";

export interface IAiKnowledge {
  _id?: Types.ObjectId;
  title: string;
  module: AiKnowledgeModule;
  category: AiKnowledgeCategory;
  content: string;
  searchableContent: string;
  tags?: AiKnowledgeTag[];
  keywords?: string[];
  language: string;
  priority: number;
  version: number;
  isActive: boolean;
  aiEnabled: boolean;
  visibility: "driver" | "internal" | "admin_only";
  status: "under_review" | "published" | "archived";
  allowedRoles: ("driver" | "passenger" | "admin" | "super_admin")[];
  previousVersionId?: Types.ObjectId;
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
  changeLog?: string;
  isLatest: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AiKnowledgeModel = ISoftDeleteModel<IAiKnowledge>;
