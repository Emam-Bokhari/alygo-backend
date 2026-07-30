import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Secret } from "jsonwebtoken";
import config from "../../config";
import { User } from "../modules/user/user.model";
import ApiError from "../../errors/ApiErrors";
import { verifyToken } from "../../util/verifyToken";
import { STATUS, USER_ROLES } from "../../enums/user";

const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization;
      if (!tokenWithBearer) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "You are not authorized !!",
        );
      }
      if (!tokenWithBearer.startsWith("Bearer")) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          "Token send is not valid !!",
        );
      }

      if (tokenWithBearer && tokenWithBearer.startsWith("Bearer")) {
        const token = tokenWithBearer.split(" ")[1];

        //verify token
        let verifyUser: any;
        try {
          verifyUser = verifyToken(token, config.jwt.jwt_secret as Secret);
        } catch (error) {
          throw new ApiError(
            StatusCodes.UNAUTHORIZED,
            "You are not authorized !!",
          );
        }

        //  user check isUserExist or not
        const user = await User.isExistUserById(verifyUser.id);
        if (!user) {
          throw new ApiError(
            StatusCodes.NOT_FOUND,
            "This user is not found !!",
          );
        }

        if (user?.status === STATUS.INACTIVE) {
          throw new ApiError(StatusCodes.FORBIDDEN, "This user is blocked !!");
        }

        // Attach roleId to req.user for permission checking
        if (user.roleId) {
          verifyUser.roleId = user.roleId.toString();
        }

        // Map custom roles to "admin" for standard auth checks (backward compatibility)
        let checkedRole = verifyUser?.role;
        if (user.roleId && checkedRole !== USER_ROLES.SUPER_ADMIN) {
          checkedRole = USER_ROLES.ADMIN;
          verifyUser.role = USER_ROLES.ADMIN;
        }

        //guard user
        if (roles.length && !roles.includes(checkedRole)) {
          throw new ApiError(
            StatusCodes.FORBIDDEN,
            "You don't have permission to access this api !!",
          );
        }

        //set user to header
        req.user = verifyUser;
        next();
      }
    } catch (error) {
      next(error);
    }
  };

export default auth;
