import express from "express";
import { isSuperAdmin } from "../../../helpers/authHelper";
import validateRequest from "../../middlewares/validateRequest";
import { RbacValidation } from "./rbac.validation";
import { RbacController } from "./rbac.controller";

const router = express.Router();

// Permissions
router.get("/permissions", isSuperAdmin, RbacController.getPermissions);
router.get("/permissions/grouped", isSuperAdmin, RbacController.getGroupedPermissions);
router.get("/permissions/modules", isSuperAdmin, RbacController.getModules);

// Roles
router.route("/roles")
  .get(isSuperAdmin, RbacController.getRoles)
  .post(isSuperAdmin, validateRequest(RbacValidation.createRoleZodSchema), RbacController.createRole);

router.route("/roles/:id")
  .get(isSuperAdmin, RbacController.getRoleById)
  .patch(isSuperAdmin, validateRequest(RbacValidation.updateRoleZodSchema), RbacController.updateRole)
  .delete(isSuperAdmin, RbacController.deleteRole);

// Assign Role to Admin User
router.patch(
  "/admins/:adminId/role",
  isSuperAdmin,
  validateRequest(RbacValidation.assignRoleZodSchema),
  RbacController.assignRole
);

export const RbacRoutes = router;
