import express from "express";
import { PayoutController } from "./payout.controller";
import { isDriver } from "../../../helpers/authHelper";

const router = express.Router();

router.post("/withdraw", isDriver, PayoutController.requestWithdrawal);
router.get("/history", isDriver, PayoutController.getWithdrawalHistory);

export const PayoutRoutes = router;
