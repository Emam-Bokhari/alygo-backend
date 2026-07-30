export type IPermission = {
  name: string;
  key: string;
  module: string;
  group: string;
  description: string;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
};
