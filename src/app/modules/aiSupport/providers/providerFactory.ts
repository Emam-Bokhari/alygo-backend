import { GeminiProvider } from "./geminiProvider";
import { OpenAiProvider } from "./openAiProvider";
import { IAiProvider } from "./aiProvider.interface";
import ApiError from "../../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";

export class ProviderFactory {
  static getProvider(provider: string): IAiProvider {
    switch (provider?.toLowerCase()) {
      case "google":
      case "gemini":
        return new GeminiProvider();
      case "openai":
        return new OpenAiProvider();
      default:
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Unsupported AI Provider: "${provider}". Supported providers: google, openai.`
        );
    }
  }
}
