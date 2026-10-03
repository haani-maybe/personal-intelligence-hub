// Separating Database Layer and AI Layer.
// This routes file does NOT directly modify the DB except for the search route.

import express from "express";
import { scoreTask, summarizeText, extractTasks, classifyUrgency, generateDailyBrief } from "../services/ai.service.js";
import { Task } from "../models/task.model.js";
import { Email } from "../models/email.model.js";
import { Note } from "../models/note.model.js";
import { getLLM } from "../services/llm/index.js";
import { search } from "../services/faiss.service.js";

const router = express.Router();


/**
 * POST /api/ai/search
 * Semantic search across emails, notes, and tasks using FAISS.
 * Body: { query: string, topK?: number, types?: ["email","note","task"] }
 */
router.post("/search", async (req, res) => {
    try {
        const { query, topK = 8, types = [] } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({ error: "query is required" });
        }

        const queryEmbedding = await getLLM().generateEmbedding(query);
        const hits = search(queryEmbedding, topK, types);

        // Enrich hits with a bit more data from MongoDB
        const enriched = await Promise.all(hits.map(async (hit) => {
            try {
                if (hit.type === "email") {
                    const doc = await Email.findById(hit.id).select("subject from summary receivedAt");
                    return { ...hit, subject: doc?.subject, from: doc?.from, receivedAt: doc?.receivedAt };
                }
                if (hit.type === "note") {
                    const doc = await Note.findById(hit.id).select("title content tags createdAt");
                    return { ...hit, tags: doc?.tags, createdAt: doc?.createdAt };
                }
                if (hit.type === "task") {
                    const doc = await Task.findById(hit.id).select("title priority score deadline completed");
                    return { ...hit, priority: doc?.priority, score: doc?.score, deadline: doc?.deadline, completed: doc?.completed };
                }
                return hit;
            } catch {
                return hit;
            }
        }));

        res.json({ query, results: enriched });
    } catch (err) {
        console.error("Search error:", err.message);
        res.status(500).json({ error: "Semantic search failed", details: err.message });
    }
});


// Score a task without persisting it
router.post("/score-task", async (req, res) => {
    try {
        const task = req.body;
        if (!task || !task.title) return res.status(400).json({ error: "invalid task data" });
        const scored = await scoreTask(task);
        res.json(scored);
    } catch (err) {
        console.error("Score task error:", err.message);
        res.status(500).json({ error: "Failed to score task", details: err.message });
    }
});


// Summarize a block of text
router.post("/summarize", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ error: "text field is required" });
        const result = await summarizeText(text);
        res.json(result);
    } catch (err) {
        console.error("Summarize error:", err.message);
        res.status(500).json({ error: "Failed to summarize", details: err.message });
    }
});


// Extract actionable tasks from text
router.post("/extract-tasks", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ error: "text field is required" });
        const result = await extractTasks(text);
        res.json(result);
    } catch (err) {
        console.error("Extract tasks error:", err.message);
        res.status(500).json({ error: "Failed to extract tasks", details: err.message });
    }
});


// Classify urgency of a task using LLM
router.post("/classify-urgency", async (req, res) => {
    try {
        const task = req.body;
        if (!task || !task.title) return res.status(400).json({ error: "task with title is required" });
        const result = await classifyUrgency(task);
        res.json(result);
    } catch (err) {
        console.error("Classify urgency error:", err.message);
        res.status(500).json({ error: "Failed to classify urgency", details: err.message });
    }
});


// Generate a daily brief from all current tasks
router.post("/daily-brief", async (req, res) => {
    try {
        const tasks = await Task.find();
        const result = await generateDailyBrief(tasks.map(t => t.toObject()));
        res.json(result);
    } catch (err) {
        console.error("Daily brief error:", err.message);
        res.status(500).json({ error: "Failed to generate daily brief", details: err.message });
    }
});


export default router;