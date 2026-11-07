import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestApp, request, waitFor } from "./helpers/app.js";

let app;
before(async () => { app = await startTestApp(); });
after(async () => { await app.stop(); });
beforeEach(async () => { await app.clear(); });

const create = (body) => request(`${app.url}/notes`, "POST", body);

test("POST /notes requires title and content", async () => {
    assert.equal((await create({ title: "only title" })).status, 400);
    assert.equal((await create({ content: "only content" })).status, 400);
});

test("notes list newest first, without embeddings, and filter by tag", async () => {
    await create({ title: "first", content: "a", tags: ["work"] });
    await create({ title: "second", content: "b", tags: ["ideas"] });

    const { body: all } = await request(`${app.url}/notes`);
    assert.deepEqual(all.map(n => n.title), ["second", "first"]);
    assert.equal(all[0].embedding, undefined);

    const { body: work } = await request(`${app.url}/notes?tag=work`);
    assert.deepEqual(work.map(n => n.title), ["first"]);
});

test("PATCH updates fields", async () => {
    const { body: note } = await create({ title: "old", content: "text" });
    const { body } = await request(`${app.url}/notes/${note._id}`, "PATCH", { title: "new", tags: ["x"] });
    assert.equal(body.title, "new");
    assert.deepEqual(body.tags, ["x"]);
    assert.equal(body.content, "text");
});

test("a created note is findable through semantic search, and gone after delete", async () => {
    const { body: note } = await create({ title: "garden plan", content: "plant tomatoes" });
    const query = () => request(`${app.url}/ai/search`, "POST", { query: "garden plan plant tomatoes", types: ["note"] });

    const hit = await waitFor(async () => (await query()).body.results.find(r => r.id === note._id));
    assert.equal(hit.title, "garden plan");

    await request(`${app.url}/notes/${note._id}`, "DELETE");
    assert.equal((await query()).body.results.some(r => r.id === note._id), false);
});

test("search keeps relevance separate from a task's priority score", async () => {
    const { body: task } = await request(`${app.url}/tasks`, "POST", { title: "ship release" });
    const query = () => request(`${app.url}/ai/search`, "POST", { query: "ship release", types: ["task"] });
    const hit = await waitFor(async () => (await query()).body.results.find(r => r.id === task._id));
    assert.ok(hit.score <= 1, "score must be cosine relevance (0-1), not the 0-100 task score");
    assert.equal(typeof hit.taskScore, "number");
});
