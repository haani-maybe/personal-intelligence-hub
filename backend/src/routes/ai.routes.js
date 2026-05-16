//SEPARATING DATABASE LAYER AND AI LAYER.
//thats why this routes file NO LONGER modifies/accesses DB.

//because Database Layer != AI Layer


import express from "express"
import {scoreTask} from "../services/ai.service.js"

const router = express.Router()


//this is our request for AI score WITHOUT altering database.
router.post("/score-task", (req, res) => {
    const task = req.body;

    if (!task || !task.title){
        return res.status(400).json({error: "invalid task data :("})
    }
    const scored = scoreTask(task)
    res.json(scored)
})
export default router;