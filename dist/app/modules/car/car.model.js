"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Car = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const carSchema = new mongoose_1.Schema({
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Driver",
        required: true,
        index: true,
    },
    brand: {
        type: String,
        required: true,
        trim: true,
    },
    model: {
        type: String,
        required: true,
        trim: true,
    },
    year: {
        type: Number,
        required: true,
    },
    carType: {
        type: String,
        required: true,
        trim: true,
    },
    seatNumber: {
        type: Number,
        required: true,
        min: 1,
    },
    licensePlate: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    vin: {
        type: String,
        default: "",
        trim: true,
        uppercase: true,
    },
    vehicleLicense: {
        type: String,
        default: "",
    },
    personalAutoInsurance: {
        type: String,
        default: "",
    },
    insuranceHub: {
        type: [
            {
                fileUrl: {
                    type: String,
                    required: true,
                },
                fileName: {
                    type: String,
                    default: "",
                },
                uploadedAt: {
                    type: Date,
                    default: null,
                },
                extractedData: {
                    type: mongoose_1.Schema.Types.Mixed,
                    default: {},
                },
            },
        ],
        default: [],
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verifiedAt: {
        type: Date,
        default: null,
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
carSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.Car = (0, mongoose_1.model)("Car", carSchema);
