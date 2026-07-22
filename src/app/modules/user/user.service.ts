import { STATUS, USER_ROLES } from "../../../enums/user";
import { IUser } from "./user.interface";
import { JwtPayload, Secret } from "jsonwebtoken";
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import QueryBuilder from "../../builder/queryBuilder";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import { ReviewServices } from "../review/review.service";
import { REVIEW_TARGET_TYPE } from "../review/review.interface";
import { Car } from "../car/car.model";
import bcrypt from "bcrypt";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";

import { ReferralService } from "../referral/referral.service";

// --- ADMIN SERVICES ---
const createAdminToDB = async (payload: any): Promise<IUser> => {
  delete payload.phone;

  const isExistAdmin = await User.findOne({ email: payload.email });
  if (isExistAdmin) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  const adminPayload = {
    ...payload,
    verified: true,
    status: STATUS.ACTIVE,
    role: USER_ROLES.ADMIN,
  };

  const createAdmin = await User.create(adminPayload);

  return createAdmin;
};

const getAdminFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: { $in: [USER_ROLES.ADMIN] },
    status: STATUS.ACTIVE,
    verified: true,
  }).select("name email role profileImage createdAt updatedAt status");

  const queryBuilder = new QueryBuilder<IUser>(baseQuery, query)
    .search(["name", "email"])
    .sort()
    .fields()
    .paginate();

  const admins = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  return {
    data: admins,
    meta,
  };
};

const updateAdminStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.ADMIN,
  });
  if (!user) {
    throw new ApiError(404, "No admin is found by this user ID");
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to change status by this user ID");
  }

  return result;
};

const deleteAdminFromDB = async (id: any) => {
  const isExistAdmin = await User.softDeleteById(id);

  if (!isExistAdmin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete Admin");
  }

  return isExistAdmin;
};

// --- HOST SERVICES ---
const createHostToDB = async (payload: any) => {
  const isExistHost = await User.findOne({ email: payload.email });
  if (isExistHost) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  const hostPayload = {
    ...payload,
    verified: true,
    status: STATUS.ACTIVE,
    role: USER_ROLES.DRIVER,
  };

  const createHost = await User.create(hostPayload);

  // notify admin
  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
    "_id name",
  );

  if (admin) {
    await sendNotifications({
      title: "New Host Created",
      text: `New host account created successfully by admin (${admin.name || admin._id})`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: createHost._id.toString(),
      referenceModel: "User",
    });
  }

  return createHost;
};

// host revenue
const ghostLoginAsHost = async (superAdmin: JwtPayload, hostId: string) => {
  if (superAdmin.role !== USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Unauthorized: Only SuperAdmin can use ghost mode");
  }

  const host = await User.findById(hostId);

  if (!host || host.role !== USER_ROLES.DRIVER) {
    throw new ApiError(404, "Host not found");
  }

  // Generate JWT as host
  const token = jwtHelper.createToken(
    {
      id: host._id,
      email: host.email,
      role: USER_ROLES.DRIVER,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return {
    accessToken: token,
    host: {
      id: host._id,
      name: host.name,
      email: host.email,
    },
  };
};

const deleteHostByIdFromD = async (id: string) => {
  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.DRIVER,
  });

  if (!user) {
    throw new ApiError(404, "Host doest not exist in the database");
  }

  const result = await User.softDeleteById(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete user by this ID");
  }

  // notify admin
  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
    "_id name",
  );

  if (admin) {
    await sendNotifications({
      title: "Host Account Deleted",
      text: `Host deleted successfully by admin (${admin.name || admin._id})`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: (result as any)._id.toString(),
      referenceModel: "User",
    });
  }

  return result;
};

const getTotalUsersAndHostsFromDB = async () => {
  const [totalUsers, totalHosts] = await Promise.all([
    User.countDocuments({
      role: USER_ROLES.USER,
      status: STATUS.ACTIVE,
      verified: true,
    }),
    User.countDocuments({
      role: USER_ROLES.DRIVER,
      status: STATUS.ACTIVE,
      verified: true,
    }),
  ]);

  return { totalUsers, totalHosts };
};

// --- USER SERVICES ---
const createUserToDB = async (payload: any) => {
  const isExistUser = await User.findOne({ email: payload.email });
  if (isExistUser) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  const { referredByCode, ...userData } = payload;

  const createUser = await User.create(userData);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create user");
  }

  // Pre-generate unique referral code for the user
  await ReferralService.getOrCreateReferralCode(createUser._id.toString());

  // Link referral if referredByCode is passed
  if (referredByCode) {
    await ReferralService.handleReferralSignup(
      createUser._id.toString(),
      referredByCode,
    );
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: Number(otp),
    email: createUser.email!,
  };

  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };

  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } },
  );

  const createToken = jwtHelper.createToken(
    {
      id: createUser._id,
      email: createUser.email,
      role: createUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  const result = {
    token: createToken,
    user: createUser,
  };

  // notify admin
  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
    "_id name",
  );

  if (admin) {
    await sendNotifications({
      title: "New User Signup",
      text: `New user signed up successfully`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: result.user._id.toString(),
      referenceModel: "User",
    });
  }

  return result;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //unlink file here
  if (payload.profileImage && isExistUser.profileImage) {
    unlinkFile(isExistUser.profileImage);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return updateDoc;
};

const switchProfileToDB = async (
  userId: string,
  role: USER_ROLES.USER | USER_ROLES.DRIVER,
) => {
  const user = await User.findById(userId);

  if (!user) throw new ApiError(404, "This user is not found in the database");

  if (![USER_ROLES.USER, USER_ROLES.DRIVER].includes(role))
    throw new ApiError(400, "Role is must be either 'USER' or 'DRIVER'");

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true },
  );

  if (!updatedUser) throw new ApiError(400, "Failed to update role");

  const createToken = jwtHelper.createToken(
    {
      id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  const result = {
    token: createToken,
    user: updatedUser,
  };

  return result;
};

const getUserByIdFromDB = async (id: string) => {
  const result = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });

  if (!result)
    throw new ApiError(404, "No user is found in the database by this ID");

  return result;
};

const updateUserStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });
  if (!user) {
    throw new ApiError(404, "No user is found by this user ID");
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(400, "Failed to change status by this user ID");
  }

  return result;
};

const deleteUserByIdFromD = async (id: string) => {
  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.USER,
  });

  if (!user) {
    throw new ApiError(404, "User doest not exist in the database");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(400, "Failed to delete user by this ID");
  }

  return result;
};

const deleteProfileFromDB = async (id: string, password: string) => {
  // user exists?
  const user = await User.findById(id).select("+password");
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // check password
  const isPasswordMatch = await bcrypt.compare(password, user.password!);
  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Password is incorrect!");
  }

  // delete user
  const result = await User.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(400, "Failed to delete this user");
  }

  return result;
};

export const UserService = {
  createUserToDB,
  getAdminFromDB,
  deleteAdminFromDB,
  getUserByIdFromDB,
  updateProfileToDB,
  createHostToDB,
  ghostLoginAsHost,
  deleteHostByIdFromD,
  getTotalUsersAndHostsFromDB,
  createAdminToDB,
  switchProfileToDB,
  updateUserStatusByIdToDB,
  updateAdminStatusByIdToDB,
  deleteUserByIdFromD,
  deleteProfileFromDB,
};
