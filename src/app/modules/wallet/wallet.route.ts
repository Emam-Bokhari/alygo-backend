import express from "express";
import { WalletController } from "./wallet.controller";
import { isUser, isDriver } from "../../../helpers/authHelper";

const router = express.Router();

// Passenger (User) Wallet Routes
router.get("/", isUser, WalletController.getWalletSummary);
router.get("/transactions", isUser, WalletController.getTransactionHistory);
router.post("/top-up", isUser, WalletController.topUpWallet);

// Driver Wallet Routes
const driverRouter = express.Router();
driverRouter.get("/", isDriver, WalletController.getDriverWalletSummary);
driverRouter.get("/transactions", isDriver, WalletController.getDriverTransactionHistory);

export const WalletRoutes = router;
export const DriverWalletRoutes = driverRouter;
