import express from "express";
import { TransactionController } from "./transaction.controller";
import { isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router.get(
  "/history",
  isAuthenticated,
  TransactionController.getMyTransactions,
);

export const TransactionRoutes = router;
