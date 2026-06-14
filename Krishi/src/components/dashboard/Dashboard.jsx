import { useState, useEffect, lazy, Suspense } from 'react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { UsersAPI, AuthAPI, AIAPI } from '../../services/api'
import { translations } from '../../translations'
import MarketPrices from './MarketPrices'
import CropScanner from './CropScanner'
import CropSecurity from './CropSecurity'
import FarmTraining from './FarmTraining'

const NearbyMarkets = lazy(() => import('./NearbyMarkets'))
const TopographicalConditions = lazy(() => import('./TopographicalConditions'))

const NAV_ITEMS = [
  { id: 'dashboard',     icon: '📊', label: 'Dashboard' },
  { id: 'topo',          icon: '🗺️', label: 'Topographical' },
  { id: 'crop',          icon: '🌿', label: 'Crop Scanner' },
  { id: 'security',      icon: '🛡️', label: 'Crop Security' },
  { id: 'training',      icon: '🎓', label: 'Farm Training' },
  { id: 'government',    icon: '🏛️', label: 'Gov. Supports' },
  { id: 'markets',       icon: '🛒', label: 'Nearby Markets' },
  { id: 'market-prices', icon: '💹', label: 'Market Prices' },
  { id: 'history',       icon: '📅', label: 'Crop History' },
  { id: 'settings',      icon: '⚙️', label: 'Settings' },
]

const URGENCY = {
  urgent:  { bg: 'var(--urg-urgent-bg)', color: 'var(--urg-urgent)', border: 'var(--urg-urgent-border)', dot: 'var(--urg-urgent)' },
  warning: { bg: 'var(--urg-warn-bg)', color: 'var(--urg-warn)', border: 'var(--urg-warn-border)', dot: 'var(--urg-warn)' },
  info:    { bg: 'var(--urg-info-bg)', color: 'var(--urg-info)', border: 'var(--urg-info-border)', dot: 'var(--urg-info)' },
}

const getEnvConditions = (pos) => {
  const isNorth = pos.lat > 28
  return {
    temp:     isNorth ? '29°C' : '34°C',
    humidity: isNorth ? '58%' : '72%',
    uv:       isNorth ? '6 (High)' : '9 (Very High)',
    wind:     isNorth ? '14 km/h NW' : '8 km/h SE',
    advisory: isNorth 
      ? 'Advisory for Wheat/Mustard: Cool breeze (14 km/h) & moderate moisture. Postpone high-nitrogen sprays today.'
      : 'Advisory for general crops: High heat (34°C) & dry wind. Increase early morning drip irrigation cycles.',
    alertColor: isNorth ? 'yellow' : 'red'
  }
}

const getRemindersForRegion = (pos) => {
  if (pos.lat > 28) {
    return [
      { id: 'rem-1', disease: '🌾 Wheat — 2nd Irrigation', treatment: 'Apply 200 L water per acre at Crown Root stage', dosage: 'Today 06:00 AM', urgency: 'urgent', status: 'pending' },
      { id: 'rem-2', disease: '🌻 Mustard — Boron foliar spray', treatment: '0.5% Borax solution at early flower', dosage: 'In 3 days', urgency: 'info', status: 'pending' },
    ]
  } else if (pos.lat > 16 && pos.lat < 26 && pos.lng > 72 && pos.lng < 81) {
    return [
      { id: 'rem-1', disease: '🪴 Cotton — Sucking Pest prevention', treatment: 'Spray Imidacloprid 70% WS', dosage: 'Today 08:00 AM', urgency: 'urgent', status: 'pending' },
      { id: 'rem-2', disease: '🫘 Soybean — Rhizobium inoculation', treatment: 'Treat seeds with Rhizobium culture to fix Nitrogen', dosage: 'Tomorrow', urgency: 'warning', status: 'pending' },
    ]
  } else {
    return [
      { id: 'rem-1', disease: '🥔 Potato — Earth-up Ridge creation', treatment: 'Perform earth-up for better tuber growth', dosage: 'Tomorrow morning', urgency: 'warning', status: 'pending' },
      { id: 'rem-2', disease: '🌾 Millets — Thinning operation', treatment: 'Thin out crowded seedlings to improve spacing', dosage: 'In 2 days', urgency: 'info', status: 'pending' },
    ]
  }
}

const getHistoryForRegion = (pos) => {
  if (pos.lat > 28) {
    return [
      { season: 'Rabi 2025–26', crop: 'Wheat', area: '12 acres', yield: '380 qtl', revenue: '₹8,64,500', ok: true },
      { season: 'Kharif 2025', crop: 'Rice', area: '8 acres', yield: '220 qtl', revenue: '₹6,82,000', ok: true },
      { season: 'Rabi 2024–25', crop: 'Mustard', area: '5 acres', yield: '90 qtl', revenue: '₹4,68,000', ok: true },
    ]
  } else if (pos.lat > 16 && pos.lat < 26 && pos.lng > 72 && pos.lng < 81) {
    return [
      { season: 'Kharif 2025', crop: 'Cotton', area: '10 acres', yield: '150 qtl', revenue: '₹9,75,000', ok: true },
      { season: 'Kharif 2024', crop: 'Soybean', area: '8 acres', yield: '96 qtl', revenue: '₹4,32,000', ok: true },
    ]
  } else {
    return [
      { season: 'Kharif 2025', crop: 'Groundnut', area: '6 acres', yield: '90 qtl', revenue: '₹5,40,000', ok: true },
      { season: 'Kharif 2024', crop: 'Millets', area: '10 acres', yield: '160 qtl', revenue: '₹3,52,000', ok: true },
    ]
  }
}

const NATIONAL_SCHEMES = [
  {
    name: 'PM-KISAN Yojana',
    icon: '🌾',
    desc: 'Direct income support of ₹6,000/year in 3 equal instalments to all landholding farmer families.',
    status: 'Active',
    badge: 'green',
    amount: '₹6,000/yr',
    link: 'https://pmkisan.gov.in',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
  },
  {
    name: 'PM Fasal Bima Yojana',
    icon: '🛡️',
    desc: 'Comprehensive crop insurance covering losses due to natural calamities, pests & diseases.',
    status: 'Apply Now',
    badge: 'yellow',
    amount: '2% Premium (Kharif)',
    link: 'https://pmfby.gov.in',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
  },
  {
    name: 'Kisan Credit Card (KCC)',
    icon: '💳',
    desc: 'Short-term credit up to ₹3 lakh at 4–7% interest for crop production and allied activities.',
    status: 'Eligible',
    badge: 'blue',
    amount: 'Up to ₹3L @ 4%',
    link: 'https://www.nabard.org/content1.aspx?id=572',
    ministry: 'NABARD / Ministry of Finance',
  },
  {
    name: 'Soil Health Card Scheme',
    icon: '🧪',
    desc: 'Free soil testing every 2 years with crop-wise fertiliser recommendations for all farmers.',
    status: 'Eligible',
    badge: 'blue',
    amount: 'Free',
    link: 'https://soilhealth.dac.gov.in',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
  },
  {
    name: 'eNAM (National Agriculture Market)',
    icon: '🛒',
    desc: 'Unified online trading platform for agricultural commodities across 1,000+ mandis in India.',
    status: 'Active',
    badge: 'green',
    amount: 'Free Access',
    link: 'https://enam.gov.in',
    ministry: 'SFAC / Ministry of Agriculture',
  },
  {
    name: 'PM Krishi Sinchai Yojana',
    icon: '💧',
    desc: '"Har Khet Ko Pani" — irrigation coverage expansion and "More Crop Per Drop" efficiency drive.',
    status: 'Active',
    badge: 'green',
    amount: 'Subsidy up to 55%',
    link: 'https://pmksy.gov.in',
    ministry: 'Ministry of Jal Shakti',
  },
  {
    name: 'National Beekeeping & Honey Mission',
    icon: '🐝',
    desc: 'Support for scientific beekeeping, production, processing and market development.',
    status: 'Eligible',
    badge: 'blue',
    amount: '₹10,000–₹70,000',
    link: 'https://www.nbb.gov.in',
    ministry: 'National Bee Board',
  },
]

