import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_actor, CurrentActor, UserRole, record_audit
from app.models.city_ward import Ward
from app.models.weather import WeatherObservation
from app.models.thermal import ThermalMetric
from app.models.vulnerability import VulnerabilityProfile
from app.models.simulation import SimulationRecord
from app.engines.heat_index_engine import calculate_heat_index
from app.engines.wbgt_engine import calculate_wbgt
from app.engines.utci_engine import calculate_utci
from app.engines.htsi_engine import calculate_htsi
from app.engines.mortality_engine import calculate_hamri_and_surge

router = APIRouter(tags=["Scenario Simulation Studio"])

class RunSimulationRequest(BaseModel):
    scenario_id: str = Field(..., description="Preset ID or 'custom'")
    temp_delta: float = Field(0.0, ge=-8.0, le=10.0, description="Temperature adjustment in °C")
    rh_delta: float = Field(0.0, ge=-40.0, le=40.0, description="Relative humidity adjustment in %")
    wind_delta: float = Field(0.0, ge=-5.0, le=5.0, description="Wind speed adjustment in m/s")
    notes: Optional[str] = None

PRESET_SCENARIOS = [
    {
        "id": "baseline_summer",
        "name": "Normal Summer Baseline",
        "category": "Seasonal Normal",
        "description": "Typical mid-May conditions in Chennai with afternoon sea breeze moderation.",
        "temp_base_c": 35.2,
        "rh_base": 65.0,
        "wind_base_ms": 3.8,
        "solar_base_wm2": 780.0,
        "default_temp_delta": 0.0,
        "default_rh_delta": 0.0,
        "expected_htsi": "52 (High)",
        "narrative": "Standard municipal baseline. High thermal burden during midday; physiological recovery possible at night."
    },
    {
        "id": "developing_heatwave",
        "name": "Developing Heatwave Event",
        "category": "Early Warning",
        "description": "Consecutive days of rising ambient temperature with delayed sea breeze arrival.",
        "temp_base_c": 37.8,
        "rh_base": 60.0,
        "wind_base_ms": 2.2,
        "solar_base_wm2": 850.0,
        "default_temp_delta": 2.5,
        "default_rh_delta": -5.0,
        "expected_htsi": "68 (Very High)",
        "narrative": "Heat buildup over 48 hours. Night temperatures fail to drop below 28.5°C in dense commercial wards."
    },
    {
        "id": "extreme_humid_heat",
        "name": "Extreme Humid Heat Crisis",
        "category": "Emergency Red Alert",
        "description": "Potentially lethal coastal wet-bulb surge (WBGT > 33.5°C) suppressing human sweat evaporation.",
        "temp_base_c": 39.5,
        "rh_base": 76.0,
        "wind_base_ms": 1.5,
        "solar_base_wm2": 820.0,
        "default_temp_delta": 4.0,
        "default_rh_delta": 12.0,
        "expected_htsi": "88 (Extreme)",
        "narrative": "Dangerous biometeorological threshold. Outdoor manual labor cannot be sustained safely without immediate cooling."
    },
    {
        "id": "dry_heatwave",
        "name": "Dry Continental Heatwave",
        "category": "Severe Heat",
        "description": "Intense inland westerly winds pushing superheated dry air masses across northern Chennai.",
        "temp_base_c": 43.5,
        "rh_base": 32.0,
        "wind_base_ms": 4.5,
        "solar_base_wm2": 960.0,
        "default_temp_delta": 5.5,
        "default_rh_delta": -25.0,
        "expected_htsi": "79 (Very High)",
        "narrative": "Extreme sensible heat flux. Dehydration and heat exhaustion accelerate rapidly among transit laborers."
    },
    {
        "id": "persistent_night_heat",
        "name": "Persistent Nocturnal Heat Trap",
        "category": "Cumulative Stress",
        "description": "High humidity and concrete thermal mass keep nighttime temperatures above 31°C across slums.",
        "temp_base_c": 36.5,
        "rh_base": 78.0,
        "wind_base_ms": 1.1,
        "solar_base_wm2": 720.0,
        "default_temp_delta": 2.0,
        "default_rh_delta": 15.0,
        "expected_htsi": "74 (Very High)",
        "narrative": "Nocturnal cardiovascular strain. Vulnerable elderly residents face elevated emergency hospitalization demand."
    },
    {
        "id": "heatwave_recovery",
        "name": "Marine Convective Relief",
        "category": "Recovery Phase",
        "description": "Vigorous onshore sea breeze and afternoon maritime convective clouds breaking the heat dome.",
        "temp_base_c": 32.0,
        "rh_base": 58.0,
        "wind_base_ms": 5.8,
        "solar_base_wm2": 520.0,
        "default_temp_delta": -3.5,
        "default_rh_delta": -8.0,
        "expected_htsi": "38 (Moderate)",
        "narrative": "Thermal comfort restoration across all 15 coastal and inland wards as ventilation index triples."
    }
]

