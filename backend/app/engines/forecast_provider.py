import math
from datetime import datetime, timezone, timedelta
from typing import Protocol, List, Dict, Any, Optional
import zoneinfo

from app.engines.heat_index_engine import calculate_heat_index
from app.engines.wbgt_engine import calculate_wbgt
from app.engines.utci_engine import calculate_utci
from app.engines.htsi_engine import calculate_htsi

IST_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")

class WeatherProvider(Protocol):
    """Protocol for biometeorological weather forecast providers."""
    def get_forecast(
        self,
        ward_id: str,
        ward_name: str,
        base_temp_c: float,
        base_rh: float,
        base_wind_ms: float,
        base_solar_wm2: float,
        builtup_fraction: float = 0.75,
        vegetation_ndvi: float = 0.20,
        days: int = 5,
        step_hours: int = 3
    ) -> Dict[str, Any]:
        ...

class DeterministicDemoForecastProvider:
    """
    Deterministic demo forecast generator with calibrated diurnal cycle,
    reproducible sinusoidal variation, explicit uncertainty bands, and DEMO confidence.
    """
    SOURCE_LABEL = "deterministic_demo_generator"
    CONFIDENCE_LABEL = "DEMO / NOT CALIBRATED"
    UNCERTAINTY_BAND = {
        "temperature_c": 1.5,
        "humidity_percent": 5.0,
        "wind_speed_ms": 0.8,
        "wbgt_c": 1.2,
        "utci_c": 2.0
    }

    def __init__(self, seed: int = 42):
        self.seed = seed

    def get_forecast(
        self,
        ward_id: str,
        ward_name: str,
        base_temp_c: float,
        base_rh: float,
        base_wind_ms: float,
        base_solar_wm2: float,
        builtup_fraction: float = 0.75,
        vegetation_ndvi: float = 0.20,
        days: int = 5,
        step_hours: int = 3
    ) -> Dict[str, Any]:
        now_utc = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        total_steps = (days * 24) // step_hours

        hourly_series: List[Dict[str, Any]] = []
        consecutive_hot_days = 1
        daily_summaries: Dict[str, Dict[str, Any]] = {}

        for step in range(total_steps):
            point_utc = now_utc + timedelta(hours=step * step_hours)
            point_ist = point_utc.astimezone(IST_TZ)
            hour_local = point_ist.hour
            date_key = point_ist.strftime("%Y-%m-%d")

            # Diurnal solar cycle: Peak solar at 13:00 IST, minimum at night
            solar_phase = math.sin(math.pi * max(0, min(14, hour_local - 5)) / 14) if 5 <= hour_local <= 19 else 0.0
            solar_rad = round(max(0.0, base_solar_wm2 * solar_phase), 1)

            # Diurnal temperature cycle: Peak around 14:30 IST, minimum around 05:30 IST
            temp_phase = math.sin((hour_local - 8.5) / 24.0 * 2.0 * math.pi)
            # Add reproducible pseudo-noise from step and seed
            pseudo_noise = 0.4 * math.sin(step * 0.7 + self.seed) + 0.2 * math.cos(step * 1.3)
            # Slight multi-day progression (+0.5C per day for heatwave accumulation)
            day_progression = (step // (24 // step_hours)) * 0.45
            
            temp_c = round(base_temp_c + (5.2 * temp_phase) + day_progression + pseudo_noise, 1)

            # Humidity inversely proportional to temperature + coastal sea breeze dynamics
            rh_phase = -temp_phase
            rh = round(max(20.0, min(95.0, base_rh + (18.0 * rh_phase) - (day_progression * 1.2))), 1)

            # Wind speed: stronger afternoon sea breeze in Chennai (14:00 - 18:00 IST)
            sea_breeze_boost = 2.2 if 13 <= hour_local <= 18 else 0.0
            wind_ms = round(max(0.5, base_wind_ms + (1.2 * temp_phase) + sea_breeze_boost), 1)

            # Compute biometeorological parameters
            hi_res = calculate_heat_index(air_temp_c=temp_c, relative_humidity=rh)
            wbgt_res = calculate_wbgt(
                air_temp_c=temp_c,
                relative_humidity=rh,
                wind_speed_m_s=wind_ms,
                solar_radiation_w_m2=solar_rad,
                environment="outdoor"
            )
            # Mean Radiant Temp estimation from air temp + solar load
            mrt_c = temp_c + (solar_rad * 0.022)
            utci_res = calculate_utci(
                air_temp_c=temp_c,
                relative_humidity=rh,
                wind_speed_10m_ms=wind_ms,
                mean_radiant_temp_c=mrt_c
            )

            # Persistence tracking: night temp trap (point between 00:00 and 06:00 IST)
            is_night = hour_local < 6 or hour_local >= 22
            is_night_heat_trap = is_night and temp_c >= 28.0

            htsi_res = calculate_htsi(
                heat_index_c=hi_res.heat_index_c,
                wbgt_c=wbgt_res.wbgt_c,
                utci_c=utci_res.utci_c,
                consecutive_hot_days=consecutive_hot_days,
                min_night_temp_c=max(26.0, temp_c if is_night else 27.5),
                vulnerability_score=50.0,
                builtup_fraction=builtup_fraction,
                vegetation_ndvi=vegetation_ndvi
            )

            point_data = {
                "timestamp_utc": point_utc.isoformat(),
                "time_display_ist": point_ist.strftime("%d %b, %H:%M IST"),
                "date_display": point_ist.strftime("%a %d %b"),
                "hour_ist": hour_local,
                "is_night": is_night,
                "is_night_heat_trap": is_night_heat_trap,
                "air_temp_c": temp_c,
                "relative_humidity": rh,
                "wind_speed_ms": wind_ms,
                "solar_radiation_wm2": solar_rad,
                "heat_index_c": hi_res.heat_index_c,
                "heat_index_category": hi_res.category,
                "wbgt_c": wbgt_res.wbgt_c,
                "wbgt_category": wbgt_res.category,
                "wbgt_flag": wbgt_res.flag_color,
                "utci_c": utci_res.utci_c,
                "utci_category": utci_res.category,
                "htsi_score": htsi_res.htsi_score,
                "htsi_category": htsi_res.htsi_category,
                "work_rest_indicative": {
                    "light_work": "Continuous" if wbgt_res.wbgt_c < 30.0 else "45m Work / 15m Rest" if wbgt_res.wbgt_c < 32.0 else "20m Work / 40m Rest",
                    "moderate_work": "Continuous" if wbgt_res.wbgt_c < 28.0 else "45m Work / 15m Rest" if wbgt_res.wbgt_c < 31.0 else "15m Work / 45m Rest",
                    "heavy_work": "45m Work / 15m Rest" if wbgt_res.wbgt_c < 27.0 else "30m Work / 30m Rest" if wbgt_res.wbgt_c < 30.0 else "Stop / Suspend",
                    "hydration_liters_per_hour": 0.5 if wbgt_res.wbgt_c < 28.0 else 0.75 if wbgt_res.wbgt_c < 31.0 else 1.0,
                    "disclaimer": "Indicative guidance for planning support only. Verify applicable occupational safety regulations before operational use."
                }
            }
            hourly_series.append(point_data)

            # Aggregate daily summary
            if date_key not in daily_summaries:
                daily_summaries[date_key] = {
                    "date": date_key,
                    "day_label": point_ist.strftime("%A, %d %b"),
                    "temps": [],
                    "night_temps": [],
                    "wbgts": [],
                    "htsis": []
                }
            daily_summaries[date_key]["temps"].append(temp_c)
            if is_night:
                daily_summaries[date_key]["night_temps"].append(temp_c)
            daily_summaries[date_key]["wbgts"].append(wbgt_res.wbgt_c)
            daily_summaries[date_key]["htsis"].append(htsi_res.htsi_score)

        # Build clean daily cards
        daily_forecast = []
        for dk, d in daily_summaries.items():
            t_max = max(d["temps"]) if d["temps"] else base_temp_c
            t_min = min(d["temps"]) if d["temps"] else base_temp_c - 6.0
            night_min = min(d["night_temps"]) if d["night_temps"] else t_min
            wbgt_max = max(d["wbgts"]) if d["wbgts"] else 30.0
            htsi_max = max(d["htsis"]) if d["htsis"] else 55.0

            daily_forecast.append({
                "date": dk,
                "day_label": d["day_label"],
                "max_temp_c": round(t_max, 1),
                "min_temp_c": round(t_min, 1),
                "night_min_temp_c": round(night_min, 1),
                "is_nocturnal_heat_trap": night_min >= 28.0,
                "peak_wbgt_c": round(wbgt_max, 1),
                "peak_htsi_score": round(htsi_max, 1),
                "htsi_category": "Extreme" if htsi_max >= 80 else "Very High" if htsi_max >= 60 else "High" if htsi_max >= 40 else "Moderate"
            })

        valid_until_utc = now_utc + timedelta(days=days)

        return {
            "source": self.SOURCE_LABEL,
            "source_display": "FORECAST SOURCE: DETERMINISTIC DEMO",
            "is_demo": True,
            "confidence_level": self.CONFIDENCE_LABEL,
            "confidence_score": None,
            "deterministic_seed": self.seed,
            "engine_version": "heatshield-engine-2.0",
            "uncertainty_band": self.UNCERTAINTY_BAND,
            "generated_at_utc": now_utc.isoformat(),
            "valid_from_utc": now_utc.isoformat(),
            "valid_until_utc": valid_until_utc.isoformat(),
            "display_timezone": "Asia/Kolkata",
            "ward_id": ward_id,
            "ward_name": ward_name,
            "days_horizon": days,
            "hourly_series": hourly_series,
            "daily_forecast": daily_forecast,
            "methodology_disclaimer": "DEMONSTRATION FORECAST. Generated deterministically for microclimate planning demonstration. Not an official IMD weather forecast."
        }
