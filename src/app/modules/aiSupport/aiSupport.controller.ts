import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AiSupportService } from "./aiSupport.service";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

const getKnowledgeList = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.getKnowledgeListFromDB(req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Knowledge base articles retrieved successfully",
    data: result.data,
    pagination: result.meta,
  });
});

const createKnowledge = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.createKnowledgeInDB(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Knowledge base article created successfully",
    data: result,
  });
});

const updateKnowledge = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AiSupportService.updateKnowledgeInDB(id, req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Knowledge base article updated successfully",
    data: result,
  });
});

const deleteKnowledge = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AiSupportService.deleteKnowledgeFromDB(id, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Knowledge base article deleted successfully",
    data: result,
  });
});

const updateConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.updateSystemConfig(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "AI configuration updated successfully",
    data: result,
  });
});

const importKnowledge = catchAsync(async (req: Request, res: Response) => {
  const { data, format } = req.body;
  const result = await AiSupportService.bulkImportKnowledge(data, format, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `Successfully imported ${result.count} knowledge articles.`,
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.getDashboardStatsFromDB();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "AI dashboard statistics retrieved successfully",
    data: result,
  });
});

// ==========================================
// DRIVER CONTROLLERS
// ==========================================

const askAi = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.askAiQuestion(req.user.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "AI response generated successfully",
    data: result,
  });
});

const regenerateChatAnswer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AiSupportService.regenerateAnswer(req.user.id, id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "AI response regenerated successfully",
    data: result,
  });
});

const getChatHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.getChatHistoryFromDB(req.user.id, req.query);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Chat history retrieved successfully",
    data: result.data,
    pagination: result.meta,
  });
});

const getChatDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AiSupportService.getChatDetailsFromDB(req.user.id, id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Chat details retrieved successfully",
    data: result,
  });
});

const submitFeedback = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { feedback } = req.body;
  const result = await AiSupportService.submitChatFeedback(req.user.id, id, feedback);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Feedback submitted successfully",
    data: result,
  });
});

const getSuggestedQuestions = catchAsync(async (req: Request, res: Response) => {
  const sysConfig = await getSystemConfig();
  const suggested = sysConfig.aiSupport?.suggestedQuestions || [];
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Suggested questions retrieved successfully",
    data: suggested,
  });
});

const startConversation = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.startConversationInDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Conversation started successfully",
    data: result,
  });
});

const renameConversation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title } = req.body;
  const result = await AiSupportService.renameConversationInDB(req.user.id, id, title);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Conversation renamed successfully",
    data: result,
  });
});

const archiveConversation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AiSupportService.archiveConversationInDB(req.user.id, id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Conversation archived successfully",
    data: result,
  });
});

const deleteConversation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AiSupportService.deleteConversationFromDB(req.user.id, id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Conversation deleted successfully",
    data: result,
  });
});

const getConversations = catchAsync(async (req: Request, res: Response) => {
  const result = await AiSupportService.getConversationsFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Conversations retrieved successfully",
    data: result,
  });
});

export const AiSupportController = {
  getKnowledgeList,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge,
  updateConfig,
  importKnowledge,
  getDashboardStats,
  askAi,
  regenerateChatAnswer,
  getChatHistory,
  getChatDetails,
  submitFeedback,
  getSuggestedQuestions,
  startConversation,
  renameConversation,
  archiveConversation,
  deleteConversation,
  getConversations,
};
