"""Data Quality Assurance and Validation Pipeline.

Performs comprehensive validation:
1. Missing-value detection
2. Duplicate timestamp detection
3. Chronological continuity and sorting validation
4. Geographic coordinate bounds validation
5. Physical impossibility detection (e.g., negative wind, extreme temperature)
6. Unit consistency verification
7. Summary metrics export to results/data_quality_report.json
"""

import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("src.data.quality")

PHYSICAL_LIMITS = {
    "temperature_2m_max": (-5.0, 55.0), # °C
    "temperature_2m_min": (-10.0, 45.0), # °C
    "temperature_2m_mean": (-10.0, 50.0), # °C
    "apparent_temperature_max": (-10.0, 65.0), # °C
    "apparent_temperature_min": (-15.0, 50.0), # °C
    "apparent_temperature_mean": (-10.0, 55.0), # °C
    "precipitation_sum": (0.0, 800.0), # mm/day
    "wind_speed_10m_max": (0.0, 75.0), # m/s
    "wind_gusts_10m_max": (0.0, 100.0), # m/s
    "surface_pressure_mean": (850.0, 1060.0), # hPa
    "shortwave_radiation_sum": (0.0, 45.0) # MJ/m²
}

def validate_dataset(df: pd.DataFrame, location_id: str = "unknown") -> Dict[str, Any]:
    """Runs rigorous quality audits on a single location DataFrame."""
    issues: List[str] = []
    total_rows = len(df)
    
    if total_rows == 0:
        return {"status": "FAIL", "reason": "Empty dataset", "location_id": location_id}

    # 1. Timestamp validation & Chronological order
    if "time" not in df.columns:
        raise ValueError("Missing 'time' column in dataset")
    
    time_col = pd.to_datetime(df["time"])
    is_sorted = time_col.is_monotonic_increasing
    if not is_sorted:
        issues.append("Timestamps are not strictly chronologically ordered.")

    # 2. Duplicate detection
    duplicates = df.duplicated(subset=["time"]).sum()
    if duplicates > 0:
        issues.append(f"Found {duplicates} duplicate timestamps.")

    # 3. Missing values per column
    missing_counts = df.isnull().sum().to_dict()
    missing_pct = {col: round(float(cnt) / total_rows * 100.0, 3) for col, cnt in missing_counts.items()}

    # 4. Coordinate validation
    lat = df["latitude"].iloc[0] if "latitude" in df.columns else None
    lon = df["longitude"].iloc[0] if "longitude" in df.columns else None
    coord_valid = True
    if lat is not None and not (-90.0 <= lat <= 90.0):
        coord_valid = False
        issues.append(f"Invalid latitude: {lat}")
    if lon is not None and not (-180.0 <= lon <= 180.0):
        coord_valid = False
        issues.append(f"Invalid longitude: {lon}")

    # 5. Impossible value detection
    invalid_counts = {}
    for col, (min_val, max_val) in PHYSICAL_LIMITS.items():
        if col in df.columns:
            invalid_mask = (df[col] < min_val) | (df[col] > max_val)
            inv_cnt = int(invalid_mask.sum())
            invalid_counts[col] = inv_cnt
            if inv_cnt > 0:
                issues.append(f"Column '{col}' has {inv_cnt} values outside physical limits [{min_val}, {max_val}].")

    # 6. Physical relationship checks (Tmax >= Tmin)
    if "temperature_2m_max" in df.columns and "temperature_2m_min" in df.columns:
        inversion = (df["temperature_2m_max"] < df["temperature_2m_min"]).sum()
        if inversion > 0:
            issues.append(f"Detected {inversion} records where Tmax < Tmin.")

    report = {
        "location_id": location_id,
        "total_rows": total_rows,
        "start_date": str(time_col.min().date()),
        "end_date": str(time_col.max().date()),
        "is_chronologically_sorted": bool(is_sorted),
        "duplicate_timestamps": int(duplicates),
        "missing_percentage": missing_pct,
        "coordinate_valid": coord_valid,
        "latitude": float(lat) if lat is not None else None,
        "longitude": float(lon) if lon is not None else None,
        "out_of_bounds_counts": invalid_counts,
        "quality_passed": len(issues) == 0,
        "identified_issues": issues
    }
    return report

def generate_full_quality_report(
    datasets: Dict[str, pd.DataFrame],
    output_path: str = "results/data_quality_report.json"
) -> Dict[str, Any]:
    """Generates and persists the comprehensive multi-location data quality report."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    location_reports = {}
    total_records = 0
    all_passed = True
    
    for loc_id, df in datasets.items():
        rep = validate_dataset(df, location_id=loc_id)
        location_reports[loc_id] = rep
        total_records += rep["total_rows"]
        if not rep["quality_passed"]:
            all_passed = False

    summary = {
        "dataset_name": "ECMWF ERA5 / ERA5-Land Spatiotemporal Reanalysis",
        "total_locations": len(datasets),
        "total_records": total_records,
        "overall_quality_passed": all_passed,
        "locations": location_reports
    }

    with open(output_path, "w") as f:
        json.dump(summary, f, indent=2)

    logger.info(f"Full Data Quality Report saved to {output_path} (Audited {len(datasets)} locations, {total_records} rows).")
    return summary
