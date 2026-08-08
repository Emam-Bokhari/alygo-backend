import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReservationServices } from "./reservation.service";

const getReservationsOverview = catchAsync(async (req, res) => {
  const result = await ReservationServices.getReservationsOverviewFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reservations overview retrieved successfully",
    data: result.data,
    meta: {
      ...result.meta,
      statistics: result.statistics,
    },
  });
});

const getReservationDetails = catchAsync(async (req, res) => {
  const { reservationId } = req.params;
  const result = await ReservationServices.getReservationDetailsFromDB(reservationId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reservation details retrieved successfully",
    data: result,
  });
});

export const ReservationControllers = {
  getReservationsOverview,
  getReservationDetails,
};
