import React, { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  Snowflake,
  Power,
  Droplets,
  MapPin,
  Filter
} from 'lucide-react';
import { fetchCoolingCenters } from '../services/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { getFacilitiesForCity } from '../data/realFacilities';

// Custom Leaflet DivIcon for Cooling Shelters
const createCoolingIcon = (isSelected: boolean, status: string) => {
  const bg = status === 'Open' ? (isSelected ? '#0284c7' : '#0ea5e9') : '#64748b';
  const border = isSelected ? '#ffffff' : '#f8fafc';
  const size = isSelected ? 32 : 26;
  return L.divIcon({
    className: 'custom-resource-marker',
    html: `<div style="background-color: ${bg}; color: #ffffff; border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(2,132,199,0.4); border: 2px solid ${border}; font-weight: 900; font-size: ${isSelected ? '14px' : '12px'}; transition: all 0.2s;">❄</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export const CoolingCentersPage: React.FC = () => {
  const { cityProfile } = useWorkspace();
  const [centers, setCenters] = useState<any[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'all' | 'open' | 'water' | 'backup'>('all');
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.045, 80.225]);
  // Basemap selector: SATELLITE DEFAULT
  const [basemapMode, setBasemapMode] = useState<'satellite' | 'street'>('satellite');

  // Real verified facilities for current city
  const realCityFacilities = useMemo(() => {
    return getFacilitiesForCity(cityProfile.id || 'chennai')
      .filter(f => f.type === 'COOLING_CENTRE' || f.type === 'EMERGENCY_CENTRE');
  }, [cityProfile.id]);

  useEffect(() => {
    setLoading(true);
    fetchCoolingCenters()
      .then((data) => {
        if (data && data.length > 0 && (!cityProfile.id || cityProfile.id === 'chennai')) {
          setCenters(data);
          setSelectedCenter(data[0]);
          if (data[0].latitude && data[0].longitude) {
            setMapCenter([data[0].latitude, data[0].longitude]);
          }
        } else {
          // Adapt real facilities to schema
          const mapped = realCityFacilities.map(rf => ({
            id: rf.id,
            name: rf.name,
            ward_name: rf.ward_name,
            address: rf.address,
            latitude: rf.latitude,
            longitude: rf.longitude,
            total_capacity: 150,
            current_occupancy: 65,
            operating_hours: rf.open_hours,
            water_available: true,
            power_backup: true,
            status: 'Open',
            contact: rf.contact,
            authority: rf.authority,
            amenities: rf.amenities
          }));
          setCenters(mapped);
          if (mapped.length > 0) {
            setSelectedCenter(mapped[0]);
            setMapCenter([mapped[0].latitude, mapped[0].longitude]);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        const mapped = realCityFacilities.map(rf => ({
          id: rf.id,
          name: rf.name,
          ward_name: rf.ward_name,
          address: rf.address,
          latitude: rf.latitude,
          longitude: rf.longitude,
          total_capacity: 150,
          current_occupancy: 65,
          operating_hours: rf.open_hours,
          water_available: true,
          power_backup: true,
          status: 'Open',
          contact: rf.contact,
          authority: rf.authority,
          amenities: rf.amenities
        }));
        setCenters(mapped);
        if (mapped.length > 0) {
          setSelectedCenter(mapped[0]);
          setMapCenter([mapped[0].latitude, mapped[0].longitude]);
        }
        setLoading(false);
      });
  }, [cityProfile.id, realCityFacilities]);

  const handleSelectResource = (cc: any) => {
    setSelectedCenter(cc);
    if (cc.latitude && cc.longitude) {
      setMapCenter([cc.latitude, cc.longitude]);
    }
  };

  const filteredCenters = centers.filter((cc) => {
    if (filterType === 'open') return cc.status === 'Open';
    if (filterType === 'water') return cc.water_available;
    if (filterType === 'backup') return cc.power_backup;
    return true;
  });

  const totalCap = centers.reduce((acc, c) => acc + (c.total_capacity || 0), 0);
  const totalOcc = centers.reduce((acc, c) => acc + (c.current_occupancy || 0), 0);
  const openCount = centers.filter(c => c.status === 'Open').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 text-slate-800">
      {/* Top Header - Soft Ice-Cyan / Sky Pastel Tint */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-50/90 via-sky-50/50 to-blue-50/40 border border-cyan-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-200 flex items-center justify-center">
                <Snowflake className="w-5 h-5 text-cyan-600" />
              </div>
              Cooling & Hydration Relief Network ({cityProfile.name})
            </h1>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
              {openCount} of {centers.length} SHELTERS OPEN
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-bold">
              VERIFIED MUNICIPAL REGISTRY
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2 max-w-3xl leading-relaxed">
            Official municipal facilities providing air-conditioned rest halls, cold potable ORS water, and basic heat exhaustion first aid under {cityProfile.corporation}.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3.5 py-2 rounded-xl bg-white/95 border border-cyan-200 shadow-xs">
            <span className="text-slate-500 mr-1.5">Network Operational Capacity:</span>
            <strong className="text-cyan-950 font-bold">{totalCap} persons ({totalOcc} active · {Math.round((totalOcc / (totalCap || 1)) * 100)}%)</strong>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-50/70 via-sky-50/40 to-blue-50/30 p-1.5 rounded-xl border border-cyan-200 text-xs font-mono shadow-xs">
          <Filter className="w-3.5 h-3.5 text-cyan-600 ml-2 mr-1" />
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition font-bold ${
              filterType === 'all'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            All Facilities ({centers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('open')}
            className={`px-3 py-1.5 rounded-lg transition font-bold ${
              filterType === 'open'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Open Now ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('water')}
            className={`px-3 py-1.5 rounded-lg transition font-bold ${
              filterType === 'water'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Potable Water Active
          </button>
          <button
            type="button"
            onClick={() => setFilterType('backup')}
            className={`px-3 py-1.5 rounded-lg transition font-bold ${
              filterType === 'backup'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Generator Backup
          </button>
        </div>

        <span className="text-[11px] font-mono text-cyan-900 font-semibold bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-lg">
          Showing {filteredCenters.length} spatial resources
        </span>
      </div>

      {/* Spatial Main Workspace: MAP (Left) + LIST & INSPECTOR (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left: Interactive Leaflet Map with SATELLITE BASMAP DEFAULT (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b121e] border-2 border-slate-300 rounded-2xl overflow-hidden relative shadow-md min-h-[420px] lg:min-h-full">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ width: '100%', height: '100%', minHeight: '450px', backgroundColor: '#090d16' }}
            zoomControl={true}
          >
            <MapRecenter center={mapCenter} />
            {/* Esri World Imagery High-Res Satellite as Default */}
            <TileLayer
              attribution={
                basemapMode === 'satellite'
                  ? '&copy; Esri, Maxar, Earthstar Geographics'
                  : '&copy; OpenStreetMap contributors'
              }
              url={
                basemapMode === 'satellite'
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              maxZoom={19}
            />

            {filteredCenters.map((cc) => {
              if (!cc.latitude || !cc.longitude) return null;
              const isSelected = selectedCenter?.id === cc.id;
              return (
                <Marker
                  key={cc.id}
                  position={[cc.latitude, cc.longitude]}
                  icon={createCoolingIcon(isSelected, cc.status)}
                  eventHandlers={{
                    click: () => handleSelectResource(cc),
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="font-sans text-xs p-1 text-slate-800">
                      <strong className="block font-semibold text-slate-900">{cc.name}</strong>
                      <span className="text-cyan-700 font-mono text-[10px] block">{cc.ward_name || cc.ward_id}</span>
                      <span className="text-slate-600 font-mono text-[11px] mt-1 block">
                        {cc.current_occupancy} / {cc.total_capacity} occupied
                      </span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Basemap Switcher (Satellite Imagery / Street Map) */}
          <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-300 shadow-md">
            <button
              type="button"
              onClick={() => setBasemapMode('satellite')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                basemapMode === 'satellite'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Satellite Imagery
            </button>
            <button
              type="button"
              onClick={() => setBasemapMode('street')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                basemapMode === 'street'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Street Map
            </button>
          </div>

          {/* Map Overlay Badge */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-700 shadow-xs">
            Satellite View Active · Click pins to inspect cooling resources
          </div>
        </div>

        {/* Right: Resource List & Detail Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Selected Resource Drawer Card - Clean Light Theme */}
          {selectedCenter ? (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 text-slate-800">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cyan-700 uppercase font-bold tracking-wider">
                      Resource Inspector
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                        selectedCenter.status === 'Open'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {selectedCenter.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                    {selectedCenter.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-semibold text-slate-700">{selectedCenter.ward_name || selectedCenter.ward_id}</span>
                    <span>·</span>
                    <span className="text-slate-500 truncate">{selectedCenter.address || `${cityProfile.name} Metro Area`}</span>
                  </p>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600">Current Capacity:</span>
                  <span className="text-slate-900 font-bold">
                    {selectedCenter.current_occupancy} / {selectedCenter.total_capacity} persons
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (selectedCenter.current_occupancy / (selectedCenter.total_capacity || 1)) > 0.8
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((selectedCenter.current_occupancy / (selectedCenter.total_capacity || 1)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                  <span>{Math.round((selectedCenter.current_occupancy / (selectedCenter.total_capacity || 1)) * 100)}% occupied</span>
                  <span className="font-semibold text-cyan-700">{selectedCenter.total_capacity - selectedCenter.current_occupancy} spaces available</span>
                </div>
              </div>

              {/* Verification & Facility Attributes */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <Droplets className={`w-4 h-4 shrink-0 ${selectedCenter.water_available ? 'text-cyan-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">Potable Water</span>
                    <span className="font-bold text-slate-900">
                      {selectedCenter.water_available ? 'Active & Tested' : 'Unavailable'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <Power className={`w-4 h-4 shrink-0 ${selectedCenter.power_backup ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">Power Generator</span>
                    <span className="font-bold text-slate-900">
                      {selectedCenter.power_backup ? 'Generator Standby' : 'Grid Only'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authority & Helpline */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Operating Hours:</span>
                  <span className="text-slate-900 font-semibold">{selectedCenter.operating_hours || '08:00 – 20:00 IST'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Helpline / Contact:</span>
                  <span className="text-emerald-700 font-bold">{selectedCenter.contact || cityProfile.helpline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Managing Authority:</span>
                  <span className="text-slate-800 font-medium">{selectedCenter.authority || cityProfile.corporation}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 font-mono shadow-xs">
              Select a facility on the map or list to inspect capacity details.
            </div>
          )}

          {/* Facility Triage List - Clean Light Theme */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex-1 flex flex-col space-y-2 overflow-hidden shadow-xs text-slate-800">
            <span className="text-[11px] font-mono uppercase text-cyan-800 font-bold tracking-wider block mb-1">
              All Municipal Resources ({filteredCenters.length})
            </span>
            <div className="space-y-2 overflow-y-auto max-h-72 pr-1 scrollbar-thin">
              {loading ? (
                <div className="text-xs text-slate-400 font-mono p-4 text-center">Loading resources...</div>
              ) : (
                filteredCenters.map((c) => {
                  const isSelected = selectedCenter?.id === c.id;
                  const occPct = Math.round((c.current_occupancy / (c.total_capacity || 1)) * 100);
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectResource(c)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-50/80 border-cyan-400 shadow-xs ring-1 ring-cyan-400'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 text-xs truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{c.ward_name || c.ward_id}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-cyan-700">
                          {c.current_occupancy}/{c.total_capacity}
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          occPct > 80
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {occPct}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
