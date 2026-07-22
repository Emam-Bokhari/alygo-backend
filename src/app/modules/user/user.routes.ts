import { FOLDER_NAMES } from "./../../../enums/files";
import express from "express";
import { USER_ROLES } from "../../../enums/user";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";

import { parseFileData } from "../../middlewares/parseFileData";
import { ReviewController } from "../review/review.controller";
import {
  isAdmin,
  isAuthenticated,
  isSuperAdmin,
} from "../../../helpers/authHelper";
import fileUploadHandler from "../../middlewares/flieUploadHandler";

const router = express.Router();

/* ---------------------------- PROFILE ROUTES ---------------------------- */
router.route("/profile").delete(isAuthenticated, UserController.deleteProfile);

/* ---------------------------- ADMIN CREATE ------------------------------ */
router.post(
  "/create-admin",
  isSuperAdmin,

  validateRequest(UserValidation.createAdminZodSchema),
  UserController.createAdmin,
);

/* ---------------------------- ADMINS LIST ------------------------------- */
router.get("/admins", isSuperAdmin, UserController.getAdmin);
router.delete("/admins/:id", isSuperAdmin, UserController.deleteAdmin);

/* ---------------------------- HOST LIST ------------------------------ */
router.post("/create-host", isSuperAdmin, UserController.createHost);

router.post(
  "/ghost-login/:hostId",
  isSuperAdmin,
  UserController.ghostLoginAsHost,
);

router.delete("/hosts/:id", isAdmin, UserController.deleteHostById);

router.get("/total-users-hosts", isAdmin, UserController.getTotalUsersAndHosts);

/* ---------------------------- USER CREATE & UPDATE ---------------------- */
router
  .route("/")
  .post(UserController.createUser)

  .patch(
    isAuthenticated,
    fileUploadHandler(),
    parseFileData(
      {
        fieldName: "profileImage",
        mode: "single",
      },
      {
        fieldName: "coverImage",
        mode: "single",
      },
    ),
    UserController.updateProfile,
  );

/* ---------------------------- SWITCH PROFILE ---------------------------- */
router.patch("/switch-profile", isAuthenticated, UserController.switchProfile);

/* ---------------------------- STATUS UPDATE ----------------------------- */
router.patch(
  "/admin/status/:id",
  isAdmin,
  UserController.updateAdminStatusById,
);
router.patch("/status/:id", isAdmin, UserController.updateUserStatusById);

router.get(
  "/:userId/reviews",
  isAuthenticated,
  ReviewController.getUserReviews,
);

/* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
router
  .route("/:id")
  .get(isAdmin, UserController.getUserById)
  .delete(isAdmin, UserController.deleteUserById);

export const UserRoutes = router;
