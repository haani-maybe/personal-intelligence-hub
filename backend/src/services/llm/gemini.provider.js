import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider } from "./provider.js";

/**
 * Gemini provider — uses Google's Generative AI SDK.
 * Text/JSON: gemini-2.0-flash (fast, cheap, great for structured output)
 * Embeddings: text-embedding-004
 */
export class GeminiProvider extends LLMProvider {
    constructor(apiKey) {
        super("gemini");

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
        }

        this.client = new GoogleGenerativeAI(apiKey);
        this.textModel = "gemini-2.0-flash";
        this.embeddingModel = "text-embedding-004";
    }

    async generateText(prompt, options = {}) {
        const {
            systemPrompt = "",
            temperature = 0.7,
            maxTokens = 1024,
        } = options;

        const model = this.client.getGenerativeModel({
            model: this.textModel,
            systemInstruction: systemPrompt || undefined,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
            },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    }

    async generateJSON(prompt, options = {}) {
        const {
            systemPrompt = "",
            temperature = 0.4,  // lower default for structured output
            maxTokens = 1024,
        } = options;

        const model = this.client.getGenerativeModel({
            model: this.textModel,
            systemInstruction: systemPrompt || undefined,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                responseMimeType: "application/json",
            },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        try {
            return JSON.parse(text);
        } catch (e) {
            // If Gemini's JSON mode still returns wrapped text, try to extract JSON
            const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error(`Gemini returned invalid JSON: ${text.substring(0, 200)}`);
        }
    }

    async generateEmbedding(text) {
        const model = this.client.getGenerativeModel({ model: this.embeddingModel });
        const result = await model.embedContent(text);
        return result.embedding.values;
    }
}
