import { ISoftDeleteModel } from "../../../types/softDelete";
import { Types } from "mongoose";
import { IPermission } from "../permission/permission.interface";

export type IRole = {
  name: string;
  slug: string;
  description?: string;
  permissions: Types.ObjectId[] | IPermission[];
  status: "active" | "inactive";
  isSystem: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RoleModel = ISoftDeleteModel<IRole>;
