import { Model } from "mongoose";

export interface IEmergencyHelpline {
  callNumber: string;
  textNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EmergencyHelplineModel = Model<IEmergencyHelpline>;
