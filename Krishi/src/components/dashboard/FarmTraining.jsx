import { useState, useEffect } from 'react'

const CROP_GUIDES = [
  {
    id: 'wheat', name: 'Wheat', emoji: '🌾', season: 'Rabi (Oct–Mar)',
    duration: '120–150 days', yield: '25–40 qtl/acre', color: '#f59e0b',
    steps: [
      { title: 'Land Preparation', desc: 'Deep plough 2–3 times. Last ploughing with rotavator. Apply 8–10 tonnes FYM per acre before sowing.' },
      { title: 'Seed Selection & Treatment', desc: 'Use HD-2967, PBW-343, or GW-322 varieties. Treat seeds with Thiram 2.5g/kg or Carboxin to prevent seed-borne diseases.' },
      { title: 'Sowing', desc: 'Sow at 100kg/acre using a seed drill at 22cm row spacing, 5cm depth. Optimal soil temperature: 20–25°C.' },
      { title: 'Irrigation', desc: '4–6 irrigations: Crown Root Initiation (21 days), Tillering (45 days), Jointing (65 days), Flowering (85 days), Grain Filling (105 days).' },
      { title: 'Fertilization', desc: 'N:P:K = 50:25:12 kg/acre. Apply half Nitrogen at sowing, rest at first irrigation. Full P & K at sowing as basal dose.' },
      { title: 'Pest & Disease Control', desc: 'Watch for Yellow Rust (spray Propiconazole 25%), Aphids (Imidacloprid 0.5ml/L), and Loose Smut (Carboxin seed treatment).' },
      { title: 'Harvesting', desc: 'Harvest when grain moisture is 14–20%. Use combine harvester. Thresh and store in cool, dry conditions below 12% moisture.' },
    ]
  },
  {
    id: 'rice', name: 'Rice (Paddy)', emoji: '🍚', season: 'Kharif (Jun–Nov)',
    duration: '100–130 days', yield: '18–28 qtl/acre', color: '#22c55e',
    steps: [
      { title: 'Nursery Preparation', desc: 'Prepare 1m-wide raised nursery beds. Sow pre-soaked seeds at 40kg/acre. Apply basal dose of DAP 100g/sq.m.' },
      { title: 'Transplanting', desc: 'Transplant 25–30 day old seedlings at 20×15cm spacing, 2–3 seedlings per hill. Flood field 2–3 days before transplanting.' },
      { title: 'Water Management', desc: 'Maintain 5cm standing water during first 3 weeks. Alternate drying and flooding (AWD) saves 30% water. Drain 15 days before harvest.' },
      { title: 'Fertilization', desc: 'Apply 50kg N, 25kg P, 12kg K per acre. Apply N in 3 splits: basal, active tillering (25 days), and panicle initiation (55 days).' },
      { title: 'Weed Control', desc: 'Apply Butachlor 1.5kg/acre or Pretilachlor within 3 days of transplanting. Manual weeding at 30 days if needed.' },
      { title: 'Pest & Disease', desc: 'Stem borer: Chlorpyrifos 20 EC; Brown plant hopper: Buprofezin; Blast: Tricyclazole 75% WP at 0.6g/L water.' },
      { title: 'Harvesting', desc: 'Harvest when 80–85% grains are straw-colored (28–32 days after flowering). Dry paddy to 12–14% moisture before storage.' },
    ]
  },
  {
    id: 'cotton', name: 'Cotton', emoji: '🪴', season: 'Kharif (May–Dec)',
    duration: '160–180 days', yield: '8–15 qtl/acre', color: '#a855f7',
    steps: [
      { title: 'Land Preparation', desc: 'Deep summer ploughing to 30cm. Apply 5 tonnes FYM. Level and prepare firm seedbed. Ensure proper drainage channels.' },
      { title: 'Seed & Variety', desc: 'Use Bt Cotton hybrids: MRC-7377, Ankur 651. Seed rate: 800g/acre. Treat with Imidacloprid 70% WS for early pest control.' },
      { title: 'Sowing', desc: 'Sow at 90×60cm spacing (paired rows recommended). Seed depth: 3–4cm. Optimal soil temperature: 20–30°C.' },
      { title: 'Irrigation', desc: 'Critical stages: Germination, Bud formation, Flowering, Boll development. 6–8 irrigations total. Avoid waterlogging at any stage.' },
      { title: 'Nutrient Management', desc: 'N:P:K = 32:16:16 kg/acre for irrigated cotton. Apply N in 3 splits. Zinc Sulfate at 5kg/acre to prevent deficiency.' },
      { title: 'Pest Management', desc: 'Major pests: Pink Bollworm, Whitefly, Jassids. Spray Spinosad, Emamectin. Install pheromone traps at 5 per acre for monitoring.' },
      { title: 'Picking', desc: 'Pick fully opened bolls in 3–5 rounds. Avoid rain-wetted cotton picking. Pack in breathable jute bags. Remove green locks.' },
    ]
  },
  {
    id: 'mustard', name: 'Mustard', emoji: '🌻', season: 'Rabi (Oct–Feb)',
    duration: '110–130 days', yield: '8–12 qtl/acre', color: '#eab308',
    steps: [
      { title: 'Land Preparation', desc: 'One deep ploughing followed by 2 cultivations. Well-leveled field essential for uniform germination. Light sandy-loam to loam preferred.' },
      { title: 'Variety Selection', desc: 'Varieties: Pusa Bold (eruca), Varuna, Kranti, RH-749. Seed rate: 2–2.5 kg/acre.' },
      { title: 'Sowing', desc: 'Optimal sowing: 1st–15th October. Row spacing: 30–45cm, depth: 2–3cm. Use seed drill.' },
      { title: 'Irrigation', desc: '2–3 irrigations: at branching (25 days), flowering (55 days), and pod formation (80 days).' },
      { title: 'Fertilization', desc: 'N:P:K = 40:20:10 kg/acre as basal. Apply 10kg Sulfur (Gypsum) for oil content improvement.' },
      { title: 'Pest & Disease', desc: 'Aphid: Dimethoate 30 EC; Alternaria Leaf spot: Mancozeb 75% WP; White Rust: Metalaxyl+Mancozeb.' },
      { title: 'Harvesting', desc: 'Harvest when 75% pods turn golden-yellow. Cut, bundle, and sun dry 3–4 days before threshing.' },
    ]
  },
  {
    id: 'sugarcane', name: 'Sugarcane', emoji: '🎋', season: 'Year-round (Feb–Mar)',
    duration: '300–365 days', yield: '300–400 qtl/acre', color: '#059669',
    steps: [
      { title: 'Soil & Trenching', desc: 'Requires fertile clay loam soil with good drainage. Open trenches at 90cm spacing.' },
      { title: 'Sett Treatment', desc: 'Select healthy 3-budded setts. Treat with Carbendazim (0.1%) to prevent red rot disease.' },
      { title: 'Planting', desc: 'Place setts horizontally in trenches, cover with 5cm soil. Water immediately.' },
      { title: 'Earthing Up', desc: 'Earth up twice: at 45 days (partial) and 120 days (full) to prevent plant lodging.' },
      { title: 'Harvesting', desc: 'Harvest when bottom leaves dry and Brix hydrometer reading is 18–20%.' }
    ]
  },
  {
    id: 'maize', name: 'Maize (Corn)', emoji: '🌽', season: 'Kharif & Rabi',
    duration: '95–115 days', yield: '20–30 qtl/acre', color: '#f59e0b',
    steps: [
      { title: 'Sowing', desc: 'Sow at 8kg/acre. Spacing: 60×20cm at 4-5cm depth. Apply FYM basal dose.' },
      { title: 'Irrigation', desc: 'Highly sensitive to waterlogging. Irrigate at knee-high, tasseling, and silking stages.' },
      { title: 'Fertilization', desc: 'N:P:K = 60:30:30 kg/acre. Split Nitrogen into 3 doses: basal, knee-high, and silking.' },
      { title: 'Harvesting', desc: 'Harvest when husk turns yellow/papery and grains have a dark moisture layer.' }
    ]
  },
  {
    id: 'soybean', name: 'Soybean', emoji: '🫘', season: 'Kharif (Jun–Sep)',
    duration: '90–105 days', yield: '8–12 qtl/acre', color: '#10b981',
    steps: [
      { title: 'Seed Inoculation', desc: 'Treat seeds with Rhizobium culture (200g/10kg seeds) to enhance nitrogen fixation.' },
      { title: 'Sowing', desc: 'Sow at 30kg/acre with 45×10cm spacing. Maintain 3-4cm depth in moist seedbed.' },
      { title: 'Nutrients', desc: 'Apply basal N:P:K = 8:32:16 kg/acre. Soybean fixes its own nitrogen, so limit nitrogenous fertilizer.' },
      { title: 'Harvesting', desc: 'Harvest when leaves fall off and pods turn brown. Shake pods: seeds should rattle inside.' }
    ]
  },
  {
    id: 'groundnut', name: 'Groundnut', emoji: '🥜', season: 'Kharif (Jun–Oct)',
    duration: '110–125 days', yield: '10–15 qtl/acre', color: '#b45309',
    steps: [
      { title: 'Soil Selection', desc: 'Prefers well-drained, sandy loam soil. Heavy soils restrict pod expansion.' },
      { title: 'Sowing', desc: 'Sow at 40kg kernels/acre at 30×10cm spacing, 5cm depth.' },
      { title: 'Gypsum Application', desc: 'Apply Gypsum (200 kg/acre) at pegging stage (45 days) to supply Calcium for pod development.' },
      { title: 'Harvesting', desc: 'Dig out vines when leaf spot occurs or inside of pod shell turns black.' }
    ]
  },
  {
    id: 'millets', name: 'Millets (Bajra/Jowar)', emoji: '🌾', season: 'Kharif (Jun–Sep)',
    duration: '80–90 days', yield: '12–18 qtl/acre', color: '#84cc16',
    steps: [
      { title: 'Land Preparation', desc: 'Requires fine seedbed. Tolerates poor, drought-prone soils. Excellent for arid zones.' },
      { title: 'Sowing & Thinning', desc: 'Sow at 1.5-2kg/acre, spacing 45×15cm. Thin out weak seedlings at 15 days.' },
      { title: 'Weed Control', desc: 'Intercultivate twice at 20 and 40 days using hoe to preserve soil moisture.' },
      { title: 'Harvesting', desc: 'Harvest when grains turn hard (moisture below 20%). Cut panicles first.' }
    ]
  },
  {
    id: 'potato', name: 'Potato', emoji: '🥔', season: 'Rabi (Oct–Feb)',
    duration: '90–120 days', yield: '80–120 qtl/acre', color: '#a1a1aa',
    steps: [
      { title: 'Seed Preparation', desc: 'Use certified disease-free seed tubers (30-45g each) with healthy eyes.' },
      { title: 'Sowing & Ridges', desc: 'Plant tubers on ridges spaced at 60cm, with 20cm spacing between tubers.' },
      { title: 'Earthing Up', desc: 'Build up soil around stems at 25 and 45 days to prevent tubers from turning green.' },
      { title: 'Harvesting', desc: 'Stop watering 10 days before harvest. Cut vines (dehaulming) to harden tuber skins.' }
    ]
  },
  {
    id: 'pulses', name: 'Pulses (Gram/Lentils)', emoji: '🫛', season: 'Rabi & Kharif',
    duration: '110–130 days', yield: '6–8 qtl/acre', color: '#16a34a',
    steps: [
      { title: 'Sowing', desc: 'Sow at 15-20kg/acre. Deep sowing (8cm) protects against wilt disease.' },
      { title: 'Rhizobium Treatment', desc: 'Treat seeds with Rhizobium and PSB cultures to maximize phosphate solubility.' },
      { title: 'Watering', desc: 'Requires minimal water. 1-2 light irrigations at pre-flowering and pod filling.' },
      { title: 'Harvesting', desc: 'Harvest when leaves turn yellow and pods dry out completely to straw color.' }
    ]
  }
]

