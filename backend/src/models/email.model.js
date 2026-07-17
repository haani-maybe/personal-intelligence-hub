import mongoose from "mongoose"

const emailSchema = new mongoose.Schema({
    // Core email fields
    from: { type: String, required: true },
    to: { type: String, default: "" },
    subject: { type: String, required: true },
    body: { type: String, required: true },

    // AI-processed fields
    summary: { type: String, default: null },              // Gemini-generated summary
    extractedTasks: [{                                      // tasks extracted by LLM
        title: String,
        deadline: String,
        suggestedPriority: String,
        reasoning: String,
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },  // link to created Task
    }],

    // For FAISS semantic search (populated later)
    embedding: { type: [Number], default: [] },

    // Processing status
    processed: { type: Boolean, default: false },           // has it been summarized + tasks extracted?
    receivedAt: { type: Date, default: Date.now },

    // Source metadata
    messageId: { type: String, default: null },             // original email Message-ID (dedup)
    threadId: { type: String, default: null },
    labels: [String],                                        // inbox, important, etc.
}, {
    timestamps: true,
})

// Prevent duplicate email ingestion
emailSchema.index({ messageId: 1 }, { unique: true, sparse: true })
emailSchema.index({ processed: 1 })
emailSchema.index({ receivedAt: -1 })

export const Email = mongoose.model("Email", emailSchema)
