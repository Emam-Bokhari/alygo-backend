import { Types } from "mongoose";
import { Permission } from "../permission/permission.model";
import { IPermission } from "../permission/permission.interface";
import QueryBuilder from "../../builder/queryBuilder";
import { Role } from "../role/role.model";
import { seedPermissions as seedPermissionsToDB } from "../permission/permission.seed";
import { User } from "../user/user.model";
import { STATUS, USER_ROLES } from "../../../enums/user";
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

/**
 * Fetch active permission keys for a given roleId, querying cache first.
 */
const getRolePermissions = async (
  roleId: string | Types.ObjectId,
): Promise<string[]> => {
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
        JSON.stringify(permissionKeys),
      );
    }
  } catch (err) {
    errorLogger.error("Redis cache write error in RBACService", err);
  }

  return permissionKeys;
};

/**
 * Check if a role has the required permission(s).
 */
const checkPermissions = async (
  roleId: string | Types.ObjectId,
  requiredPermissions: string | string[],
  strategy: "ALL" | "ANY" = "ALL",
): Promise<boolean> => {
  const keys = await getRolePermissions(roleId);
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
};

/**
 * Clear permissions cache for a specific role.
 */
const clearRoleCache = async (
  roleId: string | Types.ObjectId,
): Promise<void> => {
  const stringRoleId = roleId.toString();
  const cacheKey = `${CACHE_PREFIX}${stringRoleId}`;
  try {
    if (redisClient.isOpen) {
      await redisClient.del(cacheKey);
    }
  } catch (err) {
    errorLogger.error(
      `Failed to clear Redis cache for role: ${stringRoleId}`,
      err,
    );
  }
};

/**
 * Refresh permissions cache for a specific role.
 */
const refreshRoleCache = async (
  roleId: string | Types.ObjectId,
): Promise<void> => {
  await clearRoleCache(roleId);
  await getRolePermissions(roleId);
};

// --- PERMISSION APIS ---

const getAllPermissions = async (query: Record<string, unknown>) => {
  const permissionQuery = new QueryBuilder<IPermission>(
    Permission.find({}),
    query,
  )
    .search(["name", "resource", "action", "module", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await permissionQuery.modelQuery;
  const meta = await permissionQuery.countTotal();

  return {
    meta,
    data,
  };
};

const getGroupedPermissions = async (query: Record<string, unknown>) => {
  const permissionQuery = new QueryBuilder<IPermission>(
    Permission.find({}),
    query,
  )
    .search(["name", "resource", "action", "module", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await permissionQuery.modelQuery;
  const meta = await permissionQuery.countTotal();

  // Group the queried results by module in memory
  const grouped: Record<string, any[]> = {};
  data.forEach((permission: any) => {
    const moduleName = permission.module;
    if (!grouped[moduleName]) {
      grouped[moduleName] = [];
    }
    grouped[moduleName].push({
      id: permission._id || permission.id,
      name: permission.name,
      key: permission.key,
      description: permission.description,
      status: permission.status,
    });
  });

  const groupedData = Object.entries(grouped).map(
    ([moduleName, permissions]) => ({
      module: moduleName,
      permissions,
    }),
  );

  // Sort alphabetically by module name
  groupedData.sort((a, b) => a.module.localeCompare(b.module));

  return {
    meta,
    data: groupedData,
  };
};

const getModules = async (query: Record<string, unknown>) => {
  const permissionQuery = new QueryBuilder<IPermission>(
    Permission.find({}),
    query,
  )
    .search(["module"])
    .filter();

  const modules = await permissionQuery.modelQuery.distinct("module");

  // Paginate distinct modules in memory (JS)
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const paginatedModules = modules.slice(skip, skip + limit);
  const totalPage = Math.ceil(modules.length / limit);

  return {
    meta: {
      page,
      limit,
      total: modules.length,
      totalPage,
    },
    data: paginatedModules,
  };
};

// --- ROLE APIS ---

const getAllRoles = async () => {
  return await Role.find({}).populate({
    path: "permissions",
    select: "name key description status",
  });
};

const getRoleById = async (roleId: string) => {
  const role = await Role.findById(roleId).populate({
    path: "permissions",
    select: "name key description status",
  });
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Role not found");
  }
  return role;
};

const createRole = async (payload: any, creatorId: string) => {
  const slug = slugify(payload.name);

  // Validate unique name & slug
  const exist = await Role.findOne({
    $or: [{ name: payload.name }, { slug }],
  });
  if (exist) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Role with this name or slug already exists",
    );
  }

  // Verify all permissions are active
  const activePermissionsCount = await Permission.countDocuments({
    _id: { $in: payload.permissions },
    status: "active",
  });
  if (activePermissionsCount !== payload.permissions.length) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "One or more permissions are inactive or invalid",
    );
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
};

const updateRole = async (
  roleId: string,
  payload: any,
  updaterId: string,
  isSuperAdmin: boolean,
) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Role not found");
  }

  // Only Super Admin can edit system roles
  if (role.isSystem && !isSuperAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only Super Admin can edit system roles",
    );
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
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Role with this name or slug already exists",
      );
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
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "One or more permissions are inactive or invalid",
      );
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
  await clearRoleCache(roleId);

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
};

