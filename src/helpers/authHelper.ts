import auth from "../app/middlewares/auth";
import { USER_ROLES } from "../enums/user";

export const isUser = auth(USER_ROLES.USER);

export const isDriver = auth(USER_ROLES.DRIVER);

export const isAdmin = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);

export const isSuperAdmin = auth(USER_ROLES.SUPER_ADMIN);

export const isAuthenticated = auth(
  USER_ROLES.USER,
  USER_ROLES.DRIVER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
);
