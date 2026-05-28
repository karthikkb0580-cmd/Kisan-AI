import { useState } from 'react'

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
      { title: 'Variety Selection', desc: 'Varieties: Pusa Bold (eruca), Varuna, Kranti, RH-749. Erucic acid-free varieties preferred for edible use. Seed rate: 2–2.5 kg/acre.' },
      { title: 'Sowing', desc: 'Optimal sowing: 1st–15th October. Row spacing: 30–45cm, depth: 2–3cm. Broadcasting reduces yield — use seed drill.' },
      { title: 'Irrigation', desc: '2–3 irrigations: at branching (25 days), flowering (55 days), and pod formation (80 days). Excess water at flowering causes flower drop.' },
      { title: 'Fertilization', desc: 'N:P:K = 40:20:10 kg/acre as basal. Apply 10kg Sulfur (Gypsum) for oil content improvement. Boron foliar spray at 0.5% at flowering.' },
      { title: 'Pest & Disease', desc: 'Aphid: Dimethoate 30 EC; Alternaria Leaf spot: Mancozeb 75% WP; White Rust: Metalaxyl+Mancozeb. Monitor from January.' },
      { title: 'Harvesting', desc: 'Harvest when 75% pods turn golden-yellow. Cut and bundle, sun dry 3–4 days, then thresh. Seeds should have 8–10% moisture for storage.' },
    ]
  },
]

const LIVESTOCK_GUIDES = [
  {
    id: 'cow', name: 'Dairy Cow', emoji: '🐄',
    breed: 'Holstein-Friesian, Sahiwal, Gir',
    yield: '15–30 L/day (HF), 8–12 L (Desi)',
    color: '#3b82f6',
    steps: [
      { title: 'Housing', desc: 'Provide 40–50 sq.ft per cow. Well-ventilated, clean concrete flooring with proper slope for drainage. Shade in summer, wind protection in winter.' },
      { title: 'Feeding', desc: 'Dry roughage: 5–8 kg/day. Green fodder: 20–25 kg/day. Concentrate: 1kg per 2.5L milk produced. Always provide salt lick blocks and fresh water.' },
      { title: 'Milking Routine', desc: 'Milk twice daily at fixed 12-hour intervals. Clean udder with warm water before milking. Use strip cup test to detect mastitis early. Complete milking within 5 minutes.' },
      { title: 'Vaccination Schedule', desc: 'FMD (Foot & Mouth): every 6 months. BQ (Black Quarter): annually before monsoon. HS (Hemorrhagic Septicemia): before monsoon. Anthrax: annually in endemic areas.' },
      { title: 'Health Monitoring', desc: 'Healthy signs: Bright eyes, wet muzzle, good appetite, firm normal dung. Warning signs: Lethargy, reduced milk output, nasal discharge, off-feed behavior.' },
      { title: 'Breeding', desc: 'Heat signs: restlessness, vulva swelling, mucus discharge, standing to be mounted. Artificial Insemination preferred. Optimal time: 12–18 hours after heat onset.' },
    ]
  },
  {
    id: 'buffalo', name: 'Buffalo', emoji: '🐃',
    breed: 'Murrah, Surti, Mehsana, Jaffarabadi',
    yield: '10–18 L milk/day, 6–7% fat',
    color: '#475569',
    steps: [
      { title: 'Housing & Wallowing', desc: 'Provide wallow pond or large water tank — essential for body temperature regulation. 50–60 sq.ft space per animal. Shade trees or roof mandatory.' },
      { title: 'Feeding', desc: 'Efficient roughage converters. Green fodder: 30–35 kg/day. Dry roughage: 5–7 kg. Concentrate: 1kg/3L milk. High-fiber TMR (Total Mixed Ration) recommended.' },
      { title: 'Daily Wallowing', desc: 'Allow 30–60 minutes daily wallowing in clean mud/water. Prevents heat stress (buffaloes have fewer sweat glands), ticks, and skin parasites. Critical in summer.' },
      { title: 'Milking', desc: 'Milk 2–3× daily. Buffalo milk has 6–7% fat — excellent for ghee, paneer, and khoa. Allow calf to suckle 2 minutes before milking to fully let down milk.' },
      { title: 'Vaccination', desc: 'Same as cattle: FMD, HS, BQ. Additionally: Brucellosis vaccination for heifers 4–8 months old in endemic zones (one-time lifetime vaccination).' },
      { title: 'Breeding & Reproduction', desc: 'Silent heat common — watch for vulva swelling, clear mucus, tail raising. Murrah breed has excellent dairy genetics. AI available through NDDB network centers.' },
    ]
  },
  {
    id: 'goat', name: 'Goat Farming', emoji: '🐐',
    breed: 'Boer, Beetal, Sirohi, Jakhrana, Black Bengal',
    yield: '1–3 L milk/day; Meat: 15–25 kg/adult',
    color: '#f59e0b',
    steps: [
      { title: 'Housing Setup', desc: 'Elevated platform (2–3 ft) housing prevents hoof diseases and internal parasite cycles. 10–15 sq.ft per goat. Separate pens for kids, pregnant does, and bucks.' },
      { title: 'Feeding', desc: 'Goats prefer browsing. Provide tree leaves, shrubs, kitchen waste, and crop residues. Concentrate: 200–300g/day for milking does. Mineral mixture essential year-round.' },
      { title: 'Deworming & Hoof Care', desc: 'Deworm every 3 months with Albendazole 7.5mg/kg or Ivermectin 0.2mg/kg. Trim hooves every 3 months. Rotate dewormers to prevent resistance.' },
      { title: 'Vaccination', desc: 'PPR (Goat Plague): Every 3 years. FMD: Twice yearly. Enterotoxemia (Clostridium): Annual. Goat Pox: Annual in endemic regions. Maintain vaccination records.' },
      { title: 'Breeding', desc: 'First breeding: 7–8 months (minimum 15–18 kg weight). Gestation: 148–152 days. Buck ratio: 1:25 does. Twin births common in Beetal and Sirohi breeds.' },
      { title: 'Economics', desc: 'Low investment, quick returns in 18 months. 10 does + 1 buck can return ₹1.5–2 Lakh/year through meat, milk, and manure. Festival season commands 2× market price.' },
    ]
  },
  {
    id: 'poultry', name: 'Poultry Farming', emoji: '🐔',
    breed: 'Broiler: Cobb-400; Layer: BV-300, Hy-Line; Desi: Kadaknath',
    yield: 'Broiler: 2kg/40 days; Layer: 300–320 eggs/year',
    color: '#f97316',
    steps: [
      { title: 'Shed Setup', desc: 'Orient shed East-West. Space: 1 sq.ft/broiler, 2 sq.ft/layer. Litter: 4–5 inches dry rice husk. Install cross-ventilation curtains. Biosecurity gate and footbath mandatory.' },
      { title: 'Brooding (0–4 weeks)', desc: 'Day 1–7: 35°C. Reduce 2.5°C per week until 21°C. Use electric/gas brooders. Check chick distribution — huddling means cold, spreading away means hot.' },
      { title: 'Feed Management', desc: 'Broiler: Prestarter → Starter (0–18d) → Grower (18–28d) → Finisher (28–slaughter). Layer: Phase feeding with 3.5–4% calcium in layer mash. Always fresh, clean water.' },
      { title: 'Vaccination', desc: 'Newcastle (Lasota F1): Day 5 & 21 (eye drop). Gumboro (IBD): Day 14 & 21. Marek\'s Disease: At hatchery level. Fowl Pox: Day 28 (wing web method). Maintain cold chain.' },
      { title: 'Disease Control', desc: 'Ranikhet: Sudden death, nervous twisting. CRD: Gurgling respiratory sounds — treat with Tylosin. Coccidiosis: Bloody droppings — Amprolium in water. Strict litter management prevents most.' },
      { title: 'Marketing', desc: 'Broilers ready at 40–45 days (2–2.2 kg live weight). Contact aggregators or direct retail. Layer eggs: collect 2–3× daily, grade by size, store at 15°C. Reject cracked eggs.' },
    ]
  },
]

