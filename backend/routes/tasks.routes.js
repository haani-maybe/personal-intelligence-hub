import express from "express"

const router = express.Router()

// temporary in-memory data (we'll replace with DB later)
let tasks = [
  {
    id: 1,
    title: "Review Q3 Marketing Strategy",
    source: "email",
    priority: "high",
    score: 98,
    time: "2 hours left",
    completed: false
  },
  {
    id: 2,
    title: "Approve Backend Architecture PR",
    source: "github",
    priority: "high",
    score: 94,
    time: "3 hours left",
    completed: false
  }
];

//gets tasks above, turn to json, so frontend can utilize
router.get("/", (req, res) => {
    res.json(tasks);
});

//TOGGLE TASK COMPLETION
//basically a PATCH (req to modify existing data, turns completed to true or false (toggle))

router.patch("/:id", (req, res) => {
    const id = parseInt(req.params.id);
    
    tasks = tasks.map(task => 
        task.id == id ? {...task, completed: !task.completed} : task
    );

    const updatedTask = tasks.find(t => t.id == id);
    res.json(updatedTask); //updated task sent back as json to frontend (http response)
});

export default router;
