"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyHelplineService = void 0;
const emergencyHelpline_model_1 = require("./emergencyHelpline.model");
const upsertEmergencyHelplineToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield emergencyHelpline_model_1.EmergencyHelpline.findOneAndUpdate(
        {},
        { $set: payload },
        { new: true, upsert: true },
      );
    return result;
  });
const getEmergencyHelplineFromDB = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    return yield emergencyHelpline_model_1.EmergencyHelpline.findOne();
  });
exports.EmergencyHelplineService = {
  upsertEmergencyHelplineToDB,
  getEmergencyHelplineFromDB,
};
