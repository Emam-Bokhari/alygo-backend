"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceCategory = void 0;
const mongoose_1 = require("mongoose");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const serviceCategorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    description: {
        type: String,
        trim: true,
    },
    image: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        enum: Object.values(status_1.STATUS),
        default: status_1.STATUS.ACTIVE,
    },
    supportsReservation: {
        type: Boolean,
        default: true,
    },
    minimumAdvanceBookingMinutes: {
        type: Number,
        default: 30,
        min: 0,
    },
    maximumAdvanceBookingDays: {
        type: Number,
        default: 30,
        min: 1,
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
serviceCategorySchema.index({ name: 1, status: 1 });
serviceCategorySchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.ServiceCategory = (0, mongoose_1.model)("ServiceCategory", serviceCategorySchema);
