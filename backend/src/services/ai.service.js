import { getLLM } from "./llm/index.js";

// ============================================================
// PROMPTS — all LLM prompts are defined here for easy tuning
// ============================================================

const SYSTEM_PROMPT = `You are an AI assistant that is part of a personal productivity system. 
You help with task management, email processing, and prioritization. 
Always respond precisely and concisely.`;

const URGENCY_PROMPT = `Analyze the following task and classify its urgency.

Task:
- Title: {title}
- Description: {description}
- Source: {source}
- Deadline: {deadline}
- Created: {createdAt}

Respond in JSON with this exact structure:
{
  "urgencyLabel": "critical" | "high" | "medium" | "low",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why"
}`;

const SUMMARIZE_PROMPT = `Summarize the following text into 2-3 concise sentences. 
Capture the key information, action items, and any deadlines mentioned.

Text:
{text}`;

const EXTRACT_TASKS_PROMPT = `Extract all actionable tasks from the following text. 
For each task, identify a clear title, any deadline mentioned, and the priority based on context.

Text:
{text}

Respond in JSON with this exact structure:
{
  "tasks": [
    {
      "title": "task description",
      "deadline": "YYYY-MM-DD or null if not mentioned",
      "suggestedPriority": "high" | "medium" | "low",
      "reasoning": "why this priority"
    }
  ]
}`;

const DAILY_BRIEF_PROMPT = `Generate a concise daily briefing for a productivity dashboard.

Today's Date: {date}

Tasks Summary:
- Total tasks: {totalTasks}
- Completed: {completedTasks}
- High priority pending: {highPriorityTasks}

Task Details:
{taskList}

Write a brief, actionable daily summary (3-5 sentences) that:
1. Highlights the most important tasks to focus on
2. Notes any urgent deadlines
3. Gives an encouraging productivity insight`;

// ============================================================
// RULE-BASED SCORING — the heuristics layer
// ============================================================

const KEYWORD_SCORES = {
    critical: { keywords: ["urgent", "asap", "emergency", "critical", "immediately", "breaking"], score: 95 },
    high:     { keywords: ["review", "important", "deadline", "meeting", "client", "deploy", "fix", "bug"], score: 80 },
    medium:   { keywords: ["update", "follow up", "check", "prepare", "schedule", "plan"], score: 60 },
};

// Source weight — certain sources are inherently more urgent
const SOURCE_WEIGHTS = {
    "Email":     1.15,     // emails often carry external deadlines
    "n8n":       1.10,     // automated pipelines flagged something
    "Calendar":  1.10,     // calendar-linked = time-bound
    "Telegram":  1.05,
    "Manual":    1.00,
};

function computeRuleScore(task) {
    let score = 40; // base score
    let matchedCategory = null;
    const titleLower = (task.title || "").toLowerCase();
    const descLower = (task.description || "").toLowerCase();
    const combined = `${titleLower} ${descLower}`;

    // Keyword matching
    for (const [category, config] of Object.entries(KEYWORD_SCORES)) {
        for (const keyword of config.keywords) {
            if (combined.includes(keyword)) {
                if (config.score > score) {
                    score = config.score;
                    matchedCategory = category;
                }
            }
        }
    }

    // Deadline proximity boost
    if (task.deadline) {
        const now = new Date();
        const deadline = new Date(task.deadline);
        const hoursUntilDue = (deadline - now) / (1000 * 60 * 60);

        if (hoursUntilDue < 0) {
            // Overdue — maximum urgency
            score = Math.max(score, 98);
            matchedCategory = "critical";
        } else if (hoursUntilDue < 6) {
            score = Math.max(score, 92);
            matchedCategory = matchedCategory || "critical";
        } else if (hoursUntilDue < 24) {
            score = Math.max(score, 82);
            matchedCategory = matchedCategory || "high";
        } else if (hoursUntilDue < 72) {
            score = Math.max(score, 65);
            matchedCategory = matchedCategory || "medium";
        }
    }

    // Task age decay — older unfinished tasks drift upward in urgency
    if (task.createdAt && !task.completed) {
        const ageHours = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours > 72) {
            score = Math.min(score + 10, 98);
        } else if (ageHours > 24) {
            score = Math.min(score + 5, 98);
        }
    }

    // Source weight multiplier
    const sourceWeight = SOURCE_WEIGHTS[task.source] || 1.0;
    score = Math.min(Math.round(score * sourceWeight), 100);

    // Completed tasks get score zeroed
    if (task.completed) {
        score = 0;
    }

    const priority = matchedCategory || (score >= 80 ? "high" : score >= 55 ? "medium" : "low");

    return { ruleScore: score, rulePriority: priority };
}

