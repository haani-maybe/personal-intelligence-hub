import { GeminiProvider } from "./gemini.provider.js";
import { OpenAIProvider } from "./openai.provider.js";

/**
 * LLM Factory — returns the correct provider based on the LLM_PROVIDER env var.
 * 
 * Usage:
 *   import { getLLM } from "./services/llm/index.js";
 *   const llm = getLLM();
 *   const text = await llm.generateText("Hello!");
 * 
 * To switch providers, just change your .env:
 *   LLM_PROVIDER=gemini   →  uses Gemini
 *   LLM_PROVIDER=openai   →  uses OpenAI
 */

let cachedProvider = null;

const PROVIDERS = {
    gemini: () => new GeminiProvider(process.env.GEMINI_API_KEY),
    openai: () => new OpenAIProvider(process.env.OPENAI_API_KEY),
};

/**
 * Get the configured LLM provider (singleton — created once, reused).
 * @returns {import('./provider.js').LLMProvider}
 */
export function getLLM() {
    if (cachedProvider) {
        return cachedProvider;
    }

    const providerName = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
    const factory = PROVIDERS[providerName];

    if (!factory) {
        const available = Object.keys(PROVIDERS).join(", ");
        throw new Error(
            `Unknown LLM_PROVIDER "${providerName}". Available providers: ${available}`
        );
    }

    cachedProvider = factory();
    console.log(`LLM provider initialized: ${cachedProvider.name}`);
    return cachedProvider;
}

/**
 * Reset the cached provider (useful for testing or hot-reloading config).
 */
export function resetLLM() {
    cachedProvider = null;
}

/**
 * Inject a provider directly (tests use this to swap in a fake LLM).
 */
export function setLLM(provider) {
    cachedProvider = provider;
}
