import express from "express";
import { FinancialCenterController } from "./financialCenter.controller";
import { isAdmin } from "../../../helpers/authHelper";

const router = express.Router();

router.get("/revenue", isAdmin, FinancialCenterController.getRevenue);
router.get("/payouts", isAdmin, FinancialCenterController.getPayouts);
router.get("/wallets", isAdmin, FinancialCenterController.getWallets);
router.get("/transactions", isAdmin, FinancialCenterController.getTransactions);

export const FinancialCenterRoutes = router;
