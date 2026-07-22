import express from "express";
import { EventController } from "./event.controller";
import validateRequest from "../../middlewares/validateRequest";
import { EventZodValidation } from "./event.validation";
import { isAdmin } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    validateRequest(EventZodValidation.createEventValidationSchema),
    EventController.createEvent,
  )
  .get(isAdmin, EventController.getAllEvent);

router.get("/active", isAdmin, EventController.getActiveEvent);

router.patch(
  "/status/:eventId",
  isAdmin,
  validateRequest(EventZodValidation.updateEventStatusValidationSchema),
  EventController.updateEventStatus,
);

router
  .route("/:eventId")
  .get(isAdmin, EventController.getEvent)
  .patch(
    isAdmin,
    validateRequest(EventZodValidation.updateEventValidationSchema),
    EventController.updateEvent,
  )
  .delete(isAdmin, EventController.deleteEvent);

export const EventRoutes = router;
