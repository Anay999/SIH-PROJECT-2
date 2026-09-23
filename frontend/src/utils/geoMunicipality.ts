import { CITIES_REGISTRY, type CityJurisdiction } from '../data/cities';
import { REAL_FACILITIES, type RealFacility } from '../data/realFacilities';

/**
 * High-precision Great-Circle Haversine distance in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export interface NearestMunicipalityResult {
  city: CityJurisdiction;
  distanceKm: number;
  isWithinBoundary: boolean;
}

/**
 * Analyzes specific GPS coordinates of the device and assigns the user to
 * the exact or closest municipality / municipal corporation.
 */
export function findNearestMunicipality(
  lat: number,
  lon: number
): NearestMunicipalityResult {
  let closest: CityJurisdiction = CITIES_REGISTRY[0];
  let minDistance = Infinity;

  for (const city of CITIES_REGISTRY) {
    const dist = haversineDistanceKm(
      lat,
      lon,
      city.coordinates.lat,
      city.coordinates.lon
    );
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  // Typical metropolitan radius threshold (45 km)
  const isWithinBoundary = minDistance <= 45;

  return {
    city: closest,
    distanceKm: Number(minDistance.toFixed(1)),
    isWithinBoundary,
  };
}

export interface FacilityWithLiveDistance extends RealFacility {
  live_distance_km: number;
  travel_time_minutes: number;
}

export interface MunicipalityFacilitiesResult {
  municipality: CityJurisdiction;
  isAutoDetected: boolean;
  distanceToMunicipalityCenterKm: number;
  allFacilities: FacilityWithLiveDistance[];
  coolingCentres: FacilityWithLiveDistance[];
  hospitals: FacilityWithLiveDistance[];
}

/**
 * Fetches all cooling centres and hospitals strictly belonging to the
 * detected/assigned municipality, and calculates their live distance
 * directly from the device's actual GPS coordinates, sorted nearest-first.
 */
export function getMunicipalityFacilities(
  userLat: number,
  userLon: number,
  explicitCityIdOrName?: string
): MunicipalityFacilitiesResult {
  let municipality: CityJurisdiction;
  let isAutoDetected = true;
  let distanceToCenter = 0;

  if (explicitCityIdOrName && explicitCityIdOrName.trim().length > 0) {
    const q = explicitCityIdOrName.toLowerCase().trim();
    const found = CITIES_REGISTRY.find(
      (c) => c.id.toLowerCase() === q || c.name.toLowerCase().includes(q)
    );
    if (found) {
      municipality = found;
      isAutoDetected = false;
      distanceToCenter = haversineDistanceKm(
        userLat,
        userLon,
        found.coordinates.lat,
        found.coordinates.lon
      );
    } else {
      const nearest = findNearestMunicipality(userLat, userLon);
      municipality = nearest.city;
      distanceToCenter = nearest.distanceKm;
    }
  } else {
    const nearest = findNearestMunicipality(userLat, userLon);
    municipality = nearest.city;
    distanceToCenter = nearest.distanceKm;
  }

  // Filter facilities strictly belonging to this municipality only
  const municipalityFacilities = REAL_FACILITIES.filter(
    (f) =>
      f.city_id.toLowerCase() === municipality.id.toLowerCase() ||
      f.city_name.toLowerCase().includes(municipality.name.toLowerCase())
  );

  // Compute live Haversine distance and driving travel time from device GPS
  const mapped: FacilityWithLiveDistance[] = municipalityFacilities.map((fac) => {
    const dist = haversineDistanceKm(userLat, userLon, fac.latitude, fac.longitude);
    const speed = dist < 20 ? 25 : 45; // Urban vs highway speed in km/h
    const minutes = Math.max(1, Math.round((dist / speed) * 60));

    return {
      ...fac,
      distance_km: dist,
      live_distance_km: dist,
      travel_time_minutes: minutes,
    };
  });

  // Sort strictly by live distance ascending (nearest first)
  mapped.sort((a, b) => a.live_distance_km - b.live_distance_km);

  const coolingCentres = mapped.filter((f) => f.type === 'COOLING_CENTRE');
  const hospitals = mapped.filter(
    (f) => f.type === 'HOSPITAL' || f.type === 'EMERGENCY_CENTRE'
  );

  return {
    municipality,
    isAutoDetected,
    distanceToMunicipalityCenterKm: distanceToCenter,
    allFacilities: mapped,
    coolingCentres,
    hospitals,
  };
}

export interface PlacePreset {
  id: string;
  name: string;
  subArea: string;
  cityId: string;
  cityName: string;
  corporation: string;
  coordinates: [number, number]; // [lat, lon]
}

/**
 * Place presets for rapid place-to-place testing of GPS detection and
 * dynamic municipality assignment.
 */
export const GPS_PLACE_PRESETS: PlacePreset[] = [
  {
    id: 'chn-central',
    name: 'Chennai Central Station',
    subArea: 'Park Town (Ward 59)',
    cityId: 'chennai',
    cityName: 'Chennai',
    corporation: 'Greater Chennai Corporation (GCC)',
    coordinates: [13.0827, 80.2707],
  },
  {
    id: 'chn-tnagar',
    name: 'T. Nagar Panagal Park',
    subArea: 'T. Nagar (Ward 117)',
    cityId: 'chennai',
    cityName: 'Chennai',
    corporation: 'Greater Chennai Corporation (GCC)',
    coordinates: [13.0418, 80.2341],
  },
  {
    id: 'chn-annanagar',
    name: 'Anna Nagar Tower Park',
    subArea: 'Anna Nagar (Ward 102)',
    cityId: 'chennai',
    cityName: 'Chennai',
    corporation: 'Greater Chennai Corporation (GCC)',
    coordinates: [13.0850, 80.2101],
  },
  {
    id: 'mdu-meenakshi',
    name: 'Madurai Meenakshi Amman Temple',
    subArea: 'Heritage Zone (Ward 41)',
    cityId: 'madurai',
    cityName: 'Madurai',
    corporation: 'Madurai Municipal Corporation (MMC)',
    coordinates: [9.9195, 78.1193],
  },
  {
    id: 'cbe-gandhipuram',
    name: 'Coimbatore Gandhipuram Bus Hub',
    subArea: 'Gandhipuram (Ward 51)',
    cityId: 'coimbatore',
    cityName: 'Coimbatore',
    corporation: 'Coimbatore City Municipal Corporation (CCMC)',
    coordinates: [11.0168, 76.9558],
  },
  {
    id: 'try-junction',
    name: 'Tiruchirappalli Junction & Bus Stand',
    subArea: 'Cantonment (Ward 35)',
    cityId: 'trichy',
    cityName: 'Tiruchirappalli',
    corporation: 'Tiruchirappalli City Corporation (TCC)',
    coordinates: [10.7905, 78.6947],
  },
  {
    id: 'slm-busstand',
    name: 'Salem Old Bus Stand Hub',
    subArea: 'Shevapet (Ward 18)',
    cityId: 'salem',
    cityName: 'Salem',
    corporation: 'Salem City Municipal Corporation (SMC)',
    coordinates: [11.6643, 78.1460],
  },
  {
    id: 'del-cp',
    name: 'New Delhi Connaught Place',
    subArea: 'Connaught Place Area',
    cityId: 'delhi',
    cityName: 'Delhi (NCR)',
    corporation: 'Municipal Corporation of Delhi (MCD)',
    coordinates: [28.6315, 77.2167],
  },
  {
    id: 'del-aiims',
    name: 'AIIMS Hospital & Safdarjung Hub',
    subArea: 'Ansari Nagar, South Delhi',
    cityId: 'delhi',
    cityName: 'Delhi (NCR)',
    corporation: 'Municipal Corporation of Delhi (MCD)',
    coordinates: [28.5672, 77.2100],
  },
  {
    id: 'ahm-riverfront',
    name: 'Ahmedabad Sabarmati Riverfront',
    subArea: 'Ellisbridge West Zone',
    cityId: 'ahmedabad',
    cityName: 'Ahmedabad',
    corporation: 'Ahmedabad Municipal Corporation (AMC)',
    coordinates: [23.0189, 72.5714],
  },
  {
    id: 'jai-walled',
    name: 'Jaipur Walled City (Bapu Bazaar)',
    subArea: 'Bapu Bazaar / Johari Bazaar',
    cityId: 'jaipur',
    cityName: 'Jaipur',
    corporation: 'Jaipur Nagar Nigam (JNN)',
    coordinates: [26.9180, 75.8230],
  },
  {
    id: 'luc-hazratganj',
    name: 'Lucknow Hazratganj Promenade',
    subArea: 'Hazratganj Main Corridor',
    cityId: 'lucknow',
    cityName: 'Lucknow',
    corporation: 'Lucknow Municipal Corporation (LMC)',
    coordinates: [26.8530, 80.9450],
  },
  {
    id: 'mum-csmt',
    name: 'Mumbai CSMT & Fort Corridor',
    subArea: 'Fort / CSMT Area (Ward A)',
    cityId: 'mumbai',
    cityName: 'Mumbai',
    corporation: 'Brihanmumbai Municipal Corporation (BMC)',
    coordinates: [18.9401, 72.8347],
  },
  {
    id: 'hyd-charminar',
    name: 'Hyderabad Charminar Heritage Precinct',
    subArea: 'Charminar Heritage Zone',
    cityId: 'hyderabad',
    cityName: 'Hyderabad',
    corporation: 'Greater Hyderabad Municipal Corporation (GHMC)',
    coordinates: [17.3616, 78.4747],
  },
  {
    id: 'blr-majestic',
    name: 'Bengaluru Majestic Transport Concourse',
    subArea: 'Kempegowda Bus Station Hub',
    cityId: 'bengaluru',
    cityName: 'Bengaluru',
    corporation: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
    coordinates: [12.9774, 77.5708],
  },
];
