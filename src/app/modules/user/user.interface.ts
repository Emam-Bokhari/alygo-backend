import { Model, Types } from "mongoose";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { REFERRAL_VERIFICATION_STATUS } from "./user.constant";

export type IUser = {
  name: string;
  role: USER_ROLES;
  roleId?: Types.ObjectId;
  email: string;
  profileImage?: string;
  password?: string;
  verified: boolean;
  phone: string;
  countryCode: string;
  status: STATUS;
  firebaseUid?: string;
  dateOfBirth?: Date;
  gender?: GENDER;
  userName?: string;
  deviceToken?: string;
  stripeCustomerId?: string;
  referralCode?: string;
  referredById?: Types.ObjectId;
  isReferralVerified?: boolean;
  referralStatus?: REFERRAL_VERIFICATION_STATUS;
  referralVerifiedAt?: Date;

  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude],
    address: string;
  };
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
  totalCancellations?: number;
  consecutiveCancellations?: number;
  lastCancellationTime?: Date;
  averageRating?: number;
  totalRatings?: number;
  totalReviews?: number;
  suspension?: {
    isSuspended: boolean;
    suspendedBy?: Types.ObjectId | null;
    suspendedAt?: Date | null;
    reason?: string;
    note?: string;
  };
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isAccountCreated(id: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;

export type IUserModel = ISoftDeleteModel<IUser> & UserModal;
