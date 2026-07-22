import { Types } from "mongoose";
import { STATUS } from "../../../constants/status";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface ILostAndFoundItemCategory {
  name: string;

  status: STATUS;

  createdAt: Date;

  updatedAt: Date;
}

export type LostAndFoundItemCategoryModel =
  ISoftDeleteModel<ILostAndFoundItemCategory>;
