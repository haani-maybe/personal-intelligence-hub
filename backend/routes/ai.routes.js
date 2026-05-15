import express from "express"

const router = express.Router()

//front and backend send title, source and time 
//whereas AI sends priority, score and reasoning
router.post("/score-task", async (req, res) => {
    const {title, source, time} = req.body;

    //PLACEHOLDER AI LOGIC (MOCK !!!)
    let priority = "low"
    let score = 40
    if(title.toLowerCase().includes("review")){
        priority = "high"
        score = 90
    }
    res.json({
        title,
        source, 
        time, 
        priority,
        score,
        reason: "mock AI prioritization (placeholder logic in place of AI)"
    })
})

export default router;