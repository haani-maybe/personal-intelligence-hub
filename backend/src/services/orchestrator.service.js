/**
 * Orchestrator Service
 *
 * Coordinates AI processing pipelines:
 * 1. Receive raw email data from n8n
 * 2. Summarise + extract tasks with Gemini
 * 3. Generate embedding and add to FAISS index
 * 4. Persist everything to MongoDB
 */

import { getLLM } from "./llm/index.js";
import { scoreTask } from "./ai.service.js";
import { Email } from "../models/email.model.js";
import { Task } from "../models/task.model.js";
import { Activity } from "../models/activity.model.js";
import { addDocument, persistIndex } from "./faiss.service.js";
import { indexTask } from "./indexing.service.js";


/**
 * Process a single incoming email from n8n.
 *
 * Steps:
 *  1. Check for duplicates via messageId
 *  2. Store raw email
 *  3. Summarise with Gemini
 *  4. Extract tasks with Gemini, score + persist each
 *  5. Generate embedding → add to FAISS
 *  6. Mark email processed, save
 *
 * @param {object} emailData - { from, to, subject, body, messageId?, threadId?, labels? }
 * @returns {{ email, tasks, skipped }}
 */
export async function processIncomingEmail(emailData) {
    const { from, to = "", subject, body, messageId, threadId, labels } = emailData;

    if (!from || !subject || !body) {
        throw new Error("Email must have from, subject, and body.");
    }

    // 1. Dedup check
    if (messageId) {
        const existing = await Email.findOne({ messageId });
        if (existing) {
            console.log(`[Orchestrator] Skipping duplicate email: ${messageId}`);
            return { email: existing, tasks: [], skipped: true };
        }
    }

    // 2. Store raw email
    const email = await Email.create({ from, to, subject, body, messageId, threadId, labels });

    const llm = getLLM();

    // 3. Summarise
    let summary = null;
    try {
        const summarisePrompt = `Summarise the following email in 2-3 concise sentences. Focus on the key information and any action items.\n\nEmail:\nFrom: ${from}\nSubject: ${subject}\n\n${body}`;
        summary = await llm.generateText(summarisePrompt, { temperature: 0.3, maxTokens: 256 });
        email.summary = summary;
    } catch (err) {
        console.warn(`[Orchestrator] Summarise failed for "${subject}":`, err.message);
    }

    // 4. Extract tasks
    const createdTasks = [];
    try {
        const extractPrompt = `Extract all actionable tasks from this email. Return a JSON array of tasks.\n\nEach task object must have:\n- title (string, required)\n- deadline (ISO date string or null)\n- suggestedPriority ("critical"|"high"|"medium"|"low")\n- reasoning (1 sentence)\n\nEmail:\nFrom: ${from}\nSubject: ${subject}\n\n${body}\n\nReturn ONLY the JSON array, no explanation.`;
        const extracted = await llm.generateJSON(extractPrompt, { temperature: 0.2 });
        const taskList = Array.isArray(extracted) ? extracted : (extracted.tasks || []);

        for (const taskData of taskList) {
            try {
                const scored = await scoreTask({
                    title: taskData.title,
                    description: taskData.reasoning || "",
                    source: "Email",
                    category: "general",
                    deadline: taskData.deadline || null,
                    completed: false,
                    sourceEmailId: email._id,
                });
                const task = await Task.create(scored);
                indexTask(task);
                createdTasks.push(task);

                email.extractedTasks.push({
                    title: taskData.title,
                    deadline: taskData.deadline,
                    suggestedPriority: taskData.suggestedPriority,
                    reasoning: taskData.reasoning,
                    taskId: task._id,
                });
            } catch (err) {
                console.warn(`[Orchestrator] Failed to create task "${taskData.title}":`, err.message);
            }
        }
    } catch (err) {
        console.warn(`[Orchestrator] Task extraction failed for "${subject}":`, err.message);
    }

    // 5. Generate embedding and index in FAISS
    try {
        const textToEmbed = `${subject} ${body.substring(0, 500)}`;
        const embedding = await llm.generateEmbedding(textToEmbed);
        email.embedding = embedding;
        addDocument(email._id.toString(), "email", embedding, {
            title: subject,
            snippet: summary ? summary.substring(0, 120) : body.substring(0, 120),
        });
        persistIndex();
    } catch (err) {
        console.warn(`[Orchestrator] Embedding failed for "${subject}":`, err.message);
    }

    // 6. Mark processed and save
    email.processed = true;
    await email.save();

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
 * Process a batch of emails.
 */
export async function processBatchEmails(emails) {
    const results = [];
    for (const emailData of emails) {
        try {
            const result = await processIncomingEmail(emailData);
            results.push({ success: true, ...result });
        } catch (err) {
            console.error(`[Orchestrator] Failed to process "${emailData.subject}":`, err.message);
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
 * Process a directly-submitted task from n8n.
 */
export async function processIncomingTask(taskData) {
    const scored = await scoreTask({
        title: taskData.title,
        description: taskData.description || "",
        source: taskData.source || "n8n",
        category: taskData.category || "general",
        deadline: taskData.deadline || null,
        completed: false,
    });

    const task = await Task.create(scored);
    indexTask(task);

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
