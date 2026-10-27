function parseAnalysisResponse(responseText) {
  if (typeof responseText !== "string" || !responseText.trim()) {
    throw new Error("Gemini returned an empty analysis.");
  }

  const analysis = JSON.parse(responseText);
  const arrayFields = ["keyPoints", "entities", "actionItems", "risks"];

  if (
    !analysis ||
    typeof analysis !== "object" ||
    typeof analysis.summary !== "string" ||
    arrayFields.some(
      (field) =>
        !Array.isArray(analysis[field]) ||
        analysis[field].some((item) => typeof item !== "string"),
    )
  ) {
    throw new Error("Gemini returned an analysis with an invalid structure.");
  }

  return analysis;
}

module.exports = { parseAnalysisResponse };
