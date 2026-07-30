import express from "express";
import { EventController } from "./event.controller";
import validateRequest from "../../middlewares/validateRequest";
import { EventZodValidation } from "./event.validation";
import { isAdmin } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("event.create"),
    validateRequest(EventZodValidation.createEventValidationSchema),
    EventController.createEvent,
  )
  .get(auth(),
    requirePermission("event.read"),
    EventController.getAllEvent);

router.get("/active",
  auth(),
  requirePermission("event.read"),
  EventController.getActiveEvent);

router.patch(
  "/status/:eventId",
  auth(),
  requirePermission("event.update"),
  validateRequest(EventZodValidation.updateEventStatusValidationSchema),
  EventController.updateEventStatus,
);

router
  .route("/:eventId")
  .get(auth(),
    requirePermission("event.read"),
    EventController.getEvent)
  .patch(
    auth(),
    requirePermission("event.update"),
    validateRequest(EventZodValidation.updateEventValidationSchema),
    EventController.updateEvent,
  )
  .delete(auth(),
    requirePermission("event.delete"),
    EventController.deleteEvent);

export const EventRoutes = router;
