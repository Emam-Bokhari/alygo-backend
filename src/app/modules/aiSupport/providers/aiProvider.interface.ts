export interface IChatMessage {
  role: "user" | "model" | "system";
  content: string;
}

export interface IProviderResponse {
  answer: string;
  tokensUsed: number;
  confidenceScore: number;
}

export interface IAiProvider {
  generateAnswer(
    prompt: string,
    history: IChatMessage[],
    systemPrompt: string,
    config: {
      model: string;
      temperature: number;
      maxTokens: number;
    }
  ): Promise<IProviderResponse>;
}
