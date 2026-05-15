import express from "express"
import cors from "cors"


import taskRoutes from "./routes/tasks.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();

app.use(cors())
app.use(express.json())

app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes)

app.get("/", (req, res) => {
    res.json({message: "backend running"});
});

const PORT = 5000

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});