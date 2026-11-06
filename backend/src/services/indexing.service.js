/**
 * Indexing helpers — keep tasks embedded + searchable.
 * Both functions swallow errors (just warn) so a failed embedding never breaks a task request.
 */

import { Task } from "../models/task.model.js";
import { getLLM } from "./llm/index.js";
import { addDocument, removeDocument, persistIndex } from "./faiss.service.js";

export async function indexTask(task) {
    try {
        const id = task._id.toString();
        const description = task.description || "";
        const embedding = await getLLM().generateEmbedding(`${task.title} ${description}`);
        await Task.updateOne({ _id: task._id }, { embedding });
        addDocument(id, "task", embedding, {
            title: task.title,
            snippet: description.substring(0, 120),
        });
        persistIndex();
    } catch (err) {
        console.warn("[Indexing] Task embedding failed:", err.message);
    }
}

export function unindexTask(id) {
    removeDocument(id.toString());
    persistIndex();
}
