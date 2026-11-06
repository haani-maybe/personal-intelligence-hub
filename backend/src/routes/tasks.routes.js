import express from "express"
import {Task} from "../models/task.model.js"
import {scoreTask} from "../services/ai.service.js"


const router = express.Router()

// copy every scoring field from scoreTask onto the mongoose doc
const SCORE_FIELDS = ["score", "priority", "ruleScore", "llmScore", "urgencyLabel", "reason"]
function applyScore(task, scored) {
    SCORE_FIELDS.forEach(f => { task[f] = scored[f] })
}

//gets stored tasks, scores are saved on create/edit so no LLM calls happen here
router.get("/", async (req, res) => {
    try {
        const tasks = await Task.find().sort({ completed: 1, score: -1 });
        res.json(tasks);
    } catch (err) {
        console.error("Fetch tasks error:", err.message);
        res.status(500).json({ error: "Failed to fetch tasks", details: err.message });
    }
});

//RESCORE ALL OPEN TASKS (used by the n8n process workflow, deadlines drift so scores go stale)
//done one at a time so we dont hammer the LLM rate limit
router.post("/rescore", async (req, res) => {
    try {
        const tasks = await Task.find({ completed: false });
        for (const task of tasks) {
            applyScore(task, await scoreTask(task.toObject()));
            await task.save();
        }
        res.json({ message: `Rescored ${tasks.length} tasks`, count: tasks.length });
    } catch (err) {
        console.error("Rescore error:", err.message);
        res.status(500).json({ error: "Failed to rescore tasks", details: err.message });
    }
});

//TOGGLE TASK COMPLETION
//basically a PATCH (req to modify existing data, turns completed to true or false (toggle))

router.patch("/:id", async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)

        if(!task) {
            return res.status(404).json({error: "Not found"})
        }

        // body with editable fields = inline edit from detail panel, empty body = toggle
        const editable = ["title", "description", "deadline", "category"]
        const edits = editable.filter(f => req.body && req.body[f] !== undefined)

        if (edits.length > 0) {
            if (req.body.title !== undefined && !String(req.body.title).trim()) {
                return res.status(400).json({ error: "title cannot be empty" })
            }
            edits.forEach(f => {
                task[f] = f === "deadline" ? (req.body[f] || null) : req.body[f]
            })
        } else {
            task.completed = !task.completed
        }
        applyScore(task, await scoreTask(task.toObject()))

        await task.save()

        res.json(task); //updated task sent back as json to frontend (http response)
    } catch (err) {
        console.error("Toggle task error:", err.message);
        res.status(500).json({ error: "Failed to toggle task", details: err.message });
    }
});

//DELETE TASK
router.delete("/:id", async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id)
        if (!task) return res.status(404).json({ error: "Not found" })
        res.json({ message: "Task deleted", id: req.params.id })
    } catch (err) {
        console.error("Delete task error:", err.message);
        res.status(500).json({ error: "Failed to delete task", details: err.message });
    }
})

router.post("/", async(req, res) => {
    try {
        const scoredTask = await scoreTask(req.body)
        const newTask = await Task.create(scoredTask)

        res.status(201).json(newTask);
    } catch (err) {
        console.error("Create task error:", err.message);
        res.status(500).json({ error: "Failed to create task", details: err.message });
    }
})

export default router;
