import { useState, useRef, useEffect, useCallback } from 'react'

/* ─── Mock disease database ─────────────────────────────────────── */
const MOCK_DISEASES = [
  {
    id: 'wbr',
    disease: 'Wheat Brown Rust (Puccinia recondita)',
    severity: 'Medium ⚠️',
    severityLevel: 'warning',
    confidence: '94%',
    affectedArea: '18.5%',
    diagnosis: 'Fungal infection causing red-brown pustules on leaves, disrupting photosynthesis and reducing yield.',
    treatments: [
      {
        id: 't1',
        label: '🧪 Chemical Treatment',
        name: 'Propiconazole 25% EC (Tilt)',
        dosage: '1 ml / Litre water — 200 ml/acre in 200 L',
        color: '#15803d',
        bg: '#f0fdf4',
        border: '#22c55e',
      },
      {
        id: 't2',
        label: '🌿 Organic Remedy',
        name: 'Neem Oil 1500 PPM + mild soap solution',
        dosage: 'Spray weekly in early morning or evening',
        color: '#854d0e',
        bg: '#fef9c3',
        border: '#eab308',
      },
    ],
    precaution: 'Avoid sprinkler irrigation — moisture accelerates fungal spores. Spray in early morning or late evening.',
  },
  {
    id: 'rb',
    disease: 'Rice Blast (Magnaporthe oryzae)',
    severity: 'High 🚨',
    severityLevel: 'critical',
    confidence: '98%',
    affectedArea: '32.1%',
    diagnosis: 'Highly destructive fungal pathogen causing spindle-shaped lesions with grey centres on leaves and neck rot.',
    treatments: [
      {
        id: 't1',
        label: '🧪 Chemical Treatment',
        name: 'Tricyclazole 75% WP (Beam) or Isoprothiolane 40% EC',
        dosage: '0.6 g/Litre — 120 g/acre in 200 L',
        color: '#15803d',
        bg: '#f0fdf4',
        border: '#22c55e',
      },
      {
        id: 't2',
        label: '🌿 Bio-Organic Option',
        name: 'Pseudomonas fluorescens bio-formulation',
        dosage: 'As foliar spray per manufacturer label',
        color: '#854d0e',
        bg: '#fef9c3',
        border: '#eab308',
      },
    ],
    precaution: 'Immediately reduce nitrogenous fertilizer. Drain excess water and maintain shallow soil moisture.',
  },
  {
    id: 'tlb',
    disease: 'Tomato Late Blight (Phytophthora infestans)',
    severity: 'High 🚨',
    severityLevel: 'critical',
    confidence: '91%',
    affectedArea: '24.0%',
    diagnosis: 'Water-soaked grey-green spots on leaves turning brown-black, spreading rapidly under cool, humid conditions.',
    treatments: [
      {
        id: 't1',
        label: '🧪 Chemical Treatment',
        name: 'Metalaxyl 8% + Mancozeb 64% WP (Ridomil Gold)',
        dosage: '2.5 g/Litre — 500 g/acre',
        color: '#15803d',
        bg: '#f0fdf4',
        border: '#22c55e',
      },
      {
        id: 't2',
        label: '🌿 Biological Control',
        name: 'Trichoderma harzianum or fresh Garlic extract',
        dosage: 'Foliar spray weekly',
        color: '#854d0e',
        bg: '#fef9c3',
        border: '#eab308',
      },
    ],
    precaution: 'Prune lower leaves for air circulation. Destroy infected plant matter immediately — do NOT compost.',
  },
  {
    id: 'clc',
    disease: 'Cotton Leaf Curl Virus (CLCuV)',
    severity: 'Low 🌿',
    severityLevel: 'info',
    confidence: '89%',
    affectedArea: '6.2%',
    diagnosis: 'Viral pathogen transmitted by whiteflies, causing upward/downward curling of leaves and thickened veins.',
    treatments: [
      {
        id: 't1',
        label: '🧪 Vector Control',
        name: 'Acetamiprid 20% SP or Imidacloprid 17.8% SL',
        dosage: '0.5 ml Imidacloprid/Litre water',
        color: '#15803d',
        bg: '#f0fdf4',
        border: '#22c55e',
      },
      {
        id: 't2',
        label: '🌿 Organic Vector Trap',
        name: 'Yellow sticky traps (20/acre) + 5% NSKE spray',
        dosage: 'Install traps; spray NSKE weekly',
        color: '#854d0e',
        bg: '#fef9c3',
        border: '#eab308',
      },
    ],
    precaution: 'Uproot and burn highly deformed plants to prevent whitefly spread to healthy sectors.',
  },
]

