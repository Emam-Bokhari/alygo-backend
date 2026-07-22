"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const review_constant_1 = require("./review.constant");
const reviewSchema = new mongoose_1.Schema({
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ride",
        required: true,
        index: true,
    },
    reviewerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    reviewerRole: {
        type: String,
        enum: ["user", "driver"],
        required: true,
    },
    receiverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    receiverRole: {
        type: String,
        enum: ["user", "driver"],
        required: true,
    },
    rating: {
        type: Number,
        enum: [1, 2, 3, 4, 5],
        required: true,
    },
    reviewText: {
        type: String,
        trim: true,
        default: "",
    },
    selectedTags: {
        type: String,
        default: "",
    },
    appreciation: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: Object.values(review_constant_1.REVIEW_STATUS),
        default: review_constant_1.REVIEW_STATUS.ACTIVE,
        required: true,
    },
    rideSnapshot: {
        driverName: { type: String, required: true },
        vehicleName: { type: String, required: true },
        vehicleNumber: { type: String, required: true },
        completedAt: { type: Date, required: true },
        rideCategory: { type: String, required: true },
        pickup: { type: String, required: true },
        destination: { type: String, required: true },
        fare: { type: Number, required: true },
    },
    reviewForId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    reviewById: {
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
// Prevent duplicate review: one reviewer can only review once per ride
reviewSchema.index({ rideId: 1, reviewerId: 1 }, { unique: true });
exports.Review = (0, mongoose_1.model)("Review", reviewSchema);
// Drop legacy index to support one review per ride
mongoose_1.default.connection.once("open", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connection
            .db.collection("reviews")
            .dropIndex("reviewForId_1_reviewById_1");
    }
    catch (err) {
        // Index might not exist or already dropped
    }
}));
