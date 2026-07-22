import { EmergencyContact } from "./emergencyContact.model";
import { IEmergencyContact } from "./emergencyContact.interface";

const createEmergencyContactToDB = async (
  payload: IEmergencyContact,
): Promise<IEmergencyContact> => {
  const result = await EmergencyContact.findOneAndUpdate(
    { userId: payload.userId, phone: payload.phone },
    { $set: payload },
    { new: true, upsert: true },
  );
  return result;
};

const getEmergencyContactsByUserFromDB = async (
  userId: string,
): Promise<IEmergencyContact[]> => {
  return await EmergencyContact.find({ userId, isActive: true });
};

const updateEmergencyContactInDB = async (
  contactId: string,
  payload: Partial<IEmergencyContact>,
): Promise<IEmergencyContact | null> => {
  const result = await EmergencyContact.findByIdAndUpdate(
    contactId,
    { $set: payload },
    { new: true },
  );
  return result;
};

const deleteEmergencyContactFromDB = async (contactId: string) => {
  const result = await EmergencyContact.softDeleteById(contactId);
  return result;
};

export const EmergencyContactService = {
  createEmergencyContactToDB,
  getEmergencyContactsByUserFromDB,
  updateEmergencyContactInDB,
  deleteEmergencyContactFromDB,
};
