import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Database,
  Cpu,
  Flame,
  Activity,
  MapPin,
  Send,
  Users,
  Play,
  Pause
} from 'lucide-react';

interface PipelineNode {
  id: string;
  name: string;
  category: string;
  latencyMs: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  bgGlow: string;
  inputs: string[];
  outputs: string[];
  algorithm: string;
  status: 'ACTIVE' | 'PROCESSING';
}

const PIPELINE_NODES: PipelineNode[] = [
  {
    id: 'weather',
    name: 'WEATHER API',
    category: 'Ingestion Layer',
    latencyMs: 142,
    icon: CloudSun,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    bgGlow: 'bg-blue-500/10',
    inputs: ['IMD Official Station Feeds', 'Open-Meteo Hourly Grids', 'Satellite Solar Radiation'],
    outputs: ['T_ambient', 'Relative_Humidity', 'Wind_Speed', 'GHI_Radiation', 'Surface_Pressure'],
    algorithm: 'Temporal interpolation & quality assurance filter (app.services.weather_service)',
    status: 'ACTIVE',
  },
  {
    id: 'ingestion',
    name: 'DATA INGESTION',
    category: 'Spatial Normalization',
    latencyMs: 18,
    icon: Database,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    bgGlow: 'bg-cyan-500/10',
    inputs: ['15 Chennai Ward GeoJSONs', 'Sensor Telemetry', 'Microclimate Stations'],
    outputs: ['Ward-Normalized Spatial Matrices', 'Census Demographics (60+, Workers)'],
    algorithm: 'Geodesic point-in-polygon assignment (SQLAlchemy / GeoJSON spatial index)',
    status: 'ACTIVE',
  },
  {
    id: 'thermal',
    name: 'THERMAL ENGINE',
    category: 'Physiological Modeling',
    latencyMs: 8,
    icon: Flame,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    bgGlow: 'bg-amber-500/10',
    inputs: ['Air Temperature', 'Humidity', 'Radiation', 'Wind Speed'],
    outputs: ['Rothfusz Heat Index', 'Liljegren WBGT (Direct & Shaded)', 'Bröde UTCI', 'Composite HTSI (0-100)'],
    algorithm: 'Atmospheric Physics & Human Heat Balance (app.core.thermal_indices)',
    status: 'ACTIVE',
  },
  {
    id: 'ai_model',
    name: 'AI HEALTH MODEL',
    category: 'Predictive Inference',
    latencyMs: 24,
    icon: Activity,
    color: 'text-rose-400',
    borderColor: 'border-rose-500/50',
    bgGlow: 'bg-rose-500/10',
    inputs: ['HTSI Multi-Day Cumulative Exposure', 'Vulnerability Index', 'Historical Admissions'],
    outputs: ['Mortality Risk Index (HAMRI)', 'Hospitalization Surge Forecast', 'SHAP Attributions'],
    algorithm: 'Non-linear gradient boosted health risk surrogate model with SHAP explainers',
    status: 'ACTIVE',
  },
  {
    id: 'gis_engine',
    name: 'GIS & ROUTING',
    category: 'Geospatial Intelligence',
    latencyMs: 32,
    icon: MapPin,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgGlow: 'bg-emerald-500/10',
    inputs: ['Ward Centroids', 'Hospital Nodes', 'Cooling Centers', 'User GPS Coordinates'],
    outputs: ['Ward Risk Choropleth Layers', 'OSRM Route Geometry', 'Nearest Facility Suitability'],
    algorithm: 'OSRM routing engine + Great-Circle Geodesic fallback routing',
    status: 'ACTIVE',
  },
  {
    id: 'alert_engine',
    name: 'ALERT ENGINE',
    category: 'Automated Dispatch',
    latencyMs: 45,
    icon: Send,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    bgGlow: 'bg-purple-500/10',
    inputs: ['HTSI Threshold Breaches', 'Ward Vulnerability Triggers', 'Subscribed Citizen Registry'],
    outputs: ['Fast2SMS Bulk DLT SMS', 'CallMeBot WhatsApp Alerts', 'In-App Directives'],
    algorithm: 'Multi-channel priority queue & audit logger (app.api.routes_notifications)',
    status: 'ACTIVE',
  },
  {
    id: 'public_authority',
    name: 'PUBLIC & CIVIC RESPONSE',
    category: 'Action Execution',
    latencyMs: 5,
    icon: Users,
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/50',
    bgGlow: 'bg-indigo-500/10',
    inputs: ['Action Plan Directives', 'Turn-by-Turn Navigation Polylines'],
    outputs: ['Cooling Center Sheltering', 'ORS Distribution', 'Emergency Triage Admission'],
    algorithm: 'Municipal Heat Action Plan Directive State Machine',
    status: 'ACTIVE',
  },
];

export const DataFlowVisualization: React.FC = () => {
  const [activePacketIndex, setActivePacketIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedNode, setSelectedNode] = useState<PipelineNode>(PIPELINE_NODES[2]); // Default Thermal

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActivePacketIndex((prev) => (prev + 1) % PIPELINE_NODES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Cpu className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-wide">
              LIVE DATA FLOW ARCHITECTURE VISUALIZATION
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline: Atmospheric ingestion → Thermal stress → AI risk inference → Multi-channel emergency response.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
            {isPaused ? 'Resume Data Flow' : 'Pause Flow'}
          </button>
        </div>
      </div>

      {/* Interactive Flow Pipeline Diagram */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="flex items-center gap-3 min-w-[900px] justify-between relative px-2">
          {PIPELINE_NODES.map((node, index) => {
            const isProcessing = activePacketIndex === index;
            const isSelected = selectedNode.id === node.id;
            const NodeIcon = node.icon;

            return (
              <React.Fragment key={node.id}>
                {/* Node Card */}
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`relative cursor-pointer flex-1 p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/40 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
                  } ${
                    isProcessing ? 'scale-105 shadow-md shadow-blue-500/10' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Glowing Packet Indicator */}
                  {isProcessing && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <NodeIcon className={`w-5 h-5 ${node.color}`} />
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">{node.latencyMs}ms</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{node.name}</h4>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">{node.category}</span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">ONLINE</span>
                    <span className="text-blue-700 font-bold">0{index + 1}</span>
                  </div>
                </div>

                {/* Connecting Animated Arrow */}
                {index < PIPELINE_NODES.length - 1 && (
                  <div className="flex items-center justify-center shrink-0 w-4">
                    <span
                      className={`text-sm font-black transition-all ${
                        activePacketIndex === index ? 'text-blue-600 translate-x-0.5 scale-125' : 'text-slate-300'
                      }`}
                    >
                      →
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Deep-Dive Inspection Panel */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <selectedNode.icon className={`w-5 h-5 ${selectedNode.color}`} />
            <h3 className="text-sm font-bold text-slate-900">{selectedNode.name} SPECIFICATION</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{selectedNode.category} module in THERMOSAFE AI.</p>
          <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Execution Algorithm</span>
            <p className="text-slate-800 font-mono text-[11px] mt-1">{selectedNode.algorithm}</p>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-2">Primary Input Variables</span>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {selectedNode.inputs.map((inp, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" />
                <span>{inp}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-600 font-mono block mb-2">Engine Outputs & Artifacts</span>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {selectedNode.outputs.map((out, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span>{out}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
