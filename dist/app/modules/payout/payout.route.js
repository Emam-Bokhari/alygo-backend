"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutRoutes = void 0;
const express_1 = __importDefault(require("express"));
const payout_controller_1 = require("./payout.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router.post("/withdraw", authHelper_1.isDriver, payout_controller_1.PayoutController.requestWithdrawal);
router.get("/history", authHelper_1.isDriver, payout_controller_1.PayoutController.getWithdrawalHistory);
exports.PayoutRoutes = router;
