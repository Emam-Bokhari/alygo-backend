import { Model, Types } from "mongoose";

export interface IAiSupport {
  driverId: Types.ObjectId; // The driver asking the AI support
  question: string; // The text/question from the driver
  answer: string; // The response/answer from the AI
  createdAt: Date;
  updatedAt: Date;
}

export type AiSupportModel = Model<IAiSupport>;
