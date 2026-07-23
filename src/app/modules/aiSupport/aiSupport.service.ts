import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { AiKnowledge } from "../aiKnowledge/aiKnowledge.model";
import { IAiKnowledge } from "../aiKnowledge/aiKnowledge.interface";
import { AiSupport } from "./aiSupport.model";
import { IAiSupport } from "./aiSupport.interface";
import { AiConversation } from "./aiConversation.model";
import { IAiConversation } from "./aiConversation.interface";
import { AiAuditLog } from "./aiAuditLog.model";
import { ProviderFactory } from "./providers/providerFactory";
import { IChatMessage } from "./providers/aiProvider.interface";

// ==========================================
// AUDIT LOGGING HELPER
// ==========================================
const logAudit = async (
  action: string,
  userType: "admin" | "driver" | "system",
  userId?: string | Types.ObjectId,
  details?: Record<string, any>
) => {
  try {
    await AiAuditLog.create({
      action,
      performedBy: userId ? new Types.ObjectId(userId) : undefined,
      userType,
      details,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};

// ==========================================
// RATE LIMITING HELPER
// ==========================================
const checkRateLimits = async (
  driverId: string | Types.ObjectId,
  limitConfig: { maxQuestionsPerMinute: number; maxQuestionsPerHour: number; dailyLimit: number }
) => {
  const now = new Date();
  const oneMinAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [minCount, hourCount, dayCount] = await Promise.all([
    AiSupport.countDocuments({ driverId, createdAt: { $gte: oneMinAgo } }),
    AiSupport.countDocuments({ driverId, createdAt: { $gte: oneHourAgo } }),
    AiSupport.countDocuments({ driverId, createdAt: { $gte: oneDayAgo } }),
  ]);

  if (minCount >= limitConfig.maxQuestionsPerMinute) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Rate limit exceeded. You can only ask ${limitConfig.maxQuestionsPerMinute} questions per minute.`
    );
  }
  if (hourCount >= limitConfig.maxQuestionsPerHour) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Rate limit exceeded. You can only ask ${limitConfig.maxQuestionsPerHour} questions per hour.`
    );
  }
  if (dayCount >= limitConfig.dailyLimit) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Daily rate limit exceeded. You can only ask ${limitConfig.dailyLimit} questions per day.`
    );
  }
};

// ==========================================
// AI CORE CHAT SERVICES
// ==========================================

const askAiQuestion = async (
  driverId: string,
  payload: { conversationId: string; question: string; language?: string }
): Promise<IAiSupport> => {
  const startTime = Date.now();
  const sysConfig = await getSystemConfig();
  const aiSupportConfig = sysConfig.aiSupport;

  if (!aiSupportConfig || !aiSupportConfig.enabled) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "AI Support System is currently disabled.");
  }

  // 1. Enforce Rate Limiting
  await checkRateLimits(driverId, aiSupportConfig.rateLimit);

  // 2. Validate Conversation
  const conversation = await AiConversation.findOne({
    _id: payload.conversationId,
    driverId,
    isArchived: false,
  });

  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Active conversation not found.");
  }

  const rawQuestion = payload.question.trim();
  const normalizedQuestion = rawQuestion
    .toLowerCase()
    .replace(/[^\w\s\u0980-\u09ff]/g, "") // support English and Bengali chars
    .trim();

  const language = payload.language || aiSupportConfig.defaultLanguage || "en";

  // 3. Prompt Injection & AI Safety Guard
  const safetyBlocklist = [
    "api", "password", "database", "source code", "internal system", "security",
    "revenue", "payment secrets", "environment variables", "hidden features",
    "sql", "token", "inject", "ignore previous instructions", "jailbreak",
    "system schema", "admin panel", "fraud detection", "payment internals"
  ];

  const containsViolation = safetyBlocklist.some((term) =>
    normalizedQuestion.includes(term)
  );

  if (containsViolation) {
    const responseTimeMs = Date.now() - startTime;
    const answer = aiSupportConfig.prompts.safetyPrompt || "I am not authorized to answer this question. Please contact support.";
    const chatMsg = await AiSupport.create({
      driverId,
      conversationId: payload.conversationId,
      knowledgeIds: [],
      question: rawQuestion,
      normalizedQuestion,
      answer,
      aiModel: "guard-rail",
      promptVersion: "1.0",
      confidenceScore: 1.0,
      responseStatus: "blocked",
      responseSource: "fallback",
      responseTimeMs,
      tokensUsed: 0,
      language,
      helpful: false,
      adminReviewed: false,
    });

    await logAudit("driver_asked_question", "driver", driverId, {
      question: rawQuestion,
      status: "blocked",
      chatId: chatMsg._id,
    });

    return chatMsg;
  }

  // 4. Fetch Active, Published Knowledge
  const enabledModules = aiSupportConfig.enabledModules || [];
  const knowledgeItems = await AiKnowledge.find({
    isActive: true,
    status: "published",
    isLatest: true,
    visibility: "driver",
    allowedRoles: "driver",
    module: { $in: enabledModules },
  });

  // 5. Semantic Scoring & Ranking
  const scoredItems = knowledgeItems.map((item) => {
    let score = 0;
    const itemTitle = item.title.toLowerCase();
    const itemContent = item.content.toLowerCase();
    const itemCategory = item.category.toLowerCase();
    const itemSearchable = item.searchableContent.toLowerCase();

    // Word tokens overlap
    const queryWords = normalizedQuestion.split(/\s+/).filter(Boolean);

    // Exact keyword check
    const keywords = (item.keywords || []).map((k) => k.toLowerCase());
    const exactKeywordMatch = keywords.some(
      (k) => normalizedQuestion === k || normalizedQuestion.includes(k)
    );
    if (exactKeywordMatch) score += 1000;

    // Title checks
    if (itemTitle === normalizedQuestion) score += 800;
    else if (itemTitle.includes(normalizedQuestion)) score += 400;

    queryWords.forEach((word) => {
      if (itemTitle.includes(word)) score += 50;
    });

    // Tags check
    const tags = (item.tags || []).map((t) => t.toLowerCase());
    tags.forEach((tag) => {
      if (normalizedQuestion.includes(tag)) score += 200;
    });

    // Content containment
    if (itemContent.includes(normalizedQuestion) || itemSearchable.includes(normalizedQuestion)) {
      score += 100;
    }

    queryWords.forEach((word) => {
      if (itemContent.includes(word) || itemSearchable.includes(word)) {
        score += 10;
      }
    });

    // Category match
    if (normalizedQuestion.includes(itemCategory)) {
      score += 50;
    }

    // Priority score
    score += (item.priority || 0) * 10;

    // Normalize confidence score to be between 0.0 and 1.0
    const confidenceScore = Math.min(score / 1000, 1.0);

    return { item, score, confidenceScore };
  });

  // Sort matched items descending
  scoredItems.sort((a, b) => b.score - a.score);

  const bestMatch = scoredItems[0];
  const threshold = aiSupportConfig.minimumConfidence ?? 0.5;

  // 6. Handle Fallback if Confidence is below threshold
  if (!bestMatch || bestMatch.confidenceScore < threshold) {
    const responseTimeMs = Date.now() - startTime;
    const answer = aiSupportConfig.prompts.noMatchPrompt || "I couldn't find an approved answer for that. Please contact support.";
    const chatMsg = await AiSupport.create({
      driverId,
      conversationId: payload.conversationId,
      knowledgeIds: [],
      question: rawQuestion,
      normalizedQuestion,
      answer,
      aiModel: "system-fallback",
      promptVersion: "1.0",
      confidenceScore: bestMatch ? bestMatch.confidenceScore : 0.0,
      responseStatus: "no_match",
      responseSource: "fallback",
      responseTimeMs,
      tokensUsed: 0,
      language,
      helpful: false,
      adminReviewed: false,
    });

    await logAudit("driver_asked_question", "driver", driverId, {
      question: rawQuestion,
      status: "no_match",
      chatId: chatMsg._id,
    });

    return chatMsg;
  }

  // 7. Load Conversation History (Configurable Length)
  const historyLimit = aiSupportConfig.historyLength || 5;
  const historyMessages: IChatMessage[] = [];

  if (aiSupportConfig.enableConversationMemory) {
    const pastChats = await AiSupport.find({
      conversationId: payload.conversationId,
      responseStatus: "success",
    })
      .sort({ createdAt: -1 })
      .limit(historyLimit);

    // Reverse history back to chronological order
    pastChats.reverse().forEach((c) => {
      historyMessages.push({ role: "user", content: c.question });
      historyMessages.push({ role: "model", content: c.answer });
    });
  }

  // 8. Call AI Provider
  const provider = ProviderFactory.getProvider(aiSupportConfig.provider);
  const contextText = ` approved platform documentation knowledge:
Title: ${bestMatch.item.title}
Category: ${bestMatch.item.category}
Module: ${bestMatch.item.module}
Content: ${bestMatch.item.content}`;

  const promptText = `Analyze the context above and answer the user question strictly using it. Do not invent details.
User Question: "${rawQuestion}"`;

  const finalSystemPrompt = `${aiSupportConfig.prompts.systemPrompt}\n${aiSupportConfig.prompts.safetyPrompt}\nContext documentation for reference:\n${contextText}`;

  try {
    const aiResponse = await provider.generateAnswer(
      promptText,
      historyMessages,
      finalSystemPrompt,
      {
        model: aiSupportConfig.model,
        temperature: aiSupportConfig.temperature,
        maxTokens: aiSupportConfig.maxTokens,
      }
    );

    const responseTimeMs = Date.now() - startTime;

    const chatMsg = await AiSupport.create({
      driverId,
      conversationId: payload.conversationId,
      knowledgeIds: [bestMatch.item._id!],
      question: rawQuestion,
      normalizedQuestion,
      answer: aiResponse.answer,
      aiModel: aiSupportConfig.model,
      promptVersion: "1.0",
      confidenceScore: bestMatch.confidenceScore,
      responseStatus: "success",
      responseSource: "knowledge_base",
      responseTimeMs,
      tokensUsed: aiResponse.tokensUsed,
      language,
      helpful: false,
      adminReviewed: false,
    });

    // Update conversation updatedAt timestamp to track active sorting
    await AiConversation.findByIdAndUpdate(payload.conversationId, {
      updatedAt: new Date(),
    });

    await logAudit("driver_asked_question", "driver", driverId, {
      question: rawQuestion,
      status: "success",
      chatId: chatMsg._id,
      knowledgeId: bestMatch.item._id,
    });

    return chatMsg;
  } catch (error: any) {
    console.error("==== ASK AI GEMINI ERROR ====");
    console.error(error);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    console.error("=============================");
    
    const responseTimeMs = Date.now() - startTime;
    const fallbackAnswer = aiSupportConfig.prompts.fallbackPrompt || "I couldn't find an approved answer for that. Please contact support.";
    const chatMsg = await AiSupport.create({
      driverId,
      conversationId: payload.conversationId,
      knowledgeIds: [bestMatch.item._id!],
      question: rawQuestion,
      normalizedQuestion,
      answer: fallbackAnswer,
      aiModel: "error-fallback",
      promptVersion: "1.0",
      confidenceScore: bestMatch.confidenceScore,
      responseStatus: "error",
      responseSource: "fallback",
      responseTimeMs,
      tokensUsed: 0,
      language,
      helpful: false,
      adminReviewed: false,
    });

    await logAudit("driver_asked_question", "driver", driverId, {
      question: rawQuestion,
      status: "error",
      error: error.message,
      chatId: chatMsg._id,
    });

    return chatMsg;
  }
};

const regenerateAnswer = async (
  driverId: string,
  chatId: string
): Promise<IAiSupport> => {
  const startTime = Date.now();
  const sysConfig = await getSystemConfig();
  const aiSupportConfig = sysConfig.aiSupport;

  if (!aiSupportConfig || !aiSupportConfig.enabled) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "AI Support System is currently disabled.");
  }

  const existingChat = await AiSupport.findOne({ _id: chatId, driverId });
  if (!existingChat) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Chat log not found.");
  }

  // Re-run Ask AI logic
  const enabledModules = aiSupportConfig.enabledModules || [];
  const knowledgeItems = await AiKnowledge.find({
    isActive: true,
    status: "published",
    isLatest: true,
    visibility: "driver",
    allowedRoles: "driver",
    module: { $in: enabledModules },
  });

  const scoredItems = knowledgeItems.map((item) => {
    let score = 0;
    const itemTitle = item.title.toLowerCase();
    const itemContent = item.content.toLowerCase();
    const itemCategory = item.category.toLowerCase();
    const itemSearchable = item.searchableContent.toLowerCase();

    const queryWords = existingChat.normalizedQuestion.split(/\s+/).filter(Boolean);

    const keywords = (item.keywords || []).map((k) => k.toLowerCase());
    const exactKeywordMatch = keywords.some(
      (k) => existingChat.normalizedQuestion === k || existingChat.normalizedQuestion.includes(k)
    );
    if (exactKeywordMatch) score += 1000;

    if (itemTitle === existingChat.normalizedQuestion) score += 800;
    else if (itemTitle.includes(existingChat.normalizedQuestion)) score += 400;

    queryWords.forEach((word) => {
      if (itemTitle.includes(word)) score += 50;
    });

    const tags = (item.tags || []).map((t) => t.toLowerCase());
    tags.forEach((tag) => {
      if (existingChat.normalizedQuestion.includes(tag)) score += 200;
    });

    if (itemContent.includes(existingChat.normalizedQuestion) || itemSearchable.includes(existingChat.normalizedQuestion)) {
      score += 100;
    }

    queryWords.forEach((word) => {
      if (itemContent.includes(word) || itemSearchable.includes(word)) {
        score += 10;
      }
    });

    if (existingChat.normalizedQuestion.includes(itemCategory)) {
      score += 50;
    }

    score += (item.priority || 0) * 10;
    const confidenceScore = Math.min(score / 1000, 1.0);

    return { item, score, confidenceScore };
  });

  scoredItems.sort((a, b) => b.score - a.score);

  const bestMatch = scoredItems[0];
  const threshold = aiSupportConfig.minimumConfidence ?? 0.5;

  if (!bestMatch || bestMatch.confidenceScore < threshold) {
    const responseTimeMs = Date.now() - startTime;
    existingChat.answer = aiSupportConfig.prompts.noMatchPrompt || "I couldn't find an approved answer for that. Please contact support.";
    existingChat.responseStatus = "no_match";
    existingChat.responseSource = "fallback";
    existingChat.confidenceScore = bestMatch ? bestMatch.confidenceScore : 0.0;
    existingChat.responseTimeMs = responseTimeMs;
    await existingChat.save();

    await logAudit("response_regenerated", "driver", driverId, { chatId, status: "no_match" });
    return existingChat;
  }

  const historyLimit = aiSupportConfig.historyLength || 5;
  const historyMessages: IChatMessage[] = [];

  if (aiSupportConfig.enableConversationMemory) {
    const pastChats = await AiSupport.find({
      conversationId: existingChat.conversationId,
      responseStatus: "success",
      _id: { $ne: existingChat._id },
    })
      .sort({ createdAt: -1 })
      .limit(historyLimit);

    pastChats.reverse().forEach((c) => {
      historyMessages.push({ role: "user", content: c.question });
      historyMessages.push({ role: "model", content: c.answer });
    });
  }

  const provider = ProviderFactory.getProvider(aiSupportConfig.provider);
  const contextText = ` approved platform documentation knowledge:
Title: ${bestMatch.item.title}
Category: ${bestMatch.item.category}
Module: ${bestMatch.item.module}
Content: ${bestMatch.item.content}`;

  const promptText = `Analyze the context above and answer the user question strictly using it. Do not invent details.
User Question: "${existingChat.question}"`;

  const finalSystemPrompt = `${aiSupportConfig.prompts.systemPrompt}\n${aiSupportConfig.prompts.safetyPrompt}\nContext documentation for reference:\n${contextText}`;

  try {
    const aiResponse = await provider.generateAnswer(
      promptText,
      historyMessages,
      finalSystemPrompt,
      {
        model: aiSupportConfig.model,
        temperature: aiSupportConfig.temperature,
        maxTokens: aiSupportConfig.maxTokens,
      }
    );

    const responseTimeMs = Date.now() - startTime;
    existingChat.answer = aiResponse.answer;
    existingChat.aiModel = aiSupportConfig.model;
    existingChat.confidenceScore = bestMatch.confidenceScore;
    existingChat.responseStatus = "success";
    existingChat.responseSource = "knowledge_base";
    existingChat.responseTimeMs = responseTimeMs;
    existingChat.tokensUsed = aiResponse.tokensUsed;
    existingChat.knowledgeIds = [bestMatch.item._id!];
    await existingChat.save();

    await logAudit("response_regenerated", "driver", driverId, {
      chatId,
      status: "success",
      knowledgeId: bestMatch.item._id,
    });

    return existingChat;
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    existingChat.answer = aiSupportConfig.prompts.fallbackPrompt || "I couldn't find an approved answer for that. Please contact support.";
    existingChat.responseStatus = "error";
    existingChat.responseSource = "fallback";
    existingChat.responseTimeMs = responseTimeMs;
    existingChat.tokensUsed = 0;
    await existingChat.save();

    await logAudit("response_regenerated", "driver", driverId, {
      chatId,
      status: "error",
      error: error.message,
    });

    return existingChat;
  }
};

const getChatHistoryFromDB = async (
  driverId: string,
  query: any
): Promise<{ data: IAiSupport[]; meta: any }> => {
  const baseQuery = AiSupport.find({ driverId });
  const queryBuilder = new AiSupport(null as any); // just mock or build query

  // We manually implement standard search/filter logic to have full control
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filters: any = { driverId };
  if (query.conversationId) {
    filters.conversationId = new Types.ObjectId(query.conversationId);
  }
  if (query.searchTerm) {
    filters.$or = [
      { question: { $regex: query.searchTerm, $options: "i" } },
      { answer: { $regex: query.searchTerm, $options: "i" } },
    ];
  }
  if (query.fromDate || query.toDate) {
    filters.createdAt = {};
    if (query.fromDate) filters.createdAt.$gte = new Date(query.fromDate);
    if (query.toDate) filters.createdAt.$lte = new Date(query.toDate);
  }

  const data = await AiSupport.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("knowledgeIds");

  const total = await AiSupport.countDocuments(filters);
  const totalPage = Math.ceil(total / limit);

  return {
    data,
    meta: { page, limit, total, totalPage },
  };
};

const getChatDetailsFromDB = async (driverId: string, id: string): Promise<IAiSupport> => {
  const chat = await AiSupport.findOne({ _id: id, driverId }).populate("knowledgeIds");
  if (!chat) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Chat details not found.");
  }
  return chat;
};

const submitChatFeedback = async (
  driverId: string,
  id: string,
  feedback: "helpful" | "not_helpful"
): Promise<IAiSupport> => {
  const chat = await AiSupport.findOne({ _id: id, driverId });
  if (!chat) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Chat details not found.");
  }

  chat.feedback = feedback;
  chat.helpful = feedback === "helpful";
  await chat.save();

  await logAudit("driver_feedback", "driver", driverId, { chatId: id, feedback });

  return chat;
};

// ==========================================
// CONVERSATION SERVICES
// ==========================================

const startConversationInDB = async (driverId: string): Promise<IAiConversation> => {
  // Check count of active chats to keep it reasonable
  const activeCount = await AiConversation.countDocuments({ driverId });
  const title = `Chat Session #${activeCount + 1}`;

  const conversation = await AiConversation.create({
    driverId,
    title,
    isArchived: false,
  });

  await logAudit("driver_asked_question", "driver", driverId, {
    action: "START_CONVERSATION",
    conversationId: conversation._id,
  });

  return conversation;
};

const renameConversationInDB = async (
  driverId: string,
  id: string,
  title: string
): Promise<IAiConversation> => {
  const conversation = await AiConversation.findOneAndUpdate(
    { _id: id, driverId },
    { title },
    { new: true }
  );

  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found.");
  }

  return conversation;
};

