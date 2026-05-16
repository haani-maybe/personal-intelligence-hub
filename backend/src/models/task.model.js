import mongoose from "mongoose"

const taskSchema = new mongoose.Schema({
    title: String,
    source: String,
    priority: String,
    score: Number,
    time: String,
    completed:{
        type:Boolean,
        default: false
    }
})

export const Task = mongoose.model("Task", taskSchema)