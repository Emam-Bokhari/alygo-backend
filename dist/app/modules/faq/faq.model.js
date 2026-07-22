"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Faq = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const faqSchema = new mongoose_1.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
faqSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.Faq = (0, mongoose_1.model)("Faq", faqSchema);