const archiveConversationInDB = async (driverId: string, id: string): Promise<IAiConversation> => {
  const conversation = await AiConversation.findOneAndUpdate(
    { _id: id, driverId },
    { isArchived: true },
    { new: true }
  );

  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found.");
  }

  return conversation;
};

const deleteConversationFromDB = async (driverId: string, id: string): Promise<IAiConversation> => {
  const conversation = await AiConversation.findOne({ _id: id, driverId });
  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Conversation not found.");
  }

  // Soft delete conversation and all messages inside it
  await (conversation as any).softDelete();
  await AiSupport.updateMany({ conversationId: id }, { isDeleted: true, deletedAt: new Date() });

  return conversation;
};

const getConversationsFromDB = async (driverId: string): Promise<IAiConversation[]> => {
  return await AiConversation.find({ driverId, isArchived: false }).sort({ updatedAt: -1 });
};

// ==========================================
// KNOWLEDGE ADMIN SERVICES
// ==========================================

const getKnowledgeListFromDB = async (query: any): Promise<{ data: IAiKnowledge[]; meta: any }> => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filters: any = { isLatest: true };

  if (query.category) filters.category = query.category;
  if (query.module) filters.module = query.module;
  if (query.active !== undefined) {
    filters.isActive = query.active === "true";
  }
  if (query.aiEnabled !== undefined) {
    filters.aiEnabled = query.aiEnabled === "true";
  }
  if (query.searchTerm) {
    filters.$or = [
      { title: { $regex: query.searchTerm, $options: "i" } },
      { content: { $regex: query.searchTerm, $options: "i" } },
    ];
  }

  const data = await AiKnowledge.find(filters)
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  const total = await AiKnowledge.countDocuments(filters);
  const totalPage = Math.ceil(total / limit);

  return {
    data,
    meta: { page, limit, total, totalPage },
  };
};

