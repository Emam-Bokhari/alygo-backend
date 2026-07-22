"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverWalletRoutes = exports.WalletRoutes = void 0;
const express_1 = __importDefault(require("express"));
const wallet_controller_1 = require("./wallet.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Passenger (User) Wallet Routes
router.get("/", authHelper_1.isUser, wallet_controller_1.WalletController.getWalletSummary);
router.get("/transactions", authHelper_1.isUser, wallet_controller_1.WalletController.getTransactionHistory);
router.post("/top-up", authHelper_1.isUser, wallet_controller_1.WalletController.topUpWallet);
// Driver Wallet Routes
const driverRouter = express_1.default.Router();
driverRouter.get("/", authHelper_1.isDriver, wallet_controller_1.WalletController.getDriverWalletSummary);
driverRouter.get("/transactions", authHelper_1.isDriver, wallet_controller_1.WalletController.getDriverTransactionHistory);
exports.WalletRoutes = router;
exports.DriverWalletRoutes = driverRouter;
