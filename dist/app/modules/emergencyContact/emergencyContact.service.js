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
exports.EmergencyContactService = void 0;
const emergencyContact_model_1 = require("./emergencyContact.model");
const createEmergencyContactToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield emergencyContact_model_1.EmergencyContact.findOneAndUpdate(
        { userId: payload.userId, phone: payload.phone },
        { $set: payload },
        { new: true, upsert: true },
      );
    return result;
  });
const getEmergencyContactsByUserFromDB = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    return yield emergencyContact_model_1.EmergencyContact.find({
      userId,
      isActive: true,
    });
  });
const updateEmergencyContactInDB = (contactId, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield emergencyContact_model_1.EmergencyContact.findByIdAndUpdate(
        contactId,
        { $set: payload },
        { new: true },
      );
    return result;
  });
const deleteEmergencyContactFromDB = (contactId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield emergencyContact_model_1.EmergencyContact.softDeleteById(contactId);
    return result;
  });
exports.EmergencyContactService = {
  createEmergencyContactToDB,
  getEmergencyContactsByUserFromDB,
  updateEmergencyContactInDB,
  deleteEmergencyContactFromDB,
};
