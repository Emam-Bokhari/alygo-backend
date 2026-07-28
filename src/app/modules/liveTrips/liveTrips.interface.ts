import { RIDE_STATUS, RIDE_TYPE } from "../ride/ride.constant";

export interface ILiveTrip {
  _id: string;
  tripId: string;
  driver: {
    _id: string;
    name: string;
  };
  passenger: {
    _id: string;
    name: string;
  };
  category: string;
  pickup: string;
  dropoff: string;
  city: string;
  status: RIDE_STATUS;
  fare: number;
}

export interface ILiveTripsQuery {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: RIDE_STATUS;
  rideCategoryId?: string;
  driverId?: string;
  passengerId?: string;
  city?: string;
  serviceAreaId?: string;
  rideType?: RIDE_TYPE;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ILiveTripsResponse {
  data: ILiveTrip[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
