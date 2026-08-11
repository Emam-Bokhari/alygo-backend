import crypto from "crypto";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { Driver } from "../driver/driver.model";
import { User } from "../user/user.model";
import { VERIFICATION_STATUS } from "../driver/driver.constant";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { USER_ROLES } from "../../../enums/user";

const handleWebhook = catchAsync(async (req, res) => {
  const signatureHeader = req.headers["x-checkr-signature"] as string;
  if (!signatureHeader) {
    throw new ApiError(401, "Missing x-checkr-signature header");
  }

  // Remove prefix if present
  const signature = signatureHeader.replace("sha256=", "");
  const signingKey = config.checkr.signingKey || config.checkr.apiKey;

  if (!signingKey) {
    throw new ApiError(500, "Checkr signing key or API key is not configured");
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    throw new ApiError(400, "Raw body is missing for signature verification");
  }

  // Cryptographically verify signature
  const computedHex = crypto
    .createHmac("sha256", signingKey)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature.toLowerCase(), "hex");
  const compBuffer = Buffer.from(computedHex.toLowerCase(), "hex");

  if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
    throw new ApiError(401, "Invalid webhook signature");
  }

  const event = req.body;
  if (event && event.object === "event" && event.data && event.data.object) {
    const dataObj = event.data.object;

    // Only process report events
    if (dataObj.object === "report") {
      const reportId = dataObj.id;
      const status = dataObj.status; // pending, completed, suspended, canceled
      const result = dataObj.result; // clear, consider

      // Find associated Driver
      const driver = await Driver.findOne({
        $or: [
          { checkrMVRReportId: reportId },
          { checkrBackgroundReportId: reportId },
        ],
      });

      if (driver) {
        const isMvr = driver.checkrMVRReportId === reportId;

        // Map status
        let mappedStatus = VERIFICATION_STATUS.PENDING;
        let passed = false;

        if (status === "completed") {
          if (result === "clear") {
            mappedStatus = VERIFICATION_STATUS.VERIFIED;
            passed = true;
          } else if (result === "consider") {
            mappedStatus = VERIFICATION_STATUS.REVIEW_REQUIRED;
            passed = false;
          } else {
            mappedStatus = VERIFICATION_STATUS.REVIEW_REQUIRED;
            passed = false;
          }
        } else if (status === "pending" || status === "suspended") {
          mappedStatus = VERIFICATION_STATUS.PENDING;
        } else if (status === "canceled") {
          mappedStatus = VERIFICATION_STATUS.FAILED;
        }

        if (isMvr) {
          // Process MVR status change
          const updateData: any = {
            mvrStatus: mappedStatus,
            lastVerificationDate: new Date(),
          };

          if (mappedStatus === VERIFICATION_STATUS.VERIFIED) {
            updateData.mvrVerifiedAt = new Date();
            updateData.verificationSource = "Checkr MVR";
            updateData.verificationNotes = "Checkr MVR verification clear.";
          } else if (mappedStatus === VERIFICATION_STATUS.REVIEW_REQUIRED) {
            updateData.verificationNotes = "Checkr MVR verification requires manual review.";
          } else if (mappedStatus === VERIFICATION_STATUS.FAILED) {
            updateData.verificationNotes = "Checkr MVR verification failed.";
          }

          await Driver.findByIdAndUpdate(driver._id, { $set: updateData });

          // Send notifications
          let title = "MVR Verification Update";
          let text = `Your driving license MVR verification status is now ${mappedStatus}.`;
          if (mappedStatus === VERIFICATION_STATUS.VERIFIED) {
            title = "MVR Verification Clear";
            text = "Your driving license MVR verification completed successfully.";
          } else if (mappedStatus === VERIFICATION_STATUS.REVIEW_REQUIRED) {
            title = "MVR Verification Review Required";
            text = "Your driving license verification requires admin manual review.";
          }

          await sendNotifications({
            receiver: driver.userId,
            type: NOTIFICATION_TYPE.DRIVER,
            title,
            text,
          });

          // Notify Admin
          if (mappedStatus === VERIFICATION_STATUS.REVIEW_REQUIRED) {
            const superAdmin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select("_id");
            if (superAdmin) {
              await sendNotifications({
                receiver: superAdmin._id.toString(),
                type: NOTIFICATION_TYPE.ADMIN,
                title: "MVR Review Required",
                text: `Driver ${driver.drivingLicenseNumber || driver._id} requires manual MVR review.`,
                referenceId: driver._id.toString(),
                referenceModel: "Driver" as any,
              });
            }
          }
        } else {
          // Process Background Check status change
          const updateData: any = {
            backgroundCheckStatus: mappedStatus,
            backgroundCheckPassed: passed,
            lastVerificationDate: new Date(),
          };

          if (mappedStatus === VERIFICATION_STATUS.VERIFIED) {
            updateData.backgroundCheckPassedAt = new Date();
          }

          await Driver.findByIdAndUpdate(driver._id, { $set: updateData });

          // Send notifications
          let title = "Background Check Update";
          let text = `Your background check status is now ${mappedStatus}.`;
          if (mappedStatus === VERIFICATION_STATUS.VERIFIED) {
            title = "Background Check Clear";
            text = "Your criminal background check has completed successfully.";
          } else if (mappedStatus === VERIFICATION_STATUS.REVIEW_REQUIRED) {
            title = "Background Check Review Required";
            text = "Your background check requires admin manual review.";
          }

          await sendNotifications({
            receiver: driver.userId,
            type: NOTIFICATION_TYPE.DRIVER,
            title,
            text,
          });

          // Notify Admin
          if (mappedStatus === VERIFICATION_STATUS.REVIEW_REQUIRED) {
            const superAdmin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select("_id");
            if (superAdmin) {
              await sendNotifications({
                receiver: superAdmin._id.toString(),
                type: NOTIFICATION_TYPE.ADMIN,
                title: "Background Check Review Required",
                text: `Driver background check for ${driver.drivingLicenseNumber || driver._id} requires manual review.`,
                referenceId: driver._id.toString(),
                referenceModel: "Driver" as any,
              });
            }
          }
        }
      }
    }
  }

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Webhook event processed successfully",
    data: {},
  });
});

export const CheckrControllers = {
  handleWebhook,
};
