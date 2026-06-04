import { useState, useRef, useEffect, useCallback } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const SEVERITY_COLORS = {
  critical: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  warning:  { bg: '#fef9c3', color: '#b45309', border: '#fcd34d' },
  info:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  healthy:  { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
}

function dataURLtoFile(dataURL, filename) {
  const [header, data] = dataURL.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new File([arr], filename, { type: mime })
}

export default function CropScanner({ onTreatmentSelected }) {
  const [cameraState, setCameraState]     = useState('idle')
  const [cameraError, setCameraError]     = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [cropHint, setCropHint]           = useState('')

  const [scanning, setScanning]   = useState(false)
  const [scanStep, setScanStep]   = useState(0)
  const [scanError, setScanError] = useState('')
  const [result, setResult]       = useState(null)

  const [selectedTreatment, setSelectedTreatment] = useState(null)
  const [treatmentSent, setTreatmentSent]         = useState(false)

  const [logs, setLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('krishi_scan_logs') || '[]') }
    catch { return [] }
  })
  const [expandedLog, setExpandedLog] = useState(null)

  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const fileInputRef = useRef(null)
  const canvasRef   = useRef(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const stopCamera = useCallback(() => {
    stopStream(); setCameraState('idle'); setCameraError('')
  }, [stopStream])

  const startCamera = useCallback(async () => {
    setCameraError(''); setCameraState('requesting'); setScanError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('simulated')
      setCameraError('Camera API unavailable — using simulated viewport.')
      return
    }
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setCameraState('active')
    } catch (err) {
      const msgs = {
        NotAllowedError:  'Camera permission denied.',
        NotFoundError:    'No camera found on this device.',
        NotReadableError: 'Camera is in use by another app.',
      }
      setCameraError((msgs[err.name] || 'Camera unavailable.') + ' Using simulated viewport.')
      setCameraState('simulated')
    }
  }, [])

  useEffect(() => {
    if (cameraState === 'active' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(() => {})
    }
  }, [cameraState])

  useEffect(() => { startCamera(); return () => stopStream() }, [startCamera, stopStream])

  const captureFrame = useCallback(() => {
    setScanError('')
    const video = videoRef.current, canvas = canvasRef.current
    if (!canvas) return
    if (cameraState === 'active' && video) {
      canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480
      canvas.getContext('2d').drawImage(video, 0, 0)
    } else {
      canvas.width = 640; canvas.height = 480
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#0d1f0d'; ctx.fillRect(0, 0, 640, 480)
      ctx.font = '60px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🍃', 320, 260)
    }
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.85))
    setUploadedImage(null); setResult(null); setSelectedTreatment(null); setTreatmentSent(false)
    stopStream(); setCameraState('idle')
  }, [cameraState, stopStream])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    stopCamera(); setScanError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result)
      setCapturedImage(null); setResult(null); setSelectedTreatment(null); setTreatmentSent(false)
    }
    reader.readAsDataURL(file); e.target.value = ''
  }

  /* ── REAL AI ANALYSIS via backend ── */
  const runAnalysis = async () => {
    const img = capturedImage || uploadedImage
    if (!img) return
    setScanning(true); setScanStep(1); setScanError(''); setResult(null)
    setSelectedTreatment(null); setTreatmentSent(false)

    try {
      setScanStep(2)
      const imageFile = dataURLtoFile(img, 'crop-scan.jpg')
      setScanStep(3)

      const form = new FormData()
      form.append('image', imageFile)
      form.append('crop_name', cropHint || '')
      form.append('language', 'en')

      const token = localStorage.getItem('krishi_access_token')
      const res = await fetch(`${BASE}/ai/diagnose`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server returned ${res.status}`)
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      let msg = err.message || 'Unknown error'
      if (err.name === 'TypeError' || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('failed')) {
        msg = 'Cannot reach Krishi AI server. Make sure the Python backend is running on port 8000 (run: uvicorn main:app --reload in server_python/).'
      }
      setScanError(msg)
    } finally {
      setScanning(false); setScanStep(0)
    }
  }

  const confirmTreatment = () => {
    if (!result || !selectedTreatment) return
    const activeImage = capturedImage || uploadedImage
    const logEntry = {
      id: Date.now(), date: new Date().toLocaleString('en-IN'),
      disease: result.disease, plantType: result.plantType || '—',
      severity: result.severity, severityLevel: result.severityLevel,
      confidence: result.confidence, treatment: selectedTreatment.name,
      dosage: selectedTreatment.dosage, thumbnail: activeImage || null,
    }
    const newLogs = [logEntry, ...logs]
    setLogs(newLogs)
    localStorage.setItem('krishi_scan_logs', JSON.stringify(newLogs))
    if (onTreatmentSelected) onTreatmentSelected({ ...logEntry, urgency: result.severityLevel, treatmentLabel: selectedTreatment.label, status: 'pending' })
    setTreatmentSent(true)
  }

  const resetScanner = () => {
    stopCamera(); setCapturedImage(null); setUploadedImage(null); setResult(null)
    setScanError(''); setSelectedTreatment(null); setTreatmentSent(false)
    setScanning(false); setScanStep(0); setCropHint('')
  }

  const activeImage = capturedImage || uploadedImage
  const sevStyle = result ? (SEVERITY_COLORS[result.severityLevel] || SEVERITY_COLORS.info) : null

  return (
    <div className="db-section scanner-section">
      <div className="scanner-page-header">
        <div>
          <h1 className="db-page-title">🌿 Crop Scanner</h1>
          <p className="db-page-sub">AI-powered plant disease detection — powered by Gemini Vision. Capture or upload a crop leaf image.</p>
        </div>
        {(activeImage || result) && (
          <button className="scanner-reset-btn" onClick={resetScanner}>🔄 New Scan</button>
        )}
      </div>

      {/* Step indicator */}
      <div className="scanner-steps">
        {['Capture / Upload', 'AI Analysis', 'Select Treatment', 'Dashboard'].map((s, i) => {
          const step = i + 1
          const done = (step===1&&activeImage)||(step===2&&result)||(step===3&&treatmentSent)||(step===4&&treatmentSent)
          const active = (step===1&&!activeImage&&!result)||(step===2&&activeImage&&!result)||(step===3&&result&&!treatmentSent)
          return (
            <div key={s} className={`scanner-step ${done?'done':active?'active':''}`}>
              <div className="scanner-step-dot">{done?'✓':step}</div>
              <span className="scanner-step-label">{s}</span>
              {i<3&&<div className="scanner-step-line"/>}
            </div>
          )
        })}
      </div>

      <div className="scanner-main-grid">
        {/* LEFT: Viewport */}
        <div className="scanner-viewport-card">
          <h2 className="scanner-card-title">📷 Diagnostic Viewport</h2>

          <div style={{background:'rgba(34,197,94,0.08)',border:'1.5px solid rgba(34,197,94,0.25)',borderRadius:'10px',padding:'0.6rem 0.9rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.78rem',color:'var(--text)'}}>
            <span>🌱</span>
            <span><strong>Plant images only.</strong> Point camera at leaves, stems, or affected crop areas.</span>
          </div>

          {cameraError && <div className="scanner-cam-error"><span>⚠️</span><span>{cameraError}</span></div>}

          {scanError && (
            <div style={{background:'#fee2e2',border:'2px solid #fca5a5',borderRadius:'10px',padding:'0.75rem 1rem',marginBottom:'0.75rem',display:'flex',alignItems:'flex-start',gap:'0.6rem',fontSize:'0.82rem',color:'#dc2626'}}>
              <span style={{fontSize:'1.2rem'}}>🚫</span>
              <div>
                <strong>Scan Failed</strong>
                <p style={{margin:'0.2rem 0 0',lineHeight:1.4}}>{scanError}</p>
              </div>
            </div>
          )}

          <div className="scanner-viewport">
            {cameraState==='idle'&&!activeImage&&(
              <div className="scanner-empty-state">
                <span className="scanner-empty-icon">🍃</span>
                <p className="scanner-empty-title">No Image Selected</p>
                <p className="scanner-empty-sub">Launch camera or upload a crop leaf image below.</p>
              </div>
            )}
            {cameraState==='requesting'&&(
              <div className="scanner-empty-state">
                <div className="db-map-spinner" style={{borderTopColor:'#22c55e'}}/>
                <p className="scanner-empty-title" style={{color:'#22c55e'}}>Requesting camera access…</p>
                <p className="scanner-empty-sub">Please allow camera permission in your browser.</p>
              </div>
            )}
            {cameraState==='active'&&(
              <>
                <video ref={videoRef} autoPlay playsInline muted className="scanner-video"/>
                <div className="scanner-viewfinder"/><div className="scanner-scan-line"/>
                <span className="scanner-live-badge">📡 LIVE</span>
              </>
            )}
            {cameraState==='simulated'&&(
              <div className="scanner-simulated">
                <span style={{fontSize:'3.5rem',animation:'pulse 2s infinite'}}>🍃</span>
                <p className="scanner-sim-label">SIMULATED VIEWPORT</p>
                <p className="scanner-sim-sub">Press "Capture Sample" or upload a plant image</p>
                <div className="scanner-viewfinder scanner-viewfinder--sim"/>
                <div className="scanner-scan-line"/>
              </div>
            )}
            {activeImage&&cameraState!=='active'&&(
              <div className="scanner-img-wrap">
                <img src={activeImage} alt="Crop sample" className="scanner-img"/>
                {scanning&&<div className="scanner-scan-beam"/>}
              </div>
            )}
            {scanning&&(
              <div className="scanner-overlay">
                <div className="db-map-spinner" style={{borderTopColor:'#22c55e',width:'2.5rem',height:'2.5rem'}}/>
                <p className="scanner-overlay-text">
                  {scanStep===1?'🧬 Preparing image…':scanStep===2?'📡 Uploading to AI server…':'🤖 Gemini Vision analyzing…'}
                </p>
                <div className="scanner-progress-bar">
                  <div className="scanner-progress-fill" style={{width:`${scanStep*33}%`}}/>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{display:'none'}}/>

          <div className="scanner-actions">
            {cameraState==='idle'&&(
              <button className="scanner-btn scanner-btn--primary" onClick={startCamera}>📸 Launch Camera</button>
            )}
            {(cameraState==='active'||cameraState==='simulated')&&(
              <>
                <button className="scanner-btn scanner-btn--capture" onClick={captureFrame}>⚡ Capture Sample</button>
                <button className="scanner-btn scanner-btn--danger" onClick={stopCamera}>✕ Close Camera</button>
              </>
            )}
            {cameraState==='requesting'&&(
              <button className="scanner-btn scanner-btn--disabled" disabled>⏳ Waiting…</button>
            )}
            <button className="scanner-btn scanner-btn--upload" onClick={()=>fileInputRef.current?.click()}>📤 Upload Image</button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}}/>
          </div>

          {/* Crop hint */}
          {activeImage && !scanning && !result && (
            <div style={{marginTop:'0.75rem'}}>
              <input
                type="text"
                placeholder="Optional: Enter crop name (e.g. Wheat, Tomato, Rice)…"
                value={cropHint}
                onChange={e=>setCropHint(e.target.value)}
                style={{width:'100%',boxSizing:'border-box',padding:'0.55rem 0.85rem',borderRadius:'8px',border:'1.5px solid var(--border)',background:'var(--card-bg)',color:'var(--text)',fontSize:'0.82rem',outline:'none'}}
              />
            </div>
          )}

          {activeImage&&!scanning&&!result&&(
            <button className="scanner-btn scanner-btn--analyze" onClick={runAnalysis}>
              🧬 RUN AI PLANT DISEASE DIAGNOSIS
            </button>
          )}
          {result&&!treatmentSent&&(
            <p className="scanner-hint">👉 Select your preferred treatment on the right, then confirm to add to your dashboard.</p>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="scanner-result-card">
          <h2 className="scanner-card-title">🔬 AI Diagnosis &amp; Treatment</h2>

          {!result&&!scanning&&(
            <div className="scanner-await">
              <span style={{fontSize:'2.5rem'}}>🔬</span>
              <p className="scanner-await-title">Awaiting Scan</p>
              <p className="scanner-await-sub">
                Capture or upload a <strong>plant or leaf image</strong>, then click <strong>RUN AI DIAGNOSIS</strong>.<br/>
                Real Gemini Vision analysis will appear here. No dummy data is shown.
              </p>
            </div>
          )}

          {result&&(
            <div className="scanner-result-body">
              {result.plantType&&(
                <div style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',background:'rgba(34,197,94,0.1)',border:'1.5px solid rgba(34,197,94,0.3)',borderRadius:'99px',padding:'0.3rem 0.75rem',marginBottom:'0.75rem',fontSize:'0.78rem',fontWeight:700,color:'#15803d'}}>
                  🌱 {result.plantType}
                </div>
              )}

              {result._note&&(
                <div style={{background:'#fef9c3',border:'1.5px solid #fcd34d',borderRadius:'8px',padding:'0.5rem 0.75rem',marginBottom:'0.75rem',fontSize:'0.75rem',color:'#92400e'}}>
                  ℹ️ {result._note}
                </div>
              )}

              <div className="scanner-disease-box" style={{background:sevStyle.bg,borderColor:sevStyle.border}}>
                <span className="scanner-ai-badge">GEMINI AI DETECTED</span>
                <h3 className="scanner-disease-name">{result.disease}</h3>
                <div className="scanner-metrics">
                  <div className="scanner-metric">
                    <span className="scanner-metric-label">Severity</span>
                    <strong style={{color:sevStyle.color}}>{result.severity}</strong>
                  </div>
                  <div className="scanner-metric">
                    <span className="scanner-metric-label">Confidence</span>
                    <strong style={{color:'#22c55e'}}>{result.confidence}</strong>
                  </div>
                  <div className="scanner-metric">
                    <span className="scanner-metric-label">Affected</span>
                    <strong style={{color:'#3b82f6'}}>{result.affectedArea}</strong>
                  </div>
                </div>
                <p className="scanner-diagnosis-text">{result.diagnosis}</p>
              </div>

              {result.additionalNotes&&(
                <div style={{background:'rgba(59,130,246,0.06)',border:'1.5px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'0.75rem 1rem',marginBottom:'1rem',fontSize:'0.8rem',color:'var(--text)',lineHeight:1.5}}>
                  <strong style={{color:'#2563eb'}}>📋 Additional Observations:</strong>
                  <p style={{margin:'0.3rem 0 0'}}>{result.additionalNotes}</p>
                </div>
              )}

              {result.severityLevel==='healthy'&&(
                <div style={{background:'#f0fdf4',border:'2px solid #86efac',borderRadius:'12px',padding:'1.25rem',textAlign:'center',marginBottom:'1rem'}}>
                  <span style={{fontSize:'2.5rem'}}>🌟</span>
                  <p style={{fontWeight:800,color:'#15803d',margin:'0.5rem 0 0.25rem'}}>Plant is Healthy!</p>
                  <p style={{fontSize:'0.82rem',color:'#166534',margin:0}}>{result.precaution}</p>
                </div>
              )}

              {!treatmentSent&&result.treatments?.length>0&&(
                <>
                  <p className="scanner-select-label">💊 Select Treatment Protocol:</p>
                  <div className="scanner-treatment-list">
                    {result.treatments.map(t=>(
                      <button
                        key={t.id}
                        className={`scanner-treatment-opt ${selectedTreatment?.id===t.id?'selected':''}`}
                        style={{background:selectedTreatment?.id===t.id?t.bg:'white',borderColor:selectedTreatment?.id===t.id?t.border:'#e2e8f0'}}
                        onClick={()=>setSelectedTreatment(t)}
                      >
                        <div className="scanner-treat-header">
                          <span className="scanner-treat-label" style={{color:t.color}}>{t.label}</span>
                          {selectedTreatment?.id===t.id&&<span className="scanner-treat-check">✓ Selected</span>}
                        </div>
                        <p className="scanner-treat-name">{t.name}</p>
                        <p className="scanner-treat-dosage">📏 {t.dosage}</p>
                      </button>
                    ))}
                  </div>
                  {result.precaution&&(
                    <div className="scanner-precaution">
                      <strong>⚠️ Precaution:</strong><p>{result.precaution}</p>
                    </div>
                  )}
                  {selectedTreatment&&(
                    <button className="scanner-btn scanner-btn--confirm" onClick={confirmTreatment}>
                      ✅ Confirm &amp; Send to Dashboard
                    </button>
                  )}
                </>
              )}

              {treatmentSent&&(
                <div className="scanner-confirmed">
                  <span style={{fontSize:'2.5rem'}}>✅</span>
                  <h3>Treatment Added to Dashboard!</h3>
                  <p><strong>{selectedTreatment?.name}</strong></p>
                  <p className="scanner-confirmed-sub">Check Dashboard → Crop Treatments to mark it done or skip.</p>
                  <button className="scanner-btn scanner-btn--primary" onClick={resetScanner} style={{marginTop:'1rem'}}>🔄 Scan Another Crop</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diagnostic History */}
      <div className="scanner-logs-card">
        <h3 className="scanner-logs-title">📅 Scan History</h3>
        <p className="scanner-logs-sub">Completed AI scans from real diagnoses.</p>
        {logs.length===0?(
          <div style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)',background:'var(--card-bg)',borderRadius:'12px',border:'1.5px dashed var(--border)'}}>
            <span style={{fontSize:'2rem'}}>📋</span>
            <p style={{margin:'0.5rem 0 0',fontSize:'0.85rem'}}>No scans yet. Run your first AI plant diagnosis above.</p>
          </div>
        ):(
          <div className="scanner-logs-list">
            {logs.map(log=>{
              const sc=SEVERITY_COLORS[log.severityLevel]||SEVERITY_COLORS.info
              const isOpen=expandedLog===log.id
              return(
                <div key={log.id} className={`scanner-log-item ${isOpen?'open':''}`} style={{borderColor:isOpen?sc.border:'#e2e8f0'}}>
                  <button className="scanner-log-header" onClick={()=>setExpandedLog(isOpen?null:log.id)}>
                    <div className="scanner-log-left">
                      {log.thumbnail&&<img src={log.thumbnail} alt="" className="scanner-log-thumb"/>}
                      <span className="scanner-log-dot" style={{background:sc.color}}/>
                      <div>
                        <p className="scanner-log-disease">{log.disease}</p>
                        <p className="scanner-log-date">{log.date} · {log.plantType}</p>
                      </div>
                    </div>
                    <div className="scanner-log-right">
                      <span className="scanner-log-badge" style={{background:sc.bg,color:sc.color}}>{log.severity}</span>
                      <span className="scanner-log-badge scanner-log-badge--conf">🎯 {log.confidence}</span>
                      <span className="scanner-log-toggle">{isOpen?'▲':'▼'}</span>
                    </div>
                  </button>
                  {isOpen&&(
                    <div className="scanner-log-body">
                      <p><strong>Treatment Applied:</strong> {log.treatment}</p>
                      {log.dosage&&<p><strong>Dosage:</strong> {log.dosage}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* KVK Info */}
      <div className="scanner-kendra-card">
        <h3 className="scanner-kendra-title">🏢 Nearest Krishi Vigyan Kendra</h3>
        <div className="scanner-kendra-grid">
          <div className="scanner-kendra-item"><span className="scanner-kendra-label">📍 Address</span><strong>KVK Amritsar, PAU Regional Research Station, GT Road, Amritsar — 143001, Punjab</strong></div>
          <div className="scanner-kendra-item"><span className="scanner-kendra-label">📞 Helpline</span><strong><a href="tel:01832401960" style={{color:'inherit',textDecoration:'underline'}}>0183-240-1960</a></strong></div>
          <div className="scanner-kendra-item"><span className="scanner-kendra-label">📧 Email</span><strong><a href="mailto:kvkamritsar@pau.edu" style={{color:'inherit',textDecoration:'underline'}}>kvkamritsar@pau.edu</a></strong></div>
          <div className="scanner-kendra-item"><span className="scanner-kendra-label">🕐 Hours</span><strong>Mon–Sat: 9:00 AM – 5:00 PM</strong></div>
        </div>
        <p className="scanner-kendra-note">💡 Visit your nearest KVK for free soil testing, seed distribution, and expert agronomic consultation.</p>
      </div>
    </div>
  )
}
