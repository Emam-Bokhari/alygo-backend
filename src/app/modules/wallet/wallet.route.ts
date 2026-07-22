import express from "express";
import { WalletController } from "./wallet.controller";
import { isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router.get("/balance", isAuthenticated, WalletController.getWalletBalance);
router.get("/history", isAuthenticated, WalletController.getWalletHistory);
router.post("/top-up", isAuthenticated, WalletController.topUpWallet);

export const WalletRoutes = router;
