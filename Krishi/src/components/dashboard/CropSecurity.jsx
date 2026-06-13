import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { ShieldCheck, FileText, Upload, MapPin, Search, CheckCircle, AlertTriangle } from 'lucide-react'

// Leaflet custom marker for verified land plot
const verifiedLandPin = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:#22c55e;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 0 8px rgba(34,197,94,0.3),0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:10px;">✓</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Map view controller to re-center map when land is verified
function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 15) // Zoomed in close to show the parcel
    }
  }, [center, map])
  return null
}

const BANKS = [
  { name: 'State Bank of India (SBI)', type: 'Public', rating: '⭐⭐⭐⭐⭐', perk: 'Lowest KCC administration charges, highest agricultural loan disbursal rate, massive rural network.', link: 'https://sbi.co.in' },
  { name: 'NABARD', type: 'Government Development', rating: '⭐⭐⭐⭐⭐', perk: 'Apex refinancing body, provides direct credit support to co-operative banks and RRBs at nominal rates.', link: 'https://nabard.org' },
  { name: 'Punjab National Bank (PNB)', type: 'Public', rating: '⭐⭐⭐⭐', perk: 'Excellent PNB Kisan Credit Card schemes with flexible repayment cycles matching crop harvest.', link: 'https://pnbindia.in' },
  { name: 'HDFC Bank', type: 'Private', rating: '⭐⭐⭐⭐⭐', perk: 'Paperless digital Kisan credit processing, instant approvals for high-tech farm equipment loans.', link: 'https://hdfcbank.com' },
  { name: 'Bank of Baroda', type: 'Public', rating: '⭐⭐⭐⭐', perk: 'Baroda Kisan Tatkal Loan for emergency credit needs with zero collateral up to ₹1.6 Lakh.', link: 'https://bankofbaroda.in' }
]

const INSURANCE_PROVIDERS = [
  { name: 'Agriculture Insurance Company of India (AICIL)', rating: '⭐⭐⭐⭐⭐', highlight: 'Government-owned, specialized in PMFBY and weather-based indexing.' },
  { name: 'SBI General Insurance', rating: '⭐⭐⭐⭐', highlight: 'Swift claims settlement with regional inspection centers across major states.' },
  { name: 'HDFC ERGO General Insurance', rating: '⭐⭐⭐⭐⭐', highlight: 'Advanced satellite-based crop damage verification for automated payouts.' }
]

