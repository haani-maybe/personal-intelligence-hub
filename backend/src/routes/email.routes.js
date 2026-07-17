/**
 * Email Routes — CRUD endpoints for the frontend to read ingested emails.
 */

import express from "express";
import { Email } from "../models/email.model.js";

const router = express.Router();


// GET /api/emails — list all emails (newest first)
router.get("/", async (req, res) => {
    try {
        const { processed, limit = 50 } = req.query;
        const filter = {};
        if (processed !== undefined) {
            filter.processed = processed === "true";
        }

        const emails = await Email.find(filter)
            .sort({ receivedAt: -1 })
            .limit(Number(limit))
            .select("-body -embedding");  // omit heavy fields from list view

        res.json(emails);
    } catch (err) {
        console.error("Fetch emails error:", err.message);
        res.status(500).json({ error: "Failed to fetch emails", details: err.message });
    }
});


// GET /api/emails/:id — get a single email with full body and summary
router.get("/:id", async (req, res) => {
    try {
        const email = await Email.findById(req.params.id).select("-embedding");
        if (!email) {
            return res.status(404).json({ error: "Email not found" });
        }
        res.json(email);
    } catch (err) {
        console.error("Fetch email error:", err.message);
        res.status(500).json({ error: "Failed to fetch email", details: err.message });
    }
});


// DELETE /api/emails/:id — delete an email
router.delete("/:id", async (req, res) => {
    try {
        const email = await Email.findByIdAndDelete(req.params.id);
        if (!email) {
            return res.status(404).json({ error: "Email not found" });
        }
        res.json({ message: "Email deleted", id: req.params.id });
    } catch (err) {
        console.error("Delete email error:", err.message);
        res.status(500).json({ error: "Failed to delete email", details: err.message });
    }
});

export default router;
