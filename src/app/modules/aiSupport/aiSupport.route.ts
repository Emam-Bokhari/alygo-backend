import express from "express";
import { AiSupportController } from "./aiSupport.controller";
import { AiSupportValidation } from "./aiSupport.validation";
import { AiKnowledgeValidation } from "../aiKnowledge/aiKnowledge.validation";
import validateRequest from "../../middlewares/validateRequest";
import { isAdmin, isDriver } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const adminRouter = express.Router();
const driverRouter = express.Router();

// ==========================================
// ADMIN ROUTES (/admin/ai-support)
// ==========================================

adminRouter
  .route("/knowledge")
  .get(
    auth(),
    requirePermission("aisupport"),
    AiSupportController.getKnowledgeList,
  )
  .post(
    auth(),
    requirePermission("aisupport"),
    validateRequest(AiKnowledgeValidation.createKnowledgeValidationSchema),
    AiSupportController.createKnowledge,
  );

adminRouter
  .route("/knowledge/:id")
  .patch(
    auth(),
    requirePermission("aisupport"),
    validateRequest(AiKnowledgeValidation.updateKnowledgeValidationSchema),
    AiSupportController.updateKnowledge,
  )
  .delete(
    auth(),
    requirePermission("aisupport"),
    AiSupportController.deleteKnowledge,
  );

adminRouter.post(
  "/knowledge/import",
  auth(),
  requirePermission("aisupport"),
  AiSupportController.importKnowledge,
);

adminRouter.patch(
  "/config",
  auth(),
  requirePermission("aisupport"),
  validateRequest(AiSupportValidation.updateConfigValidationSchema),
  AiSupportController.updateConfig,
);

adminRouter.get(
  "/dashboard/stats",
  auth(),
  requirePermission("aisupport"),
  AiSupportController.getDashboardStats,
);

// ==========================================
// DRIVER ROUTES (/driver/ai-support)
// ==========================================

driverRouter.get(
  "/suggested-questions",
  isDriver,
  AiSupportController.getSuggestedQuestions,
);

driverRouter
  .route("/conversations")
  .get(isDriver, AiSupportController.getConversations)
  .post(isDriver, AiSupportController.startConversation);

driverRouter 
  .route("/conversations/:id")
  .get(isDriver, AiSupportController.getConversationById)
  .patch(
    isDriver,
    validateRequest(AiSupportValidation.conversationValidationSchema),
    AiSupportController.renameConversation,
  )
  .delete(isDriver, AiSupportController.deleteConversation);

driverRouter.patch(
  "/conversations/:id/archive",
  isDriver,
  AiSupportController.archiveConversation,
);

driverRouter.post(
  "/chat",
  isDriver,
  validateRequest(AiSupportValidation.askQuestionValidationSchema),
  AiSupportController.askAi,
);

driverRouter.patch(
  "/chat/:id/regenerate",
  isDriver,
  AiSupportController.regenerateChatAnswer,
);

driverRouter.get("/history", isDriver, AiSupportController.getChatHistory);

driverRouter.get("/history/:id", isDriver, AiSupportController.getChatDetails);

driverRouter.patch(
  "/history/:id/feedback",
  isDriver,
  validateRequest(AiSupportValidation.submitFeedbackValidationSchema),
  AiSupportController.submitFeedback,
);

export const AdminAiSupportRoutes = adminRouter;
export const DriverAiSupportRoutes = driverRouter;