// Maps state name keywords → scheme key
const STATE_KEY_MAP = {
  punjab: 'punjab', haryana: 'haryana', himachal: 'himachal', uttarakhand: 'uttarakhand',
  'uttar pradesh': 'up', bihar: 'bihar', rajasthan: 'rajasthan', gujarat: 'gujarat',
  maharashtra: 'maharashtra', madhya: 'mp', chhattisgarh: 'chhattisgarh',
  telangana: 'telangana', andhra: 'andhra', karnataka: 'karnataka',
  kerala: 'kerala', 'tamil nadu': 'tamilnadu', odisha: 'odisha',
  jharkhand: 'jharkhand', 'west bengal': 'westbengal', assam: 'assam',
  manipur: 'manipur', meghalaya: 'meghalaya', tripura: 'tripura', nagaland: 'nagaland',
  arunachal: 'arunachal', mizoram: 'mizoram', sikkim: 'sikkim', goa: 'goa',
  delhi: 'delhi', 'jammu': 'jk', kashmir: 'jk', ladakh: 'ladakh',
  chandigarh: 'chandigarh', puducherry: 'puducherry', 'andaman': 'andaman',
  lakshadweep: 'lakshadweep', 'dadra': 'dnh', 'daman': 'dd',
}

// All Indian states & UTs with complete district lists
const ALL_STATES = [
  { key: 'punjab',      label: 'Punjab' },
  { key: 'haryana',     label: 'Haryana' },
  { key: 'himachal',    label: 'Himachal Pradesh' },
  { key: 'uttarakhand', label: 'Uttarakhand' },
  { key: 'up',          label: 'Uttar Pradesh' },
  { key: 'bihar',       label: 'Bihar' },
  { key: 'jharkhand',   label: 'Jharkhand' },
  { key: 'westbengal',  label: 'West Bengal' },
  { key: 'odisha',      label: 'Odisha' },
  { key: 'assam',       label: 'Assam' },
  { key: 'manipur',     label: 'Manipur' },
  { key: 'meghalaya',   label: 'Meghalaya' },
  { key: 'tripura',     label: 'Tripura' },
  { key: 'nagaland',    label: 'Nagaland' },
  { key: 'arunachal',   label: 'Arunachal Pradesh' },
  { key: 'mizoram',     label: 'Mizoram' },
  { key: 'sikkim',      label: 'Sikkim' },
  { key: 'rajasthan',   label: 'Rajasthan' },
  { key: 'gujarat',     label: 'Gujarat' },
  { key: 'maharashtra', label: 'Maharashtra' },
  { key: 'mp',          label: 'Madhya Pradesh' },
  { key: 'chhattisgarh',label: 'Chhattisgarh' },
  { key: 'goa',         label: 'Goa' },
  { key: 'telangana',   label: 'Telangana' },
  { key: 'andhra',      label: 'Andhra Pradesh' },
  { key: 'karnataka',   label: 'Karnataka' },
  { key: 'kerala',      label: 'Kerala' },
  { key: 'tamilnadu',   label: 'Tamil Nadu' },
  { key: 'delhi',       label: 'Delhi (NCT)' },
  { key: 'jk',          label: 'Jammu & Kashmir' },
  { key: 'ladakh',      label: 'Ladakh' },
  { key: 'chandigarh',  label: 'Chandigarh' },
  { key: 'puducherry',  label: 'Puducherry' },
  { key: 'andaman',     label: 'Andaman & Nicobar' },
  { key: 'lakshadweep', label: 'Lakshadweep' },
  { key: 'dnh',         label: 'Dadra & Nagar Haveli and Daman & Diu' },
]

