import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, request, waitFor } from "./helpers/app.js";
import { search } from "../src/services/faiss.service.js";

let app;
before(async () => { app = await startTestApp(); });
after(async () => { await app.stop(); });
beforeEach(async () => { await app.clear(); });

const create = (body = { title: "Write report" }) => request(`${app.url}/tasks`, "POST", body);
const indexed = (id) => search(Array(16).fill(1), 100, ["task"]).some(r => r.id === id);

test("POST /tasks stores the full score breakdown", async () => {
    const { status, body } = await create();
    assert.equal(status, 201);
    assert.equal(body.llmScore, 80);          // fake llm says "high"
    assert.equal(body.priority, "high");
    assert.equal(typeof body.ruleScore, "number");
    assert.equal(body.reason, "fake urgency");
});

test("GET /tasks returns stored tasks, open ones first, without embeddings", async () => {
    await create({ title: "done one", completed: true });
    await create({ title: "open one" });
    const { body } = await request(`${app.url}/tasks`);
    assert.equal(body.length, 2);
    assert.equal(body[0].title, "open one");
    assert.equal(body[0].embedding, undefined);
});

test("PATCH with no body toggles completion", async () => {
    const { body: task } = await create();
    const { body: toggled } = await request(`${app.url}/tasks/${task._id}`, "PATCH");
    assert.equal(toggled.completed, true);
    const { body: back } = await request(`${app.url}/tasks/${task._id}`, "PATCH");
    assert.equal(back.completed, false);
});

test("PATCH with fields edits the task and saves the new score breakdown", async () => {
    const { body: task } = await create();
    const { status, body } = await request(`${app.url}/tasks/${task._id}`, "PATCH", {
        title: "Write the Q3 report",
        category: "work",
        deadline: "2030-01-01",
    });
    assert.equal(status, 200);
    assert.equal(body.title, "Write the Q3 report");
    assert.equal(body.category, "work");
    assert.equal(body.completed, false);        // an edit must not toggle
    const { body: list } = await request(`${app.url}/tasks`);
    assert.equal(list[0].llmScore, 80);         // persisted, not just returned
});

test("PATCH rejects an empty title", async () => {
    const { body: task } = await create();
    const { status } = await request(`${app.url}/tasks/${task._id}`, "PATCH", { title: "  " });
    assert.equal(status, 400);
});

test("new tasks are embedded + indexed in the background, and DELETE removes them", async () => {
    const { body: task } = await create({ title: "unique zebra task" });
    await waitFor(() => indexed(task._id));

    const { status } = await request(`${app.url}/tasks/${task._id}`, "DELETE");
    assert.equal(status, 200);
    assert.equal(indexed(task._id), false);
    assert.equal((await request(`${app.url}/tasks/${task._id}`, "DELETE")).status, 404);
});

test("POST /tasks/rescore only touches open tasks", async () => {
    await create({ title: "open" });
    await create({ title: "done", completed: true });
    const { body } = await request(`${app.url}/tasks/rescore`, "POST");
    assert.equal(body.count, 1);
});
