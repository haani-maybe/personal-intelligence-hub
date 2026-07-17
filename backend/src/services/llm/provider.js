/**
 * LLMProvider — Base class that defines the interface every LLM provider must implement.
 * 
 * To add a new provider (e.g., Anthropic, Mistral), create a new file that extends
 * this class and implement all three methods. Then register it in llm/index.js.
 */
export class LLMProvider {
    constructor(name) {
        this.name = name;
    }

    /**
     * Generate a text completion from a prompt.
     * @param {string} prompt - The prompt to send to the LLM.
     * @param {object} [options] - Optional parameters.
     * @param {string} [options.systemPrompt] - System-level instruction for the model.
     * @param {number} [options.temperature=0.7] - Sampling temperature (0-2).
     * @param {number} [options.maxTokens=1024] - Maximum tokens in the response.
     * @returns {Promise<string>} The generated text.
     */
    async generateText(prompt, options = {}) {
        throw new Error(`generateText() not implemented by ${this.name} provider`);
    }

    /**
     * Generate a text completion and parse the response as JSON.
     * The prompt should instruct the model to respond in JSON format.
     * @param {string} prompt - The prompt (should request JSON output).
     * @param {object} [options] - Optional parameters (same as generateText).
     * @returns {Promise<object>} The parsed JSON object.
     */
    async generateJSON(prompt, options = {}) {
        throw new Error(`generateJSON() not implemented by ${this.name} provider`);
    }

    /**
     * Generate a vector embedding for a piece of text.
     * Used for semantic search with FAISS.
     * @param {string} text - The text to embed.
     * @returns {Promise<number[]>} The embedding vector.
     */
    async generateEmbedding(text) {
        throw new Error(`generateEmbedding() not implemented by ${this.name} provider`);
    }
}
