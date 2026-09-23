export interface CityJurisdiction {
  id: string;
  name: string;
  state: string;
  region: 'South India' | 'North India';
  coordinates: { lat: number; lon: number };
  corporation: string;
  helpline: string;
  ambulance: string;
  climateZone: string;
  vulnerabilityFocus: string;
  wardsCount: number;
}

export const CITIES_REGISTRY: CityJurisdiction[] = [
  {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    region: 'South India',
    coordinates: { lat: 13.0827, lon: 80.2707 },
    corporation: 'Greater Chennai Corporation (GCC)',
    helpline: '1913',
    ambulance: '108',
    climateZone: 'Warm & Humid Coastal',
    vulnerabilityFocus: 'Elevated WBGT & humidity suppressing sweat evaporation + high port/coastal laborer density',
    wardsCount: 15,
  },
  {
    id: 'delhi',
    name: 'Delhi (NCR)',
    state: 'Delhi NCR',
    region: 'North India',
    coordinates: { lat: 28.6139, lon: 77.2090 },
    corporation: 'Municipal Corporation of Delhi (MCD)',
    helpline: '155304',
    ambulance: '108',
    climateZone: 'Semi-Arid Extreme Continental',
    vulnerabilityFocus: 'Severe urban heat island effect with temperatures >47°C + dense outdoor workforce',
    wardsCount: 12,
  },
  {
    id: 'ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    region: 'North India',
    coordinates: { lat: 23.0225, lon: 72.5714 },
    corporation: 'Ahmedabad Municipal Corporation (AMC)',
    helpline: '155303',
    ambulance: '108',
    climateZone: 'Hot Semi-Arid',
    vulnerabilityFocus: 'Pioneer of India\'s HAP (2013); severe dry heatwave spikes with daytime surface temp >50°C',
    wardsCount: 10,
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    region: 'North India',
    coordinates: { lat: 26.9124, lon: 75.7873 },
    corporation: 'Jaipur Nagar Nigam (JNN)',
    helpline: '1800-180-6127',
    ambulance: '108',
    climateZone: 'Arid Desert Fringe',
    vulnerabilityFocus: 'Extreme dry westerly "Loo" winds, intense UV solar burden, historic walled city thermal traps',
    wardsCount: 8,
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    region: 'North India',
    coordinates: { lat: 26.8467, lon: 80.9462 },
    corporation: 'Lucknow Municipal Corporation (LMC)',
    helpline: '1533',
    ambulance: '108',
    climateZone: 'Subtropical Gangetic Plains',
    vulnerabilityFocus: 'Pre-monsoon heat spikes + moisture convergence causing acute hospital inpatient admissions',
    wardsCount: 8,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    region: 'South India',
    coordinates: { lat: 18.9401, lon: 72.8347 },
    corporation: 'Brihanmumbai Municipal Corporation (BMC)',
    helpline: '1916',
    ambulance: '108',
    climateZone: 'Tropical Coastal Humid',
    vulnerabilityFocus: 'Extreme relative humidity with high coastal heat index impacting dense commuter transit hubs',
    wardsCount: 24,
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    region: 'South India',
    coordinates: { lat: 17.3850, lon: 78.4867 },
    corporation: 'Greater Hyderabad Municipal Corporation (GHMC)',
    helpline: '040-21111111',
    ambulance: '108',
    climateZone: 'Tropical Wet & Dry',
    vulnerabilityFocus: 'Intense dry summer heatwaves reaching 44°C and high solar irradiance across Deccan plateau',
    wardsCount: 15,
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    region: 'South India',
    coordinates: { lat: 12.9716, lon: 77.5946 },
    corporation: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
    helpline: '1533',
    ambulance: '108',
    climateZone: 'Tropical Savanna Elevated',
    vulnerabilityFocus: 'Urban Heat Island formation over concrete IT corridors with localized thermal stress spikes',
    wardsCount: 19,
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    region: 'North India',
    coordinates: { lat: 22.5726, lon: 88.3639 },
    corporation: 'Kolkata Municipal Corporation (KMC)',
    helpline: '155300',
    ambulance: '108',
    climateZone: 'Tropical Wet-and-Dry Coastal',
    vulnerabilityFocus: 'Severe humid heatwaves with maritime moisture stagnation causing extreme wet-bulb temperatures',
    wardsCount: 16,
  },
  {
    id: 'madurai',
    name: 'Madurai',
    state: 'Tamil Nadu',
    region: 'South India',
    coordinates: { lat: 9.9252, lon: 78.1198 },
    corporation: 'Madurai Municipal Corporation (MMC)',
    helpline: '0452-2530521',
    ambulance: '108',
    climateZone: 'Tropical Semi-Arid',
    vulnerabilityFocus: 'Southern Tamil Nadu dry heat corridor with high surface radiant heat in heritage temple zones',
    wardsCount: 10,
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore',
    state: 'Tamil Nadu',
    region: 'South India',
    coordinates: { lat: 11.0168, lon: 76.9558 },
    corporation: 'Coimbatore City Municipal Corporation (CCMC)',
    helpline: '0422-2302323',
    ambulance: '108',
    climateZone: 'Semi-Arid Rainshadow',
    vulnerabilityFocus: 'Heavy industrial textile and foundry outdoor worker exposure during pre-monsoon heat crests',
    wardsCount: 10,
  },
  {
    id: 'trichy',
    name: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    region: 'South India',
    coordinates: { lat: 10.7905, lon: 78.7047 },
    corporation: 'Tiruchirappalli City Corporation (TCC)',
    helpline: '0431-2415301',
    ambulance: '108',
    climateZone: 'Tropical Dry Continental Basin',
    vulnerabilityFocus: 'Cauvery basin high-temperature thermal entrapment with prolonged afternoon UV radiation',
    wardsCount: 8,
  },
  {
    id: 'salem',
    name: 'Salem',
    state: 'Tamil Nadu',
    region: 'South India',
    coordinates: { lat: 11.6643, lon: 78.1460 },
    corporation: 'Salem City Municipal Corporation (SMC)',
    helpline: '0427-2212844',
    ambulance: '108',
    climateZone: 'Hot Tropical Valley',
    vulnerabilityFocus: 'Valley thermal inversion trap surrounded by hills, exacerbating ground heat retention',
    wardsCount: 8,
  }
];

export function getCityProfile(cityNameOrId: string): CityJurisdiction {
  const query = (cityNameOrId || 'chennai').toLowerCase().trim();
  const match = CITIES_REGISTRY.find(
    c => c.id.toLowerCase() === query || c.name.toLowerCase().includes(query)
  );
  return match || CITIES_REGISTRY[0];
}
