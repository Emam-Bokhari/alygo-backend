"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const transaction_controller_1 = require("./transaction.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router.get("/history", authHelper_1.isAuthenticated, transaction_controller_1.TransactionController.getMyTransactions);
exports.TransactionRoutes = router;
