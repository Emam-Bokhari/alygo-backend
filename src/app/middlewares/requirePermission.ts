import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../errors/ApiErrors";
import { USER_ROLES } from "../../enums/user";
import { RBACService } from "../modules/rbac/rbac.service";
import { createAuditLog } from "../modules/rbac/rbac.utils";

/**
 * Middleware to check user permissions.
 * Bypasses checks for SUPER_ADMIN.
 *
 * Examples:
 * - requirePermission("faq")
 * - requirePermission(["faq", "banner"], "ANY")
 * - requirePermission(["faq", "banner"], "ALL")
 */
export const requirePermission = (
  permissions: string | string[],
  strategy: "ALL" | "ANY" = "ALL",
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;

      if (!user) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "User authentication required before permission check",
        );
      }

      // Super Admin bypasses every permission check automatically
      if (user.role === USER_ROLES.SUPER_ADMIN) {
        return next();
      }

      // Check if user has roleId assigned
      if (!user.roleId) {
        // Log access failure
        await createAuditLog(
          "PERMISSION_CHECK_FAILURE",
          user.id,
          {
            requestedPermissions: permissions,
            strategy,
            reason: "User has no roleId assigned",
            path: req.originalUrl,
            method: req.method,
          },
          req,
        );

        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You do not have permission to access this api !!",
        );
      }

      const hasPermission = await RBACService.checkPermissions(
        user.roleId,
        permissions,
        strategy,
      );

      if (!hasPermission) {
        // Log access failure
        await createAuditLog(
          "PERMISSION_CHECK_FAILURE",
          user.id,
          {
            requestedPermissions: permissions,
            strategy,
            reason: "Missing required permissions",
            path: req.originalUrl,
            method: req.method,
            roleId: user.roleId,
          },
          req,
        );

        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You do not have permission to access this api !!",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
