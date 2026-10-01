"""Heatwave Label Generation Module based on Official IMD Definitions.

Implements the India Meteorological Department (IMD) scientific criteria for:
1. Plains stations
2. Coastal stations
3. Severe heatwave categorization
4. Multi-horizon direct target generation (T+1, T+2, T+3)

CRITICAL: Climatological normals are derived strictly from the training period (2014-2021)
to guarantee zero target leakage into validation and testing splits.
"""

import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

logger = logging.getLogger("src.labels.generate")

def compute_climatological_normals(
    train_df: pd.DataFrame,
    window_days: int = 15
) -> pd.DataFrame:
    """Computes daily climatological normal maximum temperature from training data only.
    
    Uses day-of-year grouping with circular rolling window smoothing.
    """
    df = train_df.copy()
    df["day_of_year"] = pd.to_datetime(df["time"]).dt.dayofyear

    # Mean Tmax for each day of year across all training years
    doy_mean = df.groupby("day_of_year")["temperature_2m_max"].mean().reset_index()
    doy_mean.columns = ["day_of_year", "tmax_normal_raw"]

    # Circular smoothing for year boundary (Dec 31 to Jan 1)
    extended = pd.concat([doy_mean.iloc[-window_days:], doy_mean, doy_mean.iloc[:window_days]], ignore_index=True)
    extended["tmax_normal"] = extended["tmax_raw"].rolling(window=window_days, center=True, min_periods=1).mean() if "tmax_raw" in extended.columns else extended["tmax_normal_raw"].rolling(window=window_days, center=True, min_periods=1).mean()
    
    smoothed_doy = extended.iloc[window_days:-window_days].copy()
    smoothed_doy["tmax_normal"] = smoothed_doy["tmax_normal"].round(2)
    return smoothed_doy[["day_of_year", "tmax_normal"]]

def compute_imd_heatwave_label(
    tmax: float,
    normal_tmax: float,
    is_coastal: bool = False
) -> Tuple[int, int]:
    """Computes IMD heatwave and severe heatwave binary label for scalar observation."""
    dep = round(tmax - normal_tmax, 2)
    if is_coastal:
        hw = int(((tmax >= 37.0) and (dep >= 4.5)) or (tmax >= 42.0))
        severe = int(((tmax >= 37.0) and (dep >= 6.5)) or (tmax >= 44.0))
    else:
        hw = int(((tmax >= 40.0) and (dep >= 4.5)) or (tmax >= 45.0))
        severe = int(((tmax >= 40.0) and (dep >= 6.5)) or (tmax >= 47.0))
    return hw, severe

def assign_imd_heatwave_labels(
    df: pd.DataFrame,
    normals_df: pd.DataFrame,
    is_coastal: bool = False
) -> pd.DataFrame:
    """Applies official IMD heatwave criteria to daily observations.
    
    Plains criteria:
    - Normal Tmax > 40°C: Departure >= 4.5°C (HW) or >= 6.5°C (Severe HW)
    - Or Actual Tmax >= 45°C (HW) or >= 47°C (Severe HW)
    
    Coastal criteria:
    - Actual Tmax >= 37°C AND Departure >= 4.5°C
    """
    out = df.copy()
    out["day_of_year"] = pd.to_datetime(out["time"]).dt.dayofyear
    out = out.merge(normals_df, on="day_of_year", how="left")

    # If leap year day 366 missing in normals, forward fill from day 365
    out["tmax_normal"] = out["tmax_normal"].ffill().bfill()
    out["temperature_departure"] = (out["temperature_2m_max"] - out["tmax_normal"]).round(2)

    tmax = out["temperature_2m_max"]
    dep = out["temperature_departure"]
    normal = out["tmax_normal"]

    if is_coastal:
        # Coastal IMD rule: actual Tmax >= 37.0°C with departure >= 4.5°C, or extreme Tmax >= 42.0°C
        hw_cond = ((tmax >= 37.0) & (dep >= 4.5)) | (tmax >= 42.0)
        severe_cond = ((tmax >= 37.0) & (dep >= 6.5)) | (tmax >= 44.0)
    else:
        # Plains IMD rule: actual Tmax >= 40.0°C with departure >= 4.5°C, or extreme Tmax >= 45.0°C
        hw_cond = ((tmax >= 40.0) & (dep >= 4.5)) | (tmax >= 45.0)
        severe_cond = ((tmax >= 40.0) & (dep >= 6.5)) | (tmax >= 47.0)

    out["heatwave_label"] = hw_cond.astype(int)
    out["severe_heatwave_label"] = severe_cond.astype(int)

    return out

def create_lead_time_targets(
    df: pd.DataFrame,
    horizons: Tuple[int, ...] = (1, 2, 3)
) -> pd.DataFrame:
    """Constructs direct forecasting targets Y(t+1), Y(t+2), Y(t+3) for each horizon.
    
    Strictly shifts forward in time so X(t) aligns with target Y(t+k).
    """
    out = df.copy()
    out = out.sort_values("time").reset_index(drop=True)

    for h in horizons:
        # Target at day t is the heatwave state at day t+h
        out[f"target_hw_t{h}"] = out["heatwave_label"].shift(-h)
        out[f"target_severe_hw_t{h}"] = out["severe_heatwave_label"].shift(-h)

    return out

def process_labels_for_location(
    loc_df: pd.DataFrame,
    train_end_year: int = 2021,
    is_coastal: bool = False,
    horizons: Tuple[int, ...] = (1, 2, 3)
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Computes training normals, applies IMD labels, and generates lead time targets."""
    loc_df = loc_df.sort_values("time").reset_index(drop=True)
    train_mask = pd.to_datetime(loc_df["time"]).dt.year <= train_end_year
    train_subset = loc_df[train_mask]

    normals_df = compute_climatological_normals(train_subset)
    labeled_df = assign_imd_heatwave_labels(loc_df, normals_df, is_coastal=is_coastal)
    targeted_df = create_lead_time_targets(labeled_df, horizons=horizons)

    hw_count = int(targeted_df["heatwave_label"].sum())
    hw_pct = round(hw_count / len(targeted_df) * 100.0, 2)
    logger.info(f"Location {targeted_df['location_id'].iloc[0]}: {hw_count} heatwave days ({hw_pct}% of total records).")

    return targeted_df, normals_df
