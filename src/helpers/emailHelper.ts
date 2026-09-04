import nodemailer from "nodemailer";
import config from "../config";
import { errorLogger, logger } from "../shared/logger";
import { ISendEmail } from "../types/email";
import { notificationUiLogger } from "./notificationUiLogger";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

const sendEmail = async (values: ISendEmail) => {
  try {
    const info = await transporter.sendMail({
      from: `"Alygo" ${config.email.from}`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    });

    logger.info("Mail send successfully", info.accepted);
    notificationUiLogger.logEmail({
      status: "SUCCESS",
      to: values.to,
      subject: values.subject,
      from: `"Alygo" ${config.email.from}`,
      messageId: info.messageId,
    });
  } catch (error: any) {
    errorLogger.error("Email", error);
    notificationUiLogger.logEmail({
      status: "FAILED",
      to: values.to,
      subject: values.subject,
      from: `"Alygo" ${config.email.from}`,
      error: error?.message || error,
    });
  }
};

export const emailHelper = {
  sendEmail,
};
