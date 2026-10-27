require("dotenv").config();

const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const { GoogleGenAI } = require("@google/genai");
const path = require("node:path");
const { parseAnalysisResponse } = require("./analysis");

const app = express();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return callback(new Error("Unsupported file type."));
    }

    callback(null, true);
  },
});

const analysisSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    keyPoints: { type: "ARRAY", items: { type: "STRING" } },
    entities: { type: "ARRAY", items: { type: "STRING" } },
    actionItems: { type: "ARRAY", items: { type: "STRING" } },
    risks: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["summary", "keyPoints", "entities", "actionItems", "risks"],
};

app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

app.post("/api/analyze", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { code: "DOCUMENT_REQUIRED", message: 'Upload a file in the "document" field.' },
    });
  }

  const extension = path.extname(req.file.originalname).toLowerCase();
  const fileName = path.basename(req.file.originalname);
  let contents;

  if (extension === ".pdf") {
    if (!req.file.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_DOCUMENT", message: "The uploaded file is not a valid PDF." },
      });
    }
    contents = {
      parts: [
        { text: "Analyze this document. Return concise, accurate JSON matching the requested schema." },
        { inlineData: { mimeType: "application/pdf", data: req.file.buffer.toString("base64") } },
      ],
    };
  } else {
    let text;
    if (extension === ".docx") {
      try {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } catch {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_DOCUMENT", message: "The uploaded DOCX file could not be read." },
        });
      }
    } else {
      text = req.file.buffer.toString("utf8");
    }

    if (!text.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: "EMPTY_DOCUMENT", message: "The document contains no readable text." },
      });
    }

    contents = `Analyze this document. Return concise, accurate JSON matching the requested schema.\n\n${text}`;
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_CONFIGURATION_ERROR", message: "The AI service is not configured." },
    });
  }

  try {
    const analysis = await analyzeWithRetry(contents);
    return res.json({
      success: true,
      data: {
        file: { name: fileName, type: extension.slice(1), size: req.file.size },
        analysis,
      },
    });
  } catch (error) {
    console.error("Document analysis request failed:", error.name, error.message);
    return res.status(502).json({
      success: false,
      error: { code: "AI_SERVICE_ERROR", message: "The document could not be analyzed. Please retry." },
    });
  }
});

const MAX_ATTEMPTS = 3;

// Retries transient Gemini errors (overload, rate limits) and truncated/invalid JSON.
async function analyzeWithRetry(contents) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          maxOutputTokens: 8192,
          // Thinking tokens count against maxOutputTokens and can truncate the JSON.
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        throw new Error("Gemini analysis was truncated (MAX_TOKENS).");
      }

      return parseAnalysisResponse(response.text);
    } catch (error) {
      lastError = error;
      console.error(`Analysis attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "The requested endpoint does not exist." },
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      error: {
        code: tooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
        message: tooLarge ? "The document must be 10 MB or smaller." : error.message,
      },
    });
  }

  if (error.message === "Unsupported file type.") {
    return res.status(415).json({
      success: false,
      error: { code: "UNSUPPORTED_FILE_TYPE", message: "Upload a PDF, DOCX, TXT, or MD file." },
    });
  }

  console.error("Request failed:", error.message);
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." },
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Document Analyzer API listening on port ${port}`);
  });
}

module.exports = app;
