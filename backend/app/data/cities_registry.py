"""
Multi-City Municipal Jurisdiction Registry for HEATSHIELD AI.
Defines official biometeorological jurisdictions for South India (Chennai)
and the top 4 North Indian heatwave cities (Delhi NCR, Ahmedabad, Jaipur, Lucknow).
"""
from typing import Dict, Any, List

CITIES_REGISTRY: Dict[str, Dict[str, Any]] = {
    "Chennai": {
        "city_id": "chennai",
        "name": "Chennai",
        "state": "Tamil Nadu",
        "region": "South India",
        "coordinates": {"lat": 13.0827, "lon": 80.2707},
        "municipal_corporation": "Greater Chennai Corporation (GCC)",
        "helpline": "1913",
        "ambulance": "108",
        "climate_zone": "Warm & Humid Coastal",
        "heat_vulnerability_profile": "High humidity + intense solar irradiance causing elevated WBGT and night recovery deficit.",
        "wards_count": 15,
        "is_primary": True,
    },
    "Delhi": {
        "city_id": "delhi",
        "name": "Delhi (NCR)",
        "state": "Delhi NCR",
        "region": "North India",
        "coordinates": {"lat": 28.6139, "lon": 77.2090},
        "municipal_corporation": "Municipal Corporation of Delhi (MCD)",
        "helpline": "155304",
        "ambulance": "108",
        "climate_zone": "Semi-Arid Extreme Continental",
        "heat_vulnerability_profile": "Severe urban heat island effect with temperatures exceeding 47°C; dense outdoor workforce in unshaded corridors.",
        "wards_count": 12,
        "is_primary": False,
    },
    "Ahmedabad": {
        "city_id": "ahmedabad",
        "name": "Ahmedabad",
        "state": "Gujarat",
        "region": "North India",
        "coordinates": {"lat": 23.0225, "lon": 72.5714},
        "municipal_corporation": "Ahmedabad Municipal Corporation (AMC)",
        "helpline": "155303",
        "ambulance": "108",
        "climate_zone": "Hot Semi-Arid",
        "heat_vulnerability_profile": "Pioneer of India's Heat Action Plan (HAP 2013); severe dry heatwave spikes with daytime surface temperatures over 50°C.",
        "wards_count": 10,
        "is_primary": False,
    },
    "Jaipur": {
        "city_id": "jaipur",
        "name": "Jaipur",
        "state": "Rajasthan",
        "region": "North India",
        "coordinates": {"lat": 26.9124, "lon": 75.7873},
        "municipal_corporation": "Jaipur Nagar Nigam (JNN)",
        "helpline": "1800-180-6127",
        "ambulance": "108",
        "climate_zone": "Arid Desert Fringe",
        "heat_vulnerability_profile": "Extreme dry westerly 'Loo' winds, intense ultraviolet solar burden, high heat risk in walled city heritage districts.",
        "wards_count": 8,
        "is_primary": False,
    },
    "Lucknow": {
        "city_id": "lucknow",
        "name": "Lucknow",
        "state": "Uttar Pradesh",
        "region": "North India",
        "coordinates": {"lat": 26.8467, "lon": 80.9462},
        "municipal_corporation": "Lucknow Municipal Corporation (LMC)",
        "helpline": "1533",
        "ambulance": "108",
        "climate_zone": "Subtropical Gangetic Plains",
        "heat_vulnerability_profile": "Intense pre-monsoon heat spikes with high atmospheric moisture leading to severe hospital inpatient surges.",
        "wards_count": 8,
        "is_primary": False,
    }
}

def get_city_profile(city_name: str) -> Dict[str, Any]:
    """Resolves city profile with case-insensitive fallback to Chennai."""
    cleaned = (city_name or "Chennai").strip().title()
    for name, profile in CITIES_REGISTRY.items():
        if name.lower() == cleaned.lower():
            return profile
    return CITIES_REGISTRY["Chennai"]

def list_supported_cities() -> List[Dict[str, Any]]:
    """Lists all supported municipal jurisdictions."""
    return list(CITIES_REGISTRY.values())
