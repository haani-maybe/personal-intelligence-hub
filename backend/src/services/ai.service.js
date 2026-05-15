export function scoreTask(task){
    let priority = "low"
    let score = 40

    if (task.title.toLowerCase().includes("review")) {
    priority = "high";
    score = 90;
    }

    if (task.title.toLowerCase().includes("urgent")) {
    priority = "high";
    score = 95;
    }

    return {
        ...task,
        priority, 
        score,
        reason: "AI scored task"
    }
}