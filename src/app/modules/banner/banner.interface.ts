import { Model } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export type TBanner = {
  name: string;
  description: string;
  image: string;
  status: boolean;
};

export type BannerModel = ISoftDeleteModel<TBanner>;
