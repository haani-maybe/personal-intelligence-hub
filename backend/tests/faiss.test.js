import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { addDocument, removeDocument, search, indexSize } from "../src/services/faiss.service.js";

// module keeps state in memory, so clear it between tests
beforeEach(() => {
    ["a", "b", "c", "d"].forEach(removeDocument);
});

test("search ranks the closest vector first", () => {
    addDocument("a", "note", [1, 0], { title: "a" });
    addDocument("b", "note", [0, 1], { title: "b" });
    addDocument("c", "note", [0.9, 0.1], { title: "c" });

    const results = search([1, 0], 3);
    assert.deepEqual(results.map(r => r.id), ["a", "c", "b"]);
    assert.ok(Math.abs(results[0].score - 1) < 1e-9);
    assert.ok(Math.abs(results[2].score) < 1e-9);
});

test("topK limits the number of results", () => {
    addDocument("a", "note", [1, 0], { title: "a" });
    addDocument("b", "note", [0, 1], { title: "b" });
    assert.equal(search([1, 0], 1).length, 1);
});

test("types filter only returns matching types", () => {
    addDocument("a", "note", [1, 0], { title: "a" });
    addDocument("b", "email", [1, 0], { title: "b" });
    const results = search([1, 0], 5, ["email"]);
    assert.deepEqual(results.map(r => r.id), ["b"]);
});

test("addDocument upserts by id", () => {
    addDocument("a", "note", [1, 0], { title: "old" });
    const before = indexSize();
    addDocument("a", "note", [0, 1], { title: "new" });
    assert.equal(indexSize(), before);
    assert.equal(search([0, 1], 1)[0].title, "new");
});

test("removeDocument drops the entry", () => {
    addDocument("a", "note", [1, 0], { title: "a" });
    removeDocument("a");
    assert.equal(search([1, 0], 5).find(r => r.id === "a"), undefined);
});

test("zero vectors and mismatched dimensions score 0 instead of NaN", () => {
    addDocument("a", "note", [0, 0], { title: "zero" });
    addDocument("b", "note", [1, 0, 0], { title: "wrong dim" });
    const results = search([1, 0], 5);
    for (const r of results) assert.equal(r.score, 0);
});
