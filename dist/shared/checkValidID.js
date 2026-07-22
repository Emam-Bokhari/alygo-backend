"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkValidID = void 0;
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const checkValidID = (fieldName) => zod_1.z.string().refine((val) => {
    if (!val) {
        return false;
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(val)) {
        return false;
    }
    return true;
}, {
    message: `${fieldName}`,
});
exports.checkValidID = checkValidID;