const DISTRICTS_BY_STATE = {
  punjab: ['Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Malerkotla','Mansa','Moga','Mohali (SAS Nagar)','Muktsar','Pathankot','Patiala','Rupnagar','Sangrur','Shaheed Bhagat Singh Nagar','Tarn Taran'],
  haryana: ['Ambala','Bhiwani','Charkhi Dadri','Faridabad','Fatehabad','Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal','Kurukshetra','Mahendragarh','Nuh','Palwal','Panchkula','Panipat','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'],
  himachal: ['Bilaspur','Chamba','Hamirpur','Kangra','Kinnaur','Kullu','Lahaul & Spiti','Mandi','Shimla','Sirmaur','Solan','Una'],
  uttarakhand: ['Almora','Bageshwar','Chamoli','Champawat','Dehradun','Haridwar','Nainital','Pauri Garhwal','Pithoragarh','Rudraprayag','Tehri Garhwal','Udham Singh Nagar','Uttarkashi'],
  up: ['Agra','Aligarh','Ambedkar Nagar','Amethi','Amroha','Auraiya','Ayodhya','Azamgarh','Baghpat','Bahraich','Ballia','Balrampur','Banda','Barabanki','Bareilly','Basti','Bhadohi','Bijnor','Budaun','Bulandshahr','Chandauli','Chitrakoot','Deoria','Etah','Etawah','Farrukhabad','Fatehpur','Firozabad','Gautam Buddha Nagar','Ghaziabad','Ghazipur','Gonda','Gorakhpur','Hamirpur','Hapur','Hardoi','Hathras','Jalaun','Jaunpur','Jhansi','Kannauj','Kanpur Dehat','Kanpur Nagar','Kasganj','Kaushambi','Kushinagar','Lakhimpur Kheri','Lalitpur','Lucknow','Maharajganj','Mahoba','Mainpuri','Mathura','Mau','Meerut','Mirzapur','Moradabad','Muzaffarnagar','Pilibhit','Pratapgarh','Prayagraj','Raebareli','Rampur','Saharanpur','Sambhal','Sant Kabir Nagar','Shahjahanpur','Shamli','Shravasti','Siddharthnagar','Sitapur','Sonbhadra','Sultanpur','Unnao','Varanasi'],
  bihar: ['Araria','Arwal','Aurangabad','Banka','Begusarai','Bhagalpur','Bhojpur','Buxar','Darbhanga','East Champaran','Gaya','Gopalganj','Jamui','Jehanabad','Kaimur','Katihar','Khagaria','Kishanganj','Lakhisarai','Madhepura','Madhubani','Munger','Muzaffarpur','Nalanda','Nawada','Patna','Purnia','Rohtas','Saharsa','Samastipur','Saran','Sheikhpura','Sheohar','Sitamarhi','Siwan','Supaul','Vaishali','West Champaran'],
  jharkhand: ['Bokaro','Chatra','Deoghar','Dhanbad','Dumka','East Singhbhum','Garhwa','Giridih','Godda','Gumla','Hazaribagh','Jamtara','Khunti','Koderma','Latehar','Lohardaga','Pakur','Palamu','Ramgarh','Ranchi','Sahebganj','Seraikela Kharsawan','Simdega','West Singhbhum'],
  westbengal: ['Alipurduar','Bankura','Birbhum','Cooch Behar','Dakshin Dinajpur','Darjeeling','Hooghly','Howrah','Jalpaiguri','Jhargram','Kalimpong','Kolkata','Malda','Murshidabad','Nadia','North 24 Parganas','Paschim Bardhaman','Paschim Medinipur','Purba Bardhaman','Purba Medinipur','Purulia','South 24 Parganas','Uttar Dinajpur'],
  odisha: ['Angul','Balangir','Balasore','Bargarh','Bhadrak','Boudh','Cuttack','Deogarh','Dhenkanal','Gajapati','Ganjam','Jagatsinghpur','Jajpur','Jharsuguda','Kalahandi','Kandhamal','Kendrapara','Kendujhar','Khordha','Koraput','Malkangiri','Mayurbhanj','Nabarangpur','Nayagarh','Nuapada','Puri','Rayagada','Sambalpur','Sonepur','Sundergarh'],
  assam: ['Bajali','Baksa','Barpeta','Biswanath','Bongaigaon','Cachar','Charaideo','Chirang','Darrang','Dhemaji','Dhubri','Dibrugarh','Dima Hasao','Goalpara','Golaghat','Hailakandi','Hojai','Jorhat','Kamrup','Kamrup Metro','Karbi Anglong','Karimganj','Kokrajhar','Lakhimpur','Majuli','Morigaon','Nagaon','Nalbari','Sivasagar','Sonitpur','South Salmara-Mankachar','Tamulpur','Tinsukia','Udalguri','West Karbi Anglong'],
  manipur: ['Bishnupur','Chandel','Churachandpur','Imphal East','Imphal West','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl','Senapati','Tamenglong','Tengnoupal','Thoubal','Ukhrul'],
  meghalaya: ['East Garo Hills','East Jaintia Hills','East Khasi Hills','Eastern West Khasi Hills','North Garo Hills','Ri Bhoi','South Garo Hills','South West Garo Hills','South West Khasi Hills','West Garo Hills','West Jaintia Hills','West Khasi Hills'],
  tripura: ['Dhalai','Gomati','Khowai','North Tripura','Sepahijala','Sipahijala','South Tripura','Unakoti','West Tripura'],
  nagaland: ['Chumoukedima','Dimapur','Kiphire','Kohima','Longleng','Mokokchung','Mon','Niuland','Noklak','Peren','Phek','Shamator','Tseminyü','Tuensang','Wokha','Zunheboto'],
  arunachal: ['Anjaw','Changlang','Dibang Valley','East Kameng','East Siang','Itanagar Capital Complex','Kamle','Kra Daadi','Kurung Kumey','Lepa Rada','Lohit','Longding','Lower Dibang Valley','Lower Siang','Lower Subansiri','Namsai','Pakke-Kessang','Papum Pare','Shi Yomi','Siang','Tawang','Tirap','Upper Siang','Upper Subansiri','West Kameng','West Siang'],
  mizoram: ['Aizawl','Champhai','Hnahthial','Khawzawl','Kolasib','Lawngtlai','Lunglei','Mamit','Saiha','Saitual','Serchhip'],
  sikkim: ['East Sikkim','North Sikkim','Pakyong','Soreng','South Sikkim','West Sikkim'],
  rajasthan: ['Ajmer','Alwar','Banswara','Baran','Barmer','Bharatpur','Bhilwara','Bikaner','Bundi','Chittorgarh','Churu','Dausa','Dholpur','Dungarpur','Hanumangarh','Jaipur','Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur','Karauli','Kota','Nagaur','Pali','Pratapgarh','Rajsamand','Sawai Madhopur','Sikar','Sirohi','Sri Ganganagar','Tonk','Udaipur'],
  gujarat: ['Ahmedabad','Amreli','Anand','Aravalli','Banaskantha','Bharuch','Bhavnagar','Botad','Chhota Udaipur','Dahod','Dang','Devbhoomi Dwarka','Gandhinagar','Gir Somnath','Jamnagar','Junagadh','Kheda','Kutch','Mahisagar','Mehsana','Morbi','Narmada','Navsari','Panchmahal','Patan','Porbandar','Rajkot','Sabarkantha','Surat','Surendranagar','Tapi','Vadodara','Valsad'],
  maharashtra: ['Ahmednagar','Akola','Amravati','Aurangabad','Beed','Bhandara','Buldhana','Chandrapur','Dhule','Gadchiroli','Gondia','Hingoli','Jalgaon','Jalna','Kolhapur','Latur','Mumbai City','Mumbai Suburban','Nagpur','Nanded','Nandurbar','Nashik','Osmanabad','Palghar','Parbhani','Pune','Raigad','Ratnagiri','Sangli','Satara','Sindhudurg','Solapur','Thane','Wardha','Washim','Yavatmal'],
  mp: ['Agar Malwa','Alirajpur','Anuppur','Ashoknagar','Balaghat','Barwani','Betul','Bhind','Bhopal','Burhanpur','Chhatarpur','Chhindwara','Damoh','Datia','Dewas','Dhar','Dindori','Guna','Gwalior','Harda','Hoshangabad','Indore','Jabalpur','Jhabua','Katni','Khandwa','Khargone','Mandla','Mandsaur','Morena','Narsinghpur','Neemuch','Niwari','Panna','Raisen','Rajgarh','Ratlam','Rewa','Sagar','Satna','Sehore','Seoni','Shahdol','Shajapur','Sheopur','Shivpuri','Sidhi','Singrauli','Tikamgarh','Ujjain','Umaria','Vidisha'],
  chhattisgarh: ['Balod','Baloda Bazar','Balrampur','Bastar','Bemetara','Bijapur','Bilaspur','Dantewada','Dhamtari','Durg','Gariaband','Gaurela-Pendra-Marwahi','Janjgir-Champa','Jashpur','Kabirdham','Kanker','Khairagarh','Kondagaon','Korba','Koriya','Mahasamund','Manendragarh','Mohla-Manpur','Mungeli','Narayanpur','Raigarh','Raipur','Rajnandgaon','Sakti','Sarangarh-Bilaigarh','Sukma','Surajpur','Surguja'],
  goa: ['North Goa','South Goa'],
  telangana: ['Adilabad','Bhadradri Kothagudem','Hanumakonda','Hyderabad','Jagtial','Jangaon','Jayashankar Bhupalpally','Jogulamba Gadwal','Kamareddy','Karimnagar','Khammam','Kumuram Bheem','Mahabubabad','Mahabubnagar','Mancherial','Medak','Medchal–Malkajgiri','Mulugu','Nagarkurnool','Nalgonda','Narayanpet','Nirmal','Nizamabad','Peddapalli','Rajanna Sircilla','Rangareddy','Sangareddy','Siddipet','Suryapet','Vikarabad','Wanaparthy','Warangal','Yadadri Bhuvanagiri'],
  andhra: ['Alluri Sitharama Raju','Anakapalli','Ananthapuramu','Bapatla','Chittoor','Dr. B.R. Ambedkar Konaseema','East Godavari','Eluru','Guntur','Kakinada','Krishna','Kurnool','Nandyal','NTR','Palnadu','Parvathipuram Manyam','Prakasam','Sri Potti Sriramulu Nellore','Sri Sathya Sai','Srikakulam','Tirupati','Visakhapatnam','Vizianagaram','West Godavari','YSR Kadapa'],
  karnataka: ['Bagalkot','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban','Bidar','Chamarajanagar','Chikballapur','Chikkamagaluru','Chitradurga','Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mysuru','Raichur','Ramanagara','Shivamogga','Tumakuru','Udupi','Uttara Kannada','Vijayapura','Yadgir'],
  kerala: ['Alappuzha','Ernakulam','Idukki','Kannur','Kasaragod','Kollam','Kottayam','Kozhikode','Malappuram','Palakkad','Pathanamthitta','Thiruvananthapuram','Thrissur','Wayanad'],
  tamilnadu: ['Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri','Dindigul','Erode','Kallakurichi','Kancheepuram','Kanyakumari','Karur','Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam','Namakkal','Nilgiris','Perambalur','Pudukkottai','Ramanathapuram','Ranipet','Salem','Sivaganga','Tenkasi','Thanjavur','Theni','Thoothukudi','Tiruchirappalli','Tirunelveli','Tirupattur','Tiruppur','Tiruvallur','Tiruvannamalai','Tiruvarur','Vellore','Villupuram','Virudhunagar'],
  delhi: ['Central Delhi','East Delhi','New Delhi','North Delhi','North East Delhi','North West Delhi','Shahdara','South Delhi','South East Delhi','South West Delhi','West Delhi'],
  jk: ['Anantnag','Bandipora','Baramulla','Budgam','Doda','Ganderbal','Jammu','Kathua','Kishtwar','Kulgam','Kupwara','Poonch','Pulwama','Rajouri','Ramban','Reasi','Samba','Shopian','Srinagar','Udhampur'],
  ladakh: ['Kargil','Leh'],
  chandigarh: ['Chandigarh'],
  puducherry: ['Karaikal','Mahe','Puducherry','Yanam'],
  andaman: ['Nicobar','North and Middle Andaman','South Andaman'],
  lakshadweep: ['Lakshadweep'],
  dnh: ['Dadra & Nagar Haveli','Daman','Diu'],
  manipur: ['Bishnupur','Chandel','Churachandpur','Imphal East','Imphal West','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl','Senapati','Tamenglong','Tengnoupal','Thoubal','Ukhrul'],
}


