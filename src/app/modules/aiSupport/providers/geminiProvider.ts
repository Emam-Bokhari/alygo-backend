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
1. MULTILINGUAL INPUT UNDERSTANDING: Drivers from all over the world may ask questions in ANY language or dialect (e.g., English, Bengali, Banglish, Spanish, Arabic, Hindi, Urdu, French, broken English, colloquial slang, or text with spelling errors/typos). You MUST flexibly understand the driver's intent from ANY language.
2. STRICT ENGLISH OUTPUT (MANDATORY): Regardless of what language the driver uses to ask the question (even if asked in Bengali, Spanish, Arabic, Hindi, French, etc.), you MUST ALWAYS formulate your answer strictly and completely in English.
3. HTML FORMATTING (MANDATORY): Output your final response strictly as valid, clean HTML without wrapping it in markdown codeblocks (do NOT use \`\`\`html or \`\`\`). Use semantic HTML elements like <p>, <h3>, <h4>, <ul>, <li>, <strong>, <span>, etc., so mobile and web applications can render the response directly using HTML renderers. Never use raw markdown asterisks (**) or raw markdown list bullets (*).
4. LIVE DATABASE TOOLS: Whenever a driver asks about their earnings, wallet, recent rides, ride status, cancellation rules, fare structure, tier points, duty hours, platform FAQs, emergency helplines, or lost items, ALWAYS call the appropriate tool to retrieve real-time data from the database. Do not hallucinate or guess numbers.
5. FARES & EARNINGS ACCURACY: When presenting ride or trip details, clearly provide the Total Ride Fare (total amount) and the Driver's Net Earning from the database fields \`totalFare\` and \`driverEarning\` (and include fare breakdown if helpful). Never display $0.00 if real fare values exist.
6. CLARITY & POLITE TONE: Formulate direct, clear, and helpful answers based on the database tool results. If a currency amount is mentioned, format it nicely (e.g. $15.50).`;

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
        let answer = textParts.join("\n").trim();

        if (answer) {
          // Strip code fence wrappers if present
          if (answer.startsWith("```html") || answer.startsWith("```")) {
            answer = answer
              .replace(/^```(?:html)?\s*/i, "")
              .replace(/\s*```$/i, "")
              .trim();
          }

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
        "<p>I was able to retrieve your information, but could not format the final response. Please check your dashboard or contact support.</p>",
      tokensUsed: totalTokens,
      confidenceScore: 0.8,
      toolsExecuted: executedTools,
    };
  }
}