const createKnowledgeInDB = async (payload: IAiKnowledge, adminId: string): Promise<IAiKnowledge> => {
  // Programmatic Uniqueness check for isLatest published knowledge titles
  const duplicate = await AiKnowledge.findOne({
    title: payload.title,
    isLatest: true,
    status: "published",
  });

  if (duplicate && payload.status === "published") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "A published knowledge base document with this title already exists."
    );
  }

  const searchableContent = `${payload.title} ${payload.content} ${(payload.keywords || []).join(" ")}`;

  const docData = {
    ...payload,
    version: 1,
    isLatest: true,
    searchableContent,
    createdBy: new Types.ObjectId(adminId),
    updatedBy: new Types.ObjectId(adminId),
  };

  if (payload.status === "published") {
    docData.publishedAt = new Date();
    docData.publishedBy = new Types.ObjectId(adminId);
  }

  const newDoc = await AiKnowledge.create(docData);

  await logAudit("knowledge_created", "admin", adminId, {
    id: newDoc._id,
    title: newDoc.title,
  });

  return newDoc;
};

const updateKnowledgeInDB = async (
  id: string,
  payload: Partial<IAiKnowledge>,
  adminId: string
): Promise<IAiKnowledge> => {
  const oldDoc = await AiKnowledge.findById(id);
  if (!oldDoc) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Knowledge base article not found.");
  }

  const title = payload.title || oldDoc.title;
  const content = payload.content || oldDoc.content;
  const keywords = payload.keywords || oldDoc.keywords || [];
  const searchableContent = `${title} ${content} ${keywords.join(" ")}`;

  // If the old document was PUBLISHED, create a new version document
  if (oldDoc.status === "published" && (payload.status === "published" || !payload.status)) {
    // 1. Unmark latest on previous version
    await AiKnowledge.findByIdAndUpdate(id, { isLatest: false });

    // 2. Create versioned copy
    const newVersionData = {
      ...oldDoc.toObject(),
      ...payload,
      _id: undefined, // mongo will generate new id
      version: oldDoc.version + 1,
      previousVersionId: oldDoc._id,
      isLatest: true,
      searchableContent,
      publishedAt: new Date(),
      publishedBy: new Types.ObjectId(adminId),
      updatedBy: new Types.ObjectId(adminId),
      createdAt: undefined,
      updatedAt: undefined,
    };

    const newDoc = await AiKnowledge.create(newVersionData);

    await logAudit("knowledge_updated", "admin", adminId, {
      oldId: id,
      newId: newDoc._id,
      action: "NEW_VERSION_PUBLISHED",
      title,
    });

    return newDoc;
  } else {
    // In-place update for drafts / review documents
    const updated = await AiKnowledge.findByIdAndUpdate(
      id,
      {
        ...payload,
        searchableContent,
        updatedBy: new Types.ObjectId(adminId),
        ...(payload.status === "published"
          ? { publishedAt: new Date(), publishedBy: new Types.ObjectId(adminId) }
          : {}),
      },
      { new: true }
    );

    if (!updated) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update article.");
    }

    await logAudit("knowledge_updated", "admin", adminId, {
      id,
      action: "IN_PLACE_UPDATE",
      title,
    });

    return updated;
  }
};

