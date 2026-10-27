const API_URL = '/api/analyze'

// Each stage mirrors a step of the analysis pipeline. Stage 0 tracks real upload progress;
// the server doesn't report progress after that, so later stages advance on an estimate.
export const ANALYSIS_STAGES = [
  { id: 'upload', label: 'Uploading document', detail: 'Securely transferring your file' },
  { id: 'extract', label: 'Extracting text', detail: 'Reading pages and document content' },
  { id: 'structure', label: 'Mapping structure', detail: 'Detecting headings, sections and clauses' },
  { id: 'entities', label: 'Identifying entities', detail: 'Finding people, organizations, dates and amounts' },
  { id: 'risks', label: 'Assessing risks', detail: 'Flagging obligations, gaps and unusual terms' },
  { id: 'summary', label: 'Generating insights', detail: 'Writing the summary and action items' },
]

const UPLOAD_SHARE = 0.15 // share of the progress bar used by the upload
const MAX_ESTIMATED = 0.96 // estimated progress never reaches 100% before the response arrives
const PROCESSING_TAU_MS = 7000 // how quickly the estimate approaches MAX_ESTIMATED
const TICK_MS = 100
const FINISH_DELAY_MS = 400 // lets the user see 100% before results appear

const SERVER_DOWN_MESSAGE =
  'Could not reach the analysis server. Make sure the API is running on http://localhost:3000.'

export class AnalysisError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'AnalysisError'
    this.code = code
  }
}

function toList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []
}

function normalizeResponse({ file, analysis }) {
  return {
    file: { name: file.name, type: file.type, size: file.size },
    summary: (analysis.summary ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean),
    keyPoints: toList(analysis.keyPoints),
    entities: toList(analysis.entities),
    risks: toList(analysis.risks),
    actionItems: toList(analysis.actionItems),
    analyzedAt: new Date().toISOString(),
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Upload a document to the backend and resolve with the normalized analysis.
 * Uses XMLHttpRequest (not fetch) so upload progress can be reported.
 *
 * @param {File} file
 * @param {{ signal?: AbortSignal, onProgress?: (p: { stageIndex: number, progress: number }) => void }} options
 */
export function analyzeDocument(file, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const lastStage = ANALYSIS_STAGES.length - 1
    let processingTimer = null
    let progress = 0

    function report(stageIndex, value) {
      progress = Math.max(progress, value)
      onProgress?.({ stageIndex, progress })
    }

    function startProcessingEstimate() {
      if (processingTimer) return
      const startedAt = Date.now()
      report(1, UPLOAD_SHARE)
      processingTimer = setInterval(() => {
        const fraction = 1 - Math.exp(-(Date.now() - startedAt) / PROCESSING_TAU_MS)
        const stageIndex = 1 + Math.min(lastStage - 1, Math.floor(fraction * lastStage))
        report(stageIndex, UPLOAD_SHARE + fraction * (MAX_ESTIMATED - UPLOAD_SHARE))
      }, TICK_MS)
    }

    function cleanup() {
      clearInterval(processingTimer)
      signal?.removeEventListener('abort', handleAbort)
    }

    function handleAbort() {
      xhr.abort()
    }

    function rejectAborted() {
      cleanup()
      reject(new DOMException('Analysis cancelled', 'AbortError'))
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) report(0, UPLOAD_SHARE * (event.loaded / event.total))
    }
    xhr.upload.onload = startProcessingEstimate

    xhr.onload = () => {
      clearInterval(processingTimer)
      const body = parseJson(xhr.responseText)

      if (xhr.status >= 200 && xhr.status < 300 && body?.success && body.data?.analysis) {
        report(lastStage, 1)
        setTimeout(() => {
          if (signal?.aborted) {
            rejectAborted()
            return
          }
          cleanup()
          resolve(normalizeResponse(body.data))
        }, FINISH_DELAY_MS)
        return
      }

      cleanup()
      if (body?.error?.message) {
        reject(new AnalysisError(body.error.message, body.error.code))
      } else if (xhr.status >= 500) {
        // The Vite proxy answers with an empty 5xx body when the backend is down
        reject(new AnalysisError(SERVER_DOWN_MESSAGE, 'SERVER_UNREACHABLE'))
      } else {
        reject(new AnalysisError(`The server returned an unexpected response (${xhr.status}).`, 'BAD_RESPONSE'))
      }
    }

    xhr.onerror = () => {
      cleanup()
      reject(new AnalysisError(SERVER_DOWN_MESSAGE, 'SERVER_UNREACHABLE'))
    }

    xhr.onabort = rejectAborted

    if (signal?.aborted) {
      reject(new DOMException('Analysis cancelled', 'AbortError'))
      return
    }
    signal?.addEventListener('abort', handleAbort, { once: true })

    const body = new FormData()
    body.append('document', file)
    xhr.open('POST', API_URL)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.send(body)
    report(0, 0)
  })
}
