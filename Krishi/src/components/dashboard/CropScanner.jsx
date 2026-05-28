import { useState, useRef, useEffect } from 'react'

const MOCK_DISEASES = [
  {
    disease: 'Wheat Brown Rust (Puccinia recondita)',
    severity: 'Medium ⚠️',
    confidence: '94%',
    affectedArea: '18.5%',
    diagnosis: 'Fungal infection causing red-brown pustules on leaves, disrupting photosynthesis and reducing yield.',
    medications: {
      chemical: 'Propiconazole 25% EC (e.g., Tilt) or Tebuconazole 250 EC.',
      dosage: '1 ml per Litre of water (approx 200 ml per acre mixed in 200 Litres).',
      organic: 'Spray diluted Neem Oil (1500 PPM) mixed with a mild soap solution weekly.',
      precautions: 'Avoid sprinkler irrigation as standing moisture accelerates fungal spores. Spray in early morning or late evening.'
    }
  },
  {
    disease: 'Rice Blast (Magnaporthe oryzae)',
    severity: 'High 🚨',
    confidence: '98%',
    affectedArea: '32.1%',
    diagnosis: 'Highly destructive fungal pathogen causing spindle-shaped lesions with grey centers on leaves and neck rot.',
    medications: {
      chemical: 'Tricyclazole 75% WP (e.g., Beam) or Isoprothiolane 40% EC.',
      dosage: '0.6 g per Litre of water (or 120 g per acre in 200 Litres of water).',
      organic: 'Apply Pseudomonas fluorescens bio-formulation as foliar spray.',
      precautions: 'Immediately reduce nitrogenous fertilizer application. Drain excess water and maintain shallow soil moisture.'
    }
  },
  {
    disease: 'Tomato Late Blight (Phytophthora infestans)',
    severity: 'High 🚨',
    confidence: '91%',
    affectedArea: '24.0%',
    diagnosis: 'Water-soaked grey-green spots on leaves that turn brown-black, spreading rapidly under cool, humid conditions.',
    medications: {
      chemical: 'Metalaxyl 8% + Mancozeb 64% WP (e.g., Ridomil Gold) or Copper Oxychloride 50% WP.',
      dosage: '2.5 g per Litre of water (approx 500 g per acre).',
      organic: 'Foliar spray of Trichoderma harzianum or fresh Garlic extract solution.',
      precautions: 'Prune lower leaves to enhance air circulation. Destroy severely infected plant matter immediately (do not compost).'
    }
  },
  {
    disease: 'Cotton Leaf Curl Virus (CLCuV)',
    severity: 'Low 🌿',
    confidence: '89%',
    affectedArea: '6.2%',
    diagnosis: 'Viral pathogen transmitted by whiteflies, causing upward/downward curling of leaves and thickened veins.',
    medications: {
      chemical: 'No direct antiviral. Target vector (Whiteflies) using Acetamiprid 20% SP or Imidacloprid 17.8% SL.',
      dosage: '0.5 ml Imidacloprid per Litre of water to control vector propagation.',
      organic: 'Install yellow sticky traps (20 per acre) to trap whitefly vectors. Spray 5% Neem Seed Kernel Extract (NSKE).',
      precautions: 'Uproot and burn highly deformed plants to prevent whiteflies from transferring the virus to healthy sectors.'
    }
  }
]