const SEVERITY_COLORS = {
  critical: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  warning:  { bg: '#fef9c3', color: '#b45309', border: '#fcd34d' },
  info:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function CropScanner({ onTreatmentSelected }) {
  /* Camera / image state */
  const [cameraState, setCameraState] = useState('idle') // idle | requesting | active | error | simulated
  const [cameraError, setCameraError] = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)

  /* Analysis state */
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [result, setResult] = useState(null)

  /* Treatment selection state */
  const [selectedTreatment, setSelectedTreatment] = useState(null)
  const [treatmentSent, setTreatmentSent] = useState(false)

  /* Logs — with thumbnail support */
  const [logs, setLogs] = useState([
    {
      id: 1, date: '2026-05-27 15:40', disease: 'Wheat Brown Rust (Puccinia recondita)',
      severity: 'Medium ⚠️', severityLevel: 'warning', confidence: '94%',
      treatment: 'Propiconazole 25% EC (Tilt)', thumbnail: null,
    },
    {
      id: 2, date: '2026-05-26 09:12', disease: 'Cotton Leaf Curl Virus (CLCuV)',
      severity: 'Low 🌿', severityLevel: 'info', confidence: '89%',
      treatment: 'Yellow sticky traps + 5% NSKE spray', thumbnail: null,
    },
  ])
  const [expandedLog, setExpandedLog] = useState(null)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  /* ── Camera helpers ── */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    setCameraState('requesting')
    setCapturedImage(null)
    setUploadedImage(null)
    setResult(null)
    setSelectedTreatment(null)
    setTreatmentSent(false)

    // Check if mediaDevices API exists
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('simulated')
      setCameraError('Camera API not available in this browser/environment. Simulated viewport activated.')
      return
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {})
        }
      }
      setCameraState('active')
    } catch (err) {
      console.warn('Camera error:', err)
      let msg = 'Camera access denied or unavailable.'
      if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access in your browser settings.'
      else if (err.name === 'NotFoundError') msg = 'No camera device found on this device.'
      else if (err.name === 'NotReadableError') msg = 'Camera is in use by another application.'
      setCameraError(msg + ' — Simulated viewport activated.')
      setCameraState('simulated')
    }
  }, [])

  const stopCamera = useCallback(() => {
    stopStream()
    setCameraState('idle')
    setCameraError('')
  }, [stopStream])

  const captureFrame = useCallback(() => {
    if (cameraState === 'active' && videoRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedImage(dataUrl)
      stopStream()
      setCameraState('captured')
    } else {
      // Simulated capture
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#0b1a10"/>
        <ellipse cx="200" cy="150" rx="120" ry="90" fill="#1a4d2e"/>
        <path d="M200 60 C160 120 120 150 200 240 C280 150 240 120 200 60Z" fill="#22c55e" opacity="0.8"/>
        <circle cx="180" cy="140" r="8" fill="#f59e0b" opacity="0.9"/>
        <circle cx="215" cy="155" r="6" fill="#f59e0b" opacity="0.7"/>
        <circle cx="200" cy="130" r="5" fill="#ef4444" opacity="0.8"/>
        <text x="200" y="285" fill="#22c55e" font-size="11" text-anchor="middle" font-weight="bold">SIMULATED LEAF SAMPLE</text>
      </svg>`
      setCapturedImage('data:image/svg+xml;utf8,' + encodeURIComponent(svg))
      setCameraState('captured')
    }
  }, [cameraState, stopStream])

  /* ── File upload ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    stopCamera()
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result)
      setCapturedImage(null)
      setResult(null)
      setSelectedTreatment(null)
      setTreatmentSent(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  /* ── Auto-start camera on mount ── */
  useEffect(() => {
    startCamera()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Analysis ── */
  const runAnalysis = () => {
    const img = capturedImage || uploadedImage
    if (!img) return
    setScanning(true)
    setScanStep(1)
    setResult(null)
    setSelectedTreatment(null)
    setTreatmentSent(false)

    setTimeout(() => setScanStep(2), 900)
    setTimeout(() => setScanStep(3), 1800)
    setTimeout(() => {
      const selected = MOCK_DISEASES[Math.floor(Math.random() * MOCK_DISEASES.length)]
      setResult(selected)
      setScanning(false)
      setScanStep(0)
    }, 2700)
  }

  /* ── Select treatment & send to dashboard ── */
  const handleSelectTreatment = (treatment) => {
    setSelectedTreatment(treatment)
  }

  const confirmTreatment = () => {
    if (!result || !selectedTreatment) return
    const activeImage = capturedImage || uploadedImage
    // Save to history with thumbnail
    const logEntry = {
      id: Date.now(),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      disease: result.disease,
      severity: result.severity,
      severityLevel: result.severityLevel,
      confidence: result.confidence,
      treatment: selectedTreatment.name,
      dosage: selectedTreatment.dosage,
      thumbnail: activeImage || null,
    }
    setLogs(prev => [logEntry, ...prev])
    const newReminder = {
      id: Date.now(),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      disease: result.disease,
      severity: result.severity,
      severityLevel: result.severityLevel,
      confidence: result.confidence,
      treatment: selectedTreatment.name,
      treatmentLabel: selectedTreatment.label,
      dosage: selectedTreatment.dosage,
      status: 'pending', // pending | done | skipped
    }
    setLogs(prev => [{ ...newReminder, id: newReminder.id }, ...prev])
    if (onTreatmentSelected) onTreatmentSelected(newReminder)
    setTreatmentSent(true)
  }

  const resetScanner = () => {
    stopCamera()
    setCapturedImage(null)
    setUploadedImage(null)
    setResult(null)
    setSelectedTreatment(null)
    setTreatmentSent(false)
    setScanning(false)
    setScanStep(0)
  }

  useEffect(() => () => stopStream(), [stopStream])

  const activeImage = capturedImage || uploadedImage
  const sevStyle = result ? SEVERITY_COLORS[result.severityLevel] || SEVERITY_COLORS.info : null

  return (
    <div className="db-section scanner-section">
      <div className="scanner-page-header">
        <div>
          <h1 className="db-page-title">🌿 Crop Scanner</h1>
          <p className="db-page-sub">Deploy AI computer vision to instantly diagnose leaf diseases and access treatment protocols.</p>
        </div>
        {(activeImage || result) && (
          <button className="scanner-reset-btn" onClick={resetScanner} title="Reset Scanner">
            🔄 New Scan
          </button>
        )}
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="scanner-steps">
        {['Capture / Upload', 'AI Analysis', 'Select Treatment', 'Dashboard'].map((s, i) => {
          const step = i + 1
          const done = (step === 1 && activeImage) || (step === 2 && result) || (step === 3 && treatmentSent) || (step === 4 && treatmentSent)
          const active = (step === 1 && !activeImage && !result) || (step === 2 && activeImage && !result) || (step === 3 && result && !treatmentSent)
          return (
            <div key={s} className={`scanner-step ${done ? 'done' : active ? 'active' : ''}`}>
              <div className="scanner-step-dot">{done ? '✓' : step}</div>
              <span className="scanner-step-label">{s}</span>
              {i < 3 && <div className="scanner-step-line" />}
            </div>
          )
        })}
      </div>

      {/* ── MAIN PANEL ── */}
      <div className="scanner-main-grid">

        {/* ── LEFT: Viewport ── */}
        <div className="scanner-viewport-card">
          <h2 className="scanner-card-title">📷 AI Diagnostic Viewport</h2>

          {/* Camera error banner */}
          {cameraError && (
            <div className="scanner-cam-error">
              <span>⚠️</span>
              <span>{cameraError}</span>
            </div>
          )}

          {/* Viewport */}
          <div className="scanner-viewport">

            {/* Idle state */}
            {cameraState === 'idle' && !activeImage && (
              <div className="scanner-empty-state">
                <span className="scanner-empty-icon">🍃</span>
                <p className="scanner-empty-title">No Image Selected</p>
                <p className="scanner-empty-sub">Launch live camera or upload a crop leaf image below.</p>
              </div>
            )}

            {/* Requesting permissions */}
            {cameraState === 'requesting' && (
              <div className="scanner-empty-state">
                <div className="db-map-spinner" style={{ borderTopColor: '#22c55e' }} />
                <p className="scanner-empty-title" style={{ color: '#22c55e' }}>Requesting camera access…</p>
                <p className="scanner-empty-sub">Please allow camera permission in your browser.</p>
              </div>
            )}

            {/* Live video */}
            {cameraState === 'active' && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="scanner-video"
                />
                <div className="scanner-viewfinder" />
                <div className="scanner-scan-line" />
                <span className="scanner-live-badge">📡 LIVE</span>
              </>
            )}

            {/* Simulated viewport */}
            {cameraState === 'simulated' && (
              <div className="scanner-simulated">
                <span style={{ fontSize: '3.5rem', animation: 'pulse 2s infinite' }}>🍃</span>
                <p className="scanner-sim-label">SIMULATED VIEWPORT — TARGET ACQUIRED</p>
                <p className="scanner-sim-sub">Press "Capture Sample" to proceed</p>
                <div className="scanner-viewfinder scanner-viewfinder--sim" />
                <div className="scanner-scan-line" />
              </div>
            )}

            {/* Captured / uploaded image */}
            {activeImage && cameraState !== 'active' && (
              <div className="scanner-img-wrap">
                <img src={activeImage} alt="Crop sample" className="scanner-img" />
                {scanning && <div className="scanner-scan-beam" />}
              </div>
            )}

            {/* Scanning overlay */}
            {scanning && (
              <div className="scanner-overlay">
                <div className="db-map-spinner" style={{ borderTopColor: '#22c55e', width: '2.5rem', height: '2.5rem' }} />
                <p className="scanner-overlay-text">
                  {scanStep === 1 ? '🧬 Fragmenting leaf structures…' : scanStep === 2 ? '🦠 Scanning chemical profiles…' : '🤖 Running neural diagnosis…'}
                </p>
                <div className="scanner-progress-bar">
                  <div className="scanner-progress-fill" style={{ width: `${scanStep === 1 ? 33 : scanStep === 2 ? 66 : 95}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Canvas for capture (hidden) */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Action buttons */}
          <div className="scanner-actions">
            {cameraState === 'idle' && (
              <button className="scanner-btn scanner-btn--primary" onClick={startCamera}>
                📸 Launch Camera
              </button>
            )}
            {(cameraState === 'active' || cameraState === 'simulated') && (
              <>
                <button className="scanner-btn scanner-btn--capture" onClick={captureFrame}>
                  ⚡ Capture Sample
                </button>
                <button className="scanner-btn scanner-btn--danger" onClick={stopCamera}>
                  ✕ Close Camera
                </button>
              </>
            )}
            {cameraState === 'requesting' && (
              <button className="scanner-btn scanner-btn--disabled" disabled>
                ⏳ Waiting…
              </button>
            )}

            <button className="scanner-btn scanner-btn--upload" onClick={() => fileInputRef.current?.click()}>
              📤 Upload Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          {activeImage && !scanning && !result && (
            <button className="scanner-btn scanner-btn--analyze" onClick={runAnalysis}>
              🧬 RUN AI LEAF DISEASE DIAGNOSIS
            </button>
          )}

          {result && !treatmentSent && (
            <p className="scanner-hint">👉 Select your preferred treatment on the right, then confirm to send it to your dashboard.</p>
          )}
        </div>

        {/* ── RIGHT: Results + Treatment ── */}
        <div className="scanner-result-card">
          <h2 className="scanner-card-title">🔬 Diagnosis &amp; Treatment</h2>

          {!result && !scanning && (
            <div className="scanner-await">
              <span style={{ fontSize: '2.5rem' }}>🔬</span>
              <p className="scanner-await-title">Awaiting Scan</p>
              <p className="scanner-await-sub">Capture or upload a leaf image, then run AI diagnosis. Results and treatment options will appear here.</p>
            </div>
          )}

          {result && (
            <div className="scanner-result-body">

              {/* ── Disease summary ── */}
              <div className="scanner-disease-box" style={{ background: sevStyle.bg, borderColor: sevStyle.border }}>
                <span className="scanner-ai-badge">AI DETECTED</span>
                <h3 className="scanner-disease-name">{result.disease}</h3>
                <div className="scanner-metrics">
                  <div className="scanner-metric">
                    <span className="scanner-metric-label">Severity</span>
                    <strong style={{ color: sevStyle.color }}>{result.severity}</strong>
                  </div>
                  <div className="scanner-metric">
                    <span className="scanner-metric-label">Confidence</span>
                    <strong style={{ color: '#22c55e' }}>{result.confidence}</strong>
                  </div>
                  <div className="scanner-metric">
                    <span className="scanner-metric-label">Affected</span>
                    <strong style={{ color: '#3b82f6' }}>{result.affectedArea}</strong>
                  </div>
                </div>
                <p className="scanner-diagnosis-text">{result.diagnosis}</p>
              </div>

              {/* ── Treatment selection ── */}
              {!treatmentSent && (
                <>
                  <p className="scanner-select-label">💊 Select Treatment Protocol:</p>
                  <div className="scanner-treatment-list">
                    {result.treatments.map(t => (
                      <button
                        key={t.id}
                        className={`scanner-treatment-opt ${selectedTreatment?.id === t.id ? 'selected' : ''}`}
                        style={{
                          background: selectedTreatment?.id === t.id ? t.bg : 'white',
                          borderColor: selectedTreatment?.id === t.id ? t.border : '#e2e8f0',
                        }}
                        onClick={() => handleSelectTreatment(t)}
                      >
                        <div className="scanner-treat-header">
                          <span className="scanner-treat-label" style={{ color: t.color }}>{t.label}</span>
                          {selectedTreatment?.id === t.id && <span className="scanner-treat-check">✓ Selected</span>}
                        </div>
                        <p className="scanner-treat-name">{t.name}</p>
                        <p className="scanner-treat-dosage">📏 {t.dosage}</p>
                      </button>
                    ))}
                  </div>

                  {/* Precaution */}
                  <div className="scanner-precaution">
                    <strong>⚠️ Agricultural Precaution:</strong>
                    <p>{result.precaution}</p>
                  </div>

                  {selectedTreatment && (
                    <button className="scanner-btn scanner-btn--confirm" onClick={confirmTreatment}>
                      ✅ Confirm &amp; Send to Dashboard
                    </button>
                  )}
                </>
              )}

              {/* ── Treatment confirmed ── */}
              {treatmentSent && (
                <div className="scanner-confirmed">
                  <span style={{ fontSize: '2.5rem' }}>✅</span>
                  <h3>Treatment Added to Dashboard!</h3>
                  <p><strong>{selectedTreatment?.name}</strong></p>
                  <p className="scanner-confirmed-sub">Check your Dashboard &gt; Crop Treatments panel to mark it as done or skip.</p>
                  <button className="scanner-btn scanner-btn--primary" onClick={resetScanner} style={{ marginTop: '1rem' }}>
                    🔄 Scan Another Crop
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DIAGNOSTIC LOGS ── */}
      <div className="scanner-logs-card">
        <h3 className="scanner-logs-title">📅 Diagnostic History</h3>
        <p className="scanner-logs-sub">Tap a log entry to review its treatment details.</p>

        <div className="scanner-logs-list">
          {logs.map(log => {
            const sc = SEVERITY_COLORS[log.severityLevel] || SEVERITY_COLORS.info
            const isOpen = expandedLog === log.id
            return (
              <div key={log.id} className={`scanner-log-item ${isOpen ? 'open' : ''}`} style={{ borderColor: isOpen ? sc.border : '#e2e8f0' }}>
                <button className="scanner-log-header" onClick={() => setExpandedLog(isOpen ? null : log.id)}>
                  <div className="scanner-log-left">
                    {log.thumbnail && <img src={log.thumbnail} alt="" className="scanner-log-thumb" />}
                    <span className="scanner-log-dot" style={{ background: sc.color }} />
                    <div>
                      <p className="scanner-log-disease">{log.disease}</p>
                      <p className="scanner-log-date">{log.date}</p>
                    </div>
                  </div>
                  <div className="scanner-log-right">
                    <span className="scanner-log-badge" style={{ background: sc.bg, color: sc.color }}>{log.severity}</span>
                    <span className="scanner-log-badge scanner-log-badge--conf">🎯 {log.confidence}</span>
                    <span className="scanner-log-toggle">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="scanner-log-body">
                    <p><strong>Treatment Applied:</strong> {log.treatment}</p>
                    {log.dosage && <p><strong>Dosage:</strong> {log.dosage}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── NEAREST KRISHI KENDRA ── */}
      <div className="scanner-kendra-card">
        <h3 className="scanner-kendra-title">🏢 Nearest Krishi Vigyan Kendra</h3>
        <div className="scanner-kendra-grid">
          <div className="scanner-kendra-item">
            <span className="scanner-kendra-label">📍 Address</span>
            <strong>KVK Amritsar, PAU Regional Research Station, GT Road, Amritsar — 143001, Punjab</strong>
          </div>
          <div className="scanner-kendra-item">
            <span className="scanner-kendra-label">📞 Helpline</span>
            <strong><a href="tel:01832401960" style={{ color: 'inherit', textDecoration: 'underline' }}>0183-240-1960</a></strong>
          </div>
          <div className="scanner-kendra-item">
            <span className="scanner-kendra-label">📧 Email</span>
            <strong><a href="mailto:kvkamritsar@pau.edu" style={{ color: 'inherit', textDecoration: 'underline' }}>kvkamritsar@pau.edu</a></strong>
          </div>
          <div className="scanner-kendra-item">
            <span className="scanner-kendra-label">🕐 Hours</span>
            <strong>Mon–Sat: 9:00 AM – 5:00 PM</strong>
          </div>
        </div>
        <p className="scanner-kendra-note">💡 Visit your nearest KVK for free soil testing, seed distribution, and expert agronomic consultation.</p>
      </div>
    </div>
  )
}
