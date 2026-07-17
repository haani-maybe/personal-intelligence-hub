import OpenAI from "openai";
import { LLMProvider } from "./provider.js";

/**
 * OpenAI provider — uses the official OpenAI SDK.
 * Text/JSON: gpt-4o-mini (fast, cheap, great for structured output)
 * Embeddings: text-embedding-3-small
 */
export class OpenAIProvider extends LLMProvider {
    constructor(apiKey) {
        super("openai");

        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
        }

        this.client = new OpenAI({ apiKey });
        this.textModel = "gpt-4o-mini";
        this.embeddingModel = "text-embedding-3-small";
    }

    async generateText(prompt, options = {}) {
        const {
            systemPrompt = "",
            temperature = 0.7,
            maxTokens = 1024,
        } = options;

        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const completion = await this.client.chat.completions.create({
            model: this.textModel,
            messages,
            temperature,
            max_tokens: maxTokens,
        });

        return completion.choices[0].message.content;
    }

    async generateJSON(prompt, options = {}) {
        const {
            systemPrompt = "",
            temperature = 0.4,
            maxTokens = 1024,
        } = options;

        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: prompt });

        const completion = await this.client.chat.completions.create({
            model: this.textModel,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
        });

        const text = completion.choices[0].message.content;

        try {
            return JSON.parse(text);
        } catch (e) {
            const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error(`OpenAI returned invalid JSON: ${text.substring(0, 200)}`);
        }
    }

    async generateEmbedding(text) {
        const response = await this.client.embeddings.create({
            model: this.embeddingModel,
            input: text,
        });

        return response.data[0].embedding;
    }
}