export default function CropScanner() {
  const [streamActive, setStreamActive] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [result, setResult] = useState(null)
  const [logs, setLogs] = useState([
    {
      id: 1,
      date: '2026-05-27 15:40',
      fileName: 'wheat_field_sector_b.jpg',
      disease: 'Wheat Brown Rust (Puccinia recondita)',
      severity: 'Medium ⚠️',
      confidence: '94%',
      medications: {
        chemical: 'Propiconazole 25% EC (e.g., Tilt) or Tebuconazole 250 EC.',
        dosage: '1 ml per Litre of water.',
        organic: 'Spray diluted Neem Oil (1500 PPM) weekly.',
        precautions: 'Avoid sprinkler irrigation. Spray in early morning.'
      }
    },
    {
      id: 2,
      date: '2026-05-26 09:12',
      fileName: 'captured_cotton_leaf.png',
      disease: 'Cotton Leaf Curl Virus (CLCuV)',
      severity: 'Low 🌿',
      confidence: '89%',
      medications: {
        chemical: 'Control whiteflies using Acetamiprid 20% SP or Imidacloprid 17.8% SL.',
        dosage: '0.5 ml per Litre of water.',
        organic: 'Install yellow sticky traps (20 per acre). Spray 5% NSKE.',
        precautions: 'Uproot highly deformed plants.'
      }
    }
  ])
  const [selectedLog, setSelectedLog] = useState(null)
  const [hasRealStream, setHasRealStream] = useState(false)

  const videoRef = useRef(null)
  const fileInputRef = useRef(null)

  // Start webcam
  const startCamera = async () => {
    setUploadedImage(null)
    setResult(null)
    setHasRealStream(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setStreamActive(true)
        setHasRealStream(true)
      }
    } catch (err) {
      console.warn("Webcam not available, launching simulated camera viewport.", err)
      setStreamActive(true)
      setHasRealStream(false)
    }
  }

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
    }
    setStreamActive(false)
    setHasRealStream(false)
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      stopCamera()
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target.result)
        setResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // Trigger analysis
  const runAnalysis = () => {
    if (!uploadedImage && !streamActive) return
    
    setScanning(true)
    setScanStep(1)
    setResult(null)

    // Animated scan loading sequences
    setTimeout(() => setScanStep(2), 800)
    setTimeout(() => setScanStep(3), 1600)
    setTimeout(() => {
      // Pick random mock disease
      const mockIndex = Math.floor(Math.random() * MOCK_DISEASES.length)
      const selected = MOCK_DISEASES[mockIndex]
      
      const newLog = {
        id: Date.now(),
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        fileName: uploadedImage ? 'uploaded_leaf_sample.jpg' : 'live_camera_capture.png',
        disease: selected.disease,
        severity: selected.severity,
        confidence: selected.confidence,
        medications: selected.medications
      }

      setLogs(prev => [newLog, ...prev])
      setResult(selected)
      setScanning(false)
      setScanStep(0)
      stopCamera()
    }, 2500)
  }

  const handleCapture = () => {
    // Simulate capturing frame
    setUploadedImage('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23152d24"/><path d="M50 15 C35 35 15 50 50 85 C85 50 65 35 50 15 Z" fill="%2322c55e"/><circle cx="50" cy="45" r="3" fill="%23f59e0b"/><circle cx="42" cy="55" r="2" fill="%23f59e0b"/><circle cx="58" cy="52" r="2.5" fill="%23f59e0b"/></svg>')
    stopCamera()
  }

  return (
    <div className="db-section">
      <h1 className="db-page-title">🌿 Crop Scanner</h1>
      <p className="db-page-sub">Deploy multi-spectral computer vision to instantly diagnose leaf diseases and access target medication protocols.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left Side: Scanner viewport & upload options */}
        <div className="db-card" style={{ border: '3px solid #0f172a', borderRadius: '20px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white', boxShadow: '5px 5px 0 0 #0f172a' }}>
          <h2 className="db-card-title" style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            📷 AI Diagnostic Viewport
          </h2>

          <div style={{ position: 'relative', width: '100%', height: '280px', background: '#07111f', borderRadius: '14px', overflow: 'hidden', border: '2.5px solid #0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            {/* 1. Live stream (camera mode) */}
            {streamActive && !uploadedImage && (
              <>
                {hasRealStream ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0b1329', position: 'relative' }}>
                    <span style={{ fontSize: '3rem', animation: 'pulse 2s infinite' }}>🍃</span>
                    <p style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '800', marginTop: '0.5rem', marginInline: '1rem', textAlign: 'center' }}>SIMULATED VIEWPORT — TARGET ACQUIRED</p>
                    <p style={{ fontSize: '0.58rem', color: '#64748b' }}>Press "Capture Sample" to simulate capture</p>
                  </div>
                )}
                
                {/* Simulated viewfinder overlay */}
                <div style={{ position: 'absolute', border: '3px solid #22c55e', width: '200px', height: '200px', borderRadius: '16px', pointerEvents: 'none', opacity: 0.65 }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, transparent, #22c55e, transparent)', animation: 'shimmer 2s linear infinite' }} />
                <span style={{ position: 'absolute', bottom: '0.5rem', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: '700' }}>📡 CAMERA ACTIVE</span>
              </>
            )}

            {/* 2. Uploaded image preview */}
            {uploadedImage && (
              <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src={uploadedImage} alt="Crop sample" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {scanning && (
                  <div style={{ 
                    position: 'absolute', 
                    width: '100%', 
                    height: '6px', 
                    background: '#22c55e', 
                    boxShadow: '0 0 12px #22c55e', 
                    top: '0%', 
                    left: 0, 
                    animation: 'float-gentle 1.8s ease-in-out infinite' 
                  }} />
                )}
              </div>
            )}

            {/* 3. Empty State (No camera or upload) */}
            {!streamActive && !uploadedImage && (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🍃</span>
                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', margin: 0 }}>No Image Selected</p>
                <p style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.25rem' }}>Initiate live camera scanner or upload a crop leaf image file below.</p>
              </div>
            )}

            {/* Scanning overlay */}
            {scanning && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 17, 31, 0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#22c55e', gap: '0.5rem', padding: '1rem', zIndex: 10 }}>
                <div className="db-map-spinner" style={{ borderTopColor: '#22c55e' }} />
                <p style={{ fontSize: '0.75rem', fontWeight: '800', margin: 0 }}>
                  {scanStep === 1 ? '🧬 Fragmenting leaf structures…' : 
                   scanStep === 2 ? '🦠 Scanning chemical profiles…' : 
                   '🤖 Running neural diagnosis…'}
                </p>
                <div style={{ width: '120px', height: '4px', background: '#111b2d', borderRadius: '99px', overflow: 'hidden', marginTop: '0.25rem' }}>
                  <div style={{ height: '100%', background: '#22c55e', width: scanStep === 1 ? '33%' : scanStep === 2 ? '66%' : '95%', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!streamActive ? (
              <button 
                onClick={startCamera} 
                className="btn-magnetic" 
                style={{ 
                  flex: 1, 
                  background: '#22c55e', 
                  color: '#0f172a', 
                  fontWeight: '800', 
                  fontSize: '0.75rem', 
                  padding: '0.6rem', 
                  borderRadius: '10px',
                  cursor: 'pointer' 
                }}
              >
                📸 Launch Live Camera
              </button>
            ) : (
              <>
                <button 
                  onClick={handleCapture} 
                  className="btn-magnetic" 
                  style={{ 
                    flex: 1.2, 
                    background: '#3b82f6', 
                    color: 'white', 
                    fontWeight: '800', 
                    fontSize: '0.75rem', 
                    padding: '0.6rem', 
                    borderRadius: '10px',
                    cursor: 'pointer' 
                  }}
                >
                  ⚡ Capture Sample
                </button>
                <button 
                  onClick={stopCamera} 
                  style={{ 
                    flex: 0.8, 
                    background: '#ef4444', 
                    color: 'white', 
                    fontWeight: '800', 
                    fontSize: '0.75rem', 
                    padding: '0.6rem', 
                    borderRadius: '10px', 
                    border: '2px solid #0f172a',
                    cursor: 'pointer' 
                  }}
                >
                  ✕ Close
                </button>
              </>
            )}

            <button 
              onClick={() => fileInputRef.current.click()} 
              style={{ 
                flex: 1, 
                background: '#f1f5f9', 
                border: '2px solid #0f172a', 
                fontWeight: '800', 
                fontSize: '0.75rem', 
                padding: '0.6rem', 
                borderRadius: '10px', 
                color: '#0f172a',
                cursor: 'pointer' 
              }}
            >
              📤 Upload Leaf Image
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              style={{ display: 'none' }}
            />
          </div>

          {(uploadedImage || streamActive) && !scanning && (
            <button 
              onClick={runAnalysis} 
              className="btn-magnetic" 
              style={{ 
                background: '#0f172a', 
                color: '#22c55e', 
                fontWeight: '900', 
                fontSize: '0.8rem', 
                padding: '0.75rem', 
                borderRadius: '10px', 
                border: '3px solid #22c55e',
                cursor: 'pointer',
                marginTop: '0.25rem' 
              }}
            >
              🧬 RUN AI LEAF DISEASE DIAGNOSIS
            </button>
          )}
        </div>

        {/* Right Side: Diagnosis results display */}
        <div className="db-card" style={{ border: '2px solid #e2e8f0', borderRadius: '20px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white' }}>
          <h2 className="db-card-title" style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            🔬 Diagnosis & Treatment Output
          </h2>

          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              
              {/* Core metrics */}
              <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '900', textTransform: 'uppercase', background: '#ef4444', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>AI DISEASE DETECTED</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.15rem', color: '#0f172a', margin: '0.25rem 0' }}>{result.disease}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', display: 'block', fontWeight: '800' }}>SEVERITY</span>
                    <strong style={{ fontSize: '0.75rem', color: '#ef4444' }}>{result.severity}</strong>
                  </div>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', display: 'block', fontWeight: '800' }}>CONFIDENCE</span>
                    <strong style={{ fontSize: '0.75rem', color: '#22c55e' }}>{result.confidence}</strong>
                  </div>
                  <div style={{ background: 'white', padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', display: 'block', fontWeight: '800' }}>SURFACE AREA</span>
                    <strong style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{result.affectedArea}</strong>
                  </div>
                </div>
              </div>

              {/* Diagnosis rationale */}
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Pathology & Impact</span>
                <p style={{ fontSize: '0.72rem', color: '#334155', margin: '0.25rem 0 0', lineHeight: '1.4' }}>{result.diagnosis}</p>
              </div>

              {/* Medications recommended */}
              <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#22c55e', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>💊 Recommended Medications</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.7rem' }}>
                  <div style={{ background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                    <strong>🧪 Chemical Treatment:</strong>
                    <p style={{ margin: '0.1rem 0 0', color: '#166534' }}>{result.medications.chemical}</p>
                    <small style={{ color: '#166534', fontWeight: '700' }}>Dosage: {result.medications.dosage}</small>
                  </div>

                  <div style={{ background: '#fef9c3', padding: '0.5rem 0.75rem', borderRadius: '8px', borderLeft: '3px solid #eab308' }}>
                    <strong>🌿 Organic Remedy:</strong>
                    <p style={{ margin: '0.1rem 0 0', color: '#854d0e' }}>{result.medications.organic}</p>
                  </div>

                  <div style={{ background: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                    <strong>⚠️ Agricultural Precaution:</strong>
                    <p style={{ margin: '0.1rem 0 0', color: '#1e40af' }}>{result.medications.precautions}</p>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', textAlign: 'center', color: '#94a3b8' }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block' }}>🔬</span>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', margin: '0.5rem 0 0' }}>Awaiting Scan Sample</p>
                <p style={{ fontSize: '0.65rem', color: '#64748b' }}>Results, confidence values and target crop treatments will render here post scanning.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── PERSISTENT SCAN HISTORY LOGS ── */}
      <div className="db-card" style={{ border: '2px solid #0f172a', borderRadius: '20px', padding: '1.25rem', boxShadow: '4px 4px 0 0 #0f172a' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          📅 Diagnostic Logs History
        </h3>
        <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '-0.4rem', marginBottom: '1rem' }}>
          Select a historical log entry below to fetch and display the detailed recommended medications and treatment sheets.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.map((log) => (
            <div 
              key={log.id} 
              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                background: selectedLog?.id === log.id ? '#f0fdf4' : '#f8fafc',
                border: selectedLog?.id === log.id ? '2.5px solid #22c55e' : '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>📅</span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>{log.date}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#0f172a' }}>{log.disease}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.55rem', fontWeight: '800', background: '#fee2e2', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    {log.severity}
                  </span>
                  <span style={{ fontSize: '0.55rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    🎯 {log.confidence}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: '800' }}>
                    {selectedLog?.id === log.id ? 'Collapse ▲' : 'View Medications ▼'}
                  </span>
                </div>
              </div>

              {/* Collapsible medication list */}
              {selectedLog?.id === log.id && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  background: 'white', 
                  border: '1.5px solid #22c55e', 
                  borderRadius: '10px', 
                  padding: '0.75rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  animation: 'scale-in 0.2s ease-out' 
                }}>
                  <h4 style={{ margin: 0, fontSize: '0.72rem', fontWeight: '900', color: '#15803d', borderBottom: '1px solid #dcfce7', paddingBottom: '0.25rem' }}>
                    📋 Recommended Treatment Protocol for {log.disease}
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', fontSize: '0.68rem' }}>
                    <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '8px' }}>
                      <strong style={{ color: '#15803d' }}>🧪 Chemical Fungicide/Pesticide:</strong>
                      <p style={{ margin: '0.1rem 0 0', color: '#166534' }}>{log.medications.chemical}</p>
                      <p style={{ margin: '0.1rem 0 0', fontWeight: '700', color: '#166534' }}>Dosage: {log.medications.dosage}</p>
                    </div>

                    <div style={{ background: '#fef9c3', padding: '0.5rem', borderRadius: '8px' }}>
                      <strong style={{ color: '#854d0e' }}>🌿 Organic / Natural Solution:</strong>
                      <p style={{ margin: '0.1rem 0 0', color: '#854d0e' }}>{log.medications.organic}</p>
                    </div>
                  </div>

                  <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '8px', fontSize: '0.65rem' }}>
                    <strong style={{ color: '#1e40af' }}>⚠️ Crucial Agricultural Safeguards:</strong>
                    <p style={{ margin: '0.1rem 0 0', color: '#1e40af' }}>{log.medications.precautions}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