// ============================================================
// TEMPLATE HELPER
// ============================================================

function fillTemplate(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replaceAll(`{${key}}`, value ?? "N/A");
    }
    return result;
}

// ============================================================
// PUBLIC API — these are what routes call
// ============================================================

/**
 * Hybrid task scorer — combines rule-based heuristics with LLM urgency classification.
 * Falls back to rule-only if the LLM call fails.
 */
export async function scoreTask(task) {
    const { ruleScore, rulePriority } = computeRuleScore(task);

    let llmScore = null;
    let llmLabel = null;
    let reasoning = "Rule-based scoring";

    // Only call LLM if the task is non-trivial and not completed
    if (!task.completed && ruleScore > 0) {
        try {
            const llm = getLLM();
            const prompt = fillTemplate(URGENCY_PROMPT, {
                title: task.title || "",
                description: task.description || "",
                source: task.source || "Unknown",
                deadline: task.deadline || "None",
                createdAt: task.createdAt || "Unknown",
            });

            const result = await llm.generateJSON(prompt, {
                systemPrompt: SYSTEM_PROMPT,
                temperature: 0.3,
                maxTokens: 256,
            });

            // Map LLM urgency label to a numeric score
            const labelScores = { critical: 95, high: 80, medium: 60, low: 35 };
            llmLabel = result.urgencyLabel || "medium";
            llmScore = labelScores[llmLabel] ?? 60;
            reasoning = result.reasoning || "LLM classification";

        } catch (err) {
            // LLM failed — fall back to rule-only (don't crash the request)
            console.warn("LLM scoring failed, using rule-based only:", err.message);
            reasoning = `Rule-based scoring (LLM unavailable: ${err.message})`;
        }
    }

    // Combine scores: 40% rule-based, 60% LLM (if available)
    const RULE_WEIGHT = 0.4;
    const LLM_WEIGHT = 0.6;
    const finalScore = llmScore !== null
        ? Math.round(RULE_WEIGHT * ruleScore + LLM_WEIGHT * llmScore)
        : ruleScore;

    // Determine final priority from the combined score
    const finalPriority = llmLabel || rulePriority;

    return {
        ...task,
        score: finalScore,
        priority: finalPriority,
        urgencyLabel: llmLabel || rulePriority,
        ruleScore,
        llmScore,
        reason: reasoning,
    };
}

/**
 * Summarize a block of text (email, document, etc.)
 */
export async function summarizeText(text) {
    const llm = getLLM();
    const prompt = fillTemplate(SUMMARIZE_PROMPT, { text });

    const summary = await llm.generateText(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.5,
        maxTokens: 512,
    });

    return { summary: summary.trim() };
}

/**
 * Extract actionable tasks from a block of text.
 */
export async function extractTasks(text) {
    const llm = getLLM();
    const prompt = fillTemplate(EXTRACT_TASKS_PROMPT, { text });

    const result = await llm.generateJSON(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.4,
        maxTokens: 1024,
    });

    return result;
}

/**
 * Classify the urgency of a single task using the LLM.
 */
export async function classifyUrgency(task) {
    const llm = getLLM();
    const prompt = fillTemplate(URGENCY_PROMPT, {
        title: task.title || "",
        description: task.description || "",
        source: task.source || "Unknown",
        deadline: task.deadline || "None",
        createdAt: task.createdAt || "Unknown",
    });

    const result = await llm.generateJSON(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 256,
    });

    return result;
}

/**
 * Generate a daily brief from task data.
 */
export async function generateDailyBrief(tasks) {
    const llm = getLLM();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const highPriorityTasks = tasks.filter(t => !t.completed && t.priority === "high").length;
    const taskList = tasks
        .filter(t => !t.completed)
        .slice(0, 10) // top 10
        .map(t => `- [${t.priority?.toUpperCase() || "?"}] ${t.title} (Score: ${t.score || "?"})`)
        .join("\n");

    const prompt = fillTemplate(DAILY_BRIEF_PROMPT, {
        date: new Date().toISOString().split("T")[0],
        totalTasks: String(totalTasks),
        completedTasks: String(completedTasks),
        highPriorityTasks: String(highPriorityTasks),
        taskList: taskList || "No pending tasks.",
    });

    const brief = await llm.generateText(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 512,
    });

    return {
        date: new Date().toISOString().split("T")[0],
        brief: brief.trim(),
        stats: { totalTasks, completedTasks, highPriorityTasks },
    };
}