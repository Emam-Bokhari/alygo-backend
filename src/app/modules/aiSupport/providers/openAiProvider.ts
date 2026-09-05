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

export class OpenAiProvider implements IAiProvider {
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "OpenAI API Key (OPENAI_API_KEY) is not configured in environment variables.",
      );
    }

    const modelName = config.model || "gpt-4o-mini";
    const url = "https://api.openai.com/v1/chat/completions";

    const systemInstructionText = `${systemPrompt || ""}
You are the official AI Support Assistant for the Alygo platform, specifically helping drivers.

CRITICAL INSTRUCTIONS:
1. MULTILINGUAL INPUT UNDERSTANDING: Drivers from all over the world may ask questions in ANY language or dialect (e.g., English, Bengali, Banglish, Spanish, Arabic, Hindi, Urdu, French, broken English, colloquial slang, or text with spelling errors/typos). You MUST flexibly understand the driver's intent from ANY language.
2. STRICT ENGLISH OUTPUT (MANDATORY): Regardless of what language the driver uses to ask the question (even if asked in Bengali, Spanish, Arabic, Hindi, French, etc.), you MUST ALWAYS formulate your answer strictly and completely in English.
3. HTML FORMATTING (MANDATORY): Output your final response strictly as valid, clean HTML without wrapping it in markdown codeblocks (do NOT use \`\`\`html or \`\`\`). Use semantic HTML elements like <p>, <h3>, <h4>, <ul>, <li>, <strong>, <span>, etc., so mobile and web applications can render the response directly using HTML renderers. Never use raw markdown asterisks (**) or raw markdown list bullets (*).
4. LIVE DATABASE TOOLS: Whenever a driver asks about their earnings, wallet, recent rides, ride status, cancellation rules, fare structure, tier points, duty hours, platform FAQs, emergency helplines, or lost items, ALWAYS call the appropriate tool to retrieve real-time data from the database. Do not hallucinate or guess numbers.
5. FARES & EARNINGS ACCURACY: When presenting ride or trip details, clearly provide the Total Ride Fare (total amount) and the Driver's Net Earning from the database fields \`totalFare\` and \`driverEarning\` (and include fare breakdown if helpful). Never display $0.00 if real fare values exist.
6. CLARITY & POLITE TONE: Formulate direct, clear, and helpful answers based on the database tool results. If a currency amount is mentioned, format it nicely (e.g. $15.50).`;

    const messages: any[] = [];
    messages.push({
      role: "system",
      content: systemInstructionText,
    });

    history.forEach((msg) => {
      messages.push({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.content,
      });
    });

    messages.push({
      role: "user",
      content: prompt,
    });

    // Format tools for OpenAI format
    const openAiTools = AI_SUPPORT_TOOL_DECLARATIONS.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.parameters?.properties || {},
          required: tool.parameters?.required || [],
        },
      },
    }));

    let totalTokens = 0;
    const executedTools: string[] = [];
    const maxIterations = 4;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const payload: any = {
        model: modelName,
        messages,
        temperature: config.temperature ?? 0.2,
        max_tokens: config.maxTokens ?? 800,
      };

      if (toolsContext) {
        payload.tools = openAiTools;
      }

      try {
        const response = await axios.post(url, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 25000,
        });

        totalTokens += response.data?.usage?.total_tokens || 0;
        const choice = response.data?.choices?.[0];
        const message = choice?.message;

        if (!message) {
          throw new ApiError(
            StatusCodes.BAD_GATEWAY,
            "Invalid response received from OpenAI API.",
          );
        }

        // If tool calls were made
        if (
          message.tool_calls &&
          message.tool_calls.length > 0 &&
          toolsContext
        ) {
          messages.push(message);

          for (const toolCall of message.tool_calls) {
            const funcName = toolCall.function?.name;
            let funcArgs = {};
            try {
              funcArgs = toolCall.function?.arguments
                ? JSON.parse(toolCall.function.arguments)
                : {};
            } catch {
              funcArgs = {};
            }

            executedTools.push(funcName);

            const toolResult = await AiToolsService.executeTool(
              funcName,
              funcArgs,
              { driverId: toolsContext.driverId },
            );

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(
                toolResult.data || { error: toolResult.error },
              ),
            });
          }

          continue;
        }

        let answer = message.content;
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

        break;
      } catch (error: any) {
        const errMsg = error.response?.data?.error?.message || error.message;
        throw new ApiError(
          StatusCodes.BAD_GATEWAY,
          `OpenAI API Error: ${errMsg}`,
        );
      }
    }

    return {
      answer:
        "<p>I was able to retrieve your information, but could not format the final response. Please check your dashboard or contact support.</p>",
      tokensUsed: totalTokens,
      confidenceScore: 0.8,
      toolsExecuted: executedTools,
    };
  }
}
