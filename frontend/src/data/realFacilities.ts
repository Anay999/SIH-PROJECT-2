export interface RealFacility {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'COOLING_CENTRE' | 'EMERGENCY_CENTRE';
  city_id: string;
  city_name: string;
  ward_name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  open_hours: string;
  total_beds?: number;
  icu_beds?: number;
  capacity_status: string;
  amenities: string[];
  contact: string;
  authority: string;
}

export const REAL_FACILITIES: RealFacility[] = [
  // ==========================================
  // 1. CHENNAI (TAMIL NADU)
  // ==========================================
  {
    id: 'chn_hosp_rgggh',
    name: 'Rajiv Gandhi Govt General Hospital (RGGGH)',
    type: 'HOSPITAL',
    city_id: 'chennai',
    city_name: 'Chennai',
    ward_name: 'Park Town (Ward 59)',
    address: 'EVR Periyar Salai, Park Town, Near Chennai Central',
    latitude: 13.0820,
    longitude: 80.2770,
    distance_km: 1.2,
    open_hours: '24 Hours Emergency & Trauma',
    total_beds: 2700,
    icu_beds: 310,
    capacity_status: 'Active (24/7 Heatstroke Resuscitation)',
    amenities: ['Level-1 Trauma Center', 'Dedicated Heat Ward', 'Oxygen ICUs', 'Emergency 108 Bay'],
    contact: '+91 44 2530 5000',
    authority: 'Directorate of Medical Education, Govt of Tamil Nadu'
  },
  {
    id: 'chn_hosp_stanley',
    name: 'Govt Stanley Medical College & Hospital',
    type: 'HOSPITAL',
    city_id: 'chennai',
    city_name: 'Chennai',
    ward_name: 'Royapuram (Ward 49)',
    address: 'Old Jail Road, Royapuram, Chennai',
    latitude: 13.1070,
    longitude: 80.2880,
    distance_km: 2.4,
    open_hours: '24 Hours Emergency',
    total_beds: 1280,
    icu_beds: 140,
    capacity_status: 'Active (High Surge Protocol)',
    amenities: ['24/7 Trauma Care', 'Burns & Thermal Unit', 'Emergency Dialysis', 'ICU Support'],
    contact: '+91 44 2528 0900',
    authority: 'Govt of Tamil Nadu'
  },
  {
    id: 'chn_hosp_kilpauk',
    name: 'Govt Kilpauk Medical College Hospital',
    type: 'HOSPITAL',
    city_id: 'chennai',
    city_name: 'Chennai',
    ward_name: 'Kilpauk (Ward 104)',
    address: 'Poonamallee High Road, Kilpauk, Chennai',
    latitude: 13.0830,
    longitude: 80.2410,
    distance_km: 3.1,
    open_hours: '24 Hours Emergency',
    total_beds: 950,
    icu_beds: 95,
    capacity_status: 'Active (Elevated Readiness)',
    amenities: ['State Burns & Heat Stroke Center', 'Air-Conditioned ICUs', 'Emergency Ambulances'],
    contact: '+91 44 2836 4950',
    authority: 'Govt of Tamil Nadu'
  },
  {
    id: 'chn_hosp_royapettah',
    name: 'Govt Royapettah Hospital',
    type: 'HOSPITAL',
    city_id: 'chennai',
    city_name: 'Chennai',
    ward_name: 'Royapettah (Ward 118)',
    address: '133, Westcott Road, Royapettah, Chennai',
    latitude: 13.0530,
    longitude: 80.2610,
    distance_km: 1.8,
    open_hours: '24 Hours Emergency',
    total_beds: 710,
    icu_beds: 65,
    capacity_status: 'Operational',
    amenities: ['Emergency Casualty', 'Trauma Care Unit', 'Chilled ORS Fluids'],
    contact: '+91 44 2848 3051',
    authority: 'Govt of Tamil Nadu'
  },
  {
    id: 'chn_cc_tnagar',
    name: 'GCC Community Cooling Center & Hydration Hall',
    type: 'COOLING_CENTRE',
    city_id: 'chennai',
    city_name: 'Chennai',
    ward_name: 'T. Nagar (Ward 117)',
    address: 'Near Panagal Park, South Usman Road, T. Nagar',
    latitude: 13.0418,
    longitude: 80.2341,
    distance_km: 0.8,
    open_hours: '08:00 AM – 08:00 PM',
    capacity_status: 'Available (45/120)',
    amenities: ['Chilled ORS Water Dispenser', 'Misting Fans', 'Medical Attendant', 'Rest Cots'],
    contact: '1913 (GCC Helpline)',
    authority: 'Greater Chennai Corporation (GCC)'
  },
  {
    id: 'chn_cc_annanagar',
    name: 'GCC Shenoy Nagar Air-Cooled Relief Center',
    type: 'COOLING_CENTRE',
    city_id: 'chennai',
    city_name: 'Chennai',
    ward_name: 'Anna Nagar (Ward 102)',
    address: 'Shenoy Nagar Metro Station Concourse, Anna Nagar',
    latitude: 13.0780,
    longitude: 80.2260,
    distance_km: 2.1,
    open_hours: '08:30 AM – 07:30 PM',
    capacity_status: 'Available (75/150)',
    amenities: ['Air Conditioned Seating', 'Free Potable Cold Water', 'First Aid Station'],
    contact: '1913',
    authority: 'Greater Chennai Corporation (GCC)'
  },
  {
    id: 'chn_cc_mylapore',
    name: 'GCC Urban Primary Health Centre (UPHC) & Cool Kiosk',
    type: 'COOLING_CENTRE',
    city_id: 'chennai',
    city_name: 'Chennai',
    ward_name: 'Mylapore (Ward 124)',
    address: 'Kutchery Road, Near Luz Corner, Mylapore',
    latitude: 13.0335,
    longitude: 80.2670,
    distance_km: 1.5,
    open_hours: '08:00 AM – 08:00 PM',
    capacity_status: 'Available (30/80)',
    amenities: ['Nurse On Duty', 'Electrolyte Packs', 'Shaded Seating', 'Blood Pressure Check'],
    contact: '1913',
    authority: 'Greater Chennai Corporation (GCC)'
  },

  // ==========================================
  // 2. DELHI (NCR)
  // ==========================================
  {
    id: 'del_hosp_aiims',
    name: 'All India Institute of Medical Sciences (AIIMS New Delhi)',
    type: 'HOSPITAL',
    city_id: 'delhi',
    city_name: 'Delhi (NCR)',
    ward_name: 'Ansari Nagar, South Delhi',
    address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi',
    latitude: 28.5672,
    longitude: 77.2100,
    distance_km: 1.5,
    open_hours: '24 Hours Emergency (National Level-1)',
    total_beds: 2478,
    icu_beds: 275,
    capacity_status: 'Operational (24/7 Level-1 Apex Emergency)',
    amenities: ['National Apex Trauma Centre', 'Dedicated Heatstroke ICU', 'Air Ambulances', 'Advanced Critical Care'],
    contact: '+91 11 2658 8500',
    authority: 'Ministry of Health & Family Welfare, Govt of India'
  },
  {
    id: 'del_hosp_safdarjung',
    name: 'Vardhman Mahavir Medical College & Safdarjung Hospital',
    type: 'HOSPITAL',
    city_id: 'delhi',
    city_name: 'Delhi (NCR)',
    ward_name: 'Safdarjung, South Delhi',
    address: 'Ring Road, Opposite AIIMS, New Delhi',
    latitude: 28.5702,
    longitude: 77.2074,
    distance_km: 1.7,
    open_hours: '24 Hours Emergency & Trauma',
    total_beds: 1600,
    icu_beds: 160,
    capacity_status: 'High Readiness',
    amenities: ['Emergency Heat Triage', 'Multi-Specialty ICU', '24/7 Casualty', 'Burn & Thermal Units'],
    contact: '+91 11 2616 5060',
    authority: 'MoHFW, Govt of India'
  },
  {
    id: 'del_hosp_rml',
    name: 'Dr. Ram Manohar Lohia (RML) Hospital',
    type: 'HOSPITAL',
    city_id: 'delhi',
    city_name: 'Delhi (NCR)',
    ward_name: 'Connaught Place / Central Delhi',
    address: 'Baba Kharak Singh Marg, Connaught Place Area, New Delhi',
    latitude: 28.6253,
    longitude: 77.2023,
    distance_km: 2.8,
    open_hours: '24 Hours Emergency',
    total_beds: 1420,
    icu_beds: 140,
    capacity_status: 'Active (Designated Heat Emergency Ward)',
    amenities: ['Designated Heat Stroke Care Ward', 'Cold Water Immersion Baths', 'Emergency ICUs'],
    contact: '+91 11 2336 5525',
    authority: 'Central Govt / MoHFW'
  },
  {
    id: 'del_hosp_lnjp',
    name: 'Lok Nayak Jai Prakash Narayan (LNJP) Hospital',
    type: 'HOSPITAL',
    city_id: 'delhi',
    city_name: 'Delhi (NCR)',
    ward_name: 'Delhi Gate, Central Delhi',
    address: 'Jawaharlal Nehru Marg, Near Delhi Gate, New Delhi',
    latitude: 28.6368,
    longitude: 77.2410,
    distance_km: 3.5,
    open_hours: '24 Hours Emergency',
    total_beds: 2000,
    icu_beds: 220,
    capacity_status: 'Active Trauma & Heat Unit',
    amenities: ['MAMC Teaching Hospital', 'Emergency Medicine Department', 'Electrolyte Therapy'],
    contact: '+91 11 2323 3000',
    authority: 'Govt of NCT of Delhi'
  },
  {
    id: 'del_cc_kashmere',
    name: 'DUSIB & MCD Kashmere Gate Air-Cooled Relief Center',
    type: 'COOLING_CENTRE',
    city_id: 'delhi',
    city_name: 'Delhi (NCR)',
    ward_name: 'Kashmere Gate ISBT Hub',
    address: 'Inter-State Bus Terminal Complex, Kashmere Gate, Delhi',
    latitude: 28.6675,
    longitude: 77.2285,
    distance_km: 2.0,
    open_hours: '24 Hours Open',
    capacity_status: 'Available (110/200)',
    amenities: ['Air-Coolers & Heavy Fans', 'Potable Cold Drinking Water', 'Free ORS Pouches', 'Doctor On Call'],
    contact: '1077 (DDMA Emergency)',
    authority: 'Delhi Disaster Management Authority (DDMA)'
  },
  {
    id: 'del_cc_chandni_chowk',
    name: 'MCD Town Hall Heat Relief Shelter & Hydration Hub',
    type: 'COOLING_CENTRE',
    city_id: 'delhi',
    city_name: 'Delhi (NCR)',
    ward_name: 'Chandni Chowk, Old Delhi',
    address: 'Near Old Delhi Railway Station, Chandni Chowk',
    latitude: 28.6560,
    longitude: 77.2300,
    distance_km: 2.6,
    open_hours: '08:00 AM – 08:00 PM',
    capacity_status: 'Available (65/150)',
    amenities: ['Chilled Ro-Filtered Water', 'Misting Fans', 'Glucose & ORS Booth', 'Rest Cots'],
    contact: '155304 (MCD Helpline)',
    authority: 'Municipal Corporation of Delhi (MCD)'
  },
  {
    id: 'del_cc_connaught_place',
    name: 'NDMC Shivaji Stadium Transit Cool Pavilion',
    type: 'COOLING_CENTRE',
    city_id: 'delhi',
    city_name: 'Delhi (NCR)',
    ward_name: 'Connaught Place Area',
    address: 'Shivaji Stadium Bus Concourse, Near CP, New Delhi',
    latitude: 28.6295,
    longitude: 77.2140,
    distance_km: 1.9,
    open_hours: '08:00 AM – 09:00 PM',
    capacity_status: 'Available (90/180)',
    amenities: ['Air Conditioned Waiting Lounge', 'Cold Water Kiosks', 'Medical First Aid Attendant'],
    contact: '1533',
    authority: 'New Delhi Municipal Council (NDMC)'
  },

  // ==========================================
  // 3. AHMEDABAD (GUJARAT)
  // ==========================================
  {
    id: 'guj_hosp_civil',
    name: 'Ahmedabad Civil Hospital (Asarwa)',
    type: 'HOSPITAL',
    city_id: 'ahmedabad',
    city_name: 'Ahmedabad',
    ward_name: 'Asarwa, Central-East Zone',
    address: 'Haripura, Asarwa, Ahmedabad, Gujarat',
    latitude: 23.0536,
    longitude: 72.6022,
    distance_km: 2.2,
    open_hours: '24 Hours Emergency (Apex Heat Center)',
    total_beds: 2800,
    icu_beds: 310,
    capacity_status: 'Operational (Ahmedabad HAP Referral Apex)',
    amenities: ['Asia’s Largest Civil Hospital Campus', 'Special Heatstroke Ward', 'Cold Immersion Tanks', 'ICU'],
    contact: '+91 79 2268 0074',
    authority: 'Health & Family Welfare Dept, Govt of Gujarat'
  },
  {
    id: 'guj_hosp_svp',
    name: 'Sardar Vallabhbhai Patel (SVP) Institute of Medical Sciences',
    type: 'HOSPITAL',
    city_id: 'ahmedabad',
    city_name: 'Ahmedabad',
    ward_name: 'Ellisbridge, West Zone',
    address: 'Ellisbridge, Riverfront West, Ahmedabad',
    latitude: 23.0189,
    longitude: 72.5714,
    distance_km: 1.4,
    open_hours: '24 Hours Emergency',
    total_beds: 1500,
    icu_beds: 160,
    capacity_status: 'Operational',
    amenities: ['Municipal Super-Specialty Medical Campus', '24/7 Heat Critical ICU', 'Helipad Access'],
    contact: '+91 79 2657 7621',
    authority: 'Ahmedabad Municipal Corporation (AMC)'
  },
  {
    id: 'guj_cc_kalupur',
    name: 'AMC Kalupur Central Transit Cooling Station',
    type: 'COOLING_CENTRE',
    city_id: 'ahmedabad',
    city_name: 'Ahmedabad',
    ward_name: 'Kalupur, Central Zone',
    address: 'Opposite Kalupur Railway Station, Ahmedabad',
    latitude: 23.0298,
    longitude: 72.6015,
    distance_km: 1.1,
    open_hours: '07:30 AM – 08:30 PM',
    capacity_status: 'Available (110/180)',
    amenities: ['Chilled Drinking Water Tanks', 'Shaded Green Roof Canopy', 'Free ORS Hydration', 'First Aid'],
    contact: '155303 (AMC Emergency)',
    authority: 'Ahmedabad Municipal Corporation (AMC)'
  },
  {
    id: 'guj_cc_navrangpura',
    name: 'AMC Navrangpura Community Heat Shelter',
    type: 'COOLING_CENTRE',
    city_id: 'ahmedabad',
    city_name: 'Ahmedabad',
    ward_name: 'Navrangpura, West Zone',
    address: 'Near Sardar Patel Stadium, Navrangpura, Ahmedabad',
    latitude: 23.0370,
    longitude: 72.5620,
    distance_km: 1.8,
    open_hours: '08:00 AM – 08:00 PM',
    capacity_status: 'Available (60/120)',
    amenities: ['Air Conditioned Hall', 'Cool Mist Sprinklers', 'Health Worker Station'],
    contact: '155303',
    authority: 'Ahmedabad Municipal Corporation (AMC)'
  },

  // ==========================================
  // 4. JAIPUR (RAJASTHAN)
  // ==========================================
  {
    id: 'raj_hosp_sms',
    name: 'Sawai Man Singh (SMS) Medical College & Hospital',
    type: 'HOSPITAL',
    city_id: 'jaipur',
    city_name: 'Jaipur',
    ward_name: 'JLN Marg, Ashok Nagar',
    address: 'Jawaharlal Nehru Marg, Ashok Nagar, Jaipur, Rajasthan',
    latitude: 26.9038,
    longitude: 75.8152,
    distance_km: 1.6,
    open_hours: '24 Hours Emergency & Trauma',
    total_beds: 2500,
    icu_beds: 260,
    capacity_status: 'Operational (Thar Heatwave Emergency Triage)',
    amenities: ['State Apex Medical College', 'Specialized Heat Exhaustion Ward', 'Trauma Emergency', 'Dialysis Units'],
    contact: '+91 141 251 8224',
    authority: 'Medical & Health Dept, Govt of Rajasthan'
  },
  {
    id: 'raj_cc_bapu_bazar',
    name: 'JNN Walled City Shaded Cooling Kiosk & Jal Sewa',
    type: 'COOLING_CENTRE',
    city_id: 'jaipur',
    city_name: 'Jaipur',
    ward_name: 'Bapu Bazaar / Johari Bazaar',
    address: 'Bapu Bazaar Main Corridor, Walled City, Jaipur',
    latitude: 26.9180,
    longitude: 75.8230,
    distance_km: 1.0,
    open_hours: '08:00 AM – 08:00 PM',
    capacity_status: 'Available (85/150)',
    amenities: ['Earthen Matka & RO Cold Water', 'Traditional Shaded Verandah', 'ORS Distribution', 'First Aid'],
    contact: '1800-180-6127 (JNN Helpline)',
    authority: 'Jaipur Nagar Nigam (JNN)'
  },

  // ==========================================
  // 5. LUCKNOW (UTTAR PRADESH)
  // ==========================================
  {
    id: 'up_hosp_kgmu',
    name: 'King George’s Medical University (KGMU) Trauma Centre',
    type: 'HOSPITAL',
    city_id: 'lucknow',
    city_name: 'Lucknow',
    ward_name: 'Chowk, Old Lucknow',
    address: 'Shah Mina Road, Chowk, Lucknow, Uttar Pradesh',
    latitude: 26.8687,
    longitude: 80.9142,
    distance_km: 2.0,
    open_hours: '24 Hours Emergency (Level-1 Apex)',
    total_beds: 4500,
    icu_beds: 420,
    capacity_status: 'Operational (North India Trauma & Heat Centre)',
    amenities: ['Regional Apex Trauma Centre', 'Heatstroke Resuscitation Unit', 'Multi-Disciplinary ICU'],
    contact: '+91 522 225 7540',
    authority: 'Govt of Uttar Pradesh'
  },
  {
    id: 'up_cc_hazratganj',
    name: 'LMC Hazratganj Transit Heat Relief Pavilion',
    type: 'COOLING_CENTRE',
    city_id: 'lucknow',
    city_name: 'Lucknow',
    ward_name: 'Hazratganj Main Market',
    address: 'MG Marg, Near Janpath Market, Hazratganj, Lucknow',
    latitude: 26.8530,
    longitude: 80.9450,
    distance_km: 0.9,
    open_hours: '08:30 AM – 08:00 PM',
    capacity_status: 'Available (70/130)',
    amenities: ['Chilled RO Water Dispenser', 'High-Velocity Air Coolers', 'Electrolyte Packs', 'Doctor On Standby'],
    contact: '1533 (LMC Helpline)',
    authority: 'Lucknow Municipal Corporation (LMC)'
  }
];

export function getFacilitiesForCity(cityIdOrName: string): RealFacility[] {
  const query = (cityIdOrName || 'chennai').toLowerCase().trim();
  const matched = REAL_FACILITIES.filter(
    f => f.city_id.toLowerCase() === query || f.city_name.toLowerCase().includes(query)
  );
  if (matched.length > 0) return matched;
  // Fallback to Chennai if city has no matching facilities
  return REAL_FACILITIES.filter(f => f.city_id === 'chennai');
}
