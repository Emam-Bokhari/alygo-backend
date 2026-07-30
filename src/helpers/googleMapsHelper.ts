import {
  GoogleRouteService,
  ICoordinate,
} from "../services/googleRouteService";

class GoogleMapsHelper {
  async getRoute(
    origin: string | ICoordinate,
    destination: string | ICoordinate,
    stops: (string | ICoordinate)[] = [],
  ): Promise<{
    totalDistanceKm: number;
    totalDurationMinutes: number;
    polyline: string;
    googleRouteId?: string;
  }> {
    return GoogleRouteService.calculateRoute(origin, destination, stops);
  }

  async getRouteWithETA(
    origin: string | ICoordinate,
    destination: string | ICoordinate,
    stops: (string | ICoordinate)[] = [],
  ): Promise<{
    totalDistanceKm: number;
    totalDurationMinutes: number;
    polyline: string;
    googleRouteId?: string;
  }> {
    return GoogleRouteService.calculateRoute(origin, destination, stops);
  }

  async getDistanceMatrix(
    origins: (string | ICoordinate)[],
    destinations: (string | ICoordinate)[],
  ): Promise<
    {
      distanceKm: number;
      durationMinutes: number;
      status: string;
    }[][]
  > {
    return GoogleRouteService.calculateDistanceMatrix(origins, destinations);
  }

  async geocode(address: string): Promise<ICoordinate> {
    return GoogleRouteService.geocode(address);
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<{
    address: string;
    city: string;
    state: string;
    country: string;
  }> {
    return GoogleRouteService.reverseGeocode(lat, lng);
  }
}

export const googleMapsHelper = new GoogleMapsHelper();
