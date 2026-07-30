import { Router } from "express";
import { RuleControllers } from "./rule.controller";
import { isAdmin } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = Router();

router.post("/", auth(), requirePermission("rule.create"), RuleControllers.upsertRule);

router.get("/:type", RuleControllers.getRule);

router.patch("/:type", auth(), requirePermission("rule.update"), RuleControllers.updateRule);

router.delete("/:type", auth(), requirePermission("rule.delete"), RuleControllers.deleteRule);

export const RuleRoutes = router;
