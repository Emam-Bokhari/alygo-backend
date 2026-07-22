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
exports.NotificationPreferenceService = void 0;
const notificationPreference_model_1 = require("./notificationPreference.model");
// get notification preference by user
const getNotificationPreferenceByUser = (user) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield notificationPreference_model_1.NotificationPreference.findOne({
        userId: user.id,
      });
    return result;
  });
// update notification preference (creates if not exists)
const updateNotificationPreference = (user, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield notificationPreference_model_1.NotificationPreference.findOneAndUpdate(
        { userId: user.id },
        { $set: payload },
        { upsert: true, new: true },
      );
    return result;
  });
// delete notification preference
const deleteNotificationPreference = (user) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield notificationPreference_model_1.NotificationPreference.findOneAndUpdate(
        { userId: user.id },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true },
      );
    return result;
  });
exports.NotificationPreferenceService = {
  getNotificationPreferenceByUser,
  updateNotificationPreference,
  deleteNotificationPreference,
};