const deleteRole = async (
  roleId: string,
  performerId: string,
  isSuperAdmin: boolean,
) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Role not found");
  }

  // Only Super Admin can delete system roles
  if (role.isSystem && !isSuperAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only Super Admin can delete system roles",
    );
  }

  // Validate that role is not assigned to any users
  const assignedUsers = await User.findOne({
    roleId: new Types.ObjectId(roleId),
  });
  if (assignedUsers) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot delete role because it is assigned to one or more admin users",
    );
  }

  await Role.findByIdAndDelete(roleId);

  // Clear Cache
  await clearRoleCache(roleId);

  // Log audit
  await createAuditLog("ROLE_DELETED", performerId, {
    roleId,
    name: role.name,
  });

  return { success: true };
};

const assignRole = async (
  adminId: string,
  roleId: string,
  performerId: string,
) => {
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
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot assign an inactive role",
    );
  }

  const updatedUser = await User.findByIdAndUpdate(
    adminId,
    { roleId: new Types.ObjectId(roleId) },
    { new: true },
  ).select("-password");

  // Log audit
  await createAuditLog("ROLE_ASSIGNED", performerId, {
    adminId,
    roleId,
    roleName: role.name,
    adminEmail: targetAdmin.email,
  });

  return updatedUser;
};

const createAdminWithRole = async (payload: any, creatorId: string) => {
  const {
    name,
    email,
    password,
    phone,
    countryCode,
    roleId,
    roleName,
    permissions,
  } = payload;

  // 1. Verify if email already exists
  const isExistUser = await User.findOne({ email });
  if (isExistUser) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  let finalRoleId: Types.ObjectId | null = null;
  let finalRoleName = "";
  let isNewRoleCreated = false;

  // 2. Resolve Role
  if (roleId) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Specified Role not found");
    }
    if (role.status === "inactive") {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot assign an inactive role",
      );
    }
    finalRoleId = role._id as Types.ObjectId;
    finalRoleName = role.name;
  } else if (roleName) {
    const slug = slugify(roleName);
    const role = await Role.findOne({
      $or: [{ name: roleName }, { slug }],
    });

    if (role) {
      if (role.status === "inactive") {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Cannot assign an inactive role",
        );
      }
      finalRoleId = role._id as Types.ObjectId;
      finalRoleName = role.name;
    } else {
      // Create a new role
      const permissionIds = permissions || [];
      if (permissionIds.length > 0) {
        const activePermissionsCount = await Permission.countDocuments({
          _id: { $in: permissionIds },
          status: "active",
        });
        if (activePermissionsCount !== permissionIds.length) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "One or more permissions are inactive or invalid",
          );
        }
      }

      const newRole = await Role.create({
        name: roleName,
        slug,
        permissions: permissionIds,
        isSystem: false,
        createdBy: new Types.ObjectId(creatorId),
      });

      finalRoleId = newRole._id as Types.ObjectId;
      finalRoleName = newRole.name;
      isNewRoleCreated = true;

      // Log audit for new role creation
      await createAuditLog("ROLE_CREATED", creatorId, {
        roleId: newRole._id,
        name: newRole.name,
        permissions: permissionIds,
      });
    }
  }

  if (!finalRoleId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Role resolution failed");
  }

  // 3. Create User (Admin)
  const userPayload = {
    name,
    email,
    password,
    phone: phone || "",
    countryCode: countryCode || "",
    verified: true,
    status: STATUS.ACTIVE,
    role: USER_ROLES.ADMIN,
    roleId: finalRoleId,
  };

  const createdUser = await User.create(userPayload);

  // Log audit for admin user creation and role assignment
  await createAuditLog("ADMIN_CREATED", creatorId, {
    adminId: createdUser._id,
    name: createdUser.name,
    email: createdUser.email,
  });

  await createAuditLog("ROLE_ASSIGNED", creatorId, {
    adminId: createdUser._id,
    roleId: finalRoleId,
    roleName: finalRoleName,
    adminEmail: createdUser.email,
  });

  // Fetch populated user
  const populatedUser = await User.findById(createdUser._id)
    .populate({
      path: "roleId",
      populate: {
        path: "permissions",
        select: "name key description status",
      },
    })
    .select("-password");

  return {
    user: populatedUser,
    roleCreated: isNewRoleCreated
      ? { id: finalRoleId, name: finalRoleName }
      : null,
  };
};

// --- SEEDER ---

/**
 * Automatic Permission Seeder.
 * Ensures default permissions exist in the database without duplication.
 */
const seedPermissions = async (): Promise<void> => {
  try {
    await seedPermissionsToDB();
  } catch (err) {
    errorLogger.error("Failed to seed RBAC default permissions", err);
  }
};

export const RBACService = {
  getRolePermissions,
  checkPermissions,
  clearRoleCache,
  refreshRoleCache,
  getAllPermissions,
  getGroupedPermissions,
  getModules,
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  createAdminWithRole,
  seedPermissions,
};
