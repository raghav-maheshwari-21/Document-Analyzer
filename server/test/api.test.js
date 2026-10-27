const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../index");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint returns JSON status", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, status: "ok" });
});

test("unknown endpoint returns a JSON 404", async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "NOT_FOUND");
});

test("analysis endpoint requires a document", async () => {
  const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "DOCUMENT_REQUIRED");
});

test("analysis endpoint rejects unsupported file types", async () => {
  const form = new FormData();
  form.append("document", new Blob(["data"]), "notes.csv");
  const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: form });
  assert.equal(response.status, 415);
  assert.equal((await response.json()).error.code, "UNSUPPORTED_FILE_TYPE");
});

test("analysis endpoint rejects an invalid PDF", async () => {
  const form = new FormData();
  form.append("document", new Blob(["not a PDF"]), "report.pdf");
  const response = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: form });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "INVALID_DOCUMENT");
});
