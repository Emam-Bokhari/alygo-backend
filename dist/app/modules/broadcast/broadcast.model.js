"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Broadcast = void 0;
const mongoose_1 = require("mongoose");
const broadcast_constant_1 = require("./broadcast.constant");
const broadcastSchema = new mongoose_1.Schema({
    deliveryType: {
        type: String,
        enum: Object.values(broadcast_constant_1.BROADCAST_DELIVERY_TYPE),
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: Object.values(broadcast_constant_1.BROADCAST_TYPE),
        required: true,
    },
    targetAudience: {
        type: String,
        enum: Object.values(broadcast_constant_1.BROADCAST_TARGET),
        required: true,
    },
    targetFilters: {
        city: {
            type: String,
            trim: true,
        },
        state: {
            type: String,
            trim: true,
        },
        tier: {
            type: String,
            trim: true,
        },
        userIds: {
            type: [mongoose_1.Schema.Types.ObjectId],
            ref: "User",
            default: [],
        },
    },
    scheduledAt: {
        type: Date,
        required: false,
    },
    status: {
        type: String,
        enum: Object.values(broadcast_constant_1.BROADCAST_STATUS),
        default: broadcast_constant_1.BROADCAST_STATUS.PENDING,
        index: true,
    },
    sentAt: {
        type: Date,
        required: false,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
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
// Indexes to speed up retrieving scheduled messages and active broadcasts
broadcastSchema.index({ status: 1, scheduledAt: 1 });
exports.Broadcast = (0, mongoose_1.model)("Broadcast", broadcastSchema);
