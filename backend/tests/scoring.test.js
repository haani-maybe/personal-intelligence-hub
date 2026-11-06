import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreTask } from "../src/services/ai.service.js";

// completed tasks never hit the LLM, so these run without an API key

test("completed task is scored from rules only", async () => {
    const scored = await scoreTask({ title: "Ship the report", completed: true });
    assert.equal(scored.llmScore, null);
    assert.equal(typeof scored.ruleScore, "number");
    assert.equal(scored.score, scored.ruleScore);
    assert.equal(scored.reason, "Rule-based scoring");
});

test("scoreTask keeps the original task fields", async () => {
    const scored = await scoreTask({ title: "Call back", category: "work", completed: true });
    assert.equal(scored.title, "Call back");
    assert.equal(scored.category, "work");
});

test("score stays in 0-100 and priority is a known label", async () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    for (const task of [
        { title: "urgent deadline", deadline: soon, completed: true },
        { title: "someday", completed: true },
    ]) {
        const scored = await scoreTask(task);
        assert.ok(scored.score >= 0 && scored.score <= 100);
        assert.ok(["critical", "high", "medium", "low"].includes(scored.priority));
    }
});
