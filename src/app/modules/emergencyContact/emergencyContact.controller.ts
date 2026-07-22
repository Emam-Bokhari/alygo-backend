import { Request, Response } from "express";
import { EmergencyContactService } from "./emergencyContact.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createEmergencyContact = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const contactData = { ...req.body, userId };
    const result =
      await EmergencyContactService.createEmergencyContactToDB(contactData);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Emergency contact created successfully",
      data: result,
    });
  },
);

const getEmergencyContacts = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const result =
    await EmergencyContactService.getEmergencyContactsByUserFromDB(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Emergency contacts retrieved successfully",
    data: result,
  });
});

const updateEmergencyContact = catchAsync(
  async (req: Request, res: Response) => {
    const { contactId } = req.params;
    const result = await EmergencyContactService.updateEmergencyContactInDB(
      contactId,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Emergency contact updated successfully",
      data: result,
    });
  },
);

const deleteEmergencyContact = catchAsync(
  async (req: Request, res: Response) => {
    const { contactId } = req.params;
    const result =
      await EmergencyContactService.deleteEmergencyContactFromDB(contactId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Emergency contact deleted successfully",
      data: result,
    });
  },
);

export const EmergencyContactController = {
  createEmergencyContact,
  getEmergencyContacts,
  updateEmergencyContact,
  deleteEmergencyContact,
};
