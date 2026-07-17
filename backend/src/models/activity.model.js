import mongoose from "mongoose"

const activitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ["n8n", "gemini", "telegram", "system", "email", "task"],
    },
    title: { type: String, required: true },
    details: { type: String, default: "" },

    // Optional references to related documents
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedModel: { type: String, default: null },           // "Task", "Email", etc.

    // Status for workflow runs
    status: {
        type: String,
        enum: ["success", "error", "pending", "running"],
        default: "success",
    },
}, {
    timestamps: true,
})

// For querying recent activity (dashboard feed)
activitySchema.index({ createdAt: -1 })
activitySchema.index({ type: 1, createdAt: -1 })

export const Activity = mongoose.model("Activity", activitySchema)