const STATE_SCHEMES = {
  punjab: [
    { name: 'Pani Bachao Paise Kamao', icon: '💧', desc: 'Cash incentive for electricity conservation in agricultural tube-wells — promotes drip/sprinkler adoption.', status: 'Apply Now', badge: 'yellow', amount: '₹10,000 max', link: 'https://agri.punjab.gov.in', ministry: 'Punjab Agriculture Dept.' },
    { name: 'Mera Pani Meri Virasat', icon: '🌾', desc: 'Incentive of ₹7,000/acre for switching from paddy to less water-intensive crops.', status: 'Active', badge: 'green', amount: '₹7,000/acre', link: 'https://agri.punjab.gov.in', ministry: 'Punjab Agriculture Dept.' },
    { name: 'Punjab Kisan Karj Maafi', icon: '📋', desc: 'Crop loan waiver scheme for indebted small and marginal farmers of Punjab.', status: 'Eligible', badge: 'blue', amount: 'Up to ₹2L waived', link: 'https://agri.punjab.gov.in', ministry: 'Punjab Agriculture Dept.' },
  ],
  haryana: [
    { name: 'Meri Fasal Mera Byora', icon: '📋', desc: 'Crop registration portal for MSP procurement, insurance and input subsidy benefits.', status: 'Active', badge: 'green', amount: 'Free Registration', link: 'https://fasal.haryana.gov.in', ministry: 'Haryana Agriculture Dept.' },
    { name: 'Haryana Kisan Mitra Yojana', icon: '🌾', desc: 'Advisory and extension services for small farmers with crop-specific guidance.', status: 'Active', badge: 'green', amount: 'Free Services', link: 'https://agriharyana.gov.in', ministry: 'Haryana Agriculture Dept.' },
  ],
  himachal: [
    { name: 'HP Prakritik Kheti Khushhal Kisan', icon: '🌿', desc: 'Zero-budget natural farming programme with training and free inputs for hill farmers.', status: 'Active', badge: 'green', amount: 'Free Inputs', link: 'https://hpagrisnet.gov.in', ministry: 'HP Agriculture Dept.' },
    { name: 'HP Beekeeping Development', icon: '🐝', desc: 'State subsidy for bee colonies and equipment for apple/vegetable growers.', status: 'Eligible', badge: 'blue', amount: '₹10,000 subsidy', link: 'https://hpagrisnet.gov.in', ministry: 'HP Horticulture Dept.' },
  ],
  uttarakhand: [
    { name: 'Mukhyamantri Krishi Utpadan Mandi Yojana', icon: '🛒', desc: 'Direct marketing support and mandi infrastructure for hill farmers in Uttarakhand.', status: 'Active', badge: 'green', amount: 'Free Stall Access', link: 'https://agriculture.uk.gov.in', ministry: 'UK Agriculture Dept.' },
    { name: 'Uttarakhand Organic Farming Policy', icon: '🌿', desc: 'Full state organic certification support and premium market linkage for certified farms.', status: 'Eligible', badge: 'blue', amount: '₹20,000/ha', link: 'https://agriculture.uk.gov.in', ministry: 'UK Agriculture Dept.' },
  ],
  up: [
    { name: 'UP Kisan Debt Relief Scheme', icon: '🏦', desc: 'Crop loan waiver for small/marginal farmers of UP holding up to 2 hectares.', status: 'Active', badge: 'green', amount: 'Up to ₹1L', link: 'https://upagripardarshi.gov.in', ministry: 'UP Agriculture Dept.' },
    { name: 'UP Mukhyamantri Krishi Sashaktikaran', icon: '🌾', desc: 'Irrigation equipment subsidies and free soil testing for UP farmers.', status: 'Active', badge: 'green', amount: 'Up to 50% subsidy', link: 'https://upagripardarshi.gov.in', ministry: 'UP Agriculture Dept.' },
  ],
  bihar: [
    { name: 'Bihar Rajya Fasal Sahayata Yojana', icon: '🛡️', desc: 'State-funded crop loss compensation scheme at ₹7,500–₹10,000/ha — no premium charged.', status: 'Active', badge: 'green', amount: '₹10,000/ha max', link: 'https://pacsonline.bih.nic.in/fsy', ministry: 'Bihar Cooperative Dept.' },
    { name: 'Bihar Shatabdi Niji Nalkoop Yojana', icon: '💧', desc: 'Subsidy for private tube-well installation for irrigation in Bihar.', status: 'Eligible', badge: 'blue', amount: '₹15,000–₹35,000', link: 'https://state.bihar.gov.in/main/CitizenHome.html', ministry: 'Bihar Minor Irrigation Dept.' },
  ],
  rajasthan: [
    { name: 'Mukhyamantri Kisan Mitra Urja Yojana', icon: '⚡', desc: 'Monthly electricity subsidy of up to ₹1,000 for agricultural consumers in Rajasthan.', status: 'Active', badge: 'green', amount: '₹1,000/month', link: 'https://agriculture.rajasthan.gov.in', ministry: 'Rajasthan Agriculture Dept.' },
    { name: 'Rajasthan Krishi Processing Yojana', icon: '🏭', desc: 'Subsidy for agro-processing units and cold storage connected to farmer producer groups.', status: 'Eligible', badge: 'blue', amount: '25–40% subsidy', link: 'https://agriculture.rajasthan.gov.in', ministry: 'Rajasthan Agriculture Dept.' },
  ],
  gujarat: [
    { name: 'Mukhyamantri Kisan Sahay Yojana', icon: '🛡️', desc: 'Gujarat state crop loss compensation — ₹20,000/ha for 33–60% loss, ₹25,000/ha for >60%.', status: 'Active', badge: 'green', amount: 'Up to ₹25,000/ha', link: 'https://ikhedut.gujarat.gov.in', ministry: 'Gujarat Agriculture Dept.' },
    { name: 'iKhedut Portal Schemes', icon: '💻', desc: 'Single-window portal for 100+ agricultural schemes — equipment, seeds, irrigation subsidies.', status: 'Active', badge: 'green', amount: 'Multiple schemes', link: 'https://ikhedut.gujarat.gov.in', ministry: 'Gujarat Agriculture Dept.' },
  ],
  maharashtra: [
    { name: 'Namo Shetkari Mahasanman Nidhi', icon: '💰', desc: 'Additional ₹6,000/year from Maharashtra state — farmers get ₹12,000/yr combined with PM-KISAN.', status: 'Active', badge: 'green', amount: '₹6,000/yr extra', link: 'https://krishi.maharashtra.gov.in', ministry: 'Maharashtra Agriculture Dept.' },
    { name: 'Krishi Swavalamban Yojana', icon: '⛏️', desc: 'Subsidies for digging new wells and electric pump installation for dryland farmers.', status: 'Eligible', badge: 'blue', amount: '₹25,000 grant', link: 'https://krishi.maharashtra.gov.in', ministry: 'Maharashtra Agriculture Dept.' },
  ],
  mp: [
    { name: 'Mukhyamantri Kisan Kalyan Yojana', icon: '💰', desc: 'MP state additional income support of ₹4,000/year to farmers registered under PM-KISAN.', status: 'Active', badge: 'green', amount: '₹4,000/yr', link: 'https://saara.mp.gov.in', ministry: 'MP Agriculture Dept.' },
    { name: 'MP Bhavantar Bhugtan Yojana', icon: '📊', desc: 'Price deficiency payment when market price falls below MSP — direct DBT to farmer account.', status: 'Active', badge: 'green', amount: 'DBT on shortfall', link: 'https://mpeuparjan.nic.in', ministry: 'MP Agriculture Dept.' },
  ],
  telangana: [
    { name: 'Rythu Bandhu', icon: '🌾', desc: 'Investment support of ₹10,000 per acre per season to farm landowners — paid before sowing.', status: 'Active', badge: 'green', amount: '₹10,000/acre/season', link: 'https://rythubandhu.telangana.gov.in', ministry: 'Telangana Agriculture Dept.' },
    { name: 'Rythu Bima', icon: '🛡️', desc: 'Free life insurance of ₹5 lakh for all farmers aged 18–59 registered in Telangana.', status: 'Active', badge: 'green', amount: '₹5L life cover free', link: 'https://rythubandhu.telangana.gov.in', ministry: 'Telangana Agriculture Dept.' },
  ],
  andhra: [
    { name: 'YSR Rythu Bharosa', icon: '💰', desc: '₹13,500/year combined (₹6,000 central + ₹7,500 state) to all farmer and tenant farmer households.', status: 'Active', badge: 'green', amount: '₹13,500/yr', link: 'https://ysrrythubharosa.ap.gov.in', ministry: 'AP Agriculture Dept.' },
    { name: 'YSR Sunna Vaddi', icon: '🏦', desc: 'Zero-interest crop loans for farmers and DWCRA women SHGs through cooperative banks in AP.', status: 'Active', badge: 'green', amount: 'Zero interest loans', link: 'https://apagrisnet.gov.in', ministry: 'AP Cooperative Dept.' },
  ],
  karnataka: [
    { name: 'Raitha Siri', icon: '💰', desc: 'Karnataka state income support scheme for small and marginal farmers — supplementary to PM-KISAN.', status: 'Active', badge: 'green', amount: '₹2,000–₹4,000/yr', link: 'https://raitamitra.kar.nic.in', ministry: 'Karnataka Agriculture Dept.' },
    { name: 'Krishi Bhagya Scheme', icon: '💧', desc: 'Farm pond, drip irrigation and sprinkler subsidy scheme for rain-fed farmers in Karnataka.', status: 'Active', badge: 'green', amount: 'Up to ₹1.5L subsidy', link: 'https://raitamitra.kar.nic.in', ministry: 'Karnataka Agriculture Dept.' },
  ],
  kerala: [
    { name: 'Karshaka Kshemasree', icon: '🌾', desc: 'Kerala state welfare fund for farmers — accident insurance, pension and disability benefits.', status: 'Active', badge: 'green', amount: 'Insurance + pension', link: 'https://keralaagriculture.gov.in', ministry: 'Kerala Agriculture Dept.' },
    { name: 'Subhiksha Keralam', icon: '🥦', desc: 'State food security programme promoting vegetable cultivation in homesteads and paddy fields.', status: 'Active', badge: 'green', amount: 'Free seeds & inputs', link: 'https://keralaagriculture.gov.in', ministry: 'Kerala Agriculture Dept.' },
  ],
  tamilnadu: [
    { name: 'Uzhavar Sandhai', icon: '🛒', desc: 'Tamil Nadu Farmer Markets — sell directly to consumers and bypass commission agents.', status: 'Active', badge: 'green', amount: 'Free stall access', link: 'https://tnagrisnet.tn.gov.in', ministry: 'TN Agriculture Dept.' },
    { name: 'CM Breakfast Scheme Procurement', icon: '🌾', desc: 'TN government direct procurement of millet/rice from farmers at MSP for the school breakfast scheme.', status: 'Active', badge: 'green', amount: 'MSP guaranteed', link: 'https://tnagrisnet.tn.gov.in', ministry: 'TN Agriculture Dept.' },
  ],
  odisha: [
    { name: 'KALIA Scheme', icon: '💰', desc: 'Comprehensive livelihood and income support — ₹10,000/year for small/marginal farmers & landless labourers.', status: 'Active', badge: 'green', amount: '₹10,000/yr', link: 'https://kalia.odisha.gov.in', ministry: 'Odisha Agriculture Dept.' },
    { name: 'Balaram Scheme', icon: '🏦', desc: 'Crop loans for landless agricultural labourers through SHGs in Odisha — no collateral needed.', status: 'Active', badge: 'green', amount: 'Zero collateral loan', link: 'https://kalia.odisha.gov.in', ministry: 'Odisha Agriculture Dept.' },
  ],
  westbengal: [
    { name: 'Krishak Bandhu', icon: '💰', desc: 'WB state income support of ₹10,000/year for farmers with ≥1 acre + ₹2L death benefit.', status: 'Active', badge: 'green', amount: '₹10,000/yr + ₹2L cover', link: 'https://krishakbandhu.net', ministry: 'WB Agriculture Dept.' },
    { name: 'Bangla Fasal Bima Yojana', icon: '🛡️', desc: 'Fully state-funded crop insurance — no premium from farmer — covers all notified crops.', status: 'Active', badge: 'green', amount: 'Zero premium', link: 'https://krishakbandhu.net', ministry: 'WB Agriculture Dept.' },
  ],
  assam: [
    { name: 'Assam Krishi Rin Mela', icon: '🏦', desc: 'Crop loan fair organised for easy access to KCC and crop loans at district level.', status: 'Active', badge: 'green', amount: 'KCC Access', link: 'https://agri.assam.gov.in', ministry: 'Assam Agriculture Dept.' },
    { name: 'Chief Minister Samagra Gramya Unnayan', icon: '🌾', desc: 'Village development package including agri inputs, irrigation, livestock for Assam farmers.', status: 'Active', badge: 'green', amount: 'Package support', link: 'https://agri.assam.gov.in', ministry: 'Assam Agriculture Dept.' },
  ],
  default: [
    { name: 'PM-KISAN Beneficiary Status', icon: '📋', desc: 'Check and update your PM-KISAN status, correct land/bank records and track installments.', status: 'Active', badge: 'green', amount: '₹6,000/yr', link: 'https://pmkisan.gov.in', ministry: 'Ministry of Agriculture' },
    { name: 'State Agriculture Portal', icon: '🏛️', desc: 'Visit your state agriculture department portal for local scheme enrollment and information.', status: 'Active', badge: 'blue', amount: 'Varies', link: 'https://agricoop.nic.in', ministry: 'State Agriculture Dept.' },
  ],
}

