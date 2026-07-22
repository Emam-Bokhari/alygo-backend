"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleMapsHelper = void 0;
const googleRouteService_1 = require("../services/googleRouteService");
class GoogleMapsHelper {
    getRoute(origin_1, destination_1) {
        return __awaiter(this, arguments, void 0, function* (origin, destination, stops = []) {
            return googleRouteService_1.GoogleRouteService.calculateRoute(origin, destination, stops);
        });
    }
    getRouteWithETA(origin_1, destination_1) {
        return __awaiter(this, arguments, void 0, function* (origin, destination, stops = []) {
            return googleRouteService_1.GoogleRouteService.calculateRoute(origin, destination, stops);
        });
    }
    getDistanceMatrix(origins, destinations) {
        return __awaiter(this, void 0, void 0, function* () {
            return googleRouteService_1.GoogleRouteService.calculateDistanceMatrix(origins, destinations);
        });
    }
    geocode(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return googleRouteService_1.GoogleRouteService.geocode(address);
        });
    }
    reverseGeocode(lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            return googleRouteService_1.GoogleRouteService.reverseGeocode(lat, lng);
        });
    }
}
exports.googleMapsHelper = new GoogleMapsHelper();
