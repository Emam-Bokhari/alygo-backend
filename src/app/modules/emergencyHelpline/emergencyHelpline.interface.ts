import { ISoftDeleteModel } from "../../../types/softDelete";
import { Model } from "mongoose";

export interface IEmergencyHelpline {
  callNumber: string;
  textNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EmergencyHelplineModel = ISoftDeleteModel<IEmergencyHelpline>;
