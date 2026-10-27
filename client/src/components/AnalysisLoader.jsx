import { CheckIcon } from './Icons'
import Ring from './Ring'

const SHEET_LINES = [92, 78, 85, 60, 88, 72, 95, 54, 80, 66]
const STATUS_TEXT = { done: 'Done', active: 'Running', pending: 'Queued' }

function getStageState(index, activeIndex) {
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'pending'
}

export default function AnalysisLoader({ stages, stageIndex, progress, fileName, onCancel }) {
  const current = stages[stageIndex]
  const percent = progress * 100

  return (
    <section className="panel loader" aria-live="polite" aria-busy="true">
      <div className="loader-visual">
        <div className="doc-sheet" aria-hidden="true">
          <div className="doc-sheet-head" />
          {SHEET_LINES.map((width, i) => (
            <div
              key={i}
              className="doc-line"
              style={{ width: `${width}%`, animationDelay: `${i * 0.35}s` }}
            />
          ))}
          <div className="scan-beam" />
        </div>
        <Ring value={percent} size={92} stroke={7} label="done" />
      </div>

      <div className="loader-body">
        <span className="eyebrow">
          Step {stageIndex + 1} of {stages.length}
        </span>
        <h3 className="loader-title">
          {current.label}
          <span className="dots" aria-hidden="true" />
        </h3>
        <p className="muted">{current.detail}</p>
        <p className="loader-file" title={fileName}>
          {fileName}
        </p>

        <div className="progress" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar" style={{ width: `${percent}%` }} />
        </div>

        <ol className="stage-list">
          {stages.map((stage, i) => {
            const state = getStageState(i, stageIndex)
            return (
              <li key={stage.id} className={`stage stage-${state}`}>
                <span className="stage-dot">
                  {state === 'done' ? <CheckIcon width={12} height={12} strokeWidth={3} /> : null}
                </span>
                <span className="stage-label">{stage.label}</span>
                <span className="stage-status">{STATUS_TEXT[state]}</span>
              </li>
            )
          })}
        </ol>

        <button type="button" className="btn btn-ghost btn-sm loader-cancel" onClick={onCancel}>
          Cancel analysis
        </button>
      </div>
    </section>
  )
}
