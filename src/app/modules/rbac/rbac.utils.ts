import { Request } from "express";
import { Types } from "mongoose";
import { AuditLog } from "../auditLog/auditLog.model";
import { logger, errorLogger } from "../../../shared/logger";

export const createAuditLog = async (
  action: string,
  performedBy?: string | Types.ObjectId,
  details: Record<string, any> = {},
  req?: Request,
) => {
  try {
    const ipAddress =
      req?.ip || (req?.headers?.["x-forwarded-for"] as string) || "";
    const userAgent = req?.headers?.["user-agent"] || "";

    const parsedPerformedBy = performedBy
      ? new Types.ObjectId(performedBy.toString())
      : undefined;

    await AuditLog.create({
      action,
      performedBy: parsedPerformedBy,
      details,
      ipAddress,
      userAgent,
    });

    const actor = performedBy ? `User(${performedBy})` : "System";
    const detailString = JSON.stringify(details);
    logger.info(
      `[AUDIT] Action: ${action} | Actor: ${actor} | Details: ${detailString}`,
    );
  } catch (error) {
    errorLogger.error(
      `Failed to create audit log for action: ${action}`,
      error,
    );
  }
};
