const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseAnalysisResponse } = require("../analysis");

test("parses a structured Gemini analysis", () => {
  const expected = {
    summary: "Overview",
    keyPoints: ["Point"],
    entities: ["Organization"],
    actionItems: [],
    risks: [],
  };

  assert.deepEqual(parseAnalysisResponse(JSON.stringify(expected)), expected);
});

test("rejects malformed or incomplete Gemini JSON", () => {
  assert.throws(() => parseAnalysisResponse('{"summary":"unterminated'), SyntaxError);
  assert.throws(() => parseAnalysisResponse(""), /empty analysis/i);
});

test("rejects a response that does not match the analysis schema", () => {
  assert.throws(
    () => parseAnalysisResponse(JSON.stringify({ summary: "Overview", keyPoints: "not an array" })),
    /invalid structure/i,
  );
});
