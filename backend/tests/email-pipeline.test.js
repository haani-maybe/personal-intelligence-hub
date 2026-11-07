import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, request, waitFor } from "./helpers/app.js";

let app;
before(async () => { app = await startTestApp(); });
after(async () => { await app.stop(); });
beforeEach(async () => { await app.clear(); });

const email = { from: "boss@work.com", subject: "Quarterly report", body: "Please send the report by Friday.", messageId: "m-1" };
const ingest = (body) => request(`${app.url}/n8n/ingest-email`, "POST", body);

test("ingesting an email summarises it, extracts + scores tasks and marks it processed", async () => {
    const { status, body } = await ingest(email);
    assert.equal(status, 201);
    assert.equal(body.tasksCreated, 1);
    assert.equal(body.tasks[0].title, "Send the report");

    const { body: saved } = await request(`${app.url}/emails/${body.emailId}`);
    assert.equal(saved.processed, true);
    assert.equal(saved.summary, "Fake summary.");
    assert.equal(saved.extractedTasks[0].taskId, body.tasks[0].id);

    const { body: tasks } = await request(`${app.url}/tasks`);
    assert.equal(tasks.length, 1);
    assert.equal(String(tasks[0].sourceEmailId), body.emailId);
});

test("the same messageId is not processed twice", async () => {
    await ingest(email);
    const { body } = await ingest(email);
    assert.equal(body.message, "Email already processed");
    assert.equal((await request(`${app.url}/tasks`)).body.length, 1);
});

test("missing required fields returns 400", async () => {
    assert.equal((await ingest({ from: "a@b.com" })).status, 400);
});

test("batch ingest reports successes and failures separately", async () => {
    const { body } = await ingest({
        emails: [email, { from: "x@y.com", subject: "bad, no body" }],
    });
    assert.equal(body.results.filter(r => r.success).length, 1);
    assert.equal(body.results.filter(r => !r.success).length, 1);
});

test("an ingested email is searchable", async () => {
    const { body } = await ingest(email);
    const found = await waitFor(async () => {
        const res = await request(`${app.url}/ai/search`, "POST", {
            query: "Quarterly report Please send the report by Friday.",
            types: ["email"],
        });
        return res.body.results.find(r => r.id === body.emailId);
    });
    assert.equal(found.type, "email");
});

test("ingest-task creates a scored task", async () => {
    const { status, body } = await request(`${app.url}/n8n/ingest-task`, "POST", { title: "Pay invoice" });
    assert.equal(status, 201);
    assert.equal(body.task.title, "Pay invoice");
    assert.equal(typeof body.task.score, "number");
});
