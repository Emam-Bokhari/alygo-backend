import axios from "axios";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../../errors/ApiErrors";
import { IAiProvider, IChatMessage, IProviderResponse } from "./aiProvider.interface";

export class GeminiProvider implements IAiProvider {
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
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(apiKey,"Api key");

    if (!apiKey) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Gemini API Key (GEMINI_API_KEY) is not configured in environment variables."
      );
    } 

    let modelName = config.model || "gemini-3.5-flash";
    if (modelName === "gemini-3.5-flash") {
      modelName = "gemini-3.5-flash";
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const contents = history.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Append current user query
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const payload: any = {
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.2,
        maxOutputTokens: config.maxTokens ?? 800,
      },
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    try {
      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000, // 15 seconds timeout
      });

      const candidate = response.data?.candidates?.[0];
      const answer = candidate?.content?.parts?.[0]?.text;

      if (!answer) {
        throw new ApiError(
          StatusCodes.BAD_GATEWAY,
          "Invalid response received from Gemini API."
        );
      }

      const promptTokens = response.data?.usageMetadata?.promptTokenCount || 0;
      const candidatesTokens = response.data?.usageMetadata?.candidatesTokenCount || 0;
      const tokensUsed = promptTokens + candidatesTokens;

      return {
        answer,
        tokensUsed,
        confidenceScore: 1.0, // Default model response confidence
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      throw new ApiError(
        StatusCodes.BAD_GATEWAY,
        `Gemini API Error: ${errMsg}`
      );
    }
  }
}
