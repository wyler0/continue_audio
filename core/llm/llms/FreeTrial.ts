import { getHeaders } from "../../continueServer/stubs/headers.js";
import { ChatMessage, CompletionOptions, ModelProvider } from "../../index.js";
import { SERVER_URL } from "../../util/parameters.js";
import { BaseLLM } from "../index.js";
import { streamResponse } from "../stream.js";

class FreeTrial extends BaseLLM {
  static providerName: ModelProvider = "free-trial";

  private _getHeaders() {
    return {
      uniqueId: this.uniqueId || "None",
      "Content-Type": "application/json",
      ...getHeaders(),
    };
  }

  private _convertArgs(options: CompletionOptions): any {
    return {
      model: options.model,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      max_tokens: options.maxTokens,
      stop:
        options.model === "starcoder-7b"
          ? options.stop
          : options.stop?.slice(0, 2),
      temperature: options.temperature,
      top_p: options.topP,
    };
  }

  protected async *_streamComplete(
    prompt: string,
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    const args = this._convertArgs(this.collectArgs(options));

    const response = await this.fetch(`${SERVER_URL}/stream_complete`, {
      method: "POST",
      headers: this._getHeaders(),
      body: JSON.stringify({
        prompt,
        ...args,
      }),
    });

    for await (const value of streamResponse(response)) {
      yield value;
    }
  }

  protected _convertMessage(message: ChatMessage) {
    if (typeof message.content === "string") {
      return message;
    }

    const parts = message.content.map((part) => {
      return {
        type: part.type,
        text: part.text,
        image_url: { ...part.imageUrl, detail: "low" },
      };
    });
    return {
      ...message,
      content: parts,
    };
  }

  protected async *_streamChat(
    messages: ChatMessage[],
    options: CompletionOptions,
  ): AsyncGenerator<ChatMessage> {
    const args = this._convertArgs(this.collectArgs(options));

    const response = await this.fetch(`${SERVER_URL}/stream_chat`, {
      method: "POST",
      headers: this._getHeaders(),
      body: JSON.stringify({
        messages: messages.map(this._convertMessage),
        ...args,
      }),
    });

    for await (const chunk of streamResponse(response)) {
      yield {
        role: "assistant",
        content: chunk,
      };
    }
  }

  async listModels(): Promise<string[]> {
    return [
      "llama3-70b",
      "gpt-3.5-turbo",
      "gpt-4o",
      "gpt-4-turbo",
      "gemini-1.5-pro-latest",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  }
}

export default FreeTrial;
