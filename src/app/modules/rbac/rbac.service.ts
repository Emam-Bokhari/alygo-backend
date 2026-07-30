import { Types } from "mongoose";
import { Permission } from "../permission/permission.model";
import { Role } from "../role/role.model";
import { User } from "../user/user.model";
import redisClient from "../../../shared/redisClient";
import { logger, errorLogger } from "../../../shared/logger";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { createAuditLog } from "./rbac.utils";

const CACHE_PREFIX = "role_permissions:";
const DEFAULT_TTL = 86400; // 24 hours in seconds

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
};

export class RBACService {
  /**
   * Fetch active permission keys for a given roleId, querying cache first.
   */
  public static async getRolePermissions(roleId: string | Types.ObjectId): Promise<string[]> {
    const stringRoleId = roleId.toString();
    const cacheKey = `${CACHE_PREFIX}${stringRoleId}`;

    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      errorLogger.error("Redis cache read error in RBACService", err);
    }

    const role = await Role.findById(stringRoleId).populate({
      path: "permissions",
      match: { status: "active" },
    });

    if (!role || role.status !== "active") {
      return [];
    }

    const activePermissions = (role.permissions || []) as any[];
    const permissionKeys = activePermissions.map((p) => p.key);

    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(
          cacheKey,
          DEFAULT_TTL,
          JSON.stringify(permissionKeys)
        );
      }
    } catch (err) {
      errorLogger.error("Redis cache write error in RBACService", err);
    }

    return permissionKeys;
  }

  /**
   * Check if a role has the required permission(s).
   */
  public static async checkPermissions(
    roleId: string | Types.ObjectId,
    requiredPermissions: string | string[],
    strategy: "ALL" | "ANY" = "ALL"
  ): Promise<boolean> {
    const keys = await this.getRolePermissions(roleId);
    const requiredList = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    if (requiredList.length === 0) {
      return true;
    }

    if (strategy === "ANY") {
      return requiredList.some((reqKey) => keys.includes(reqKey));
    }

    return requiredList.every((reqKey) => keys.includes(reqKey));
  }

  /**
   * Clear permissions cache for a specific role.
   */
  public static async clearRoleCache(roleId: string | Types.ObjectId): Promise<void> {
    const stringRoleId = roleId.toString();
    const cacheKey = `${CACHE_PREFIX}${stringRoleId}`;
    try {
      if (redisClient.isOpen) {
        await redisClient.del(cacheKey);
      }
    } catch (err) {
      errorLogger.error(`Failed to clear Redis cache for role: ${stringRoleId}`, err);
    }
  }

  /**
   * Refresh permissions cache for a specific role.
   */
  public static async refreshRoleCache(roleId: string | Types.ObjectId): Promise<void> {
    await this.clearRoleCache(roleId);
    await this.getRolePermissions(roleId);
  }

  // --- PERMISSION APIS ---

  public static async getAllPermissions() {
    return await Permission.find({}).sort({ module: 1, name: 1 });
  }

  public static async getGroupedPermissions() {
    return await Permission.aggregate([
      {
        $group: {
          _id: "$group",
          module: { $first: "$module" },
          permissions: {
            $push: {
              id: "$_id",
              name: "$name",
              key: "$key",
              description: "$description",
              status: "$status",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          group: "$_id",
          module: 1,
          permissions: 1,
        },
      },
      {
        $sort: { module: 1, group: 1 },
      },
    ]);
  }

  public static async getModules() {
    return await Permission.distinct("module");
  }

  // --- ROLE APIS ---

  public static async getAllRoles() {
    return await Role.find({}).populate({
      path: "permissions",
      select: "name key description status",
    });
  }

  public static async getRoleById(roleId: string) {
    const role = await Role.findById(roleId).populate({
      path: "permissions",
      select: "name key description status",
    });
    if (!role) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Role not found");
    }
    return role;
  }

  public static async createRole(payload: any, creatorId: string) {
    const slug = slugify(payload.name);

    // Validate unique name & slug
    const exist = await Role.findOne({
      $or: [{ name: payload.name }, { slug }],
    });
    if (exist) {
      throw new ApiError(StatusCodes.CONFLICT, "Role with this name or slug already exists");
    }

    // Verify all permissions are active
    const activePermissionsCount = await Permission.countDocuments({
      _id: { $in: payload.permissions },
      status: "active",
    });
    if (activePermissionsCount !== payload.permissions.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "One or more permissions are inactive or invalid");
    }

    const role = await Role.create({
      ...payload,
      slug,
      isSystem: false,
      createdBy: new Types.ObjectId(creatorId),
    });

    const populated = await role.populate({
      path: "permissions",
      select: "name key description status",
    });

    // Log audit
    await createAuditLog("ROLE_CREATED", creatorId, {
      roleId: role._id,
      name: role.name,
      permissions: payload.permissions,
    });

    return populated;
  }

  public static async updateRole(
    roleId: string,
    payload: any,
    updaterId: string,
    isSuperAdmin: boolean
  ) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Role not found");
    }

    // Only Super Admin can edit system roles
    if (role.isSystem && !isSuperAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only Super Admin can edit system roles");
    }

    const updateData: any = { ...payload };

    // Handle name change (regenerate slug)
    if (payload.name && payload.name !== role.name) {
      const slug = slugify(payload.name);
      const exist = await Role.findOne({
        _id: { $ne: roleId },
        $or: [{ name: payload.name }, { slug }],
      });
      if (exist) {
        throw new ApiError(StatusCodes.CONFLICT, "Role with this name or slug already exists");
      }
      updateData.slug = slug;
    }

    // Validate active permissions if updating permissions list
    if (payload.permissions) {
      const activePermissionsCount = await Permission.countDocuments({
        _id: { $in: payload.permissions },
        status: "active",
      });
      if (activePermissionsCount !== payload.permissions.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "One or more permissions are inactive or invalid");
      }
    }

    updateData.updatedBy = new Types.ObjectId(updaterId);

    const updatedRole = await Role.findByIdAndUpdate(roleId, updateData, {
      new: true,
    }).populate({
      path: "permissions",
      select: "name key description status",
    });

    // Clear Cache when Role details or permissions change
    await this.clearRoleCache(roleId);

    // Log audit
    await createAuditLog("ROLE_UPDATED", updaterId, {
      roleId,
      updatedFields: Object.keys(updateData),
      before: {
        name: role.name,
        permissions: role.permissions,
        status: role.status,
      },
      after: {
        name: updatedRole?.name,
        permissions: payload.permissions,
        status: updatedRole?.status,
      },
    });

    return updatedRole;
  }

  public static async deleteRole(roleId: string, performerId: string, isSuperAdmin: boolean) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Role not found");
    }

    // Only Super Admin can delete system roles
    if (role.isSystem && !isSuperAdmin) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Only Super Admin can delete system roles");
    }

    // Validate that role is not assigned to any users
    const assignedUsers = await User.findOne({ roleId: new Types.ObjectId(roleId) });
    if (assignedUsers) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot delete role because it is assigned to one or more admin users");
    }

    await Role.findByIdAndDelete(roleId);

    // Clear Cache
    await this.clearRoleCache(roleId);

    // Log audit
    await createAuditLog("ROLE_DELETED", performerId, {
      roleId,
      name: role.name,
    });

    return { success: true };
  }

  public static async assignRole(adminId: string, roleId: string, performerId: string) {
    const targetAdmin = await User.findById(adminId);
    if (!targetAdmin) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Admin user not found");
    }

    const role = await Role.findById(roleId);
    if (!role) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Role not found");
    }

    // Validate role is active
    if (role.status === "inactive") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot assign an inactive role");
    }

    const updatedUser = await User.findByIdAndUpdate(
      adminId,
      { roleId: new Types.ObjectId(roleId) },
      { new: true }
    ).select("-password");

    // Log audit
    await createAuditLog("ROLE_ASSIGNED", performerId, {
      adminId,
      roleId,
      roleName: role.name,
      adminEmail: targetAdmin.email,
    });

    return updatedUser;
  }

  // --- SEEDER ---

  /**
   * Automatic Permission Seeder.
   * Ensures default permissions exist in the database without duplication.
   */
  public static async seedPermissions(): Promise<void> {
    const defaultPermissions = [
      // FAQ Module
      { name: "Create FAQ", key: "faq.create", module: "FAQ", group: "FAQ", description: "Allows creating new FAQs" },
      { name: "Get FAQs", key: "faq.get", module: "FAQ", group: "FAQ", description: "Allows viewing FAQ lists and details" },
      { name: "Update FAQ", key: "faq.update", module: "FAQ", group: "FAQ", description: "Allows editing existing FAQs" },
      { name: "Delete FAQ", key: "faq.delete", module: "FAQ", group: "FAQ", description: "Allows deleting FAQs" },

      // Ride Module
      { name: "Create Ride", key: "ride.create", module: "Ride", group: "Ride", description: "Allows creating new rides" },
      { name: "Get Rides", key: "ride.get", module: "Ride", group: "Ride", description: "Allows listing and viewing ride details" },
      { name: "Cancel Ride", key: "ride.cancel", module: "Ride", group: "Ride", description: "Allows canceling active or scheduled rides" },
      { name: "Assign Driver to Ride", key: "ride.assign", module: "Ride", group: "Ride", description: "Allows assigning drivers to rides" },

      // Driver Module
      { name: "Create Driver", key: "driver.create", module: "Driver", group: "Driver", description: "Allows registering new drivers" },
      { name: "Get Drivers", key: "driver.get", module: "Driver", group: "Driver", description: "Allows viewing driver accounts and logs" },
      { name: "Update Driver", key: "driver.update", module: "Driver", group: "Driver", description: "Allows updating driver verification status and info" },

      // User Module
      { name: "Create User", key: "user.create", module: "User", group: "User", description: "Allows creating user profiles manually" },
      { name: "Get Users", key: "user.get", module: "User", group: "User", description: "Allows viewing user accounts" },
      { name: "Update User", key: "user.update", module: "User", group: "User", description: "Allows modifying user profiles" },
      { name: "Delete User", key: "user.delete", module: "User", group: "User", description: "Allows deleting user accounts" },

      // Wallet & Financials
      { name: "Get Wallet Information", key: "wallet.get", module: "Wallet", group: "Wallet", description: "Allows viewing transaction histories and balances" },
      { name: "Withdraw Money", key: "wallet.withdraw", module: "Wallet", group: "Wallet", description: "Allows initiating payout withdrawals" },

      // Support & AI Support
      { name: "Reply to Support Ticket", key: "support.reply", module: "Support", group: "Support", description: "Allows responding to customer helpline inquiries" },
      { name: "Ask AI Support", key: "aiSupport.ask", module: "AISupport", group: "AISupport", description: "Allows executing AI support checks" },

      // System Configuration
      { name: "Update System Configuration", key: "systemConfiguration.update", module: "SystemConfiguration", group: "SystemConfiguration", description: "Allows updating platform global preferences" },
    ];

    try {
      for (const perm of defaultPermissions) {
        await Permission.findOneAndUpdate(
          { key: perm.key },
          {
            $set: {
              name: perm.name,
              module: perm.module,
              group: perm.group,
              description: perm.description,
              status: "active",
            },
          },
          { upsert: true, new: true }
        );
      }
      logger.info("✔ RBAC Permissions seeded successfully!");
    } catch (err) {
      errorLogger.error("Failed to seed RBAC default permissions", err);
    }
  }
}