export default function FarmTraining() {
  const [activeCategory, setActiveCategory] = useState('crops')
  const [expandedId, setExpandedId] = useState(null)
  const [expandedStep, setExpandedStep] = useState(null)

  const guides = activeCategory === 'crops' ? CROP_GUIDES : LIVESTOCK_GUIDES

  return (
    <div className="db-section">
      <h1 className="db-page-title">🎓 Farm Training Academy</h1>
      <p className="db-page-sub">Step-by-step agronomic and livestock management guides curated by agricultural scientists.</p>

      {/* Category Tabs */}
      <div className="ft-tabs">
        <button
          onClick={() => { setActiveCategory('crops'); setExpandedId(null) }}
          className={`ft-tab-btn ${activeCategory === 'crops' ? 'active-crop' : ''}`}
        >
          🌾 Crop Growing Guides
        </button>
        <button
          onClick={() => { setActiveCategory('livestock'); setExpandedId(null) }}
          className={`ft-tab-btn ${activeCategory === 'livestock' ? 'active-live' : ''}`}
        >
          🐄 Livestock & Poultry
        </button>
      </div>

      {/* Guide Cards Grid */}
      <div className="ft-grid">
        {guides.map(guide => (
          <div
            key={guide.id}
            className="ft-guide-card"
            style={{ borderColor: expandedId === guide.id ? guide.color : undefined, boxShadow: expandedId === guide.id ? `4px 4px 0 0 ${guide.color}` : undefined }}
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
                <span>💰 {guide.yield}</span>
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
