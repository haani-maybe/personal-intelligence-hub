import express from "express"
import {Task} from "../models/task.model.js"
import {scoreTask} from "../services/ai.service.js"


const router = express.Router()

//gets tasks above, turn to json, so frontend can utilize
router.get("/", async (req, res) => {
    try {
        //below gives u all task documents in collection.
        const tasks = await Task.find();

        //auto scores everytime it fetches tasks from data
        const scoredTasks = await Promise.all(
            tasks.map(task =>
                //using toObject to turn mongoose document to js object
                scoreTask(task.toObject())
            )
        );
        res.json(scoredTasks);
    } catch (err) {
        console.error("Fetch tasks error:", err.message);
        res.status(500).json({ error: "Failed to fetch tasks", details: err.message });
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
        
        task.completed = !task.completed
        const scored = await scoreTask(task.toObject());
        task.priority = scored.priority
        task.score = scored.score

        await task.save()

        res.json(task); //updated task sent back as json to frontend (http response)
    } catch (err) {
        console.error("Toggle task error:", err.message);
        res.status(500).json({ error: "Failed to toggle task", details: err.message });
    }
});

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