const DISTRICT_RESOURCES = [
  { name: 'Kisan Call Centre Helpline', icon: '📞', desc: 'Free toll-free helpline for agricultural advice and scheme enrollment guidance in local language. Available 6AM–10PM.', status: 'Always Open', badge: 'green', amount: 'Free', link: 'https://mkisan.gov.in', contact: 'Call: 1800-180-1551' },
  { name: 'Krishi Vigyan Kendra (KVK)', icon: '🏢', desc: 'District farm science centres for free soil testing, seed distribution, training and expert consultation.', status: 'Active', badge: 'green', amount: 'Free', link: 'https://kvk.icar.gov.in', contact: 'Visit nearest KVK' },
  { name: 'District Agriculture Officer (DAO)', icon: '🏛️', desc: 'Primary contact for scheme enrollment, verification, subsidy claims and grievance redressal.', status: 'Active', badge: 'blue', amount: 'Free Services', link: 'https://agricoop.nic.in', contact: 'Local Agriculture Office' },
  { name: 'PM Kisan Samman App', icon: '📱', desc: 'Check PM-KISAN beneficiary status, installment dates and raise correction requests from mobile.', status: 'Active', badge: 'green', amount: 'Free App', link: 'https://pmkisan.gov.in', contact: 'Play Store / App Store' },
  { name: 'Soil Health Card Portal', icon: '🧪', desc: 'Get your Soil Health Card online — check nutrient status and crop-wise fertiliser recommendations.', status: 'Active', badge: 'green', amount: 'Free', link: 'https://soilhealth.dac.gov.in', contact: 'Online Portal' },
  { name: 'PM Fasal Bima Grievance', icon: '🛡️', desc: 'Raise crop insurance claim grievances and check settlement status directly on the PMFBY portal.', status: 'Active', badge: 'yellow', amount: 'Free Grievance', link: 'https://pmfby.gov.in', contact: 'Online + 14447 helpline' },
]

const getStateKey = (stateName) => {
  if (!stateName) return 'default'
  const lower = stateName.toLowerCase()
  for (const [keyword, key] of Object.entries(STATE_KEY_MAP)) {
    if (lower.includes(keyword)) return key
  }
  return 'default'
}

const getSchemesForState = (stateKey) => STATE_SCHEMES[stateKey] || STATE_SCHEMES.default

function MapLoading() {
  return (
    <div className="db-section" style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'300px',gap:'.75rem' }}>
      <div className="db-map-spinner" style={{ borderTopColor:'var(--accent)' }} />
      <strong style={{ fontSize:'.8rem',color:'var(--accent)' }}>Loading map…</strong>
    </div>
  )
}

