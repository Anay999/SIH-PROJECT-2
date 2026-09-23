
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { CITIES_REGISTRY } from '../data/cities';
import { GPS_PLACE_PRESETS, type PlacePreset } from '../utils/geoMunicipality';
import {
  Users,
  Search,
  Filter,
  Bell,
  RefreshCw,
  Building,
  MapPin,
  LocateFixed
} from 'lucide-react';

interface MunicipalCitizen {
  id: string;
  username: string;
  full_name: string;
  phone_masked: string;
  city: string;
  ward_area: string;
  risk_zone: string;
  current_risk: string;
  alert_eligibility: string;
  is_active: boolean;
  created_at_utc?: string;
  gps_lat?: number;
  gps_lon?: number;
  detected_place?: string;
}

export const RegisteredUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { cityProfile, activeCity, setActiveCity } = useWorkspace();

  const [citizens, setCitizens] = useState<MunicipalCitizen[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userOverrides, setUserOverrides] = useState<
    Record<string, { city: string; lat: number; lon: number; placeName: string }>
  >({});

  const fetchCitizens = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/municipal-users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCitizens(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load municipal citizens:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCitizens();
  }, [cityProfile]);

  const handleRelocateCitizen = (citizenId: string, preset: PlacePreset) => {
    setUserOverrides((prev) => ({
      ...prev,
      [citizenId]: {
        city: preset.cityName,
        lat: preset.coordinates[0],
        lon: preset.coordinates[1],
        placeName: `${preset.name}, ${preset.subArea}`,
      },
    }));
  };

  const enrichedCitizens: MunicipalCitizen[] = citizens.map((c, idx) => {
    const override = userOverrides[c.id];
    const baseLat = (cityProfile.coordinates?.lat || 13.0827) + ((idx % 5) - 2) * 0.012;
    const baseLon = (cityProfile.coordinates?.lon || 80.2707) + (((idx * 3) % 5) - 2) * 0.012;
    return {
      ...c,
      city: override ? override.city : c.city,
      gps_lat: override ? override.lat : Number(baseLat.toFixed(4)),
      gps_lon: override ? override.lon : Number(baseLon.toFixed(4)),
      detected_place: override ? override.placeName : `${c.ward_area}, ${c.city}`,
    };
  });

  const filteredCitizens = enrichedCitizens.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ward_area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone_masked.includes(searchQuery);

    const matchesZone =
      selectedZoneFilter === 'all'
        ? true
        : selectedZoneFilter === 'high_risk'
          ? c.current_risk === 'HIGH'
          : c.risk_zone.toLowerCase().includes(selectedZoneFilter.toLowerCase());

    return matchesSearch && matchesZone;
  });

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedUserIds.size === filteredCitizens.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredCitizens.map((c) => c.id)));
    }
  };

  const handleSelectHighRiskOnly = () => {
    const highRiskIds = enrichedCitizens.filter((c) => c.current_risk === 'HIGH').map((c) => c.id);
    setSelectedUserIds(new Set(highRiskIds));
  };

  const handleProceedToBroadcast = () => {
    navigate('/alerts', {
      state: {
        preselectedCount: selectedUserIds.size > 0 ? selectedUserIds.size : citizens.length,
        selectedTargetMode: selectedUserIds.size > 0 ? 'selected_users' : 'all_municipality'
      }
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ede7de] pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-700 border border-orange-200">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-[#1c1917]">
              Municipal Registered Citizen Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-100 text-orange-800 border border-orange-300">
              {cityProfile.corporation}
            </span>
          </div>
          <p className="text-xs text-[#57534e] mt-1">
            Officer User Management: View citizens, inspect device GPS detections, and select municipality jurisdictions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Officer Municipality Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#ede7de] shadow-2xs text-xs">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
            <span className="font-bold text-[#78716c]">Officer Municipality:</span>
            <select
              value={activeCity}
              onChange={(e) => setActiveCity(e.target.value)}
              className="bg-transparent font-bold text-[#1c1917] focus:outline-none cursor-pointer"
              title="Switch Officer Active Municipality"
            >
              {CITIES_REGISTRY.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchCitizens}
            className="p-2 rounded-xl bg-white border border-[#ede7de] hover:bg-[#f5f3ef] text-[#57534e] transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleProceedToBroadcast}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-orange-600/20 transition"
          >
            <Bell className="w-4 h-4" />
            <span>
              {selectedUserIds.size > 0
                ? `Alert ${selectedUserIds.size} Selected`
                : `Broadcast to All (${citizens.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Municipality Isolation Policy Alert */}
      <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#ede7de] flex items-start space-x-3 text-xs">
        <Building className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-[#1c1917] block">Strict Jurisdiction Boundary:</strong>
          <span className="text-[#57534e]">
            Under municipal data governance, you are displaying citizens registered within <strong>{cityProfile.name}</strong>. Officers cannot access user telemetry from other municipal corporations.
          </span>
        </div>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-[#78716c] block uppercase tracking-wider">Total Municipal Citizens</span>
          <span className="text-2xl font-black text-[#1c1917] mt-1 block">{citizens.length}</span>
          <span className="text-[10px] text-emerald-700 font-bold">100% active in {cityProfile.name}</span>
        </div>

        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-[#78716c] block uppercase tracking-wider">High-Risk Zone Residents</span>
          <span className="text-2xl font-black text-orange-600 mt-1 block">
            {citizens.filter((c) => c.current_risk === 'HIGH').length}
          </span>
          <span className="text-[10px] text-orange-600 font-bold">Residing in acute thermal hotspots</span>
        </div>

        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-[#78716c] block uppercase tracking-wider">Eligible Alert Recipients</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {citizens.filter((c) => c.alert_eligibility === 'ELIGIBLE').length}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold">SMS / WhatsApp 2FA verified</span>
        </div>
      </div>

      {/* Filter and Selection Toolbar */}
      <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box & Zone Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search citizen name, ward, phone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-xs text-[#1c1917] focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#78716c]" />
              <select
                value={selectedZoneFilter}
                onChange={(e) => setSelectedZoneFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-xs text-[#1c1917] focus:outline-none focus:border-orange-500"
              >
                <option value="all">All Risk Zones</option>
                <option value="high_risk">High Risk Wards Only</option>
                <option value="Zone A">Zone A (High Thermal)</option>
                <option value="Zone B">Zone B (Residential)</option>
                <option value="Zone C">Zone C (Commercial Hub)</option>
                <option value="Zone D">Zone D (Coastal Sector)</option>
              </select>
            </div>
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleSelectAllFiltered}
              className="px-3 py-1.5 rounded-lg bg-[#faf9f6] hover:bg-[#ede7de] border border-[#ede7de] text-[#1c1917] font-semibold transition"
            >
              {selectedUserIds.size === filteredCitizens.length ? 'Deselect All' : 'Select All Filtered'}
            </button>
            <button
              onClick={handleSelectHighRiskOnly}
              className="px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-800 font-semibold transition"
            >
              Select High Risk Zones Only
            </button>
            {selectedUserIds.size > 0 && (
              <button
                onClick={() => setSelectedUserIds(new Set())}
                className="px-2.5 py-1.5 text-[#78716c] hover:text-red-700 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Citizen Table */}
      <div className="bg-white border border-[#ede7de] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf9f6] text-[#78716c] uppercase tracking-wider text-[10px] font-bold border-b border-[#ede7de]">
              <tr>
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === filteredCitizens.length && filteredCitizens.length > 0}
                    onChange={handleSelectAllFiltered}
                    className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-4 py-3">Citizen Name & Handle</th>
                <th className="px-4 py-3">Contact Mobile</th>
                <th className="px-4 py-3">Device GPS Telemetry</th>
                <th className="px-4 py-3">Assigned Municipality</th>
                <th className="px-4 py-3">Thermal Risk Zone</th>
                <th className="px-4 py-3">Current Risk</th>
                <th className="px-4 py-3">Alert Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede7de] font-medium">
              {filteredCitizens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[#78716c]">
                    No citizens found matching current search/filter criteria in {cityProfile.name}.
                  </td>
                </tr>
              ) : (
                filteredCitizens.map((c) => {
                  const isSelected = selectedUserIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => toggleSelectUser(c.id)}
                      className={`hover:bg-[#faf9f6] transition cursor-pointer ${isSelected ? 'bg-orange-50/60' : ''
                        }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(c.id)}
                          className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#1c1917] block">{c.full_name}</span>
                        <span className="text-[10px] text-[#78716c] font-mono">@{c.username}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#57534e] whitespace-nowrap">
                        {c.phone_masked}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-[#1c1917]">
                          <LocateFixed className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span className="font-mono font-semibold">{c.gps_lat}°N, {c.gps_lon}°E</span>
                        </div>
                        <span className="text-[10px] text-[#78716c] block">{c.detected_place}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="font-bold text-[#1c1917] flex items-center gap-1">
                            <Building className="w-3 h-3 text-orange-600" />
                            <span>{c.city}</span>
                          </span>
                          {/* Officer Place-to-Place Change Trigger */}
                          <select
                            defaultValue=""
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const matchedPreset = GPS_PLACE_PRESETS.find(p => p.id === e.target.value);
                              if (matchedPreset) {
                                handleRelocateCitizen(c.id, matchedPreset);
                              }
                              e.target.value = "";
                            }}
                            className="text-[10px] bg-[#faf9f6] border border-[#ede7de] rounded px-1.5 py-0.5 text-[#57534e] hover:border-orange-300 focus:outline-none cursor-pointer"
                            title="Officer Override: Relocate user to another place via GPS detection"
                          >
                            <option value="" disabled>Change Place (GPS)...</option>
                            {GPS_PLACE_PRESETS.map((p) => (
                              <option key={p.id} value={p.id}>
                                Move to {p.name.split(' ')[0]} ({p.cityName})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#57534e]">{c.risk_zone}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.current_risk === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {c.current_risk}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.alert_eligibility === 'ELIGIBLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-600'
                            }`}
                        >
                          {c.alert_eligibility}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
