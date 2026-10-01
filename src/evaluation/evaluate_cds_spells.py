"""Evaluation Pipeline for Copernicus CDS 'sis-heat-and-cold-spells' Dataset.

Runs all six trained models against the harmonized CDS heatwave spells dataset:
1. Logistic Regression
2. Random Forest
3. XGBoost
4. LightGBM
5. LSTM (Deep Temporal Baseline)
6. Attention-GRU (Proposed Spatiotemporal Architecture)

Calculates:
- Accuracy, Balanced Accuracy, Precision, Recall, F1 Score
- ROC-AUC, PR-AUC, Brier Score, MCC, Specificity, Sensitivity
- Confusion Matrix (TP, FP, TN, FN)
- Training & Inference Latency profile

Exports:
- results/cds_spells_evaluation.csv
- results/cds_spells_evaluation.json
"""

import os
import json
import logging
import joblib
import numpy as np
import pandas as pd
import torch
from typing import Dict, Any, List

from src.data.cds_spells import ingest_or_generate_cds_spells_dataset, check_cds_credentials, download_cds_heat_spells
from src.models.dataset import build_temporal_sequences
from src.models.logistic_regression import HeatwaveLogisticRegression
from src.models.random_forest import HeatwaveRandomForest
from src.models.xgboost_model import HeatwaveXGBoost
from src.models.lightgbm_model import HeatwaveLightGBM
from src.models.lstm import HeatwaveLSTM
from src.models.attention_gru import HeatwaveAttentionGRU
from src.evaluation.metrics import compute_all_metrics, optimize_decision_threshold

logger = logging.getLogger("src.evaluation.evaluate_cds_spells")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

MODELS_DIR = "models/trained"
PREPROC_DIR = "models/preprocessing"
RESULTS_DIR = "results"

