import express from "express"

const router = express.Router()
import {tasks} from "../data/tasks.store.js"

import {scoreTask} from "../services/ai.service.js"

//gets tasks above, turn to json, so frontend can utilize
router.get("/", (req, res) => {
    //auto scores everytime it fetches tasks from data
    const scoredTasks = tasks.map(scoreTask)
    res.json(scoredTasks);
});

//TOGGLE TASK COMPLETION
//basically a PATCH (req to modify existing data, turns completed to true or false (toggle))

router.patch("/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t=>t.id == id);

    if(!task) return res.status(404).json({error: "Not found"})
    
    task.completed = !task.completed

    //add in update by scoring task again
    //because a completed task obv has 0 priority
    const scored = scoreTask(task); 

    res.json(scored); //updated task sent back as json to frontend (http response)
});

export default router;
