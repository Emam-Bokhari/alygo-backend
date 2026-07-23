"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Support = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const supportSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    name: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "low",
    },
}, {
    timestamps: true,
    versionKey: false,
});
supportSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.Support = (0, mongoose_1.model)("Support", supportSchema);