const deleteKnowledgeFromDB = async (id: string, adminId: string): Promise<IAiKnowledge> => {
  const doc = await AiKnowledge.findById(id);
  if (!doc) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Knowledge base article not found.");
  }

  await (doc as any).softDelete();

  await logAudit("knowledge_deleted", "admin", adminId, {
    id,
    title: doc.title,
  });

  return doc;
};

// ==========================================
// SYSTEM CONFIG & DASHBOARD SERVICES
// ==========================================

const updateSystemConfig = async (
  payload: Partial<any>,
  adminId: string
): Promise<any> => {
  const existingConfig = await AiConversation.db.model("SystemConfiguration").findOne();

  // Defensive fallback merge
  const currentAiSupport = existingConfig?.aiSupport || {
    enabled: true,
    provider: "google",
    model: "gemini-1.5-flash",
    temperature: 0.2,
    maxTokens: 800,
    historyLength: 5,
    enableConversationMemory: true,
    minimumConfidence: 0.5,
    allowFallbackAnswer: true,
    defaultLanguage: "en",
    enabledModules: [
      "Ride",
      "Wallet",
      "Referral",
      "Tier",
      "Points",
      "Destination Filter",
      "Lost Found",
      "Support",
      "FAQ",
      "Documents",
    ],
    suggestedQuestions: [
      "How do I receive payments?",
      "How does Lost & Found work?",
      "How do referral rewards work?",
      "How do destination filters work?",
    ],
    rateLimit: { maxQuestionsPerMinute: 5, maxQuestionsPerHour: 30, dailyLimit: 100 },
    prompts: {
      systemPrompt:
        "You are an AI Support Assistant for the Alygo platform. You answer driver queries ONLY using approved platform documentation. Keep answers helpful and brief. If the query is outside Alygo documentation, politely refuse.",
      fallbackPrompt:
        "I couldn't find an approved answer for that. Please contact support.",
      safetyPrompt:
        "Never output database structure, SQL queries, code snippets, internal business policies, private formulas, passenger secrets, APIs, or internal configurations.",
      noMatchPrompt:
        "I couldn't find an approved answer for that. Please contact support.",
    },
  };

  const updatedAiSupport = {
    ...currentAiSupport,
    ...payload,
    // Deep merge rateLimit & prompts if provided
    rateLimit: {
      ...currentAiSupport.rateLimit,
      ...payload.rateLimit,
    },
    prompts: {
      ...currentAiSupport.prompts,
      ...payload.prompts,
    },
  };

  const result = await AiConversation.db.model("SystemConfiguration").findOneAndUpdate(
    {},
    { $set: { aiSupport: updatedAiSupport } },
    { new: true, upsert: true }
  );

  // Clear helper cache
  const { clearSystemConfigCache } = require("../../../helpers/systemConfigHelper");
  clearSystemConfigCache();

  await logAudit("ai_config_changed", "admin", adminId, payload);

  return result.aiSupport;
};

