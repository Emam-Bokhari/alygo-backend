import { z } from "zod";

const getReservationsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    searchTerm: z.string().optional(),
    reservationType: z.enum(["scheduled", "airport", "event"]).optional(),
    status: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    driverId: z.string().optional(),
    passengerId: z.string().optional(),
    airport: z.string().optional(),
    city: z.string().optional(),
  }),
});

const reservationIdParamSchema = z.object({
  params: z.object({
    reservationId: z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid reservationId format. Must be a 24-character hex string.",
    }),
  }),
});

export const ReservationValidation = {
  getReservationsQuerySchema,
  reservationIdParamSchema,
};
