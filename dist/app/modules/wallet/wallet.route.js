"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRoutes = void 0;
const express_1 = __importDefault(require("express"));
const wallet_controller_1 = require("./wallet.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router.get(
  "/balance",
  authHelper_1.isAuthenticated,
  wallet_controller_1.WalletController.getWalletBalance,
);
router.get(
  "/history",
  authHelper_1.isAuthenticated,
  wallet_controller_1.WalletController.getWalletHistory,
);
router.post(
  "/top-up",
  authHelper_1.isAuthenticated,
  wallet_controller_1.WalletController.topUpWallet,
);
exports.WalletRoutes = router;
