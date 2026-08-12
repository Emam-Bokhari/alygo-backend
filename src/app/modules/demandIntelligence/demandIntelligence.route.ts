import express from "express";
import { DemandIntelligenceController } from "./demandIntelligence.controller";
import validateRequest from "../../middlewares/validateRequest";
import { DemandIntelligenceValidation } from "./demandIntelligence.validation";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router.get(
  "/summary",
  auth(),
  requirePermission("demandintelligence"),
  validateRequest(DemandIntelligenceValidation.demandIntelligenceQuerySchema),
  DemandIntelligenceController.getSummary,
);

router.get(
  "/zones",
  auth(),
  requirePermission("demandintelligence"),
  validateRequest(DemandIntelligenceValidation.demandIntelligenceQuerySchema),
  DemandIntelligenceController.getZones,
);

router.get(
  "/live-map",
  auth(),
  requirePermission("demandintelligence"),
  validateRequest(DemandIntelligenceValidation.demandIntelligenceQuerySchema),
  DemandIntelligenceController.getLiveMap,
);

router.get(
  "/upcoming-events",
  auth(),
  requirePermission("demandintelligence"),
  validateRequest(DemandIntelligenceValidation.demandIntelligenceQuerySchema),
  DemandIntelligenceController.getUpcomingEvents,
);

export const DemandIntelligenceRoutes = router;
