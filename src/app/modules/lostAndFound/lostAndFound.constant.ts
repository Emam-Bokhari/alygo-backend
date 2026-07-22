export enum LOST_AND_FOUND_STATUS {
  REPORTED = "reported",
  DRIVER_REVIEWING = "driver_reviewing",
  NOT_FOUND = "not_found",
  FOUND = "found",
  RETURN_SCHEDULED = "return_scheduled",
  RETURN_CONFIRMED = "return_confirmed",
  RETURNED = "returned",
}

export enum ITEM_NOT_FOUND_REASON {
  NOT_IN_VEHICLE = "not_in_vehicle",
  ALREADY_TAKEN = "already_taken",
  OTHER = "other",
}

export enum RETURN_METHOD {
  PASSENGER_PICKUP = "passenger_pickup",
  DRIVER_DELIVERY = "driver_delivery",
}
