import { useEffect, useRef, useState } from 'react'
import AnalysisLoader from './components/AnalysisLoader'
import AnalysisResult from './components/AnalysisResult'
import FileDropzone from './components/FileDropzone'
import { AlertIcon, LogoIcon, SparkIcon } from './components/Icons'
import { ANALYSIS_STAGES, analyzeDocument } from './services/analyzeDocument'
import './App.css'

const STEPS = ['Upload', 'Analyze', 'Insights']

function getActiveStep(status) {
  if (status === 'done') return 2
  if (status === 'analyzing') return 1
  return 0
}

function getStepClass(index, activeStep) {
  if (index < activeStep) return 'is-done'
  if (index === activeStep) return 'is-active'
  return ''
}

function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | analyzing | done | error
  const [stageIndex, setStageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const outputRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const isAnalyzing = status === 'analyzing'
  const activeStep = getActiveStep(status)

  function handleFileChange(nextFile) {
    setFile(nextFile)
    setResult(null)
    setError('')
    setStatus('idle')
  }

  async function handleAnalyze() {
    if (!file || isAnalyzing) return

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('analyzing')
    setResult(null)
    setError('')
    setStageIndex(0)
    setProgress(0)
    requestAnimationFrame(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))

    try {
      const data = await analyzeDocument(file, {
        signal: controller.signal,
        onProgress: ({ stageIndex, progress }) => {
          setStageIndex(stageIndex)
          setProgress(progress)
        },
      })
      setResult(data)
      setStatus('done')
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus('idle')
        return
      }
      setError(err.message || 'Something went wrong while analyzing the document.')
      setStatus('error')
    }
  }

  function handleReset() {
    setFile(null)
    setResult(null)
    setStatus('idle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <LogoIcon width={20} height={20} />
          </span>
          <span className="brand-name">
            Doc<span>Lens</span>
          </span>
          <span className="brand-tag">Analyzer</span>
        </div>
        <ol className="stepper" aria-label="Progress">
          {STEPS.map((step, i) => (
            <li key={step} className={getStepClass(i, activeStep)}>
              <span className="stepper-num">{i + 1}</span>
              <span className="stepper-label">{step}</span>
            </li>
          ))}
        </ol>
      </header>

      <main className="container">
        <section className="hero">
          <span className="eyebrow eyebrow-glow">AI document intelligence</span>
          <h1>
            Understand any document{' '}
            <span className="gradient-text">in seconds</span>
          </h1>
          <p className="muted">
            Upload a contract, report or policy. You get a clear summary, key points, extracted entities, flagged
            risks and suggested next steps.
          </p>
        </section>

        <section className="panel upload-panel">
          <div className="panel-title">
            <span className="step-badge">01</span>
            <div>
              <h2>Upload document</h2>
              <p className="muted">Your file is processed securely and never shared.</p>
            </div>
          </div>

          <FileDropzone file={file} onFileChange={handleFileChange} disabled={isAnalyzing} />

          <button
            type="button"
            className={`btn btn-primary btn-lg analyze-btn ${isAnalyzing ? 'is-loading' : ''}`}
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>Analyzing document…</span>
              </>
            ) : (
              <>
                <SparkIcon width={18} height={18} />
                {status === 'done' ? 'Re-analyze document' : 'Analyze document'}
              </>
            )}
          </button>
        </section>

        <section ref={outputRef} className="output" aria-label="Analysis output">
          <div className="output-heading">
            <span className="step-badge">02</span>
            <h2>Analysis</h2>
          </div>

          {status === 'idle' && (
            <div className="panel empty-state">
              <div className="empty-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="empty-title">No analysis yet</p>
              <p className="muted">
                {file ? 'Click "Analyze document" to start.' : 'Upload a document above to get started.'}
              </p>
            </div>
          )}

          {isAnalyzing && (
            <AnalysisLoader
              stages={ANALYSIS_STAGES}
              stageIndex={stageIndex}
              progress={progress}
              fileName={file?.name ?? ''}
              onCancel={() => abortRef.current?.abort()}
            />
          )}

          {status === 'error' && (
            <div className="panel error-state" role="alert">
              <AlertIcon width={22} height={22} />
              <div>
                <p className="empty-title">Analysis failed</p>
                <p className="muted">{error}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleAnalyze}>
                Try again
              </button>
            </div>
          )}

          {status === 'done' && result && <AnalysisResult result={result} onReset={handleReset} />}
        </section>
      </main>

      <footer className="footer">DocLens Analyzer · AI-generated analysis can contain mistakes, so verify important details</footer>
    </div>
  )
}

export default App
