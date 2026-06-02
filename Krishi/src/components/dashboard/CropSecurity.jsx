import { useState } from 'react'

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
  const [landSize, setLandSize] = useState(5) // in acres
  const [cropCycle, setCropCycle] = useState('rabi') // rabi, kharif, commercial
  const [creditNeeded, setCreditNeeded] = useState(120000) // in INR
  const [timelyRepay, setTimelyRepay] = useState(true)

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

      {/* AI recommendation alert */}
      <div className="mp-ai-box" style={{ 
        borderColor: '#22c55e', 
        background: 'var(--bg3)', 
        border: '3px solid #22c55e', 
        boxShadow: '4px 4px 0 0 #22c55e', 
        padding: '1.25rem', 
        borderRadius: '16px', 
        marginBottom: '1.5rem' 
      }}>
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
