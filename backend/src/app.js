import dotenv from "dotenv";
dotenv.config();

// DB connection
import { connectDB } from "./config/db.js";
connectDB();

import express from "express";
import cors from "cors";

// Route imports
import taskRoutes from "./routes/tasks.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import n8nRoutes from "./routes/n8n.routes.js";
import emailRoutes from "./routes/email.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import noteRoutes from "./routes/notes.routes.js";

// FAISS — load persisted index then sync from DB
import { loadIndex, buildFromDB } from "./services/faiss.service.js";
loadIndex();
setTimeout(() => buildFromDB().catch(err => console.warn("[FAISS] buildFromDB error:", err.message)), 3000);

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));  // emails can be large

// API routes
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/n8n", n8nRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/notes", noteRoutes);

app.get("/", (req, res) => {
    res.json({ message: "AI Personal Intelligence Hub — backend running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});