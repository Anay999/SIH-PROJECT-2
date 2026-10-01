"""Single-Location Inference Pipeline CLI.

Usage:
    python predict.py --location Chennai --horizon 1 [--model attention_gru]
"""

import os
import sys
import json
import argparse
import joblib
import torch
import numpy as np
import pandas as pd

from src.models.attention_gru import HeatwaveAttentionGRU
from src.models.lstm import HeatwaveLSTM
from src.models.xgboost_model import HeatwaveXGBoost
from src.models.lightgbm_model import HeatwaveLightGBM
from src.models.random_forest import HeatwaveRandomForest
from src.models.logistic_regression import HeatwaveLogisticRegression
from src.forecasting.early_warning_engine import EarlyWarningEngine

MODELS_DIR = "models/trained"
PREPROC_DIR = "models/preprocessing"
METADATA_DIR = "models/metadata"
DATA_PATH = "data/processed/all_processed.csv"

def predict_single_location(
    location_query: str,
    horizon: int = 1,
    model_name: str = "attention_gru",
    data_path: str = DATA_PATH
):
    """Executes live/reanalysis inference for a specified location and forecast horizon."""
    # 1. Load feature schema and thresholds
    schema_path = os.path.join(PREPROC_DIR, "feature_schema.json")
    thresholds_path = os.path.join(PREPROC_DIR, "thresholds.json")
    scaler_path = os.path.join(PREPROC_DIR, "scaler.joblib")

    if not os.path.exists(schema_path) or not os.path.exists(thresholds_path):
        raise FileNotFoundError("Model artifacts not found. Please train models first using 'python train_all.py'.")

    with open(schema_path, "r") as f:
        schema = json.load(f)
    with open(thresholds_path, "r") as f:
        thresholds = json.load(f)

    feature_cols = schema["features"]
    threshold = thresholds.get(model_name, 0.5)
    scaler = joblib.load(scaler_path)

    # 2. Retrieve location historical records
    df = pd.read_csv(data_path, parse_dates=["time"])
    loc_match = df[(df["location_id"].str.lower().str.contains(location_query.lower())) |
                   (df["district"].str.lower().str.contains(location_query.lower())) |
                   (df["ward_name"].fillna("").str.lower().str.contains(location_query.lower()))]

    if len(loc_match) == 0:
        raise ValueError(f"No records found for location query '{location_query}'. Available locations: {df['location_id'].unique().tolist()}")

    loc_id = loc_match["location_id"].iloc[0]
    loc_df = df[df["location_id"] == loc_id].sort_values("time").reset_index(drop=True)

    if len(loc_df) < 7:
        raise ValueError(f"Insufficient history for location {loc_id}. Requires at least 7 continuous daily records.")

    recent_7 = loc_df.tail(7)
    recent_features = recent_7[feature_cols].values.astype(np.float32)
    recent_features_scaled = scaler.transform(np.nan_to_num(recent_features))
    latest_date = recent_7["time"].iloc[-1].date()
    forecast_date = latest_date + pd.Timedelta(days=horizon)

    # 3. Model Inference
    attention_weights_info = None
    if model_name == "attention_gru":
        model_file = os.path.join(MODELS_DIR, "attention_gru.pt")
        m = HeatwaveAttentionGRU(input_dim=len(feature_cols))
        m.load(model_file)
        X_seq = recent_features_scaled.reshape(1, 7, len(feature_cols))
        prob, att = m.predict_proba_and_attention(X_seq)
        probability = float(prob[0])
        attention_weights_info = {f"Day -{7-i}": round(float(w), 4) for i, w in enumerate(att[0])}
    elif model_name == "lstm":
        model_file = os.path.join(MODELS_DIR, "lstm.pt")
        m = HeatwaveLSTM(input_dim=len(feature_cols))
        m.load(model_file)
        X_seq = recent_features_scaled.reshape(1, 7, len(feature_cols))
        probability = float(m.predict_proba(X_seq)[0])
    elif model_name == "xgboost":
        m = HeatwaveXGBoost()
        m.load(os.path.join(MODELS_DIR, "xgboost.json"))
        X_last = recent_features_scaled[-1:].reshape(1, -1)
        probability = float(m.predict_proba(X_last)[0])
    elif model_name == "lightgbm":
        m = HeatwaveLightGBM()
        m.load(os.path.join(MODELS_DIR, "lightgbm.txt"))
        X_last = recent_features_scaled[-1:].reshape(1, -1)
        probability = float(m.predict_proba(X_last)[0])
    elif model_name == "random_forest":
        m = HeatwaveRandomForest()
        m.load(os.path.join(MODELS_DIR, "random_forest.joblib"))
        X_last = recent_features_scaled[-1:].reshape(1, -1)
        probability = float(m.predict_proba(X_last)[0])
    elif model_name == "logistic_regression":
        m = HeatwaveLogisticRegression()
        m.load(os.path.join(MODELS_DIR, "logistic_regression.joblib"), os.path.join(PREPROC_DIR, "lr_scaler.joblib"))
        X_last = recent_features[-1:].reshape(1, -1)
        probability = float(m.predict_proba(X_last)[0])
    else:
        raise ValueError(f"Unknown model name '{model_name}'. Choose from: attention_gru, lstm, xgboost, lightgbm, random_forest, logistic_regression")

    predicted_class = "HEATWAVE" if probability >= threshold else "NO HEATWAVE"
    early_warning = EarlyWarningEngine().determine_risk_tier(probability)

    result = {
        "location": loc_id,
        "district": loc_df["district"].iloc[0] if "district" in loc_df.columns else "N/A",
        "latest_observation_date": str(latest_date),
        "forecast_date": str(forecast_date),
        "forecast_horizon": f"T+{horizon}",
        "predicted_probability": round(probability, 4),
        "predicted_class": predicted_class,
        "model": model_name,
        "model_version": "1.0",
        "validation_threshold": round(float(threshold), 4),
        "decision_support_level": early_warning["tier"],
        "risk_description": early_warning["description"],
        "latest_tmax_c": float(recent_7["temperature_2m_max"].iloc[-1]),
        "latest_heat_index_c": float(recent_7["heat_index"].iloc[-1]) if "heat_index" in recent_7.columns else None,
        "attention_weights": attention_weights_info
    }

    # Format human-readable output (Prompt Section 59)
    print("\n" + "="*50)
    print("HEATWAVE EARLY-WARNING FORECAST")
    print("="*50)
    print(f"Location:                 {result['location']}")
    print(f"District:                 {result['district']}")
    print(f"Forecast Horizon:         {result['forecast_horizon']}")
    print(f"Forecast Date:            {result['forecast_date']}")
    print(f"Probability:              {result['predicted_probability']:.1%}")
    print(f"Prediction:               {result['predicted_class']}")
    print(f"Decision Support Level:   {result['decision_support_level']}")
    print(f"Model:                    {result['model']}")
    print(f"Threshold:                {result['validation_threshold']:.3f}")
    print(f"Model Version:            {result['model_version']}")
    print(f"Observed Tmax Context:    {result['latest_tmax_c']} °C")
    if result["attention_weights"]:
        print("\nTemporal Attention Lookback Weights (Previous 7 Days):")
        for d, w in result["attention_weights"].items():
            print(f"  {d}: {w:.4f}")
    print("="*50 + "\n")

    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate live/offline heatwave forecast for a location.")
    parser.add_argument("--location", type=str, default="Chennai", help="Name or ID of location/ward")
    parser.add_argument("--horizon", type=int, default=1, choices=[1, 2, 3], help="Lead horizon: 1, 2, or 3 days ahead")
    parser.add_argument("--model", type=str, default="attention_gru", help="Model: attention_gru, lstm, xgboost, lightgbm, random_forest, logistic_regression")
    args = parser.parse_args()

    predict_single_location(args.location, args.horizon, args.model)
