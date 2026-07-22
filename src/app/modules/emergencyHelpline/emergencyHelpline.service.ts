import { EmergencyHelpline } from "./emergencyHelpline.model";
import { IEmergencyHelpline } from "./emergencyHelpline.interface";

const upsertEmergencyHelplineToDB = async (
  payload: Partial<IEmergencyHelpline>,
): Promise<IEmergencyHelpline> => {
  const result = await EmergencyHelpline.findOneAndUpdate(
    {},
    { $set: payload },
    { new: true, upsert: true },
  );
  return result;
};

const getEmergencyHelplineFromDB =
  async (): Promise<IEmergencyHelpline | null> => {
    return await EmergencyHelpline.findOne();
  };

export const EmergencyHelplineService = {
  upsertEmergencyHelplineToDB,
  getEmergencyHelplineFromDB,
};
