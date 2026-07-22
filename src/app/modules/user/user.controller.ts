import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UserService } from "./user.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { JwtPayload } from "jsonwebtoken";
import config from "../../../config";

// register user
const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ...userData } = req.body;

    console.log(userData, "payload");

    const result = await UserService.createUserToDB(userData);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message:
        "Your account has been successfully created. Verify Your Email By OTP. Check your email",
      data: result,
    });
  },
);

// register admin
const createAdmin = catchAsync(async (req, res) => {
  const userData = req.body;
  console.log(userData, "payload");
  const result = await UserService.createAdminToDB(userData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Admin created successfully",
    data: result,
  });
});

const getAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAdminFromDB(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin retrieved Successfully",
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.params.id;
  const result = await UserService.deleteAdminFromDB(payload);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin Deleted Successfully",
    data: result,
  });
});

//update profile
const updateProfile = catchAsync(async (req, res) => {
  const user: any = req.user;
  if ("role" in req.body) {
    delete req.body.role;
  }
  if ("phone" in req.body) {
    delete req.body.phone;
  }
  // If password is provided
  if (req.body.password) {
    req.body.password = await bcrypt.hash(
      req.body.password,
      Number(config.bcrypt_salt_rounds),
    );
  }

  const result = await UserService.updateProfileToDB(user, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Profile updated successfully",
    data: result,
  });
});

//register host
const createHost = catchAsync(async (req, res) => {
  const userData = req.body;
  console.log(userData, "payload");
  const result = await UserService.createHostToDB(userData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Host created successfully",
    data: result,
  });
});

const ghostLoginAsHost = catchAsync(async (req, res) => {
  const { hostId } = req.params;
  const user: any = req.user;
  const result = await UserService.ghostLoginAsHost(user, hostId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Ghost Host logged in successfully",
    data: result,
  });
});

const deleteHostById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await UserService.deleteHostByIdFromD(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Host is deleted successfully",
    data: result,
  });
});

const getTotalUsersAndHosts = catchAsync(async (req, res) => {
  const result = await UserService.getTotalUsersAndHostsFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieved total users and hosts",
    data: result,
  });
});

const switchProfile = catchAsync(async (req, res) => {
  const { role } = req.body;
  const { id: userId } = req.user;
  const result = await UserService.switchProfileToDB(userId, role);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully switch the accounts",
    data: result,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await UserService.getUserByIdFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Successfully retrieve user by ID",
    data: result,
  });
});

const updateUserStatusById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { status } = req.body;

  const result = await UserService.updateUserStatusByIdToDB(id, status);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Status updated successfully",
    data: result,
  });
});

const updateAdminStatusById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { status } = req.body;

  const result = await UserService.updateAdminStatusByIdToDB(id, status);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Admin status updated successfully",
    data: result,
  });
});

const deleteUserById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await UserService.deleteUserByIdFromD(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User is deleted successfully",
    data: result,
  });
});

const deleteProfile = catchAsync(async (req, res) => {
  const { id }: any = req.user;
  // console.log(id, "ID");
  const { password } = req.body;

  const result = await UserService.deleteProfileFromDB(id, password);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Profile deleted successfully",
    data: result,
  });
});

export const UserController = {
  createUser,
  createAdmin,
  getAdmin,
  deleteAdmin,

  updateProfile,
  switchProfile,

  getUserById,

  deleteHostById,
  getTotalUsersAndHosts,
  createHost,
  ghostLoginAsHost,

  updateUserStatusById,
  updateAdminStatusById,
  deleteUserById,
  deleteProfile,
};
