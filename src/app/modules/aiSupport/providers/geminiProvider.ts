import axios from "axios";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../../errors/ApiErrors";
import {
  IAiProvider,
  IChatMessage,
  IProviderResponse,
} from "./aiProvider.interface";
import {
  AiToolsService,
  AI_SUPPORT_TOOL_DECLARATIONS,
} from "../aiTools.service";

export class GeminiProvider implements IAiProvider {
  async generateAnswer(
    prompt: string,
    history: IChatMessage[],
    systemPrompt: string,
    config: {
      model: string;
      temperature: number;
      maxTokens: number;
    },
    toolsContext?: {
      driverId: string;
    },
  ): Promise<IProviderResponse> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Gemini API Key (GEMINI_API_KEY) is not configured in environment variables.",
      );
    }

    let modelName = config.model || "gemini-3.6-flash";
    if (modelName === "gemini-2.5-flash" || modelName === "gemini-2.0-flash") {
      modelName = "gemini-3.6-flash";
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemInstructionText = `${systemPrompt || ""}
You are the official AI Support Assistant for the Alygo platform, specifically helping drivers.

CRITICAL INSTRUCTIONS:
1. UNDERSTANDING QUERIES: You must flexibly understand driver questions even if they contain typos, spelling errors, informal language, Banglish (e.g., 'ajke amr income koto?', 'last trip er fare koto?', 'cancel fee koto?'), Bengali, or broken English. Identify the driver's intent accurately.
2. LIVE DATABASE TOOLS: Whenever a driver asks about their earnings, wallet, recent rides, ride status, cancellation rules, fare structure, tier points, duty hours, platform FAQs, emergency helplines, or lost items, ALWAYS call the appropriate tool to retrieve real-time data from the database. Do not hallucinate or guess numbers.
3. LANGUAGE OF RESPONSE: Provide your final answer in clear, polite, and professional English (unless the driver explicitly asked to answer in another language).
4. ACCURACY & CONCISENESS: Formulate direct, clear, and helpful answers based on the database tool results. If a currency amount is mentioned, format it nicely (e.g. $50.00).`;

    // Map declarations for Gemini tools schema
    const toolsPayload = [
      {
        functionDeclarations: AI_SUPPORT_TOOL_DECLARATIONS.map((tool) => {
          const decl: any = {
            name: tool.name,
            description: tool.description,
          };
          if (
            tool.parameters &&
            tool.parameters.properties &&
            Object.keys(tool.parameters.properties).length > 0
          ) {
            decl.parameters = {
              type: "OBJECT",
              properties: tool.parameters.properties,
              required: tool.parameters.required || [],
            };
          }
          return decl;
        }),
      },
    ];

    // Build initial conversation contents
    const contents: any[] = history.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Append current user query
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    let totalTokens = 0;
    const executedTools: string[] = [];
    const maxIterations = 4;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const payload: any = {
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.2,
          maxOutputTokens: config.maxTokens ?? 1000,
        },
        systemInstruction: {
          parts: [{ text: systemInstructionText }],
        },
      };

      if (toolsContext) {
        payload.tools = toolsPayload;
      }

      try {
        const response = await axios.post(url, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 25000, // 25 seconds
        });

        const promptTokens =
          response.data?.usageMetadata?.promptTokenCount || 0;
        const candidatesTokens =
          response.data?.usageMetadata?.candidatesTokenCount || 0;
        totalTokens += promptTokens + candidatesTokens;

        const candidate = response.data?.candidates?.[0];
        if (!candidate) {
          throw new ApiError(
            StatusCodes.BAD_GATEWAY,
            "Invalid response received from Gemini API.",
          );
        }

        const parts: any[] = candidate.content?.parts || [];
        const functionCallPart = parts.find((p) => p.functionCall);

        // If model wants to invoke a tool
        if (functionCallPart && functionCallPart.functionCall && toolsContext) {
          const { name, args } = functionCallPart.functionCall;
          executedTools.push(name);

          // Execute database tool
          const toolResult = await AiToolsService.executeTool(
            name,
            args || {},
            { driverId: toolsContext.driverId },
          );

          // Append model turn with original candidate content (preserves thought signature & metadata)
          contents.push(candidate.content);

          // Append function response turn with role 'user'
          contents.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name,
                  response: {
                    name,
                    content: toolResult.data || { error: toolResult.error },
                  },
                },
              },
            ],
          });

          // Continue next iteration to let Gemini process the tool result
          continue;
        }

        // Extract text answer
        const textParts = parts.filter((p) => p.text).map((p) => p.text);
        const answer = textParts.join("\n").trim();

        if (answer) {
          return {
            answer,
            tokensUsed: totalTokens,
            confidenceScore: 1.0,
            toolsExecuted: executedTools,
          };
        }

        // If no text and no function call returned
        break;
      } catch (error: any) {
        console.error("==== GEMINI API ERROR ====");
        console.error(error.response?.data || error.message);
        console.error("==========================");

        const errMsg =
          error.response?.data?.error?.message ||
          error.message ||
          "Gemini API request failed.";
        throw new ApiError(
          StatusCodes.BAD_GATEWAY,
          `Gemini API Error: ${errMsg}`,
        );
      }
    }

    // Fallback if loop ended without final text
    return {
      answer:
        "I was able to retrieve your information, but could not format the final response. Please check your dashboard or contact support.",
      tokensUsed: totalTokens,
      confidenceScore: 0.8,
      toolsExecuted: executedTools,
    };
  }
}
