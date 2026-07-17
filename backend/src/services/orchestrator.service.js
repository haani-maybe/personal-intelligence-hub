/**
 * Orchestrator Service — the central "brain" that wires together:
 *   ingestion → processing → scoring → storage → logging
 * 
 * Called by n8n inbound webhooks and internal routes.
 * Each function handles a complete end-to-end flow.
 */

import { Email } from "../models/email.model.js";
import { Task } from "../models/task.model.js";
import { Activity } from "../models/activity.model.js";
import { summarizeText, extractTasks, scoreTask } from "./ai.service.js";


/**
 * Process a raw email end-to-end:
 *   1. Store the raw email
 *   2. Summarize it with the LLM
 *   3. Extract tasks from it
 *   4. Score and create each task
 *   5. Log all activity
 * 
 * @param {object} emailData - Raw email fields (from, to, subject, body, etc.)
 * @returns {object} The processed email with created tasks
 */
export async function processIncomingEmail(emailData) {
    const { from, to, subject, body, messageId, threadId, labels, receivedAt } = emailData;

    // 1. Store raw email (or find existing by messageId to avoid duplicates)
    let email;
    if (messageId) {
        email = await Email.findOne({ messageId });
        if (email && email.processed) {
            return { email, tasks: [], skipped: true, reason: "Already processed" };
        }
    }

    if (!email) {
        email = await Email.create({
            from, to, subject, body,
            messageId, threadId, labels,
            receivedAt: receivedAt || new Date(),
            processed: false,
        });
    }

    // Log that we received the email
    await Activity.create({
        type: "email",
        title: `Ingested email: "${subject}"`,
        details: `From: ${from}`,
        relatedId: email._id,
        relatedModel: "Email",
        status: "running",
    });

    // 2. Summarize the email body
    let summary = null;
    try {
        const result = await summarizeText(`Subject: ${subject}\n\n${body}`);
        summary = result.summary;
        email.summary = summary;
    } catch (err) {
        console.warn("Email summarization failed:", err.message);
        summary = `Email from ${from}: ${subject}`;
        email.summary = summary;
    }

    // 3. Extract tasks from the email
    let extractedTasks = [];
    try {
        const result = await extractTasks(`Subject: ${subject}\n\n${body}`);
        extractedTasks = result.tasks || [];
    } catch (err) {
        console.warn("Task extraction failed:", err.message);
    }

    // 4. Score and create each extracted task
    const createdTasks = [];
    for (const taskData of extractedTasks) {
        try {
            const taskObj = {
                title: taskData.title,
                description: `Extracted from email: "${subject}" from ${from}`,
                source: "Email",
                category: "email",
                deadline: taskData.deadline || null,
                time: taskData.deadline || "No deadline",
                completed: false,
                sourceEmailId: email._id,
            };

            const scored = await scoreTask(taskObj);
            const task = await Task.create(scored);
            createdTasks.push(task);

            // Link task back to email's extractedTasks array
            email.extractedTasks.push({
                title: taskData.title,
                deadline: taskData.deadline,
                suggestedPriority: taskData.suggestedPriority,
                reasoning: taskData.reasoning,
                taskId: task._id,
            });
        } catch (err) {
            console.warn(`Failed to create task "${taskData.title}":`, err.message);
        }
    }

    // 5. Mark email as processed and save
    email.processed = true;
    await email.save();

    // Log completion
    await Activity.create({
        type: "gemini",
        title: `Processed email: "${subject}"`,
        details: `Summary generated. ${createdTasks.length} task(s) extracted.`,
        relatedId: email._id,
        relatedModel: "Email",
        status: "success",
    });

    return { email, tasks: createdTasks, skipped: false };
}


/**
 * Process a batch of emails (called when n8n sends multiple at once).
 */
export async function processBatchEmails(emails) {
    const results = [];

    for (const emailData of emails) {
        try {
            const result = await processIncomingEmail(emailData);
            results.push({ success: true, ...result });
        } catch (err) {
            console.error(`Failed to process email "${emailData.subject}":`, err.message);
            results.push({ success: false, subject: emailData.subject, error: err.message });

            await Activity.create({
                type: "system",
                title: `Failed to process email: "${emailData.subject}"`,
                details: err.message,
                status: "error",
            });
        }
    }

    return results;
}


/**
 * Process a directly-submitted task (from n8n or external sources).
 * Scores it and stores it.
 */
export async function processIncomingTask(taskData) {
    const scored = await scoreTask({
        title: taskData.title,
        description: taskData.description || "",
        source: taskData.source || "n8n",
        category: taskData.category || "general",
        deadline: taskData.deadline || null,
        time: taskData.deadline || taskData.time || "No deadline",
        completed: false,
    });

    const task = await Task.create(scored);

    await Activity.create({
        type: "n8n",
        title: `Task ingested: "${task.title}"`,
        details: `Source: ${task.source}, Score: ${task.score}`,
        relatedId: task._id,
        relatedModel: "Task",
        status: "success",
    });

    return task;
}