const LIVESTOCK_GUIDES = [
  {
    id: 'cow', name: 'Dairy Cow', emoji: '🐄',
    breed: 'Holstein-Friesian, Sahiwal, Gir',
    yield: '15–30 L/day (HF), 8–12 L (Desi)',
    color: '#3b82f6',
    steps: [
      { title: 'Housing', desc: 'Provide 40–50 sq.ft per cow. Well-ventilated concrete flooring with proper slope. Shade in summer.' },
      { title: 'Feeding', desc: 'Dry roughage: 5–8 kg/day. Green fodder: 20–25 kg/day. Concentrate: 1kg per 2.5L milk produced.' },
      { title: 'Milking Routine', desc: 'Milk twice daily at 12-hour intervals. Clean udder with warm water before milking.' },
      { title: 'Vaccination', desc: 'FMD (Foot & Mouth) every 6 months. Black Quarter (BQ) and HS before monsoon annually.' },
      { title: 'Breeding', desc: 'Artificial Insemination preferred. Optimal breeding time: 12–18 hours after heat onset.' },
    ]
  },
  {
    id: 'buffalo', name: 'Buffalo', emoji: '🐃',
    breed: 'Murrah, Surti, Mehsana',
    yield: '10–18 L milk/day, 6–7% fat',
    color: '#475569',
    steps: [
      { title: 'Wallowing Pond', desc: 'Allow 30–60 minutes wallowing daily. Buffaloes have fewer sweat glands and need water to cool down.' },
      { title: 'Housing', desc: 'Provide 50–60 sq.ft per buffalo. Roof must have high thermal insulation to avoid heat stress.' },
      { title: 'Feeding', desc: 'Excellent roughage converters. Provide 30kg green fodder and 1kg concentrate per 3L milk.' },
      { title: 'Vaccination', desc: 'Regular FMD, HS, BQ schedules. Brucellosis vaccine for young calves once in lifetime.' },
    ]
  },
  {
    id: 'goat', name: 'Goat Farming', emoji: '🐐',
    breed: 'Boer, Beetal, Sirohi, Sirohi cross',
    yield: '1–3 L milk/day; Meat: 15–25 kg',
    color: '#f59e0b',
    steps: [
      { title: 'Elevated Housing', desc: 'Raised wooden platform housing prevents foot rot and parasite ingestion cycles.' },
      { title: 'Feeding', desc: 'Browsers by nature. Provide shrubs, tree leaves (Subabul), dry hay, and mineral blocks.' },
      { title: 'Deworming', desc: 'Deworm every 3 months. Alternate deworming formulas to prevent parasite immunity.' },
      { title: 'Vaccination', desc: 'PPR vaccine every 3 years. Enterotoxemia and Goat Pox vaccine annually.' },
    ]
  },
  {
    id: 'poultry', name: 'Poultry Farming', emoji: '🐔',
    breed: 'Broiler: Cobb-400; Layer: BV-300; Desi: Kadaknath',
    yield: 'Broiler: 2kg/40 days; Layer: 300 eggs/yr',
    color: '#f97316',
    steps: [
      { title: 'Shed Orientation', desc: 'Build shed in East-West direction to prevent direct sun glare. Maintain dry litter.' },
      { title: 'Brooding (Week 1)', desc: 'Maintain 35°C under artificial heat lamps. Cold drafts will kill chicks.' },
      { title: 'Disease Management', desc: 'Newcastle (Ranikhet) vaccine at day 5 & 21. Strictly control human entry.' },
      { title: 'Marketing', desc: 'Sell broilers at 42 days. Grade and collect eggs 3 times daily; keep at 15°C.' },
    ]
  },
]

