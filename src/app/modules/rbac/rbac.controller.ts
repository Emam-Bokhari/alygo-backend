import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { RBACService } from "./rbac.service";
import { USER_ROLES } from "../../../enums/user";

const getPermissions = catchAsync(async (req: Request, res: Response) => {
  const result = await RBACService.getAllPermissions(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permissions retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getGroupedPermissions = catchAsync(async (req: Request, res: Response) => {
  const result = await RBACService.getGroupedPermissions(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Grouped permissions retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getModules = catchAsync(async (req: Request, res: Response) => {
  const result = await RBACService.getModules(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Modules retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getRoles = catchAsync(async (req: Request, res: Response) => {
  const result = await RBACService.getAllRoles();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Roles retrieved successfully",
    data: result,
  });
});

const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RBACService.getRoleById(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Role details retrieved successfully",
    data: result,
  });
});

const createRole = catchAsync(async (req: Request, res: Response) => {
  const creatorId = req.user.id;
  const result = await RBACService.createRole(req.body, creatorId);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Role created successfully",
    data: result,
  });
});

const updateRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updaterId = req.user.id;
  const isSuperAdmin = req.user.role === USER_ROLES.SUPER_ADMIN;
  
  const result = await RBACService.updateRole(id, req.body, updaterId, isSuperAdmin);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Role updated successfully",
    data: result,
  });
});

const deleteRole = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const performerId = req.user.id;
  const isSuperAdmin = req.user.role === USER_ROLES.SUPER_ADMIN;

  const result = await RBACService.deleteRole(id, performerId, isSuperAdmin);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Role deleted successfully",
    data: result,
  });
});

const assignRole = catchAsync(async (req: Request, res: Response) => {
  const { adminId } = req.params;
  const { roleId } = req.body;
  const performerId = req.user.id;

  const result = await RBACService.assignRole(adminId, roleId, performerId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Role assigned to admin user successfully",
    data: result,
  });
});

const createAdminWithRole = catchAsync(async (req: Request, res: Response) => {
  const creatorId = req.user.id;
  const result = await RBACService.createAdminWithRole(req.body, creatorId);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Admin user created and role assigned successfully",
    data: result,
  });
});

export const RbacController = {
  getPermissions,
  getGroupedPermissions,
  getModules,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  createAdminWithRole,
};
