import { model, Schema } from "mongoose";
import { IAiConversation, AiConversationModel } from "./aiConversation.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const aiConversationSchema = new Schema<IAiConversation, AiConversationModel>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "New Conversation",
    },
    isArchived: {
      type: Boolean,
      required: true,
      default: false,
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

// Apply soft delete plugin
aiConversationSchema.plugin(softDeletePlugin);

// Compound index to quickly query driver conversations sorted by latest activity
aiConversationSchema.index({ driverId: 1, updatedAt: -1 });

export const AiConversation = model<IAiConversation, AiConversationModel>(
  "AiConversation",
  aiConversationSchema,
);
