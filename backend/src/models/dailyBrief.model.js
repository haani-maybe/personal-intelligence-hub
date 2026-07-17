import mongoose from "mongoose"

const dailyBriefSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true },    // YYYY-MM-DD — one brief per day
    brief: { type: String, required: true },                  // the generated text
    stats: {
        totalTasks: Number,
        completedTasks: Number,
        highPriorityTasks: Number,
    },
    sentViaTelegram: { type: Boolean, default: false },
}, {
    timestamps: true,
})

export const DailyBrief = mongoose.model("DailyBrief", dailyBriefSchema)
