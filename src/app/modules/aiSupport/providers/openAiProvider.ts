import axios from "axios";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../../errors/ApiErrors";
import { IAiProvider, IChatMessage, IProviderResponse } from "./aiProvider.interface";

export class OpenAiProvider implements IAiProvider {
  async generateAnswer(
    prompt: string,
    history: IChatMessage[],
    systemPrompt: string,
    config: {
      model: string;
      temperature: number;
      maxTokens: number;
    }
  ): Promise<IProviderResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "OpenAI API Key (OPENAI_API_KEY) is not configured in environment variables."
      );
    }

    const modelName = config.model || "gpt-4o-mini";
    const url = "https://api.openai.com/v1/chat/completions";

    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

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

    const payload = {
      model: modelName,
      messages,
      temperature: config.temperature ?? 0.2,
      max_tokens: config.maxTokens ?? 800,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 15000, // 15 seconds timeout
      });

      const answer = response.data?.choices?.[0]?.message?.content;
      if (!answer) {
        throw new ApiError(
          StatusCodes.BAD_GATEWAY,
          "Invalid response received from OpenAI API."
        );
      }

      const tokensUsed = response.data?.usage?.total_tokens || 0;

      return {
        answer,
        tokensUsed,
        confidenceScore: 1.0,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      throw new ApiError(
        StatusCodes.BAD_GATEWAY,
        `OpenAI API Error: ${errMsg}`
      );
    }
  }
}
