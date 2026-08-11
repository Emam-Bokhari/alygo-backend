import express from "express";
import { CheckrControllers } from "./checkr.controller";

const router = express.Router();

// Public Webhook route (authenticated cryptographically in controller using signatures)
router.post("/webhook", CheckrControllers.handleWebhook);

export const CheckrRoutes = router;
