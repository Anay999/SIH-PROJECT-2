"""Master Dataset Preparation and Preprocessing Pipeline.

Integrates:
1. Multi-location meteorological dataset ingestion (Districts & Wards)
2. Spatial mapping and Local Climate Zone microclimate processing
3. Data quality validation (saving results/data_quality_report.json)
4. IMD heatwave labeling (training-only climatology)
5. Comprehensive feature engineering (physical, thermal, temporal, seasonal)
6. Target leakage prevention audit (saving results/leakage_audit.json)
7. Chronological splitting into Train (2014-2021), Validation (2022-2023), and Test (2024)
8. Export of processed artifacts to data/processed/
"""

import os
import json
import logging
import yaml
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple

from src.data.quality import validate_dataset, generate_full_quality_report
from src.data.spatial_mapping import prepare_ward_datasets
from src.labels.generate import process_labels_for_location
from src.features.build import engineer_features_for_location, run_target_leakage_audit

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("src.data.prepare")

RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"
PREPROCESSING_DIR = "models/preprocessing"
CONFIG_PATH = "configs/experiment_config.yaml"

def load_all_raw_datasets(raw_dir: str = RAW_DIR) -> Dict[str, pd.DataFrame]:
    """Loads all downloaded ERA5 raw datasets from data/raw/."""
    dfs = {}
    if not os.path.exists(raw_dir):
        raise FileNotFoundError(f"Raw data directory '{raw_dir}' does not exist.")
    for fname in os.listdir(raw_dir):
        if fname.startswith("era5_") and (fname.endswith(".parquet") or fname.endswith(".csv")):
            loc_id = fname.replace("era5_", "").replace(".parquet", "").replace(".csv", "")
            fpath = os.path.join(raw_dir, fname)
            if fname.endswith(".parquet"):
                df = pd.read_parquet(fpath)
            else:
                df = pd.read_csv(fpath, parse_dates=["time"])
            dfs[loc_id] = df
    logger.info(f"Loaded {len(dfs)} raw district datasets from {raw_dir}: {list(dfs.keys())}")
    return dfs

def prepare_complete_dataset(
    config_path: str = CONFIG_PATH,
    raw_dir: str = RAW_DIR,
    processed_dir: str = PROCESSED_DIR
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, List[str]]:
    """Runs the end-to-end data pipeline from raw meteorological inputs to train/val/test splits."""
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(PREPROCESSING_DIR, exist_ok=True)

    with open(config_path, "r") as f:
        cfg = yaml.safe_load(f)

    # 1. Load Raw District Data
    raw_dfs = load_all_raw_datasets(raw_dir)
    if "loc_chennai" not in raw_dfs:
        raise ValueError("Baseline dataset 'loc_chennai' must be present in data/raw.")

    # 2. Spatial Mapping for Wards
    ward_dfs = prepare_ward_datasets(raw_dfs, geojson_path="data/geojson/chennai_wards.geojson")
    all_locations_df = {**raw_dfs, **ward_dfs}
    logger.info(f"Total active administrative locations: {len(all_locations_df)} (8 districts + 15 wards)")

    # 3. Quality Assurance Audit
    generate_full_quality_report(all_locations_df, output_path="results/data_quality_report.json")

    # 4. IMD Labeling & Feature Engineering per Location
    processed_loc_list = []
    location_configs = {loc["id"]: loc for loc in cfg.get("geographic", {}).get("locations", [])}

    for loc_id, df in all_locations_df.items():
        loc_cfg = location_configs.get(loc_id, {})
        is_coastal = (loc_cfg.get("category") == "coastal") or ("ward" in loc_id)
        elevation = loc_cfg.get("elevation_m", 15.0)

        # IMD Heatwave Labeling & Lead Targets
        labeled_df, normals = process_labels_for_location(
            df,
            train_end_year=2021,
            is_coastal=is_coastal,
            horizons=(1, 2, 3)
        )

        # Feature Engineering
        feat_df = engineer_features_for_location(labeled_df, elevation_m=elevation)
        processed_loc_list.append(feat_df)

    # Combine all locations
    combined_df = pd.concat(processed_loc_list, ignore_index=True)
    combined_df = combined_df.sort_values(["time", "location_id"]).reset_index(drop=True)

    # Identify Feature Columns and Target Columns
    meta_cols = [
        "time", "location_id", "district", "ward_name", "location_type",
        "data_source", "spatial_mapping_method", "spatial_provenance", "source_grid_resolution_km"
    ]
    target_cols = [c for c in combined_df.columns if c.startswith("target_") or c.endswith("_label")]
    feature_cols = [c for c in combined_df.columns if c not in meta_cols and c not in target_cols and c != "day_of_year"]

    # 5. Target Leakage Audit
    run_target_leakage_audit(feature_cols, target_cols, output_path="results/leakage_audit.json")

    # Save Feature Schema
    feature_schema = {
        "feature_count": len(feature_cols),
        "features": feature_cols,
        "target_horizons": [1, 2, 3],
        "primary_target": "target_hw_t1",
        "created_at": str(pd.Timestamp.now())
    }
    with open(os.path.join(PREPROCESSING_DIR, "feature_schema.json"), "w") as f:
        json.dump(feature_schema, f, indent=2)

    # 6. Chronological Splitting
    combined_df["year"] = pd.to_datetime(combined_df["time"]).dt.year
    train_years = cfg["temporal"]["train_years"]
    val_years = cfg["temporal"]["val_years"]
    test_years = cfg["temporal"]["test_years"]

    train_df = combined_df[combined_df["year"].isin(train_years)].copy()
    val_df = combined_df[combined_df["year"].isin(val_years)].copy()
    test_df = combined_df[combined_df["year"].isin(test_years)].copy()

    logger.info(f"Dataset split sizes: Train={len(train_df)} ({train_years[0]}-{train_years[-1]}), "
                f"Val={len(val_df)} ({val_years[0]}-{val_years[-1]}), "
                f"Test={len(test_df)} ({test_years[0]}-{test_years[-1]})")
    logger.info(f"Heatwave label positive rates: Train={train_df['heatwave_label'].mean():.3%}, "
                f"Val={val_df['heatwave_label'].mean():.3%}, Test={test_df['heatwave_label'].mean():.3%}")

    # Persist Processed Data
    train_path = os.path.join(processed_dir, "train.csv")
    val_path = os.path.join(processed_dir, "val.csv")
    test_path = os.path.join(processed_dir, "test.csv")
    all_path = os.path.join(processed_dir, "all_processed.csv")

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)
    combined_df.to_csv(all_path, index=False)

    logger.info(f"Processed splits saved to {processed_dir}/ (train.csv, val.csv, test.csv, all_processed.csv).")
    return train_df, val_df, test_df, feature_cols

if __name__ == "__main__":
    prepare_complete_dataset()
