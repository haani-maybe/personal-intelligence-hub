import mongoose from "mongoose"

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    source: { type: String, default: "Manual" },            // Manual, Email, n8n, Telegram

    // For FAISS semantic search (populated later)
    embedding: { type: [Number], default: [] },

    // Organization
    tags: [String],
}, {
    timestamps: true,
})

noteSchema.index({ tags: 1 })

export const Note = mongoose.model("Note", noteSchema)
