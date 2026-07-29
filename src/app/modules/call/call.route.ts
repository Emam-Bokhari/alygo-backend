import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { CallController } from "./call.controller";
import { callValidation } from "./call.validation";
import { isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router.post(
  "/initiate",
  isAuthenticated,
  validateRequest(callValidation.initiateCallValidationSchema),
  CallController.initiateCall,
);

router.post(
  "/answer",
  isAuthenticated,
  validateRequest(callValidation.answerCallValidationSchema),
  CallController.answerCall,
);

router.post(
  "/reject",
  isAuthenticated,
  validateRequest(callValidation.rejectCallValidationSchema),
  CallController.rejectCall,
);

router.post(
  "/cancel",
  isAuthenticated,
  validateRequest(callValidation.cancelCallValidationSchema),
  CallController.cancelCall,
);

router.post(
  "/end",
  isAuthenticated,
  validateRequest(callValidation.endCallValidationSchema),
  CallController.endCall,
);

router.post(
  "/token",
  isAuthenticated,
  validateRequest(callValidation.getCallTokenValidationSchema),
  CallController.getToken,
);

router.get(
  "/history",
  isAuthenticated,
  CallController.getHistory,
);

router.get(
  "/:id",
  isAuthenticated,
  CallController.getCall,
);

export const CallRoutes = router;
