/**
 * n8n Routes — webhook endpoints that n8n workflows call to push data into our system.
 * 
 * All routes are protected by the n8n auth middleware (skipped in dev if no token set).
 * 
 * Flow: n8n fetches external data (email, APIs) → processes it → POSTs to these endpoints
 *       → our orchestrator handles storage, AI processing, and task creation.
 */

import express from "express";
import { validateN8nAuth, triggerEmailIngestion, triggerProcessingWorkflow } from "../services/n8n.service.js";
import { processIncomingEmail, processBatchEmails, processIncomingTask } from "../services/orchestrator.service.js";
import { Activity } from "../models/activity.model.js";

const router = express.Router();

// Protect all n8n webhook routes
router.use(validateN8nAuth);


/**
 * POST /api/n8n/ingest-email
 * n8n sends a processed email here. We store, summarize, extract tasks, and score.
 * 
 * Body: { from, to, subject, body, messageId?, threadId?, labels?, receivedAt? }
 *   or: { emails: [{ from, to, subject, body, ... }, ...] }  for batch
 */
router.post("/ingest-email", async (req, res) => {
    try {
        // Support both single email and batch
        if (req.body.emails && Array.isArray(req.body.emails)) {
            const results = await processBatchEmails(req.body.emails);
            const succeeded = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            return res.json({
                message: `Batch processed: ${succeeded} succeeded, ${failed} failed`,
                results,
            });
        }

        // Single email
        const { from, subject, body } = req.body;
        if (!from || !subject || !body) {
            return res.status(400).json({ 
                error: "Required fields: from, subject, body" 
            });
        }

        const result = await processIncomingEmail(req.body);

        if (result.skipped) {
            return res.json({ message: "Email already processed", emailId: result.email._id });
        }

        res.status(201).json({
            message: `Email processed: "${subject}"`,
            emailId: result.email._id,
            tasksCreated: result.tasks.length,
            tasks: result.tasks.map(t => ({ id: t._id, title: t.title, score: t.score, priority: t.priority })),
        });

    } catch (err) {
        console.error("n8n email ingestion error:", err.message);
        res.status(500).json({ error: "Failed to process email", details: err.message });
    }
});


/**
 * POST /api/n8n/ingest-task
 * n8n sends a pre-extracted task directly (no email processing needed).
 * 
 * Body: { title, description?, source?, category?, deadline? }
 */
router.post("/ingest-task", async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: "title is required" });
        }

        const task = await processIncomingTask(req.body);

        res.status(201).json({
            message: `Task created: "${task.title}"`,
            task,
        });

    } catch (err) {
        console.error("n8n task ingestion error:", err.message);
        res.status(500).json({ error: "Failed to ingest task", details: err.message });
    }
});


/**
 * POST /api/n8n/trigger
 * Frontend or other services call this to trigger an n8n workflow.
 * 
 * Body: { workflow: "email-ingest" | "process", data?: {} }
 */
router.post("/trigger", async (req, res) => {
    try {
        const { workflow, data } = req.body;

        await Activity.create({
            type: "n8n",
            title: `Workflow triggered: ${workflow || "default"}`,
            details: JSON.stringify(data || {}),
            status: "pending",
        });

        let result;
        switch (workflow) {
            case "email-ingest":
                result = await triggerEmailIngestion();
                break;
            case "process":
                result = await triggerProcessingWorkflow(data);
                break;
            default:
                result = await triggerProcessingWorkflow(data);
        }

        res.json({ message: "Workflow triggered", result });

    } catch (err) {
        console.error("n8n trigger error:", err.message);

        await Activity.create({
            type: "n8n",
            title: `Workflow trigger failed: ${req.body.workflow || "default"}`,
            details: err.message,
            status: "error",
        });

        res.status(502).json({ error: "Failed to trigger n8n workflow", details: err.message });
    }
});

export default router;
