import { useState } from 'react'
import { formatBytes, stripMarkup } from '../utils/format'
import {
  AlertIcon,
  BulbIcon,
  CheckIcon,
  CopyIcon,
  DocIcon,
  DownloadIcon,
  ListIcon,
  RefreshIcon,
  TagIcon,
} from './Icons'
import RichText from './RichText'

const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'key-points', label: 'Key points' },
  { id: 'entities', label: 'Entities' },
  { id: 'risks', label: 'Risks' },
  { id: 'action-items', label: 'Action items' },
]

function SectionHeader({ icon, title, count }) {
  return (
    <header className="section-header">
      <span className="section-icon">{icon}</span>
      <h3>{title}</h3>
      {count != null && <span className="count-pill">{count}</span>}
    </header>
  )
}

function EmptyNote({ children }) {
  return <p className="muted empty-note">{children}</p>
}

export default function AnalysisResult({ result, onReset }) {
  const { file, summary, keyPoints, entities, risks, actionItems, analyzedAt } = result
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary.map(stripMarkup).join('\n\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function handleDownload() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${file.name.replace(/\.[^.]+$/, '')}-analysis.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function scrollTo(id) {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="result">
      {/* Overview */}
      <section className="panel overview reveal">
        <div className="overview-main">
          <div className="overview-title">
            <span className="doc-icon">
              <DocIcon width={22} height={22} />
            </span>
            <div className="overview-name">
              <span className="eyebrow">Analysis complete</span>
              <h2 title={file.name}>{file.name}</h2>
            </div>
          </div>
          <div className="tag-row">
            <span className="tag tag-accent">{file.type.toUpperCase()}</span>
            <span className="tag tag-neutral">{formatBytes(file.size)}</span>
            {risks.length > 0 && (
              <span className="tag tag-high">
                {risks.length} {risks.length === 1 ? 'risk' : 'risks'} flagged
              </span>
            )}
            <span className="tag tag-neutral">
              Analyzed {new Date(analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <dl className="stat-grid">
            <div>
              <dt>Key points</dt>
              <dd>{keyPoints.length}</dd>
            </div>
            <div>
              <dt>Entities</dt>
              <dd>{entities.length}</dd>
            </div>
            <div>
              <dt>Risks</dt>
              <dd>{risks.length}</dd>
            </div>
            <div>
              <dt>Action items</dt>
              <dd>{actionItems.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <nav className="section-nav reveal" aria-label="Analysis sections">
        {SECTIONS.map((section) => (
          <button key={section.id} type="button" className="chip" onClick={() => scrollTo(section.id)}>
            {section.label}
          </button>
        ))}
      </nav>

      {/* Summary */}
      <section id="section-summary" className="panel reveal">
        <SectionHeader icon={<ListIcon width={18} height={18} />} title="Executive summary" />
        {summary.length > 0 ? (
          <div className="prose">
            {summary.map((paragraph, i) => (
              <RichText key={i} text={paragraph} />
            ))}
          </div>
        ) : (
          <EmptyNote>No summary was returned for this document.</EmptyNote>
        )}
      </section>

      {/* Key points */}
      <section id="section-key-points" className="panel reveal">
        <SectionHeader icon={<CheckIcon width={18} height={18} />} title="Key points" count={keyPoints.length} />
        {keyPoints.length > 0 ? (
          <ul className="finding-list">
            {keyPoints.map((point, i) => (
              <li key={i}>
                <span className="finding-index">{String(i + 1).padStart(2, '0')}</span>
                <RichText text={point} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>No key points identified.</EmptyNote>
        )}
      </section>

      {/* Entities */}
      <section id="section-entities" className="panel reveal">
        <SectionHeader icon={<TagIcon width={18} height={18} />} title="Extracted entities" count={entities.length} />
        {entities.length > 0 ? (
          <div className="entity-chips">
            {entities.map((entity, i) => (
              <span key={i} className="entity-chip">
                {stripMarkup(entity)}
              </span>
            ))}
          </div>
        ) : (
          <EmptyNote>No people, organizations, dates or amounts were detected.</EmptyNote>
        )}
      </section>

      {/* Risks */}
      <section id="section-risks" className="panel reveal">
        <SectionHeader icon={<AlertIcon width={18} height={18} />} title="Risk assessment" count={risks.length} />
        {risks.length > 0 ? (
          <ul className="risk-list">
            {risks.map((risk, i) => (
              <li key={i} className="risk">
                <AlertIcon className="risk-icon" width={16} height={16} />
                <RichText text={risk} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>No significant risks were flagged.</EmptyNote>
        )}
      </section>

      {/* Action items */}
      <section id="section-action-items" className="panel reveal">
        <SectionHeader icon={<BulbIcon width={18} height={18} />} title="Action items" count={actionItems.length} />
        {actionItems.length > 0 ? (
          <ol className="rec-list">
            {actionItems.map((item, i) => (
              <li key={i}>
                <RichText text={item} />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyNote>No follow-up actions suggested.</EmptyNote>
        )}
      </section>

      <div className="result-actions reveal">
        <button type="button" className="btn btn-ghost" onClick={handleCopy} disabled={summary.length === 0}>
          {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
          {copied ? 'Copied' : 'Copy summary'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleDownload}>
          <DownloadIcon width={16} height={16} />
          Download JSON
        </button>
        <button type="button" className="btn btn-primary" onClick={onReset}>
          <RefreshIcon width={16} height={16} />
          Analyze another document
        </button>
      </div>
    </div>
  )
}
