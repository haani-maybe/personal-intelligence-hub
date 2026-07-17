//SEPARATING DATABASE LAYER AND AI LAYER.
//thats why this routes file NO LONGER modifies/accesses DB.

//because Database Layer != AI Layer


import express from "express"
import { scoreTask, summarizeText, extractTasks, classifyUrgency, generateDailyBrief } from "../services/ai.service.js"
import { Task } from "../models/task.model.js"

const router = express.Router()


//this is our request for AI score WITHOUT altering database.
router.post("/score-task", async (req, res) => {
    try {
        const task = req.body;

        if (!task || !task.title){
            return res.status(400).json({error: "invalid task data :("})
        }
        const scored = await scoreTask(task)
        res.json(scored)
    } catch (err) {
        console.error("Score task error:", err.message);
        res.status(500).json({ error: "Failed to score task", details: err.message });
    }
})


// Summarize a block of text (email body, document, etc.)
router.post("/summarize", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "text field is required" });
        }

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

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "text field is required" });
        }

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

        if (!task || !task.title) {
            return res.status(400).json({ error: "task with title is required" });
        }

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