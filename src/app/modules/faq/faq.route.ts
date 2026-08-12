import express from "express";
import { FaqController } from "./faq.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(auth(), requirePermission("faq"), FaqController.createFaq)
  .get(FaqController.getFaqs);

router
  .route("/:id")
  .patch(auth(), requirePermission("faq"), FaqController.updateFaq)
  .delete(auth(), requirePermission("faq"), FaqController.deleteFaq);

export const FaqRoutes = router;
