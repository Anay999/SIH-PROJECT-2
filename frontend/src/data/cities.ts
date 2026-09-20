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
  }
];

export function getCityProfile(cityNameOrId: string): CityJurisdiction {
  const query = (cityNameOrId || 'chennai').toLowerCase().trim();
  const match = CITIES_REGISTRY.find(
    c => c.id.toLowerCase() === query || c.name.toLowerCase().includes(query)
  );
  return match || CITIES_REGISTRY[0];
}