// Map Soil / Geolocation Region to suitable Crop IDs and Livestock IDs
const REGION_SUITABLE_MAP = [
  {
    soilName: 'Alluvial Soil Plains (Northern India)',
    crops: ['wheat', 'rice', 'mustard', 'sugarcane', 'maize'],
    livestock: ['cow', 'buffalo', 'poultry']
  },
  {
    soilName: 'Black Cotton Soil Belt (Central/Deccan India)',
    crops: ['cotton', 'soybean', 'maize', 'wheat', 'groundnut'],
    livestock: ['goat', 'buffalo', 'poultry']
  },
  {
    soilName: 'Red and Yellow Soil Region (Eastern/Southern India)',
    crops: ['groundnut', 'millets', 'maize', 'pulses', 'potato'],
    livestock: ['goat', 'poultry', 'cow']
  }
]

export default function FarmTraining() {
  const [activeCategory, setActiveCategory] = useState('crops')
  const [expandedId, setExpandedId] = useState(null)
  const [expandedStep, setExpandedStep] = useState(null)

  // Location-based states
  const [userPos, setUserPos] = useState({ lat: 31.634, lng: 74.872 }) // default Amritsar (Alluvial)
  const [soilIndex, setSoilIndex] = useState(0)
  const [locationName, setLocationName] = useState('Alluvial Soil Plains (Northern India)')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  const fetchLocation = () => {
    setLocating(true)
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by this browser. Defaulting to Amritsar APMC region.')
      setLocating(false)
      determineRegion(31.634, 74.872)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserPos({ lat, lng })
        determineRegion(lat, lng)
        setLocating(false)
      },
      () => {
        setLocationError('Access denied / timeout. Using fallback Amritsar region.')
        determineRegion(31.634, 74.872)
        setLocating(false)
      },
      { timeout: 6000 }
    )
  }

  const determineRegion = (lat, lng) => {
    let idx = 2
    let name = 'Red & Yellow Soil Region (Eastern/Southern India)'
    if (lat > 28) {
      idx = 0
      name = 'Alluvial Soil Plains (Northern India)'
    } else if (lat > 16 && lat < 26 && lng > 72 && lng < 81) {
      idx = 1
      name = 'Black Cotton Soil Belt (Central/Deccan India)'
    }
    setSoilIndex(idx)
    setLocationName(name)
  }

  useEffect(() => {
    fetchLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeRegion = REGION_SUITABLE_MAP[soilIndex]
  const filteredCrops = CROP_GUIDES.filter(c => activeRegion.crops.includes(c.id))
  const filteredLivestock = LIVESTOCK_GUIDES.filter(l => activeRegion.livestock.includes(l.id))
  const guides = activeCategory === 'crops' ? filteredCrops : filteredLivestock

  return (
    <div className="db-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.2rem' }}>
        <h1 className="db-page-title" style={{ margin: 0 }}>🎓 Farm Training Academy</h1>
        <button 
          onClick={fetchLocation} 
          disabled={locating}
          className="nm-locate-btn"
          style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
        >
          {locating ? '📡 Scanning Location…' : '📍 Sync Location'}
        </button>
      </div>

      <div style={{ 
        background: 'rgba(34,197,94,0.06)', 
        border: '1.5px solid rgba(34,197,94,0.2)', 
        borderRadius: '12px', 
        padding: '0.75rem 1rem', 
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
          📍 Current Zone: <strong style={{ color: '#22c55e' }}>{locationName}</strong>
          <span style={{ fontSize: '0.7rem', color: 'var(--text3)', display: 'block', marginTop: '0.1rem' }}>
            Showing only agricultural varieties native to your location coordinates ({userPos.lat.toFixed(3)}°N, {userPos.lng.toFixed(3)}°E).
          </span>
        </div>
        {locationError && (
          <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>⚠️ {locationError}</span>
        )}
      </div>

      {/* Category Tabs */}
      <div className="ft-tabs">
        <button
          onClick={() => { setActiveCategory('crops'); setExpandedId(null) }}
          className={`ft-tab-btn ${activeCategory === 'crops' ? 'active-crop' : ''}`}
        >
          🌾 Crop Growing Guides ({filteredCrops.length})
        </button>
        <button
          onClick={() => { setActiveCategory('livestock'); setExpandedId(null) }}
          className={`ft-tab-btn ${activeCategory === 'livestock' ? 'active-live' : ''}`}
        >
          🐄 Livestock & Poultry ({filteredLivestock.length})
        </button>
      </div>

      {/* Guide Cards Grid */}
      <div className="ft-grid">
        {guides.map(guide => (
          <div
            key={guide.id}
            className="ft-guide-card"
            style={{ 
              borderColor: expandedId === guide.id ? guide.color : undefined, 
              boxShadow: expandedId === guide.id ? `4px 4px 0 0 ${guide.color}` : undefined 
            }}
          >
            {/* Card Header Button */}
            <button
              onClick={() => { setExpandedId(expandedId === guide.id ? null : guide.id); setExpandedStep(null) }}
              className="ft-card-btn"
            >
              <div className="ft-card-header">
                <span className="ft-guide-emoji">{guide.emoji}</span>
                <div style={{ flex: 1 }}>
                  <h3 className="ft-guide-title">{guide.name}</h3>
                  <div className="ft-meta-row">
                    <span className="ft-meta-chip" style={{ background: `${guide.color}18`, color: guide.color, border: `1px solid ${guide.color}40` }}>
                      {activeCategory === 'crops' ? `🗓️ ${guide.season}` : `🐾 ${guide.breed.split(',')[0]}`}
                    </span>
                    <span className="ft-meta-chip ft-meta-neutral">
                      {activeCategory === 'crops' ? `⏱️ ${guide.duration}` : `📊 ${guide.yield.split(';')[0]}`}
                    </span>
                  </div>
                </div>
                <span className="ft-chevron" style={{ color: guide.color, transform: expandedId === guide.id ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>
              <div className="ft-yield-bar" style={{ background: `${guide.color}12` }}>
                <span>💰 Yield: {guide.yield}</span>
                <span style={{ color: guide.color, fontWeight: '700' }}>View {guide.steps.length} steps →</span>
              </div>
            </button>

            {/* Expanded Steps */}
            {expandedId === guide.id && (
              <div className="ft-steps" style={{ borderTopColor: `${guide.color}40` }}>
                {guide.steps.map((step, idx) => (
                  <div key={idx}>
                    <button
                      onClick={() => setExpandedStep(expandedStep === `${guide.id}-${idx}` ? null : `${guide.id}-${idx}`)}
                      className="ft-step-btn"
                      style={{
                        background: expandedStep === `${guide.id}-${idx}` ? `${guide.color}12` : undefined,
                        borderColor: expandedStep === `${guide.id}-${idx}` ? guide.color : undefined,
                      }}
                    >
                      <span className="ft-step-num" style={{ background: guide.color }}>{idx + 1}</span>
                      <span className="ft-step-title">{step.title}</span>
                      <span style={{ fontSize: '0.7rem', color: guide.color }}>{expandedStep === `${guide.id}-${idx}` ? '▲' : '▼'}</span>
                    </button>
                    {expandedStep === `${guide.id}-${idx}` && (
                      <div className="ft-step-desc" style={{ borderLeftColor: guide.color, background: `${guide.color}08` }}>
                        {step.desc}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Footer */}
      <div className="ft-help-footer">
        <span style={{ fontSize: '2rem' }}>💡</span>
        <div>
          <strong className="ft-help-title">Need Expert Advice?</strong>
          <p className="ft-help-desc">
            Contact your nearest Krishi Vigyan Kendra (KVK) or call the Kisan Call Centre at{' '}
            <strong>1800-180-1551</strong> (toll-free, 24×7) for personalized guidance on crop selection, soil health and livestock management.
          </p>
        </div>
      </div>
    </div>
  )
}