const bulkImportKnowledge = async (
  rawCsvOrMarkdownData: string,
  format: "csv" | "markdown",
  adminId: string
): Promise<{ count: number }> => {
  const itemsToCreate: any[] = [];

  if (format === "csv") {
    // Basic CSV parser
    const lines = rawCsvOrMarkdownData.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split accounting for quotes values
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
      const values = matches.map((v) => v.trim().replace(/^"|"$/g, ""));

      const record: any = {};
      headers.forEach((header, index) => {
        const val = values[index] || "";
        if (header === "tags" || header === "keywords") {
          record[header] = val ? val.split(";").map((t) => t.trim()) : [];
        } else if (header === "priority") {
          record[header] = Number(val) || 0;
        } else {
          record[header] = val;
        }
      });

      if (record.title && record.content) {
        itemsToCreate.push(record);
      }
    }
  } else {
    // Markdown parser
    // Identifies "# title" headers and segments content
    const sections = rawCsvOrMarkdownData.split(/(?=\n#\s+)/);
    sections.forEach((section) => {
      const lines = section.trim().split("\n");
      const titleLine = lines[0].replace(/^#\s*/, "").trim();
      if (!titleLine) return;

      const content = lines.slice(1).join("\n").trim();
      itemsToCreate.push({
        title: titleLine,
        module: "Documents",
        category: "faq",
        content,
        tags: ["imported", "markdown"],
        keywords: [titleLine.toLowerCase()],
      });
    });
  }

  let count = 0;
  for (const item of itemsToCreate) {
    try {
      await createKnowledgeInDB(
        {
          ...item,
          status: "published",
          isActive: true,
          aiEnabled: true,
          visibility: "driver",
          allowedRoles: ["driver"],
          language: "en",
        } as any,
        adminId
      );
      count++;
    } catch (err) {
      console.warn("Import skip for item:", item.title, err);
    }
  }

  await logAudit("knowledge_created", "admin", adminId, {
    action: "BULK_IMPORT",
    count,
  });

  return { count };
};

const getDashboardStatsFromDB = async (): Promise<any> => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalQuestions, questionsToday, helpfulFeedback, notHelpfulFeedback] = await Promise.all([
    AiSupport.countDocuments(),
    AiSupport.countDocuments({ createdAt: { $gte: startOfToday } }),
    AiSupport.countDocuments({ feedback: "helpful" }),
    AiSupport.countDocuments({ feedback: "not_helpful" }),
  ]);

  const totalFeedback = helpfulFeedback + notHelpfulFeedback;
  const helpfulPct = totalFeedback > 0 ? Math.round((helpfulFeedback / totalFeedback) * 100) : 0;
  const notHelpfulPct = totalFeedback > 0 ? Math.round((notHelpfulFeedback / totalFeedback) * 100) : 0;

  // Average response time, Token Usage aggregation
  const aggregates = await AiSupport.aggregate([
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: "$responseTimeMs" },
        totalTokens: { $sum: "$tokensUsed" },
        avgTokens: { $avg: "$tokensUsed" },
      },
    },
  ]);

  const avgResponseTime = aggregates[0]?.avgResponseTime
    ? Math.round(aggregates[0].avgResponseTime)
    : 0;
  const totalTokens = aggregates[0]?.totalTokens || 0;
  const avgTokens = aggregates[0]?.avgTokens ? Math.round(aggregates[0].avgTokens) : 0;

  // Assume provider cost rate of $0.0015 per 1,000 tokens
  const estimatedCost = (totalTokens / 1000) * 0.0015;

  // Top Categories (knowledge hits mapping categories)
  const topCategories = await AiKnowledge.aggregate([
    { $match: { isLatest: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Top Asked Questions (Frequent queries)
  const topAskedQuestions = await AiSupport.aggregate([
    { $group: { _id: "$normalizedQuestion", rawQuestion: { $first: "$question" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Top Missing / Unanswered Questions
  const topMissingQuestions = await AiSupport.aggregate([
    { $match: { responseStatus: "no_match" } },
    { $group: { _id: "$normalizedQuestion", rawQuestion: { $first: "$question" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Document usage frequency
  const docUsage = await AiSupport.aggregate([
    { $unwind: "$knowledgeIds" },
    { $group: { _id: "$knowledgeIds", count: { $sum: 1 } } },
    { $lookup: { from: "aiknowledges", localField: "_id", foreignField: "_id", as: "doc" } },
    { $unwind: "$doc" },
    { $project: { _id: 1, title: "$doc.title", count: 1 } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Low confidence responses
  const lowConfidence = await AiSupport.find({
    confidenceScore: { $lt: 0.6 },
    responseStatus: "success",
  })
    .sort({ confidenceScore: 1 })
    .limit(10)
    .select("question answer confidenceScore createdAt");

  return {
    totalQuestions,
    questionsToday,
    avgResponseTime,
    helpfulPct,
    notHelpfulPct,
    totalTokens,
    avgTokens,
    estimatedCost,
    topCategories: topCategories.map((c) => ({ category: c._id, count: c.count })),
    topAskedQuestions: topAskedQuestions.map((q) => ({ question: q.rawQuestion, count: q.count })),
    topMissingQuestions: topMissingQuestions.map((q) => ({ question: q.rawQuestion, count: q.count })),
    mostUsedDocuments: docUsage.map((d) => ({ id: d._id, title: d.title, count: d.count })),
    lowConfidenceResponses: lowConfidence,
  };
};

export const AiSupportService = {
  askAiQuestion,
  regenerateAnswer,
  getChatHistoryFromDB,
  getChatDetailsFromDB,
  submitChatFeedback,
  startConversationInDB,
  renameConversationInDB,
  archiveConversationInDB,
  deleteConversationFromDB,
  getConversationsFromDB,
  getKnowledgeListFromDB,
  createKnowledgeInDB,
  updateKnowledgeInDB,
  deleteKnowledgeFromDB,
  updateSystemConfig,
  bulkImportKnowledge,
  getDashboardStatsFromDB,
};