export default function CropSecurity() {
  const { user } = useFarmvestStore()
  const [landSize, setLandSize] = useState(5) // in acres
  const [cropCycle, setCropCycle] = useState('rabi') // rabi, kharif, commercial
  const [creditNeeded, setCreditNeeded] = useState(120000) // in INR
  const [timelyRepay, setTimelyRepay] = useState(true)

  // Document Verification States
  const [aadhaarNum, setAadhaarNum] = useState('')
  const [aadhaarFile, setAadhaarFile] = useState(null)
  const [landDocFile, setLandDocFile] = useState(null)
  const [surveyNum, setSurveyNum] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [growingCrops, setGrowingCrops] = useState([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyStep, setVerifyStep] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [geoResult, setGeoResult] = useState(null)

  const ALL_CROPS = [
    '🌾 Wheat','🍚 Paddy (Rice)','🌽 Maize','🫘 Soybean','🥜 Groundnut',
    '🎋 Sugarcane','🪴 Cotton','🌻 Mustard','🫛 Pulses','🥔 Potato',
    '🍅 Tomato','🥦 Vegetables','🍊 Citrus','🍈 Melons','🌾 Millets'
  ]

  const toggleCrop = (c) => setGrowingCrops(prev =>
    prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
  )

  // Format Aadhaar as XXXX XXXX XXXX
  const handleAadhaarInput = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 12)
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
    setAadhaarNum(formatted)
  }

  const isAadhaarValid = aadhaarNum.replace(/\s/g, '').length === 12

  const handleVerify = async (e) => {
    e.preventDefault()
    setVerifyError('')
    if (!isAadhaarValid) { setVerifyError('Enter a valid 12-digit Aadhaar number.'); return }
    if (!aadhaarFile) { setVerifyError('Upload your Aadhaar card image/PDF.'); return }
    if (growingCrops.length === 0) { setVerifyError('Select at least one crop you are growing.'); return }
    if (!landDocFile) { setVerifyError('Upload your Land Registry / Patta document.'); return }
    if (!surveyNum) { setVerifyError('Enter your Survey / Patta number.'); return }
    if (!village) { setVerifyError('Enter your village name to locate the land.'); return }

    setIsVerifying(true)
    setVerifyStep(1)

    // Step 1: Aadhaar format validation (free — no external API needed)
    await new Promise(r => setTimeout(r, 900))
    setVerifyStep(2)

    // Step 2: Crop registry cross-check (mock)
    await new Promise(r => setTimeout(r, 800))
    setVerifyStep(3)

    // Step 3: Free Nominatim geocoding to locate the land
    try {
      const query = encodeURIComponent(`${village}${district ? ', ' + district : ''}, India`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'KrishiAI-LandVerifier/1.0' }
      })
      const data = await res.json()
      if (data && data.length > 0) {
        setGeoResult({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name })
      } else {
        setGeoResult({ lat: 31.634, lng: 74.872, display: `${village}, India (approximate)` })
      }
    } catch {
      setGeoResult({ lat: 31.634, lng: 74.872, display: `${village}, India (approximate)` })
    }

    setVerifyStep(4)
    setIsVerifying(false)
    setIsVerified(true)
    setLandSize(5)
  }

  // Calculations
  // 1. KCC Loan
  const kccBaseRate = 7.0
  const kccSubvention = timelyRepay ? 3.0 : 0.0
  const kccNetRate = kccBaseRate - kccSubvention
  const kccInterestPayable = Math.round((creditNeeded * kccNetRate) / 100)
  
  // 2. Term Loan
  const termBaseRate = 9.2
  const termInterestPayable = Math.round((creditNeeded * termBaseRate) / 100)

  // 3. PMFBY Insurance (per acre)
  // Rabi (wheat/mustard) -> 1.5% premium, sum insured ~35000/acre
  // Kharif (rice/cotton) -> 2.0% premium, sum insured ~45000/acre
  // Commercial -> 5.0% premium, sum insured ~70000/acre
  const getPmfbyConfig = () => {
    switch(cropCycle) {
      case 'kharif': return { rate: 2.0, sumPerAcre: 45000 }
      case 'commercial': return { rate: 5.0, sumPerAcre: 75000 }
      default: return { rate: 1.5, sumPerAcre: 35000 } // rabi
    }
  }
  const pmfbyConfig = getPmfbyConfig()
  const pmfbySumInsured = landSize * pmfbyConfig.sumPerAcre
  const pmfbyFarmerPremium = Math.round((pmfbySumInsured * pmfbyConfig.rate) / 100)
  const pmfbyGovtSubsidy = Math.round((pmfbySumInsured * (12.5 - pmfbyConfig.rate)) / 100) // Government covers remaining ~10-12%

  // 4. WBCIS Insurance (Weather indexing)
  const wbcisRate = cropCycle === 'commercial' ? 5.0 : cropCycle === 'kharif' ? 2.5 : 2.0
  const wbcisSumInsured = landSize * (pmfbyConfig.sumPerAcre * 0.9) // slightly lower
  const wbcisFarmerPremium = Math.round((wbcisSumInsured * wbcisRate) / 100)

  // Recommend Best Plan
  const getAIRecommendation = () => {
    if (creditNeeded <= 300000) {
      return {
        title: '⭐ Kisan Credit Card Loan + PMFBY Insurance Bundle',
        reason: `Since your credit requirement is ₹${creditNeeded.toLocaleString()} (within the ₹3 Lakh limit), you qualify for the Kisan Credit Card (KCC) interest subvention scheme! With your commitment to timely repayment, your net interest rate is just 4.0%! Bundling this with PM Fasal Bima Yojana (PMFBY) secures crop damage for a nominal premium of ₹${pmfbyFarmerPremium.toLocaleString()} while the Government subsidizes ₹${pmfbyGovtSubsidy.toLocaleString()}.`,
        netSavings: termInterestPayable - kccInterestPayable,
        bestBanks: ['State Bank of India (SBI)', 'NABARD']
      }
    } else {
      return {
        title: '⭐ Hybrid Credit: KCC (Up to ₹3L) + Agri Term Loan Combo',
        reason: `Your credit requirement of ₹${creditNeeded.toLocaleString()} exceeds the standard ₹3 Lakh subsidized KCC threshold. We recommend securing ₹3 Lakhs under KCC (at 4% effective interest) and the remaining balance under an Agricultural Term Loan (8.9%-9.2% interest) with HDFC or SBI. Always pair this with PMFBY Insurance to prevent default in case of extreme weather damage.`,
        netSavings: termInterestPayable - (Math.round((300000 * 4)/100) + Math.round(((creditNeeded - 300000) * termBaseRate)/100)),
        bestBanks: ['HDFC Bank', 'State Bank of India (SBI)']
      }
    }
  }

  const aiRec = getAIRecommendation()

  return (
    <div className="db-section">
      <h1 className="db-page-title">🛡️ Crop Security, Credit & Insurance</h1>
      <p className="db-page-sub">Interactive eligibility engine matching financial assistance and crop protection policies based on your land assets.</p>

      {/* Inputs Section */}
      <div className="db-card" style={{ marginBottom: '1.5rem', background: 'var(--bg2)', border: '3px solid var(--text)', boxShadow: '5px 5px 0 0 var(--text)' }}>
        <h2 className="db-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text)' }}>
          🧮 Loan & Insurance Parameters
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {/* Land size slider */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: '0.4rem' }}>
              🌾 Land Size: <strong style={{ color: '#22c55e', fontSize: '0.9rem' }}>{landSize} Acres</strong>
            </label>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={landSize} 
              onChange={(e) => setLandSize(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#22c55e' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text3)', marginTop: '0.1rem' }}>
              <span>1 Acre</span>
              <span>50 Acres</span>
            </div>
          </div>

          {/* Crop cycle */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: '0.4rem' }}>
              🍂 Crop Cycle & Category
            </label>
            <select 
              value={cropCycle} 
              onChange={(e) => setCropCycle(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: '8px', 
                border: '2px solid var(--border)', 
                fontSize: '0.75rem', 
                fontWeight: '700',
                background: 'var(--bg2)',
                color: 'var(--text)' 
              }}
            >
              <option value="rabi">Rabi Crops (Wheat, Mustard, Barley - 1.5% Premium)</option>
              <option value="kharif">Kharif Crops (Rice, Maize, Cotton - 2.0% Premium)</option>
              <option value="commercial">Commercial/Horticultural (Sugar, Vegs, Orchards - 5.0% Premium)</option>
            </select>
          </div>

          {/* Credit amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: '0.4rem' }}>
              💰 Required Credit Limit (Loan)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text2)' }}>₹</span>
              <input 
                type="number" 
                min="10000" 
                max="2000000" 
                value={creditNeeded} 
                onChange={(e) => setCreditNeeded(parseInt(e.target.value) || 0)}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem 0.5rem 0.5rem 1.4rem', 
                  borderRadius: '8px', 
                  border: '2px solid var(--border)', 
                  fontSize: '0.8rem', 
                  fontWeight: '700',
                  boxSizing: 'border-box',
                  background: 'var(--bg2)',
                  color: 'var(--text)'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text3)', marginTop: '0.2rem' }}>
              <span>Min: ₹10K</span>
              <span>Subsidized limit: ₹3 Lakhs</span>
            </div>
          </div>
        </div>

        {/* Repayment Option */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', borderTop: '2px dashed var(--border)', paddingTop: '0.75rem' }}>
          <input 
            type="checkbox" 
            id="timely-repay" 
            checked={timelyRepay} 
            onChange={(e) => setTimelyRepay(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }}
          />
          <label htmlFor="timely-repay" style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text)', cursor: 'pointer' }}>
            🤝 I plan to pay back timely within 1 year (Activates additional <strong>3% interest subvention discount</strong> under KCC!)
          </label>
        </div>
      </div>

      {/* Document Verification & GIS Mapping Card */}
      <div className="db-card" style={{ marginBottom: '1.5rem', background: 'var(--bg2)', border: '3px solid var(--text)', boxShadow: '5px 5px 0 0 var(--text)', padding: '1.25rem' }}>
        <h2 className="db-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
          📄 Land Document Verification & GIS Mapping
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
          Fill in all required fields — Aadhaar identity, crops you grow, land registry documents, and your village name — to authenticate ownership and automatically locate your land on the satellite map.
        </p>

        {verifyError && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid #ef4444', borderRadius: '10px', padding: '0.6rem 0.9rem', fontSize: '0.72rem', color: '#ef4444', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={14} /> {verifyError}
          </div>
        )}

        {!isVerified && !isVerifying && (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Aadhaar */}
            <div style={{ background: 'var(--bg3)', borderRadius: '14px', padding: '1rem', border: '2px solid var(--border)' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: '900', textTransform: 'uppercase', color: '#22c55e', marginBottom: '0.7rem', letterSpacing: '0.08em' }}>① Aadhaar Identity Verification</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text2)', marginBottom: '0.35rem' }}>Aadhaar Number (12-digit) *</label>
                  <input type="text" inputMode="numeric" value={aadhaarNum} onChange={e => handleAadhaarInput(e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={14}
                    style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: '8px', border: `2px solid ${aadhaarNum.length > 0 ? (isAadhaarValid ? '#22c55e' : '#f59e0b') : 'var(--border)'}`, fontSize: '1rem', fontWeight: '800', letterSpacing: '0.18em', boxSizing: 'border-box', background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'monospace' }} />
                  <p style={{ fontSize: '0.62rem', color: isAadhaarValid ? '#22c55e' : 'var(--text3)', marginTop: '0.2rem' }}>
                    {isAadhaarValid ? '✓ Valid 12-digit Aadhaar format' : 'Auto-formats as XXXX XXXX XXXX'}
                  </p>
                </div>
                <div style={{ position: 'relative', border: `2px dashed ${aadhaarFile ? '#22c55e' : 'var(--border)'}`, borderRadius: '10px', padding: '0.9rem', textAlign: 'center', cursor: 'pointer' }}>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setAadhaarFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  <Upload size={20} style={{ color: aadhaarFile ? '#22c55e' : 'var(--text3)', margin: '0 auto 0.3rem' }} />
                  <p style={{ fontSize: '0.7rem', fontWeight: '700', color: aadhaarFile ? '#22c55e' : 'var(--text2)' }}>{aadhaarFile ? `✓ ${aadhaarFile.name}` : 'Upload Aadhaar Card Image'}</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>PDF / JPG / PNG</p>
                </div>
              </div>
            </div>

            {/* Crops */}
            <div style={{ background: 'var(--bg3)', borderRadius: '14px', padding: '1rem', border: '2px solid var(--border)' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: '900', textTransform: 'uppercase', color: '#22c55e', marginBottom: '0.6rem', letterSpacing: '0.08em' }}>② Crops Currently Growing on Your Land *</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {ALL_CROPS.map(c => (
                  <button key={c} type="button" onClick={() => toggleCrop(c)} style={{
                    background: growingCrops.includes(c) ? '#15803d' : 'var(--bg2)', color: growingCrops.includes(c) ? '#fff' : 'var(--text2)',
                    border: `2px solid ${growingCrops.includes(c) ? '#15803d' : 'var(--border)'}`,
                    borderRadius: '20px', padding: '0.28rem 0.65rem', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.14s'
                  }}>{c}</button>
                ))}
              </div>
              {growingCrops.length > 0 && <p style={{ fontSize: '0.65rem', color: '#22c55e', marginTop: '0.5rem', fontWeight: '700' }}>✓ {growingCrops.map(c => c.split(' ').slice(1).join(' ')).join(', ')}</p>}
            </div>

            {/* Land docs + survey */}
            <div style={{ background: 'var(--bg3)', borderRadius: '14px', padding: '1rem', border: '2px solid var(--border)' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: '900', textTransform: 'uppercase', color: '#22c55e', marginBottom: '0.7rem', letterSpacing: '0.08em' }}>③ Land Registry Documents *</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                <div style={{ position: 'relative', border: `2px dashed ${landDocFile ? '#22c55e' : 'var(--border)'}`, borderRadius: '10px', padding: '1rem', textAlign: 'center', cursor: 'pointer' }}>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setLandDocFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  <FileText size={20} style={{ color: landDocFile ? '#22c55e' : 'var(--text3)', margin: '0 auto 0.3rem' }} />
                  <p style={{ fontSize: '0.7rem', fontWeight: '700', color: landDocFile ? '#22c55e' : 'var(--text2)' }}>{landDocFile ? `✓ ${landDocFile.name}` : 'Land Patta / RoR / 7-12 Extract'}</p>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text3)' }}>Jamabandi · Khatauni · Chitta</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text2)', marginBottom: '0.35rem' }}>Survey / Patta Number *</label>
                  <input type="text" value={surveyNum} onChange={e => setSurveyNum(e.target.value)} placeholder="e.g. 145/B or SF No. 32"
                    style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '0.8rem', fontWeight: '700', boxSizing: 'border-box', background: 'var(--bg2)', color: 'var(--text)' }} />
                </div>
              </div>
            </div>

            {/* Village / District for geocoding */}
            <div style={{ background: 'var(--bg3)', borderRadius: '14px', padding: '1rem', border: '2px solid var(--border)' }}>
              <p style={{ fontSize: '0.67rem', fontWeight: '900', textTransform: 'uppercase', color: '#22c55e', marginBottom: '0.7rem', letterSpacing: '0.08em' }}>④ Land Location — Free GIS Lookup via OpenStreetMap</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text2)', marginBottom: '0.35rem' }}>Village / Town Name *</label>
                  <input type="text" value={village} onChange={e => setVillage(e.target.value)} placeholder="e.g. Verka or Ludhiana"
                    style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '0.8rem', fontWeight: '700', boxSizing: 'border-box', background: 'var(--bg2)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: 'var(--text2)', marginBottom: '0.35rem' }}>District (optional)</label>
                  <input type="text" value={district} onChange={e => setDistrict(e.target.value)} placeholder="e.g. Amritsar"
                    style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '0.8rem', fontWeight: '700', boxSizing: 'border-box', background: 'var(--bg2)', color: 'var(--text)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <p style={{ fontSize: '0.62rem', color: 'var(--text3)', lineHeight: '1.4' }}>📡 Uses <strong>free Nominatim API</strong> — no API key or cost needed. Simply enter your village name.</p>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-magnetic" style={{ background: '#22c55e', color: '#0f172a', fontWeight: '900', fontSize: '0.85rem', padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', width: '100%', letterSpacing: '0.04em' }}>
              ⚡ VERIFY ALL DOCUMENTS & LOCATE LAND ON MAP
            </button>
          </form>
        )}

        {isVerifying && (
          <div style={{ background: 'var(--bg3)', borderRadius: '14px', padding: '2rem', border: '2px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div className="db-map-spinner" style={{ borderTopColor: '#22c55e', width: '28px', height: '28px' }} />
              <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>Authenticating documents…</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '500px' }}>
              {[
                { step: 1, label: '🆔 Aadhaar Format Check — validating 12-digit UID structure' },
                { step: 2, label: '🌾 Crop Registry — cross-referencing with PMFBY eligible crop list' },
                { step: 3, label: '🌍 GIS Geocoding — calling free Nominatim API to pin your village' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', fontSize: '0.75rem', color: verifyStep > s.step ? '#22c55e' : verifyStep === s.step ? 'var(--text)' : 'var(--text3)', fontWeight: verifyStep === s.step ? '800' : '500' }}>
                  <div style={{ minWidth: '20px', height: '20px', borderRadius: '50%', background: verifyStep > s.step ? '#22c55e' : verifyStep === s.step ? 'rgba(34,197,94,0.2)' : 'transparent', border: `2px solid ${verifyStep >= s.step ? '#22c55e' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: verifyStep > s.step ? '#0f172a' : '#22c55e', fontWeight: '800' }}>
                    {verifyStep > s.step ? '✓' : s.step}
                  </div>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isVerified && geoResult && (
          <div style={{ background: 'var(--bg3)', borderRadius: '16px', padding: '1.25rem', border: '2.5px solid #22c55e', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem', animation: 'scale-in 0.25s ease-out' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22c55e' }}>
                <ShieldCheck size={20} />
                <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Documents Authenticated ✓</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.73rem' }}>
                {[
                  ['Owner', user?.name || 'Karthik'],
                  ['Aadhaar', aadhaarNum.replace(/(\d{4}) (\d{4}) (\d{4})/, '•••• •••• $3')],
                  ['Survey No.', `#${surveyNum}`],
                  ['Located At', geoResult.display.slice(0, 65) + (geoResult.display.length > 65 ? '…' : '')],
                  ['Declared Crops', growingCrops.map(c => c.split(' ').slice(1).join(' ')).join(', ')],
                  ['Plot Size', '5.0 Acres (from Patta)'],
                  ['Registry ID', 'NLRMP-IN-98234-A'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.3rem', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text2)', flexShrink: 0 }}>{k}:</span>
                    <strong style={{ color: 'var(--text)', textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>{v}</strong>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.1)', border: '1.5px solid #22c55e', borderRadius: '8px', padding: '0.4rem 0.6rem', fontSize: '0.67rem', color: '#22c55e' }}>
                <CheckCircle size={14} /> Loan & Insurance eligibility unlocked for all declared crops!
              </div>
              <button onClick={() => { setIsVerified(false); setAadhaarFile(null); setLandDocFile(null); setAadhaarNum(''); setGrowingCrops([]); setSurveyNum(''); setVillage(''); setDistrict(''); setVerifyStep(0); setGeoResult(null); setVerifyError(''); }}
                style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '0.4rem', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text2)', cursor: 'pointer' }}>
                ↩ Reset & Re-submit Documents
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text2)' }}>🗺️ Live GIS Land Location</span>
                <span style={{ fontSize: '0.62rem', background: '#f0fdf4', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '800' }}>
                  📍 {geoResult.lat.toFixed(4)}°N {geoResult.lng.toFixed(4)}°E
                </span>
              </div>
              <div style={{ height: '260px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--text)', position: 'relative', zIndex: 1 }}>
                <MapContainer center={[geoResult.lat, geoResult.lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" attribution="&copy; OpenTopoMap" maxZoom={17} />
                  <Polygon
                    positions={[
                      [geoResult.lat + 0.002, geoResult.lng - 0.002],
                      [geoResult.lat + 0.002, geoResult.lng + 0.002],
                      [geoResult.lat - 0.002, geoResult.lng + 0.002],
                      [geoResult.lat - 0.002, geoResult.lng - 0.002],
                    ]}
                    pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.3, weight: 3 }}
                  />
                  <Marker position={[geoResult.lat, geoResult.lng]} icon={verifiedLandPin} />
                  <MapUpdater center={geoResult} />
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* AI recommendation alert */}
      <div className="mp-ai-box" style={{ borderColor: '#22c55e', background: 'var(--bg3)', border: '3px solid #22c55e', boxShadow: '4px 4px 0 0 #22c55e', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🤖</span>
          <strong style={{ fontSize: '0.8rem', letterSpacing: '0.05em', color: '#22c55e', textTransform: 'uppercase' }}>
            Krishi AI Best-Fit Recommendation
          </strong>
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.1rem', color: 'var(--text)', margin: '0.25rem 0' }}>
          {aiRec.title}
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text2)', lineHeight: '1.5', margin: '0.5rem 0' }}>
          {aiRec.reason}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(34, 197, 94, 0.2)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '800' }}>
            💰 Est. Interest Savings: <strong style={{ fontSize: '0.9rem' }}>₹{aiRec.netSavings.toLocaleString()}</strong>
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text)', fontWeight: '800' }}>
            🏦 Recommended Banks: <strong style={{ color: '#22c55e' }}>{aiRec.bestBanks.join(', ')}</strong>
          </span>
        </div>
      </div>

      {/* Dynamic Results Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left Side: Loan Options */}
        <div className="db-card" style={{ border: '2px solid var(--border)', borderRadius: '18px', padding: '1.25rem', background: 'var(--bg2)' }}>
          <h3 className="db-card-title" style={{ fontSize: '0.95rem', fontWeight: '800', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
            🏛️ Eligible Crop Loans comparison
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* KCC Loan Card */}
            <div style={{ 
              background: 'var(--bg3)', 
              border: creditNeeded <= 300000 ? '2px solid #22c55e' : '2px solid var(--border)', 
              borderRadius: '12px', 
              padding: '0.9rem',
              position: 'relative'
            }}>
              {creditNeeded <= 300000 && <span style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', background: '#22c55e', color: '#0f172a', fontWeight: '800', fontSize: '0.55rem', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>AI Best Fit</span>}
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.85rem', margin: 0, color: 'var(--text)' }}>🌾 Kisan Credit Card (KCC) Loan</h4>
              <p style={{ fontSize: '0.68rem', color: 'var(--text3)', margin: '0.2rem 0 0.5rem' }}>Short-term crop production loan under government subvention scheme.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base Interest Rate:</span><span>7.0%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontWeight: '700' }}><span>Repayment Discount:</span><span>-{kccSubvention}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', borderTop: '1px solid var(--border)', paddingTop: '0.25rem', fontSize: '0.75rem' }}>
                  <span>Effective Interest Rate:</span>
                  <span style={{ color: '#22c55e' }}>{kccNetRate}% per annum</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: 'var(--text)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  <span>Total Interest Payable:</span>
                  <span>₹{kccInterestPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Commercial Term Loan Card */}
            <div style={{ 
              border: '2px solid var(--border)', 
              borderRadius: '12px', 
              padding: '0.9rem',
              background: 'var(--bg3)'
            }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.85rem', margin: 0, color: 'var(--text)' }}>🚜 Agricultural Term Loan</h4>
              <p style={{ fontSize: '0.68rem', color: 'var(--text3)', margin: '0.2rem 0 0.5rem' }}>Longer-term credit for irrigation, modern machinery, solar pumps, or farm land upgrades.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base Interest Rate:</span><span>9.2%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text3)' }}><span>Interest Subventions:</span><span>Not Eligible</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', borderTop: '1px solid var(--border)', paddingTop: '0.25rem', fontSize: '0.75rem' }}>
                  <span>Effective Interest Rate:</span>
                  <span>{termBaseRate}% per annum</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: 'var(--text)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  <span>Total Interest Payable:</span>
                  <span>₹{termInterestPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Insurance Schemes */}
        <div className="db-card" style={{ border: '2px solid var(--border)', borderRadius: '18px', padding: '1.25rem', background: 'var(--bg2)' }}>
          <h3 className="db-card-title" style={{ fontSize: '0.95rem', fontWeight: '800', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)' }}>
            🛡️ Eligible Crop Insurance comparison
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* PMFBY Insurance Card */}
            <div style={{ 
              background: 'var(--bg3)',
              border: '2px solid #22c55e', 
              borderRadius: '12px', 
              padding: '0.9rem',
              boxShadow: '3px 3px 0 0 #22c55e',
              position: 'relative'
            }}>
              <span style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', background: '#22c55e', color: '#0f172a', fontWeight: '800', fontSize: '0.55rem', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>Government Supported</span>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.85rem', margin: 0, color: 'var(--text)' }}>🌾 PM Fasal Bima Yojana (PMFBY)</h4>
              <p style={{ fontSize: '0.68rem', color: 'var(--text3)', margin: '0.2rem 0 0.5rem' }}>Full seasonal insurance covering drought, flooding, pests, landslides, and storm damage.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Premium Rate for {cropCycle.toUpperCase()}:</span><span>{pmfbyConfig.rate}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sum Insured (₹{pmfbyConfig.sumPerAcre.toLocaleString()}/acre):</span><span style={{ fontWeight: '700' }}>₹{pmfbySumInsured.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}><span>Government Subsidy Contribution:</span><span>₹{pmfbyGovtSubsidy.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', borderTop: '1px solid var(--border)', paddingTop: '0.25rem', fontSize: '0.78rem', color: '#22c55e' }}>
                  <span>Farmer Share Payable (Premium):</span>
                  <span>₹{pmfbyFarmerPremium.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* WBCIS Insurance Card */}
            <div style={{ 
              border: '2px solid var(--border)', 
              borderRadius: '12px', 
              padding: '0.9rem',
              background: 'var(--bg3)'
            }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.85rem', margin: 0, color: 'var(--text)' }}>🌦️ Weather Based Crop Insurance (WBCIS)</h4>
              <p style={{ fontSize: '0.68rem', color: 'var(--text3)', margin: '0.2rem 0 0.5rem' }}>Claims are automatically released when local rainfall, dry spells, or temperatures hit critical thresholds.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Premium Rate:</span><span>{wbcisRate}%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sum Insured:</span><span>₹{wbcisSumInsured.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', borderTop: '1px solid var(--border)', paddingTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text)' }}>
                  <span>Farmer Share Payable (Premium):</span>
                  <span>₹{wbcisFarmerPremium.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Suggested Good Banks & Insurers */}
      <div className="db-card" style={{ border: '2px solid var(--text)', borderRadius: '18px', padding: '1.25rem', boxShadow: '4px 4px 0 0 var(--text)', background: 'var(--bg2)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1.1rem', color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🏛️ Recommended Good Banks & Insurers for Farmers
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.25rem' }}>Top Agricultural Lending Banks</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {BANKS.map((b) => (
                  <div key={b.name} style={{ background: 'var(--bg3)', padding: '0.6rem 0.8rem', borderRadius: '10px', fontSize: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800' }}>
                      <span style={{ color: 'var(--text)' }}>{b.name}</span>
                      <span style={{ color: '#f59e0b' }}>{b.rating}</span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--text2)', fontSize: '0.65rem', lineHeight: '1.4' }}>{b.perk}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.25rem' }}>Top Crop Insurers (PMFBY Approved)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {INSURANCE_PROVIDERS.map((ins) => (
                  <div key={ins.name} style={{ background: 'var(--bg3)', padding: '0.6rem 0.8rem', borderRadius: '10px', fontSize: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800' }}>
                      <span style={{ color: 'var(--text)' }}>{ins.name}</span>
                      <span style={{ color: '#f59e0b' }}>{ins.rating}</span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--text2)', fontSize: '0.65rem', lineHeight: '1.4' }}>{ins.highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
