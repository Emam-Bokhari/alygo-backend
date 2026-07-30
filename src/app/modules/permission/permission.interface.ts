import { ISoftDeleteModel } from "../../../types/softDelete";
export type IPermission = {
  name: string;
  resource: string;
  action: string;
  description: string;
  module: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // Backward compatibility fields
  key?: string;
  status?: "active" | "inactive";
};

export type PermissionModel = ISoftDeleteModel<IPermission>;