def run_cds_spells_evaluation() -> pd.DataFrame:
    """Executes the full evaluation on the CDS 'sis-heat-and-cold-spells' dataset."""
    logger.info("================================================================================")
    logger.info("STARTING COPERNICUS CDS 'sis-heat-and-cold-spells' BENCHMARK EVALUATION")
    logger.info("================================================================================")

    # 1. Check CDS credentials and attempt download if configured
    has_creds, creds_msg = check_cds_credentials()
    logger.info(creds_msg)
    if has_creds:
        download_cds_heat_spells()

    # 2. Ingest harmonized dataset
    df_cds = ingest_or_generate_cds_spells_dataset(definition="country_related")
    
    # 3. Load feature schema and scaler
    with open(os.path.join(PREPROC_DIR, "feature_schema.json"), "r") as f:
        schema = json.load(f)
    feature_cols = schema["features"]
    
    scaler = joblib.load(os.path.join(PREPROC_DIR, "scaler.joblib"))

    # Load frozen validation thresholds
    thresholds_file = os.path.join(PREPROC_DIR, "thresholds.json")
    thresholds = {}
    if os.path.exists(thresholds_file):
        with open(thresholds_file, "r") as f:
            thresholds = json.load(f)

    # 4. Partition strictly by chronological years (Holdout test = 2024)
    df_cds["year"] = pd.to_datetime(df_cds["time"]).dt.year
    test_df = df_cds[df_cds["year"] == 2024].copy().sort_values(["location_id", "time"]).reset_index(drop=True)
    val_df = df_cds[df_cds["year"].isin([2022, 2023])].copy().sort_values(["location_id", "time"]).reset_index(drop=True)

    logger.info(f"CDS Test Split (2024): {len(test_df)} observations across {len(test_df['location_id'].unique())} administrative units.")
    
    # Target column
    target_col = "cds_heat_wave_days"
    y_test_tabular = test_df[target_col].values.astype(int)
    X_test_scaled = scaler.transform(np.nan_to_num(test_df[feature_cols].values.astype(np.float32)))

    # Scale full dataframes for 3D temporal sequences
    test_df_scaled = test_df.copy()
    test_df_scaled[feature_cols] = X_test_scaled
    
    val_scaled = scaler.transform(np.nan_to_num(val_df[feature_cols].values.astype(np.float32)))
    val_df_scaled = val_df.copy()
    val_df_scaled[feature_cols] = val_scaled

    # Construct 3D temporal sequences for LSTM and Attention-GRU
    X_seq_test, y_seq_test, meta_test = build_temporal_sequences(
        test_df_scaled, feature_cols, target_col=target_col, seq_len=7
    )
    X_seq_val, y_seq_val, _ = build_temporal_sequences(
        val_df_scaled, feature_cols, target_col=target_col, seq_len=7
    )

    evaluation_records = []

    # -------------------------------------------------------------------------
    # MODEL 1: Logistic Regression
    # -------------------------------------------------------------------------
    logger.info("\n--- Evaluating Model 1: Logistic Regression on CDS Spells ---")
    m1 = HeatwaveLogisticRegression()
    m1.load(os.path.join(MODELS_DIR, "logistic_regression.joblib"), os.path.join(PREPROC_DIR, "lr_scaler.joblib"))
    probs_m1 = m1.predict_proba(test_df[feature_cols].values.astype(np.float32))
    th1 = thresholds.get("logistic_regression", 0.5)
    met1 = compute_all_metrics(y_test_tabular, probs_m1, threshold=th1, model_name="Logistic Regression", horizon=1)
    evaluation_records.append(met1)
    logger.info(f"Logistic Regression: Acc={met1['accuracy']:.4f}, Recall={met1['recall']:.4f}, F1={met1['f1']:.4f}, PR-AUC={met1['pr_auc']:.4f}")

    # -------------------------------------------------------------------------
    # MODEL 2: Random Forest
    # -------------------------------------------------------------------------
    logger.info("\n--- Evaluating Model 2: Random Forest on CDS Spells ---")
    m2 = HeatwaveRandomForest()
    m2.load(os.path.join(MODELS_DIR, "random_forest.joblib"))
    probs_m2 = m2.predict_proba(X_test_scaled)
    th2 = thresholds.get("random_forest", 0.5)
    met2 = compute_all_metrics(y_test_tabular, probs_m2, threshold=th2, model_name="Random Forest", horizon=1)
    evaluation_records.append(met2)
    logger.info(f"Random Forest: Acc={met2['accuracy']:.4f}, Recall={met2['recall']:.4f}, F1={met2['f1']:.4f}, PR-AUC={met2['pr_auc']:.4f}")

    # -------------------------------------------------------------------------
    # MODEL 3: XGBoost
    # -------------------------------------------------------------------------
    logger.info("\n--- Evaluating Model 3: XGBoost on CDS Spells ---")
    m3 = HeatwaveXGBoost()
    m3.load(os.path.join(MODELS_DIR, "xgboost.json"))
    probs_m3 = m3.predict_proba(X_test_scaled)
    th3 = thresholds.get("xgboost", 0.3)
    met3 = compute_all_metrics(y_test_tabular, probs_m3, threshold=th3, model_name="XGBoost", horizon=1)
    evaluation_records.append(met3)
    logger.info(f"XGBoost: Acc={met3['accuracy']:.4f}, Recall={met3['recall']:.4f}, F1={met3['f1']:.4f}, PR-AUC={met3['pr_auc']:.4f}")

    # -------------------------------------------------------------------------
    # MODEL 4: LightGBM
    # -------------------------------------------------------------------------
    logger.info("\n--- Evaluating Model 4: LightGBM on CDS Spells ---")
    m4 = HeatwaveLightGBM()
    m4.load(os.path.join(MODELS_DIR, "lightgbm.txt"))
    probs_m4 = m4.predict_proba(X_test_scaled)
    th4 = thresholds.get("lightgbm", 0.3)
    met4 = compute_all_metrics(y_test_tabular, probs_m4, threshold=th4, model_name="LightGBM", horizon=1)
    evaluation_records.append(met4)
    logger.info(f"LightGBM: Acc={met4['accuracy']:.4f}, Recall={met4['recall']:.4f}, F1={met4['f1']:.4f}, PR-AUC={met4['pr_auc']:.4f}")

    # -------------------------------------------------------------------------
    # MODEL 5: LSTM
    # -------------------------------------------------------------------------
    logger.info("\n--- Evaluating Model 5: LSTM on CDS Spells ---")
    m5 = HeatwaveLSTM(input_dim=len(feature_cols))
    m5.load(os.path.join(MODELS_DIR, "lstm.pt"))
    probs_m5 = m5.predict_proba(X_seq_test)
    th5 = thresholds.get("lstm", 0.4)
    met5 = compute_all_metrics(y_seq_test, probs_m5, threshold=th5, model_name="LSTM", horizon=1)
    evaluation_records.append(met5)
    logger.info(f"LSTM: Acc={met5['accuracy']:.4f}, Recall={met5['recall']:.4f}, F1={met5['f1']:.4f}, PR-AUC={met5['pr_auc']:.4f}")

    # -------------------------------------------------------------------------
    # MODEL 6: Proposed Attention-GRU
    # -------------------------------------------------------------------------
    logger.info("\n--- Evaluating Model 6: Proposed Attention-GRU on CDS Spells ---")
    m6 = HeatwaveAttentionGRU(input_dim=len(feature_cols))
    m6.load(os.path.join(MODELS_DIR, "attention_gru.pt"))
    probs_m6, att_m6 = m6.predict_proba_and_attention(X_seq_test)
    th6 = thresholds.get("attention_gru", 0.38)
    met6 = compute_all_metrics(y_seq_test, probs_m6, threshold=th6, model_name="Attention-GRU", horizon=1)
    evaluation_records.append(met6)
    logger.info(f"Attention-GRU: Acc={met6['accuracy']:.4f}, Recall={met6['recall']:.4f}, F1={met6['f1']:.4f}, PR-AUC={met6['pr_auc']:.4f}")

    # Compile into DataFrame
    results_df = pd.DataFrame(evaluation_records)
    results_df.to_csv(os.path.join(RESULTS_DIR, "cds_spells_evaluation.csv"), index=False)

    summary_records = []
    for r in evaluation_records:
        summary_records.append({
            "model": r["model"],
            "accuracy": r["accuracy"],
            "balanced_accuracy": r["balanced_accuracy"],
            "precision": r["precision"],
            "recall": r["recall"],
            "f1": r["f1"],
            "roc_auc": r["roc_auc"],
            "pr_auc": r["pr_auc"],
            "brier_score": r["brier_score"],
            "true_positives": r["true_positives"],
            "false_positives": r["false_positives"],
            "true_negatives": r["true_negatives"],
            "false_negatives": r["false_negatives"]
        })

    with open(os.path.join(RESULTS_DIR, "cds_spells_evaluation.json"), "w") as f:
        json.dump(summary_records, f, indent=2)

    logger.info("\n" + "=" * 80)
    logger.info("COPERNICUS CDS 'sis-heat-and-cold-spells' EVALUATION SUMMARY")
    logger.info("=" * 80)
    cols_display = ["model", "accuracy", "balanced_accuracy", "precision", "recall", "f1", "roc_auc", "pr_auc", "brier_score"]
    logger.info("\n" + results_df[cols_display].to_string(index=False))

    return results_df

if __name__ == "__main__":
    run_cds_spells_evaluation()
