import express from "express"
import {Task} from "../models/task.model.js"
import {scoreTask} from "../services/ai.service.js"


const router = express.Router()

//gets tasks above, turn to json, so frontend can utilize
router.get("/", async (req, res) => {

    //below gives u all task documents in collection.
    const tasks = await Task.find();

    //auto scores everytime it fetches tasks from data
    const scoredTasks = tasks.map(task => 
        //using toObject to turn mongoose document to js object
        scoreTask(task.toObject())
    )
    res.json(scoredTasks);
});

//TOGGLE TASK COMPLETION
//basically a PATCH (req to modify existing data, turns completed to true or false (toggle))

router.patch("/:id", async (req, res) => {
    const task = await Task.findById(req.params.id)

    if(!task) {
        return res.status(404).json({error: "Not found"})
    }
    
    task.completed = !task.completed
    const scored = scoreTask(task.toObject());
    task.priority = scored.priority
    task.score = scored.score

    await task.save()

    res.json(task); //updated task sent back as json to frontend (http response)
});

router.post("/", async(req, res) => {
    const scoredTask = scoreTask(req.body)
    const newTask = await Task.create(scoredTask)

    res.status(201).json(newTask);
})

export default router;
