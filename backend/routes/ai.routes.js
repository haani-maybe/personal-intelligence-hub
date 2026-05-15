import express from "express"
import { tasks } from "../data/tasks.store.js";

const router = express.Router()

//front and backend send title, source and time 
//whereas AI sends priority, score and reasoning
router.post("/score-task", async (req, res) => {
    const {id} = req.body;

    const task = tasks.find(t=> t.id == id);

    if(!task){
        return res.status(404).json({error:"Task not found"});
    }


    //PLACEHOLDER AI LOGIC (MOCK !!!)
    let priority = "low"
    let score = 40
    if(task.title.toLowerCase().includes("review")){
        priority = "high"
        score = 90
    }
    task.priority = priority;
    task.score = score
    res.json(task)
})

export default router;