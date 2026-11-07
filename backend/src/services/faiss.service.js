/**
 * faiss.service.js
 *
 * In-memory vector store with cosine similarity search.
 * Mirrors the FAISS API pattern — swap for faiss-node later if needed.
 * Vectors persist to disk as JSON so they survive restarts.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// FAISS_STORE_DIR lets tests write somewhere disposable
const STORE_DIR = process.env.FAISS_STORE_DIR || path.join(__dirname, "../../faiss_store");
const INDEX_FILE = path.join(STORE_DIR, "index.json");

// Each entry: { id, type, title, snippet, embedding: number[] }
let _index = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function ensureStoreDir() {
    if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add or update a document in the index.
 * @param {string} id   - MongoDB _id (as string)
 * @param {string} type - "email" | "note" | "task"
 * @param {number[]} embedding
 * @param {{ title: string, snippet: string }} metadata
 */
export function addDocument(id, type, embedding, metadata) {
    // Remove existing entry for same id (upsert behaviour)
    _index = _index.filter(e => e.id !== id);
    _index.push({ id, type, title: metadata.title || "", snippet: metadata.snippet || "", embedding });
}

/**
 * Remove a document from the index by id.
 */
export function removeDocument(id) {
    _index = _index.filter(e => e.id !== id);
}

/**
 * Search the index for the top-K most similar documents.
 * @param {number[]} queryEmbedding
 * @param {number}   topK
 * @param {string[]} [types]  - optional filter e.g. ["email","note"]
 * @returns {{ id, type, title, snippet, score }[]}
 */
export function search(queryEmbedding, topK = 5, types = []) {
    let candidates = _index;
    if (types && types.length > 0) {
        candidates = _index.filter(e => types.includes(e.type));
    }

    return candidates
        .map(e => ({ id: e.id, type: e.type, title: e.title, snippet: e.snippet, score: cosineSimilarity(queryEmbedding, e.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

/**
 * Persist the current index to disk.
 */
export function persistIndex() {
    ensureStoreDir();
    fs.writeFileSync(INDEX_FILE, JSON.stringify(_index), "utf8");
    console.log(`[FAISS] Persisted ${_index.length} documents to ${INDEX_FILE}`);
}

/**
 * Load the index from disk (called at startup).
 */
export function loadIndex() {
    ensureStoreDir();
    if (fs.existsSync(INDEX_FILE)) {
        try {
            _index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
            console.log(`[FAISS] Loaded ${_index.length} documents from disk.`);
        } catch (e) {
            console.warn("[FAISS] Could not parse index file, starting fresh.", e.message);
            _index = [];
        }
    } else {
        console.log("[FAISS] No existing index found — starting fresh.");
        _index = [];
    }
}

/**
 * Build the index from MongoDB data.
 * Call this at startup AFTER loadIndex() — it fills in any documents
 * that are in MongoDB but not yet in the persisted index.
 */
export async function buildFromDB() {
    const { Email } = await import("../models/email.model.js");
    const { Note } = await import("../models/note.model.js");
    const { Task } = await import("../models/task.model.js");

    const existingIds = new Set(_index.map(e => e.id));

    // Index emails with embeddings
    const emails = await Email.find({ embedding: { $exists: true, $not: { $size: 0 } } }).select("subject from embedding summary");
    for (const email of emails) {
        if (!existingIds.has(email._id.toString())) {
            addDocument(email._id.toString(), "email", email.embedding, {
                title: email.subject,
                snippet: email.summary || email.from,
            });
        }
    }

    // Index notes with embeddings
    const notes = await Note.find({ embedding: { $exists: true, $not: { $size: 0 } } }).select("title content embedding");
    for (const note of notes) {
        if (!existingIds.has(note._id.toString())) {
            addDocument(note._id.toString(), "note", note.embedding, {
                title: note.title,
                snippet: note.content.substring(0, 120),
            });
        }
    }

    // Index tasks (title used as text — embed from title+description)
    const tasks = await Task.find({ embedding: { $exists: true, $not: { $size: 0 } } }).select("title description embedding");
    for (const task of tasks) {
        if (!existingIds.has(task._id.toString())) {
            addDocument(task._id.toString(), "task", task.embedding, {
                title: task.title,
                snippet: task.description || "",
            });
        }
    }

    console.log(`[FAISS] Index now contains ${_index.length} documents.`);
    persistIndex();
}

/**
 * Return total number of indexed documents.
 */
export function indexSize() {
    return _index.length;
}
