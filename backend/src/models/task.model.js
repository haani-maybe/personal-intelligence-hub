import mongoose from "mongoose"

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    source: { type: String, default: "Manual" },        // Manual, Email, n8n, Telegram, Calendar
    category: { type: String, default: "general" },      // general, work, personal, meeting, etc.
    
    // Deadlines
    deadline: { type: Date, default: null },
    time: String,                                         // kept for backward compat with frontend

    // Scoring — hybrid model
    priority: { type: String, default: "low" },           // critical, high, medium, low
    score: { type: Number, default: 40 },                 // final combined score (0-100)
    ruleScore: { type: Number, default: null },            // heuristics-only score
    llmScore: { type: Number, default: null },             // LLM-only score
    urgencyLabel: { type: String, default: null },         // LLM classification label
    reason: { type: String, default: "" },                 // scoring explanation

    // Status
    completed: { type: Boolean, default: false },

    // Provenance — what created this task
    sourceEmailId: { type: mongoose.Schema.Types.ObjectId, ref: "Email", default: null },
}, {
    timestamps: true,  // adds createdAt, updatedAt automatically
})

// Index for sorting by score (most common query pattern)
taskSchema.index({ completed: 1, score: -1 })

export const Task = mongoose.model("Task", taskSchema)