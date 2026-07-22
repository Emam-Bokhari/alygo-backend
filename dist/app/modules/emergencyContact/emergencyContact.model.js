"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyContact = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const emergencyContactSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    relationship: {
        type: String,
        required: false,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
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
});
emergencyContactSchema.plugin(softDeletePlugin_1.softDeletePlugin);
// Prevent duplicate contacts with the same number for a single user
emergencyContactSchema.index({ userId: 1, phone: 1 }, { unique: true });
exports.EmergencyContact = (0, mongoose_1.model)("EmergencyContact", emergencyContactSchema);
