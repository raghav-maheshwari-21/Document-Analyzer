import { useRef, useState } from 'react'
import { formatBytes, getExtension } from '../utils/format'
import { UploadIcon, XIcon } from './Icons'

// Must match the backend's allowed types
const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export default function FileDropzone({ file, onFileChange, disabled }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  function selectFile(selected) {
    if (!selected) return
    if (!ACCEPTED_EXTENSIONS.includes(getExtension(selected.name))) {
      setError(`Unsupported file type. Use ${ACCEPTED_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')}.`)
      return
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError(`File is too large (${formatBytes(selected.size)}). The limit is 10 MB.`)
      return
    }
    setError('')
    onFileChange(selected)
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click()
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    if (!disabled) selectFile(event.dataTransfer.files?.[0])
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  return (
    <div className="dropzone-wrap">
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
        onChange={(event) => {
          selectFile(event.target.files?.[0])
          // Reset so picking the same file again still fires onChange
          event.target.value = ''
        }}
      />

      {file ? (
        <div className={`file-card ${disabled ? 'is-disabled' : ''}`}>
          <div className="file-badge">{getExtension(file.name) || 'file'}</div>
          <div className="file-info">
            <span className="file-name" title={file.name}>
              {file.name}
            </span>
            <span className="file-meta">
              {formatBytes(file.size)} · Ready to analyze
            </span>
          </div>
          <div className="file-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={openPicker} disabled={disabled}>
              Replace
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onFileChange(null)}
              disabled={disabled}
              aria-label="Remove file"
            >
              <XIcon width={18} height={18} />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              openPicker()
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="dropzone-icon">
            <UploadIcon width={26} height={26} />
          </div>
          <p className="dropzone-title">
            {isDragging ? 'Drop to upload' : (
              <>
                Drag & drop your document, or <span className="link">browse</span>
              </>
            )}
          </p>
          <p className="dropzone-hint">PDF, DOCX, TXT or MD · up to 10 MB</p>
        </div>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