def unified_response(data: Any, request_id: Optional[str] = None) -> Dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "error": None,
        "request_id": request_id or f"req_{uuid.uuid4().hex[:10]}",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "display_timezone": "Asia/Kolkata"
    }

@router.get("/simulations/scenarios")
def list_scenarios():
    """Returns 6 standardized climate heatwave scenarios for deterministic stress testing."""
    return unified_response({
        "scenarios": PRESET_SCENARIOS,
        "engine_version": "heatshield-engine-2.0",
        "is_demo": True,
        "simulation_isolation_mode": "strict_copy_on_simulate"
    })

@router.post("/simulations/run")
def run_simulation(
    payload: RunSimulationRequest,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Executes a fully isolated, deterministic heatwave simulation without modifying canonical baseline data.
    Allowed for: OFFICER, ADMIN with 'simulation.run' permission.
    """
    if not (actor.has_permission("simulation.run") or actor.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access restricted. Role '{actor.role.value}' does not have permission 'simulation.run'."
        )

    # Find matching scenario metadata
    matched_scenario = next((s for s in PRESET_SCENARIOS if s["id"] == payload.scenario_id), None)
    scenario_name = matched_scenario["name"] if matched_scenario else f"Custom Mutation ({payload.scenario_id})"

    wards = db.query(Ward).all()
    if not wards:
        raise HTTPException(status_code=500, detail="No wards found in database.")

    baseline_ward_results = []
    simulated_ward_results = []
    triggered_alerts = []

    total_pop = sum(w.total_population for w in wards)
    baseline_high_risk_pop = 0
    sim_high_risk_pop = 0

    base_htsi_list = []
    sim_htsi_list = []
    base_surge_list = []
    sim_surge_list = []

    sim_id = f"sim_{uuid.uuid4().hex[:10]}"
    now_utc = datetime.now(timezone.utc)

    for ward in wards:
        obs = db.query(WeatherObservation).filter(WeatherObservation.ward_id == ward.id).order_by(WeatherObservation.timestamp.desc()).first()
        vuln = db.query(VulnerabilityProfile).filter(VulnerabilityProfile.ward_id == ward.id).first()
        vuln_score = vuln.vulnerability_score if vuln else 50.0

        base_t = obs.air_temp_c if obs else 35.0
        base_rh = obs.relative_humidity if obs else 65.0
        base_wind = obs.wind_speed_ms if obs else 3.5
        base_solar = obs.solar_radiation_wm2 if obs else 750.0

        # Compute baseline biometeorology
        b_hi = calculate_heat_index(air_temp_c=base_t, relative_humidity=base_rh)
        b_wbgt = calculate_wbgt(air_temp_c=base_t, relative_humidity=base_rh, wind_speed_m_s=base_wind, solar_radiation_w_m2=base_solar)
        b_utci = calculate_utci(air_temp_c=base_t, relative_humidity=base_rh, wind_speed_ms=base_wind, mean_radiant_temp_c=base_t + 12.0)
        b_htsi = calculate_htsi(
            heat_index_c=b_hi.heat_index_c,
            wbgt_c=b_wbgt.wbgt_c,
            utci_c=b_utci.utci_c,
            consecutive_hot_days=2,
            min_night_temp_c=27.5,
            vulnerability_score=vuln_score,
            builtup_fraction=ward.builtup_surface_fraction,
            vegetation_ndvi=ward.vegetation_ndvi_proxy
        )
        b_risk = calculate_hamri_and_surge(htsi_score=b_htsi.htsi_score, vulnerability_score=vuln_score, consecutive_days=2, nighttime_min_temp_c=27.5, ward_population=ward.total_population)
        b_surge_index = b_risk.hospital_surge.surge_index

        if b_htsi.htsi_score >= 60.0:
            baseline_high_risk_pop += ward.total_population

        base_htsi_list.append(b_htsi.htsi_score)
        base_surge_list.append(b_surge_index)

        baseline_ward_results.append({
            "ward_id": ward.id,
            "ward_name": ward.name,
            "temp_c": round(base_t, 1),
            "rh": round(base_rh, 1),
            "wbgt_c": b_wbgt.wbgt_c,
            "htsi_score": b_htsi.htsi_score,
            "htsi_category": b_htsi.htsi_category,
            "surge_index": b_surge_index
        })

        # Apply perturbation deltas
        sim_t = round(max(15.0, min(55.0, base_t + payload.temp_delta)), 1)
        sim_rh = round(max(10.0, min(98.0, base_rh + payload.rh_delta)), 1)
        sim_wind = round(max(0.2, min(20.0, base_wind + payload.wind_delta)), 1)
        sim_solar = base_solar + (payload.temp_delta * 25.0)

        s_hi = calculate_heat_index(air_temp_c=sim_t, relative_humidity=sim_rh)
        s_wbgt = calculate_wbgt(air_temp_c=sim_t, relative_humidity=sim_rh, wind_speed_m_s=sim_wind, solar_radiation_w_m2=sim_solar)
        s_utci = calculate_utci(air_temp_c=sim_t, relative_humidity=sim_rh, wind_speed_ms=sim_wind, mean_radiant_temp_c=sim_t + 14.0)
        s_htsi = calculate_htsi(
            heat_index_c=s_hi.heat_index_c,
            wbgt_c=s_wbgt.wbgt_c,
            utci_c=s_utci.utci_c,
            consecutive_hot_days=3 if payload.temp_delta > 0 else 1,
            min_night_temp_c=27.5 + (payload.temp_delta * 0.7),
            vulnerability_score=vuln_score,
            builtup_fraction=ward.builtup_surface_fraction,
            vegetation_ndvi=ward.vegetation_ndvi_proxy
        )
        s_risk = calculate_hamri_and_surge(htsi_score=s_htsi.htsi_score, vulnerability_score=vuln_score, consecutive_days=3 if payload.temp_delta > 0 else 1, nighttime_min_temp_c=27.5 + (payload.temp_delta * 0.7), ward_population=ward.total_population)
        s_surge_index = s_risk.hospital_surge.surge_index

        if s_htsi.htsi_score >= 60.0:
            sim_high_risk_pop += ward.total_population

        sim_htsi_list.append(s_htsi.htsi_score)
        sim_surge_list.append(s_surge_index)

        # Trigger simulated alerts if crossing threshold
        if s_htsi.htsi_score >= 75.0 or s_wbgt.wbgt_c >= 33.0:
            triggered_alerts.append({
                "ward_id": ward.id,
                "ward_name": ward.name,
                "severity": "Extreme Warning" if s_htsi.htsi_score >= 80.0 else "Warning",
                "trigger_metric": f"HTSI: {s_htsi.htsi_score} | WBGT: {s_wbgt.wbgt_c}°C",
                "headline": f"Simulated Severe Thermal Surge in {ward.name}",
                "simulated_population_at_risk": ward.total_population
            })

        simulated_ward_results.append({
            "ward_id": ward.id,
            "ward_name": ward.name,
            "temp_c": sim_t,
            "rh": sim_rh,
            "wbgt_c": s_wbgt.wbgt_c,
            "htsi_score": s_htsi.htsi_score,
            "htsi_category": s_htsi.htsi_category,
            "surge_index": s_surge_index
        })

    # Summary aggregations
    avg_base_htsi = round(sum(base_htsi_list) / len(base_htsi_list), 1)
    avg_sim_htsi = round(sum(sim_htsi_list) / len(sim_htsi_list), 1)
    avg_base_surge = round(sum(base_surge_list) / len(base_surge_list), 1)
    avg_sim_surge = round(sum(sim_surge_list) / len(sim_surge_list), 1)

    delta_metrics = {
        "citywide_mean_htsi_delta": round(avg_sim_htsi - avg_base_htsi, 1),
        "mean_hospital_surge_delta": round(avg_sim_surge - avg_base_surge, 1),
        "population_at_high_risk_baseline": baseline_high_risk_pop,
        "population_at_high_risk_simulated": sim_high_risk_pop,
        "high_risk_population_delta": sim_high_risk_pop - baseline_high_risk_pop,
        "high_risk_population_delta_pct": round((sim_high_risk_pop - baseline_high_risk_pop) / max(1, total_pop) * 100.0, 1),
        "triggered_alerts_count": len(triggered_alerts)
    }

    baseline_snapshot = {
        "citywide_mean_htsi": avg_base_htsi,
        "citywide_mean_surge": avg_base_surge,
        "high_risk_population": baseline_high_risk_pop,
        "ward_samples": baseline_ward_results
    }

    simulated_snapshot = {
        "citywide_mean_htsi": avg_sim_htsi,
        "citywide_mean_surge": avg_sim_surge,
        "high_risk_population": sim_high_risk_pop,
        "ward_samples": simulated_ward_results
    }

    # Persist simulation record
    sim_record = SimulationRecord(
        id=sim_id,
        scenario_id=payload.scenario_id,
        scenario_name=scenario_name,
        seed=42,
        engine_version="heatshield-engine-2.0",
        reproducible=True,
        is_demo=True,
        input_parameters={
            "temp_delta": payload.temp_delta,
            "rh_delta": payload.rh_delta,
            "wind_delta": payload.wind_delta,
            "notes": payload.notes
        },
        baseline_snapshot=baseline_snapshot,
        simulated_snapshot=simulated_snapshot,
        delta_metrics=delta_metrics,
        triggered_alerts=triggered_alerts,
        created_at_utc=now_utc,
        created_by=actor.actor_id,
        active=True
    )
    db.add(sim_record)

    # Record mutation in audit log
    req_id = f"req_{uuid.uuid4().hex[:10]}"
    record_audit(
        db=db,
        actor=actor,
        action="RUN_SIMULATION",
        entity_type="SIMULATION",
        entity_id=sim_id,
        previous_state={"status": "baseline_active"},
        new_state={"simulation_id": sim_id, "scenario": scenario_name, "deltas": delta_metrics},
        request_id=req_id
    )

    db.commit()

    return unified_response({
        "simulation_id": sim_id,
        "scenario_id": payload.scenario_id,
        "scenario_name": scenario_name,
        "seed": 42,
        "engine_version": "heatshield-engine-2.0",
        "reproducible": True,
        "is_demo": True,
        "simulation_mode": "ISOLATED_SIMULATION_ACTIVE",
        "baseline_snapshot": baseline_snapshot,
        "simulated_snapshot": simulated_snapshot,
        "delta_metrics": delta_metrics,
        "triggered_alerts": triggered_alerts,
        "created_at_utc": now_utc.isoformat(),
        "created_by": actor.actor_id
    }, request_id=req_id)

@router.post("/simulations/reset")
def reset_simulation(
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Restores the active state back to canonical baseline without deleting historical simulation runs.
    Requires OFFICER or ADMIN role.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Actor role '{actor.role.value}' cannot reset simulations. Required: OFFICER or ADMIN."
        )

    # Deactivate active simulation flag while retaining historical records
    active_runs = db.query(SimulationRecord).filter(SimulationRecord.active == True).all()
    deactivated_count = len(active_runs)
    for r in active_runs:
        r.active = False

    req_id = f"req_{uuid.uuid4().hex[:10]}"
    record_audit(
        db=db,
        actor=actor,
        action="RESET_SIMULATION",
        entity_type="SIMULATION",
        entity_id="global_reset",
        previous_state={"active_runs_count": deactivated_count},
        new_state={"status": "canonical_baseline_restored"},
        request_id=req_id
    )
    db.commit()

    return unified_response({
        "message": "Active simulation state cleared. Canonical baseline restored.",
        "historical_runs_preserved": db.query(SimulationRecord).count(),
        "status": "CANONICAL_BASELINE_ACTIVE",
        "reset_at_utc": datetime.now(timezone.utc).isoformat(),
        "reset_by": actor.actor_id
    }, request_id=req_id)

@router.get("/simulations/history")
def get_simulation_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """Returns past simulation runs preserving full reproducibility parameters."""
    runs = db.query(SimulationRecord).order_by(SimulationRecord.created_at_utc.desc()).limit(limit).all()
    history = []
    for r in runs:
        history.append({
            "id": r.id,
            "scenario_id": r.scenario_id,
            "scenario_name": r.scenario_name,
            "seed": r.seed,
            "engine_version": r.engine_version,
            "input_parameters": r.input_parameters,
            "delta_metrics": r.delta_metrics,
            "triggered_alerts_count": len(r.triggered_alerts) if r.triggered_alerts else 0,
            "created_at_utc": r.created_at_utc.isoformat(),
            "created_by": r.created_by,
            "active": r.active
        })

    return unified_response({
        "total_history_count": len(history),
        "history": history
    })
