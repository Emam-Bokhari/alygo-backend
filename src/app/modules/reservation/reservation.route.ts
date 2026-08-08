import express from "express";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";
import validateRequest from "../../middlewares/validateRequest";
import { ReservationControllers } from "./reservation.controller";
import { ReservationValidation } from "./reservation.validation";

const router = express.Router();

router.get(
  "/",
  auth(),
  requirePermission("reservation.read"),
  validateRequest(ReservationValidation.getReservationsQuerySchema),
  ReservationControllers.getReservationsOverview,
);

router.get(
  "/:reservationId",
  auth(),
  requirePermission("reservation.read"),
  validateRequest(ReservationValidation.reservationIdParamSchema),
  ReservationControllers.getReservationDetails,
);

export const ReservationRoutes = router;