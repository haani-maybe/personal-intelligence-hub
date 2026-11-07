import "./env.js";
import express from "express";
import mongoose from "mongoose";
import { setLLM } from "../../src/services/llm/index.js";
import taskRoutes from "../../src/routes/tasks.routes.js";
import noteRoutes from "../../src/routes/notes.routes.js";
import emailRoutes from "../../src/routes/email.routes.js";
import aiRoutes from "../../src/routes/ai.routes.js";
import n8nRoutes from "../../src/routes/n8n.routes.js";

/**
 * Stand-in for Gemini/OpenAI so tests run without an api key.
 * Embeddings are deterministic: same text -> same vector.
 */
export class FakeLLM {
    name = "fake";

    async generateText() {
        return "Fake summary.";
    }

    async generateJSON(prompt) {
        if (prompt.includes("classify its urgency")) {
            return { urgencyLabel: "high", confidence: 0.9, reasoning: "fake urgency" };
        }
        return [{ title: "Send the report", deadline: null, suggestedPriority: "high", reasoning: "asked in email" }];
    }

    async generateEmbedding(text) {
        const v = new Array(16).fill(0);
        for (let i = 0; i < text.length; i++) v[i % 16] += text.charCodeAt(i);
        return v;
    }
}

// the mongo from "docker compose up -d", override with MONGO_TEST_URI.
// every run uses its own throwaway database and drops it at the end
const MONGO_TEST_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017";

/**
 * Connects to mongo + mounts the real routers on a random port.
 * Returns { url, clear, stop }.
 */
export async function startTestApp() {
    const dbName = `ai-hub-test-${process.pid}-${Date.now()}`;
    try {
        await mongoose.connect(MONGO_TEST_URI, { dbName, serverSelectionTimeoutMS: 3000 });
    } catch (err) {
        throw new Error(`Could not reach mongo at ${MONGO_TEST_URI} (${err.message}). Run "docker compose up -d mongo" first.`);
    }
    setLLM(new FakeLLM());

    const app = express();
    app.use(express.json());
    app.use("/api/tasks", taskRoutes);
    app.use("/api/notes", noteRoutes);
    app.use("/api/emails", emailRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/api/n8n", n8nRoutes);

    const server = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s));
    });

    return {
        url: `http://localhost:${server.address().port}/api`,
        async clear() {
            const { collections } = mongoose.connection;
            await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
        },
        async stop() {
            await new Promise(resolve => server.close(resolve));
            await mongoose.connection.dropDatabase();
            await mongoose.disconnect();
        },
    };
}

export async function request(url, method = "GET", body) {
    const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
}

// background work (embedding after create) isn't awaited by the routes, so poll for it
export async function waitFor(fn, timeoutMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const value = await fn();
        if (value) return value;
        await new Promise(r => setTimeout(r, 25));
    }
    throw new Error("waitFor timed out");
}