export default function Dashboard() {
  const { user, setUser, setView, theme, language } = useFarmvestStore()
  const t = (key, fallback) => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback || key
  }
  const [activeTab, setActiveTab] = useState('dashboard')
  const [time, setTime] = useState(new Date())
  const [treatments, setTreatments] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [schemes, setSchemes] = useState([])
  const [govTier, setGovTier] = useState('national')
  const [selectedState, setSelectedState] = useState('') // e.g. 'punjab'
  const [selectedDistrict, setSelectedDistrict] = useState('') // e.g. 'Amritsar'
  const [userAddress, setUserAddress] = useState('Detecting location…')

  // Location-based states
  const [userPos, setUserPos] = useState({ lat: 31.634, lng: 74.872 })
  const [stats, setStats] = useState({
    temp: '24°C',
    humidity: '67%',
    uv: '6 (High)',
    wind: '12 km/h',
    advisory: 'Syncing live weather advisory…',
    alertColor: 'yellow'
  })

  // Settings states
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoSuccess, setPhotoSuccess] = useState('')

  const [secChannel, setSecChannel] = useState('email')
  const [secContact, setSecContact] = useState('')
  const [secOtpCode, setSecOtpCode] = useState('')
  const [secOtpSent, setSecOtpSent] = useState(false)
  const [secLoading, setSecLoading] = useState(false)
  const [secError, setSecError] = useState('')
  const [secSuccess, setSecSuccess] = useState('')

  const loadDashboardData = async (pos) => {
    setUserPos(pos)
    const defaults = getEnvConditions(pos)
    setTreatments(getRemindersForRegion(pos))
    setHistory(getHistoryForRegion(pos))

    // Reverse-geocode to get real state name
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const geoData = await geoRes.json()
      const stateRaw = geoData?.address?.state || ''
      const district = geoData?.address?.county || geoData?.address?.district || ''
      const displayAddr = [district, stateRaw].filter(Boolean).join(', ')
      setUserAddress(displayAddr || 'India')
      const key = getStateKey(stateRaw)
      setSelectedState(key)
      setSchemes(getSchemesForState(key))
    } catch {
      // fallback: rough lat/lng bucket
      const key = pos.lat > 28 ? 'punjab' : pos.lat > 22 && pos.lng > 72 && pos.lng < 82 ? 'maharashtra' : pos.lat > 17 && pos.lng > 79 ? 'telangana' : 'default'
      setSelectedState(key)
      setSchemes(getSchemesForState(key))
      setUserAddress('India')
    }

    try {
      let locName = 'South/East India'
      if (pos.lat > 28) locName = 'Punjab, North India'
      else if (pos.lat > 16 && pos.lat < 26 && pos.lng > 72 && pos.lng < 81) locName = 'Deccan, Central India'
      const res = await AIAPI.weatherAdvisory(locName, 'general')
      if (res && res.temperature) {
        setStats({
          temp: res.temperature.includes('C') ? res.temperature : `${res.temperature}°C`,
          humidity: res.humidity || defaults.humidity,
          uv: defaults.uv, wind: defaults.wind,
          advisory: res.advisory || defaults.advisory,
          alertColor: defaults.alertColor
        })
      } else setStats(defaults)
    } catch { setStats(defaults) }
  }

  const fetchDashboardLocation = () => {
    if (!navigator.geolocation) {
      loadDashboardData({ lat: 31.634, lng: 74.872 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadDashboardData({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        loadDashboardData({ lat: 31.634, lng: 74.872 })
      },
      { timeout: 6000 }
    )
  }

  useEffect(() => {
    fetchDashboardLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const mainEl = document.querySelector('.db-main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [activeTab])

  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
  const fmtDate = (d) => d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

  const handleTreatmentSelected = (reminder) => {
    setTreatments(prev => {
      if (prev.find(t => t.id === reminder.id)) return prev
      return [{ ...reminder, urgency: reminder.urgency || reminder.severityLevel || 'info' }, ...prev]
    })
  }
  const markStatus = (id, status) => setTreatments(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  const removeTreatment = (id) => setTreatments(prev => prev.filter(t => t.id !== id))
  const refreshTreatments = () => { fetchDashboardLocation(); setTime(new Date()) }

  const activeTreatments = treatments.filter(t => t.status !== 'done' && t.status !== 'skipped')
  const completedTreatments = treatments.filter(t => t.status === 'done' || t.status === 'skipped')

  const switchTab = (id) => { setActiveTab(id); setSidebarOpen(false) }

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Are you absolutely sure you want to delete your operator account? This action is permanent and all your diagnostics data will be lost."
    );
    if (!confirmDelete) return;

    // Delete user from localStorage mock DB
    const users = JSON.parse(localStorage.getItem('krishi_users') || '[]')
    const filtered = users.filter(u => u.id !== user.id)
    localStorage.setItem('krishi_users', JSON.stringify(filtered))

    // Wipe session logs
    localStorage.removeItem('krishi_scan_logs')

    alert("👋 Account permanently deleted. Thank you for using Krishi AI.");
    setView('home');
  };

  // Helper to render user avatars
  const renderAvatar = (avatar, name) => {
    if (typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:'))) {
      return <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
    }
    return avatar || (name ? name.slice(0, 2).toUpperCase() : 'U')
  }

  // Handle secondary contact verification OTP send
  const handleSendVerifyOTP = async (e) => {
    e.preventDefault()
    setSecError('')
    setSecSuccess('')
    if (!secContact) { setSecError('Please enter contact info.'); return }
    setSecLoading(true)
    try {
      await UsersAPI.sendContactVerifyOTP(secChannel, secContact)
      setSecOtpSent(true)
      setSecSuccess(`Verification OTP sent successfully to ${secContact}. Check your inbox or Python terminal window.`)
    } catch (err) {
      setSecError(err.message || 'Failed to send OTP')
    } finally {
      setSecLoading(false)
    }
  }

  // Handle secondary contact verification OTP confirm
  const handleConfirmVerifyOTP = async (e) => {
    e.preventDefault()
    setSecError('')
    setSecSuccess('')
    if (!secOtpCode) { setSecError('Please enter the verification code.'); return }
    setSecLoading(true)
    try {
      await UsersAPI.confirmContactVerifyOTP(secChannel, secContact, secOtpCode)
      
      // Update profile locally by fetching fresh details
      const fresh = await AuthAPI.getMe()
      setUser({
        id:            fresh.id,
        name:          fresh.full_name,
        email:         fresh.email || '',
        phone:         fresh.phone || '',
        avatar:        fresh.profile_photo_url || fresh.full_name.slice(0, 2).toUpperCase(),
        emailVerified: fresh.email_verified,
        phoneVerified: fresh.phone_verified,
        createdAt:     fresh.created_at,
      })

      setSecSuccess('Secondary contact verified and linked successfully!')
      setSecContact('')
      setSecOtpCode('')
      setSecOtpSent(false)
    } catch (err) {
      setSecError(err.message || 'Invalid code')
    } finally {
      setSecLoading(false)
    }
  }

  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setPhotoSuccess('')
    setPhotoLoading(true)
    try {
      const res = await UsersAPI.uploadPhoto(file)
      setUser({ ...user, avatar: res.profile_photo_url })
      setPhotoSuccess('Profile photo uploaded and updated successfully!')
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo')
    } finally {
      setPhotoLoading(false)
    }
  }

  return (
    <div className={`db-root ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="db-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`db-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="db-user-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
          <div className="db-avatar" style={{ width: '40px', height: '40px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderAvatar(user?.avatar, user?.name)}
          </div>
          <div className="db-user-info">
            <p className="db-user-name">{user?.name}</p>
            <p className="db-user-email" style={{ fontSize: '0.7rem' }}>{user?.email || user?.phone}</p>
          </div>
        </div>
        <nav className="db-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.id} id={`sidebar-${item.id}`} onClick={() => switchTab(item.id)}
              className={`db-nav-btn ${activeTab === item.id ? 'active' : ''}`}
              title={item.label}>
              <span className="db-nav-icon">{item.icon}</span>
              <span className="db-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="db-logout-btn" onClick={() => setView('home')}>
          <span>🚪</span> Log Out
        </button>
      </aside>

      {/* MAIN */}
      <main className="db-main">

        {/* Mobile top bar with hamburger */}
        <div className="db-topbar">
          <button className="db-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="db-topbar-title">
            {NAV_ITEMS.find(n => n.id === activeTab)?.icon}{' '}
            {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </span>
        </div>

        {/* 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="db-section">
            <div className="dash-clock-bar">
              <div>
                <h1 className="db-page-title" style={{ margin:0 }}>
                  Good {time.getHours() < 12 ? 'morning' : time.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
                </h1>
                <p className="db-page-sub" style={{ margin:0 }}>Real-time overview of your farm operations.</p>
              </div>
              <div className="dash-clock-widget">
                <span className="dash-clock-time">{fmt(time)}</span>
                <span className="dash-clock-date">{fmtDate(time)}</span>
              </div>
            </div>

            <div className="db-stats-grid">
              {[
                { icon:'🌡️', label:'Soil Temperature', value: stats.temp, color:'green' },
                { icon:'💧', label:'Soil Moisture', value: stats.humidity, color:'blue' },
                { icon:'☀️', label:'UV Index', value: stats.uv, color:'yellow' },
                { icon:'🌬️', label:'Wind Speed', value: stats.wind, color:'purple' },
              ].map(s => (
                <div key={s.label} className={`db-stat-card db-stat-${s.color}`}>
                  <span className="db-stat-icon">{s.icon}</span>
                  <p className="db-stat-value">{s.value}</p>
                  <p className="db-stat-label">{s.label}</p>
                </div>
              ))}
            </div>

            {/* TREATMENTS PANEL */}
            <div className="dash-treatments-panel">
              <div className="dash-treatments-header">
                <div>
                  <span className="dash-treatments-title">💊 Crop Treatments &amp; Reminders</span>
                  <span className="dash-treatments-count">{activeTreatments.length} active</span>
                </div>
                <div className="dash-treatments-header-btns">
                  <button className="db-refresh-btn" onClick={refreshTreatments}>🔄 Refresh</button>
                  <button className="dash-treatments-reset" onClick={() => setTreatments(getRemindersForRegion(userPos))}>Reset</button>
                </div>
              </div>

              {activeTreatments.length === 0 && (
                <div className="dash-treatments-empty">
                  <span>✅</span><p>All treatments complete. Add new ones from Crop Scanner or Topographical.</p>
                </div>
              )}

              <div className="dash-treatments-list">
                {activeTreatments.map(t => {
                  const s = URGENCY[t.urgency] || URGENCY.info
                  return (
                    <div key={t.id} className="dash-treat-item" style={{ background:s.bg, borderColor:s.border }}>
                      <div className="dash-treat-dot" style={{ background:s.dot }} />
                      <div className="dash-treat-body">
                        <p className="dash-treat-disease">{t.disease}</p>
                        <p className="dash-treat-action">{t.treatment}</p>
                        {t.dosage && <p className="dash-treat-dosage" style={{ color:s.color }}>📏 {t.dosage}</p>}
                      </div>
                      <div className="dash-treat-btns">
                        <button className="dash-treat-btn dash-treat-btn--done" onClick={() => markStatus(t.id,'done')} title="Done">✅</button>
                        <button className="dash-treat-btn dash-treat-btn--skip" onClick={() => markStatus(t.id,'skipped')} title="Skip">❌</button>
                        <button className="dash-treat-btn dash-treat-btn--del" onClick={() => removeTreatment(t.id)} title="Remove">🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {completedTreatments.length > 0 && (
                <details className="dash-completed-details">
                  <summary className="dash-completed-summary">📂 Completed / Skipped ({completedTreatments.length})</summary>
                  <div className="dash-completed-list">
                    {completedTreatments.map(t => (
                      <div key={t.id} className={`dash-completed-item dash-completed-item--${t.status}`}>
                        <span>{t.status === 'done' ? '✅' : '❌'}</span>
                        <div>
                          <p className="dash-completed-disease">{t.disease}</p>
                          <p className="dash-completed-action">{t.treatment}</p>
                        </div>
                        <button className="dash-completed-undo" onClick={() => markStatus(t.id,'pending')}>Undo</button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            <div className="db-grid-2">
              <div className="db-card">
                <h2 className="db-card-title">🛰️ Satellite Status</h2>
                <div className="db-info-row"><span>Uplink</span><span className="db-badge green">SECURE SAT-5</span></div>
                <div className="db-info-row"><span>Last Sync</span><span>2 min ago</span></div>
                <div className="db-info-row"><span>Coverage</span><span>99.7%</span></div>
                <div className="db-info-row"><span>Orbit Type</span><span>Geo-synchronous</span></div>
              </div>
              <div className="db-card">
                <h2 className="db-card-title">⚠️ Alerts</h2>
                <div className={`db-alert ${stats.alertColor || 'yellow'}`}>📢 Weather Advisory: {stats.advisory}</div>
                <div className="db-alert green">✅ Soil condition synced to GPS coordinates</div>
                <div className="db-alert red">🔴 Regional Soil: {userPos && userPos.lat > 28 ? 'Phosphorus levels low (typical for Alluvial Soil)' : 'Nitrogen deficient (typical for Red/Yellow Soil)'}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'topo' && <Suspense fallback={<MapLoading />}><TopographicalConditions onTreatmentSelected={handleTreatmentSelected} /></Suspense>}
        {activeTab === 'crop' && <CropScanner onTreatmentSelected={handleTreatmentSelected} />}
        {activeTab === 'security' && <CropSecurity />}
        {activeTab === 'training' && <FarmTraining />}

        {activeTab === 'government' && (() => {
          const userDistrict = userAddress && userAddress !== 'Detecting location…' && userAddress !== 'India'
            ? userAddress.split(',')[0].trim()
            : 'Local';
          return (
            <div className="db-section">
              <div className="gov-page-header">
                <div>
                  <h1 className="db-page-title">🏛️ Government Supports</h1>
                  <p className="db-page-sub">National, State and District-level schemes — click any card to visit the official portal.</p>
                </div>
              </div>

              {/* Location + State + District Selector */}
              <div className="gov-location-bar">
                <div className="gov-loc-badge">
                  <span className="gov-loc-pin">📍</span>
                  <div className="gov-loc-text">
                    <span className="gov-loc-label">Active Support Zone</span>
                    <strong className="gov-loc-value">{userAddress}</strong>
                  </div>
                </div>
                <div className="gov-location-controls">
                  <div className="gov-control-field">
                    <label htmlFor="gov-addr-input">
                      <span className="gov-ctrl-icon">✏️</span> Edit Address
                    </label>
                    <input
                      id="gov-addr-input"
                      type="text"
                      className="gov-address-input"
                      value={userAddress}
                      onChange={e => {
                        const val = e.target.value
                        setUserAddress(val)
                        const detectedKey = getStateKey(val)
                        if (detectedKey !== 'default') {
                          setSelectedState(detectedKey)
                          setSelectedDistrict('')
                          setSchemes(getSchemesForState(detectedKey))
                        }
                      }}
                      placeholder="e.g. Amritsar, Punjab"
                    />
                  </div>
                  <div className="gov-control-field">
                    <label htmlFor="gov-state-select">
                      <span className="gov-ctrl-icon">🏴</span> Select State
                    </label>
                    <select
                      id="gov-state-select"
                      className="gov-state-select"
                      value={selectedState || 'default'}
                      onChange={e => {
                        const k = e.target.value
                        setSelectedState(k)
                        setSelectedDistrict('')
                        setSchemes(getSchemesForState(k))
                        const stateLabel = e.target.options[e.target.selectedIndex].text
                        if (!userAddress || userAddress === 'Detecting location…' || userAddress === 'India') {
                          setUserAddress(stateLabel)
                        } else {
                          const parts = userAddress.split(',')
                          parts[parts.length - 1] = ' ' + stateLabel
                          setUserAddress(parts.join(','))
                        }
                      }}
                    >
                      <option value="default">🌐 All India (Default)</option>
                      {ALL_STATES.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="gov-control-field">
                    <label htmlFor="gov-dist-select">
                      <span className="gov-ctrl-icon">🏘️</span> Select District
                    </label>
                    <select
                      id="gov-dist-select"
                      className="gov-state-select"
                      value={selectedDistrict}
                      onChange={e => {
                        const dist = e.target.value
                        setSelectedDistrict(dist)
                        const stateEl = document.getElementById('gov-state-select')
                        const stateLabel = stateEl ? stateEl.options[stateEl.selectedIndex].text : ''
                        setUserAddress(dist ? `${dist}, ${stateLabel}` : stateLabel)
                      }}
                      disabled={!selectedState || selectedState === 'default' || !DISTRICTS_BY_STATE[selectedState]}
                    >
                      <option value="">— Select District —</option>
                      {selectedState && DISTRICTS_BY_STATE[selectedState] && DISTRICTS_BY_STATE[selectedState].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="gov-reset-btn"
                    onClick={() => {
                      setUserAddress('Detecting location…')
                      setSelectedState('')
                      setSelectedDistrict('')
                      fetchDashboardLocation()
                    }}
                    title="Auto-detect using browser GPS"
                  >
                    <span>⚡</span> Auto-Detect GPS
                  </button>
                </div>
              </div>


              {/* Tier Tab Switcher */}
              <div className="gov-tier-tabs">
                {[
                  { id: 'national', icon: '🇮🇳', label: 'National Schemes', count: NATIONAL_SCHEMES.length },
                  { id: 'state',    icon: '🏴',  label: 'State Schemes',    count: schemes.length },
                  { id: 'district', icon: '🏘️', label: 'District Resources', count: DISTRICT_RESOURCES.length },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`gov-tier-tab ${govTier === t.id ? 'active' : ''}`}
                    onClick={() => setGovTier(t.id)}
                  >
                    <span className="gov-tier-tab-icon">{t.icon}</span>
                    <span className="gov-tier-tab-label">{t.label}</span>
                    <span className="gov-tier-tab-count">{t.count}</span>
                  </button>
                ))}
              </div>

              {/* NATIONAL SCHEMES */}
              {govTier === 'national' && (
                <>
                  <div className="gov-tier-info">
                    <span>🇮🇳</span>
                    <div>
                      <strong>Central Government Schemes</strong>
                      <p>Flagship programmes by the Government of India — available to all eligible farmers nationwide.</p>
                    </div>
                  </div>
                  <div className="db-schemes-grid">
                    {NATIONAL_SCHEMES.map(s => (
                      <a
                        key={s.name}
                        href={s.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="db-scheme-card gov-scheme-link"
                      >
                        <div className="db-scheme-top">
                          <h3 className="db-scheme-name">
                            <span style={{ marginRight: '0.4rem' }}>{s.icon}</span>
                            {s.name}
                          </h3>
                          <span className={`db-badge ${s.badge}`}>{s.status}</span>
                        </div>
                        <p className="db-scheme-desc">{s.desc}</p>
                        <p className="gov-scheme-ministry">🏛 {s.ministry}</p>
                        <div className="db-scheme-footer">
                          <span className="db-scheme-amount">{s.amount}</span>
                          <span className="gov-visit-link">Visit Official Site →</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* STATE SCHEMES */}
              {govTier === 'state' && (
                <>
                  <div className="gov-tier-info gov-tier-info--state">
                    <span>🏴</span>
                    <div>
                      <strong>State Government Schemes</strong>
                      <p>Schemes specific to your region based on detected GPS location or selected state. State portals open in a new tab.</p>
                    </div>
                  </div>
                  {schemes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontSize: '2rem' }}>📍</span>
                      <p>Select a state or allow location access to load state-specific schemes.</p>
                    </div>
                  ) : (
                    <div className="db-schemes-grid">
                      {schemes.map(s => (
                        <a
                          key={s.name}
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="db-scheme-card gov-scheme-link gov-scheme-link--state"
                        >
                          <div className="db-scheme-top">
                            <h3 className="db-scheme-name">
                              <span style={{ marginRight: '0.4rem' }}>{s.icon}</span>
                              {s.name}
                            </h3>
                            <span className={`db-badge ${s.badge}`}>{s.status}</span>
                          </div>
                          <p className="db-scheme-desc">{s.desc}</p>
                          <p className="gov-scheme-ministry">🏛 {s.ministry}</p>
                          <div className="db-scheme-footer">
                            <span className="db-scheme-amount">{s.amount}</span>
                            <span className="gov-visit-link">Visit Portal →</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* DISTRICT RESOURCES */}
              {govTier === 'district' && (
                <>
                  <div className="gov-tier-info gov-tier-info--district">
                    <span>🏘️</span>
                    <div>
                      <strong>District-Level Resources & Helplines</strong>
                      <p>Local offices, helplines, and digital tools accessible at the block and district level for {userDistrict}.</p>
                    </div>
                  </div>
                  <div className="db-schemes-grid">
                    {DISTRICT_RESOURCES.map(s => {
                      const displayName = s.name
                        .replace('District', userDistrict)
                      const displayContact = s.contact
                        .replace('nearest KVK', `${userDistrict} KVK`)
                        .replace('Local Agriculture Office', `${userDistrict} Agriculture Office`)
                        .replace('District Agriculture Office', `${userDistrict} Office`)
                      return (
                        <a
                          key={s.name}
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="db-scheme-card gov-scheme-link gov-scheme-link--district"
                        >
                          <div className="db-scheme-top">
                            <h3 className="db-scheme-name">
                              <span style={{ marginRight: '0.4rem' }}>{s.icon}</span>
                              {displayName}
                            </h3>
                            <span className={`db-badge ${s.badge}`}>{s.status}</span>
                          </div>
                          <p className="db-scheme-desc">{s.desc}</p>
                          <p className="gov-scheme-ministry">📞 {displayContact}</p>
                          <div className="db-scheme-footer">
                            <span className="db-scheme-amount">{s.amount}</span>
                            <span className="gov-visit-link">Open Resource →</span>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })()}


        {activeTab === 'markets' && <Suspense fallback={<MapLoading />}><NearbyMarkets /></Suspense>}
        {activeTab === 'market-prices' && <MarketPrices />}

        {activeTab === 'history' && (
          <div className="db-section">
            <h1 className="db-page-title">📅 Crop History</h1>
            <p className="db-page-sub">Seasonal cultivation log and yield performance.</p>
            <div className="db-history-table-wrap">
              <table className="db-table">
                <thead><tr><th>Season</th><th>Crop</th><th>Area</th><th>Yield</th><th>Revenue</th><th>Status</th></tr></thead>
                <tbody>
                  {history.map((r,i) => (
                    <tr key={i}><td>{r.season}</td><td><strong>{r.crop}</strong></td><td>{r.area}</td><td>{r.yield}</td><td className="db-revenue">{r.revenue}</td><td><span className={`db-badge ${r.ok?'green':'yellow'}`}>{r.ok?'Harvested':'Partial ⚠️'}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="db-section">
            <h1 className="db-page-title">⚙️ Settings</h1>
            <p className="db-page-sub">Manage your security profiles, data, and agricultural node controls.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Operator Details & Photo Card */}
              <div className="db-card">
                <h2 className="db-card-title">👤 Operator Profile</h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--accent)', background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderAvatar(user?.avatar, user?.name)}
                  </div>
                  <div>
                    <label style={{ display: 'inline-block', background: 'var(--accent)', color: '#0f172a', fontWeight: 'bold', fontSize: '0.72rem', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}>
                      📷 {photoLoading ? 'Uploading…' : 'Upload New Photo'}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={photoLoading} />
                    </label>
                    {photoError && <p style={{ color: '#ef4444', fontSize: '0.68rem', margin: '0.2rem 0 0' }}>{photoError}</p>}
                    {photoSuccess && <p style={{ color: '#22c55e', fontSize: '0.68rem', margin: '0.2rem 0 0' }}>{photoSuccess}</p>}
                  </div>
                </div>

                <div className="db-info-row"><span>Operator Name</span><strong>{user?.name}</strong></div>
                <div className="db-info-row">
                  <span>Operator Email</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong>{user?.email || 'Not Linked'}</strong>
                    {user?.emailVerified ? <span style={{ color: '#22c55e', fontSize: '0.68rem' }}>🟢 Verified</span> : user?.email ? <span style={{ color: '#ef4444', fontSize: '0.68rem' }}>🔴 Unverified</span> : null}
                  </div>
                </div>
                <div className="db-info-row">
                  <span>Helpline Node</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong>{user?.phone || 'Not Linked'}</strong>
                    {user?.phoneVerified ? <span style={{ color: '#22c55e', fontSize: '0.68rem' }}>🟢 Verified</span> : user?.phone ? <span style={{ color: '#ef4444', fontSize: '0.68rem' }}>🔴 Unverified</span> : null}
                  </div>
                </div>
                <div className="db-info-row"><span>Registered Date</span><span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'Active Session'}</span></div>
              </div>

              {/* Secure OTP-Verified Contact Card */}
              <div className="db-card" style={{ border: '2.5px solid var(--accent)', boxShadow: '4px 4px 0px 0px var(--accent)' }}>
                <h2 className="db-card-title" style={{ color: 'var(--accent)' }}>🔑 Verify Secondary Contact</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  Add or update secondary email or phone nodes with a secure OTP check to receive automated crop disease alert callbacks.
                </p>

                {secError && <div className="db-alert red" style={{ marginBottom: '0.75rem', fontSize: '0.72rem' }}>⚠️ {secError}</div>}
                {secSuccess && <div className="db-alert green" style={{ marginBottom: '0.75rem', fontSize: '0.72rem' }}>🟢 {secSuccess}</div>}

                <form onSubmit={secOtpSent ? handleConfirmVerifyOTP : handleSendVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!secOtpSent ? (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text2)' }}>Verification Channel</label>
                        <select 
                          value={secChannel} 
                          onChange={(e) => setSecChannel(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          <option value="email">📧 Email Node</option>
                          <option value="sms">📱 Mobile Node (E.164: +91…)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text2)' }}>Contact Address / Phone</label>
                        <input 
                          type={secChannel === 'email' ? 'email' : 'tel'} 
                          placeholder={secChannel === 'email' ? 'helper@domain.com' : '+919876543210'} 
                          required 
                          value={secContact}
                          onChange={(e) => setSecContact(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.75rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text2)' }}>6-Digit Verification Code</label>
                      <input 
                        type="text" 
                        placeholder="123456" 
                        maxLength={6} 
                        required 
                        value={secOtpCode}
                        onChange={(e) => setSecOtpCode(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center', letterSpacing: '4px', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={secLoading} 
                    className="scanner-btn" 
                    style={{ background: 'var(--accent)', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', padding: '0.6rem', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {secLoading ? 'Processing…' : secOtpSent ? 'Verify & Link Contact' : 'Send Verification OTP'}
                  </button>

                  {secOtpSent && (
                    <button 
                      type="button" 
                      onClick={() => setSecOtpSent(false)} 
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px' }}
                    >
                      ← Change Contact Info
                    </button>
                  )}
                </form>
              </div>
            </div>

            <div className="db-card" style={{ maxWidth: '600px', border: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
              <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                ⚠️ Danger Zone
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                Uprooting your operator profile is permanent. All leaf, fruit, and vegetable scans, custom treatments, and dashboard reminders will be wiped instantly from the databases.
              </p>
              <button 
                onClick={handleDeleteAccount}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.target.style.background = '#dc2626'}
                onMouseOut={(e) => e.target.style.background = '#ef4444'}
              >
                🗑️ Delete Account
              </button>
            </div>
          </div>
        )}
      </main>

      {/* No bottom bar — collapsible sidebar handles all mobile navigation */}
    </div>
  )
}
