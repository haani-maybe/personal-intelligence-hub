/**
 * Activity Routes — endpoints for the dashboard activity feed.
 */

import express from "express";
import { Activity } from "../models/activity.model.js";

const router = express.Router();


// GET /api/activity — get recent activity (for dashboard feed)
router.get("/", async (req, res) => {
    try {
        const { type, limit = 20 } = req.query;
        const filter = {};
        if (type) {
            filter.type = type;
        }

        const activities = await Activity.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.json(activities);
    } catch (err) {
        console.error("Fetch activity error:", err.message);
        res.status(500).json({ error: "Failed to fetch activity", details: err.message });
    }
});


// GET /api/activity/stats — aggregated stats for the dashboard
router.get("/stats", async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalToday, byType] = await Promise.all([
            Activity.countDocuments({ createdAt: { $gte: today } }),
            Activity.aggregate([
                { $match: { createdAt: { $gte: today } } },
                { $group: { _id: "$type", count: { $sum: 1 } } },
            ]),
        ]);

        const typeStats = {};
        for (const item of byType) {
            typeStats[item._id] = item.count;
        }

        res.json({
            totalToday,
            byType: typeStats,
        });
    } catch (err) {
        console.error("Fetch activity stats error:", err.message);
        res.status(500).json({ error: "Failed to fetch stats", details: err.message });
    }
});

export default router;
