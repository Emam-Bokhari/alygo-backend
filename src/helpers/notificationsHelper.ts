import { INotification } from "../app/modules/notification/notification.interface";
import { Notification } from "../app/modules/notification/notification.model";
import { notificationHelper } from "../app/builder/pushNotification";
import { NOTIFICATION_TYPE } from "../app/modules/notification/notification.constant";
import { User } from "../app/modules/user/user.model";
import { USER_ROLES } from "../enums/user";
import { notificationUiLogger } from "./notificationUiLogger";

export const sendNotifications = async (
  data: Partial<INotification>,
): Promise<INotification | any> => {
  if (
    data.type === NOTIFICATION_TYPE.USER ||
    data.type === NOTIFICATION_TYPE.DRIVER
  ) {
    // For User and Host, use the Push Notification Helper (which also saves to DB)
    if (!data.receiver) return;

    const payload = {
      title: data.title || "Notification",
      body: data.text || "",
      type: data.type,
      data: {
        type: data.type,
        referenceId: data.referenceId?.toString() || "",
        referenceModel: data.referenceModel || "",
      },
    };

    return await notificationHelper.sendToUser(
      data.receiver.toString(),
      payload,
    );
  } else {
    // For Admin and others, keep the existing Socket.io logic
    if (!data.receiver && data.type === NOTIFICATION_TYPE.ADMIN) {
      const superAdmin = await User.findOne({
        role: { $in: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
      }).select("_id");
      if (superAdmin) {
        data.receiver = superAdmin._id;
      }
    }

    if (!data.receiver) {
      console.warn(
        "sendNotifications: Skipping notification without receiver:",
        data.title,
      );
      return null;
    }

    const result = await (
      await Notification.create(data)
    ).populate("receiver sender referenceId");

    //@ts-ignore
    const socketIo = global.io;

    if (socketIo) {
      socketIo.emit(`send-notification::${data?.receiver}`, result);
      notificationUiLogger.logSocketEvent({
        status: "DELIVERED",
        event: `send-notification::${data?.receiver}`,
        recipient: data?.receiver?.toString(),
        data: {
          title: result.title,
          text: result.text,
          type: result.type,
        },
      });

      socketIo.emit("send-notification::admin", result);
      notificationUiLogger.logSocketEvent({
        status: "BROADCAST",
        event: "send-notification::admin",
        recipient: "Admin Channel",
        data: {
          title: result.title,
          text: result.text,
        },
      });
    }

    return result;
  }
};
