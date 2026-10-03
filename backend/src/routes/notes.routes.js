/**
 * Notes Routes — CRUD for user notes.
 * Notes are embedded and indexed in FAISS for semantic search.
 */

import express from "express";
import { Note } from "../models/note.model.js";
import { getLLM } from "../services/llm/index.js";
import { addDocument, removeDocument, persistIndex } from "../services/faiss.service.js";
import { Activity } from "../models/activity.model.js";

const router = express.Router();


// GET /api/notes — list all notes, optional ?tag= filter
router.get("/", async (req, res) => {
    try {
        const { tag, limit = 100 } = req.query;
        const filter = tag ? { tags: tag } : {};
        const notes = await Note.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .select("-embedding");   // omit heavy field from list view
        res.json(notes);
    } catch (err) {
        console.error("Fetch notes error:", err.message);
        res.status(500).json({ error: "Failed to fetch notes", details: err.message });
    }
});


// GET /api/notes/:id — single note
router.get("/:id", async (req, res) => {
    try {
        const note = await Note.findById(req.params.id).select("-embedding");
        if (!note) return res.status(404).json({ error: "Note not found" });
        res.json(note);
    } catch (err) {
        console.error("Fetch note error:", err.message);
        res.status(500).json({ error: "Failed to fetch note", details: err.message });
    }
});


// POST /api/notes — create a note, auto-embed
router.post("/", async (req, res) => {
    try {
        const { title, content, tags = [], source = "Manual" } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "title and content are required" });
        }

        const note = await Note.create({ title, content, tags, source });

        // Generate embedding and index
        try {
            const embedding = await getLLM().generateEmbedding(`${title} ${content}`);
            note.embedding = embedding;
            await note.save();
            addDocument(note._id.toString(), "note", embedding, {
                title,
                snippet: content.substring(0, 120),
            });
            persistIndex();
        } catch (embErr) {
            console.warn("[Notes] Embedding failed:", embErr.message);
        }

        await Activity.create({
            type: "system",
            title: `Note created: "${title}"`,
            status: "success",
        });

        res.status(201).json({ ...note.toObject(), embedding: undefined });
    } catch (err) {
        console.error("Create note error:", err.message);
        res.status(500).json({ error: "Failed to create note", details: err.message });
    }
});


// PATCH /api/notes/:id — update title, content, or tags
router.patch("/:id", async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ error: "Note not found" });

        if (title !== undefined) note.title = title;
        if (content !== undefined) note.content = content;
        if (tags !== undefined) note.tags = tags;

        // Re-embed if content changed
        if (content !== undefined || title !== undefined) {
            try {
                const embedding = await getLLM().generateEmbedding(`${note.title} ${note.content}`);
                note.embedding = embedding;
                addDocument(note._id.toString(), "note", embedding, {
                    title: note.title,
                    snippet: note.content.substring(0, 120),
                });
                persistIndex();
            } catch (embErr) {
                console.warn("[Notes] Re-embedding failed:", embErr.message);
            }
        }

        await note.save();
        res.json({ ...note.toObject(), embedding: undefined });
    } catch (err) {
        console.error("Update note error:", err.message);
        res.status(500).json({ error: "Failed to update note", details: err.message });
    }
});


// DELETE /api/notes/:id
router.delete("/:id", async (req, res) => {
    try {
        const note = await Note.findByIdAndDelete(req.params.id);
        if (!note) return res.status(404).json({ error: "Note not found" });
        removeDocument(req.params.id);
        persistIndex();
        res.json({ message: "Note deleted", id: req.params.id });
    } catch (err) {
        console.error("Delete note error:", err.message);
        res.status(500).json({ error: "Failed to delete note", details: err.message });
    }
});


export default router;
