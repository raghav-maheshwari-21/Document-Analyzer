# Document Analyzer API

An Express API that accepts a document, sends it to Gemini, and returns a structured JSON analysis.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to a valid Gemini API key.
3. Start the server with `npm start`.

The server listens on port `3000` by default. Set `PORT` to change it.

## Endpoints

- `GET /health` — returns the service status.
- `POST /api/analyze` — accepts one multipart file in the `document` field. Supported file types: PDF, DOCX, TXT, and MD; maximum file size: 10 MB.

Successful analysis response:

```json
{
  "success": true,
  "data": {
    "file": { "name": "report.pdf", "type": "pdf", "size": 12345 },
    "analysis": {
      "summary": "A concise overview.",
      "keyPoints": ["Important point"],
      "entities": ["Person, organization, or date"],
      "actionItems": ["Suggested next step"],
      "risks": ["Potential concern"]
    }
  }
}
```

Errors use a JSON body with `success: false` and an `error` containing a stable `code` and readable `message`.

Example:

```sh
curl -X POST http://localhost:3000/api/analyze -F "document=@report.pdf"
```
