"""Comprehensive Automated Test Suite for Multi-Source Spatiotemporal AI Heatwave Platform.

Validates:
1. Feature engineering and physical transformations
2. Official IMD heatwave label construction (plains vs coastal)
3. Target leakage prevention audit
4. Temporal sequence generation and location boundary enforcement
5. All six model architectures (LR, RF, XGBoost, LightGBM, LSTM, Attention-GRU)
6. Learnable attention weight normalization (softmax sum to 1.0)
7. Early warning decision support engine tiers
8. NOAA Rothfusz Heat Index and physical bounds
9. Evaluation metrics (PR-AUC, Brier score, ROC-AUC)
10. Model registry and batch prediction integrity
"""

import os
import json
import pytest
import numpy as np
import pandas as pd
import torch

from src.labels.generate import compute_imd_heatwave_label, compute_climatological_normals
from src.features.build import calculate_rothfusz_heat_index, calculate_wbgt_approximation
from src.models.dataset import build_temporal_sequences, SpatiotemporalSequenceDataset
from src.models.attention_gru import HeatwaveAttentionGRU, AttentionGRUNetwork
from src.models.lstm import HeatwaveLSTM, LSTMNetwork
from src.models.logistic_regression import HeatwaveLogisticRegression
from src.models.random_forest import HeatwaveRandomForest
from src.forecasting.early_warning_engine import EarlyWarningEngine
from src.evaluation.metrics import compute_all_metrics, optimize_decision_threshold


# 1. IMD Label Generation Tests
def test_imd_label_generation_plains_normal_departure():
    """Plains station: Tmax >= 40.0 and departure >= 4.5 => Heatwave."""
    # Normal is 38.0, Tmax is 43.0 (departure 5.0 >= 4.5, Tmax >= 40.0)
    label, severe = compute_imd_heatwave_label(tmax=43.0, normal_tmax=38.0, is_coastal=False)
    assert label == 1
    assert severe == 0

def test_imd_label_generation_plains_severe_absolute():
    """Plains station: Tmax >= 47.0 => Severe Heatwave."""
    label, severe = compute_imd_heatwave_label(tmax=47.5, normal_tmax=40.0, is_coastal=False)
    assert label == 1
    assert severe == 1

def test_imd_label_generation_plains_sub_threshold():
    """Plains station: Tmax < 40.0 => No Heatwave regardless of departure."""
    label, severe = compute_imd_heatwave_label(tmax=38.5, normal_tmax=32.0, is_coastal=False)
    assert label == 0
    assert severe == 0

def test_imd_label_generation_coastal():
    """Coastal station: Tmax >= 37.0 and departure >= 4.5 => Heatwave."""
    # Normal is 34.0, Tmax is 39.0 (departure 5.0 >= 4.5, Tmax >= 37.0)
    label, severe = compute_imd_heatwave_label(tmax=39.0, normal_tmax=34.0, is_coastal=True)
    assert label == 1

def test_imd_label_generation_coastal_absolute():
    """Coastal station: Tmax >= 42.0 => Heatwave by absolute criterion."""
    label, severe = compute_imd_heatwave_label(tmax=42.5, normal_tmax=39.0, is_coastal=True)
    assert label == 1


# 2. Thermal Indices Calculations
def test_heat_index_rothfusz():
    """Test Rothfusz regression produces higher apparent temp under high humidity."""
    hi_dry = float(calculate_rothfusz_heat_index(pd.Series([38.0]), pd.Series([25.0])).iloc[0])
    hi_humid = float(calculate_rothfusz_heat_index(pd.Series([38.0]), pd.Series([75.0])).iloc[0])
    assert hi_humid > hi_dry
    assert hi_humid > 45.0  # High danger category

def test_wbgt_calculation():
    """Test approximate WBGT is physically plausible."""
    wbgt = float(calculate_wbgt_approximation(pd.Series([36.0]), pd.Series([60.0]), pd.Series([700.0]), pd.Series([2.5])).iloc[0])
    assert 20.0 < wbgt < 45.0


# 3. Leakage Prevention & Sequence Generation
def test_temporal_sequences_no_location_crossing():
    """Ensure sequences NEVER concatenate observations from two different locations."""
    dates = pd.date_range("2024-05-01", periods=10, freq="D")
    df_loc1 = pd.DataFrame({
        "location_id": ["loc_chennai"] * 10,
        "time": dates,
        "feat_1": np.ones(10),
        "target_hw_t1": np.zeros(10)
    })
    df_loc2 = pd.DataFrame({
        "location_id": ["loc_madurai"] * 10,
        "time": dates,
        "feat_1": np.full(10, 2.0),
        "target_hw_t1": np.zeros(10)
    })
    combined_df = pd.concat([df_loc1, df_loc2], ignore_index=True)

    X_seq, y_seq, meta = build_temporal_sequences(combined_df, feature_cols=["feat_1"], target_col="target_hw_t1", seq_len=7)
    
    # 10 days with seq_len=7 gives 4 sequences per location => 8 total
    assert len(X_seq) == 8
    
    # For every sequence, all 7 timesteps must have identical feature values (either 1.0 or 2.0, never a mix)
    for seq in X_seq:
        assert np.all(seq == 1.0) or np.all(seq == 2.0)

def test_temporal_sequences_date_discontinuity_skipped():
    """Ensure non-continuous dates (missing days) are not joined into sequences."""
    dates_with_gap = pd.to_datetime(["2024-05-01", "2024-05-02", "2024-05-03",
                                      "2024-05-10", "2024-05-11", "2024-05-12", "2024-05-13"])
    df = pd.DataFrame({
        "location_id": ["loc_test"] * 7,
        "time": dates_with_gap,
        "feat_1": np.ones(7),
        "target_hw_t1": np.zeros(7)
    })
    # Since days 4 to 9 are missing, no continuous 7-day span exists
    with pytest.raises(ValueError, match="No valid continuous sequences"):
        build_temporal_sequences(df, feature_cols=["feat_1"], target_col="target_hw_t1", seq_len=7)

def test_leakage_audit_file_integrity():
    """Verify results/leakage_audit.json reports all features as SAFE."""
    audit_file = "results/leakage_audit.json"
    assert os.path.exists(audit_file)
    with open(audit_file, "r") as f:
        audit = json.load(f)
    assert audit.get("leakage_detected") is False
    assert audit.get("certified_leakage_free") is True
    assert audit.get("total_features_audited", 0) >= 80


# 4. Model Architectures & Mechanics
def test_attention_gru_forward_and_attention_softmax():
    """Attention-GRU forward pass must output valid probability and attention weights summing to 1.0."""
    net = AttentionGRUNetwork(input_dim=10, hidden_dim=32, dense_dim=16)
    x = torch.randn(4, 7, 10)  # batch=4, seq_len=7, feats=10
    probs, logits, att = net(x)
    
    assert probs.shape == (4, 1)
    assert torch.all(probs >= 0.0) and torch.all(probs <= 1.0)
    
    assert att.shape == (4, 7)
    # Each row of attention weights must sum to 1.0 (+- 1e-5)
    row_sums = att.sum(dim=1)
    assert torch.allclose(row_sums, torch.ones(4), atol=1e-5)

def test_lstm_forward_pass():
    """LSTM network forward pass must output valid sigmoid probabilities."""
    net = LSTMNetwork(input_dim=12, hidden_dim=32, num_layers=2)
    x = torch.randn(5, 7, 12)
    out = net(x)
    assert out.shape == (5, 1)
    assert torch.all(out >= 0.0) and torch.all(out <= 1.0)

def test_logistic_regression_probabilities():
    """Logistic regression classifier must produce probabilities in [0, 1]."""
    clf = HeatwaveLogisticRegression()
    X = np.random.randn(50, 8)
    y = np.random.binomial(1, 0.2, 50)
    clf.fit(X, y)
    probs = clf.predict_proba(X)
    assert probs.shape == (50,)
    assert np.all(probs >= 0.0) and np.all(probs <= 1.0)

def test_random_forest_probabilities():
    """Random forest must output calibrated probability array."""
    rf = HeatwaveRandomForest(n_estimators=10, max_depth=3)
    X = np.random.randn(60, 6)
    y = np.random.binomial(1, 0.2, 60)
    rf.fit(X, y)
    probs = rf.predict_proba(X)
    assert probs.shape == (60,)
    assert np.all(probs >= 0.0) and np.all(probs <= 1.0)


# 5. Early-Warning Engine
def test_early_warning_engine_tiers():
    """Verify tier assignment based on forecast probability."""
    engine = EarlyWarningEngine(
        watch_threshold=0.35,
        warning_threshold=0.55,
        severe_threshold=0.75
    )
    assert engine.determine_risk_tier(0.15)["tier"] == "NORMAL"
    assert engine.determine_risk_tier(0.40)["tier"] == "WATCH"
    assert engine.determine_risk_tier(0.65)["tier"] == "WARNING"
    assert engine.determine_risk_tier(0.85)["tier"] == "SEVERE_WARNING"


# 6. Evaluation Metrics & Threshold Optimization
def test_metrics_computation_under_imbalance():
    """compute_all_metrics returns valid values without crashing under severe imbalance."""
    y_true = np.zeros(200, dtype=int)
    y_true[:5] = 1  # 5 positive, 195 negative (rare heatwave)
    y_prob = np.random.uniform(0.01, 0.4, 200)
    y_prob[:5] = np.random.uniform(0.5, 0.9, 5)

    metrics = compute_all_metrics(y_true, y_prob, threshold=0.5, model_name="TestModel", horizon=1)
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert 0.0 <= metrics["recall"] <= 1.0
    assert 0.0 <= metrics["precision"] <= 1.0
    assert 0.0 <= metrics["f1"] <= 1.0
    assert 0.0 <= metrics["roc_auc"] <= 1.0
    assert 0.0 <= metrics["pr_auc"] <= 1.0
    assert metrics["brier_score"] >= 0.0

def test_threshold_optimization():
    """optimize_decision_threshold selects cutoff that optimizes F1."""
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 0, 0, 1])
    y_prob = np.array([0.1, 0.2, 0.15, 0.3, 0.6, 0.7, 0.8, 0.4, 0.2, 0.65])
    best_th, best_f1 = optimize_decision_threshold(y_true, y_prob)
    assert 0.4 <= best_th <= 0.65
    assert best_f1 > 0.7


# 7. Model Artifacts & File Deliverables
def test_model_registry_json_structure():
    """Verify models/metadata/model_registry.json contains all 6 benchmarked architectures."""
    registry_file = "models/metadata/model_registry.json"
    assert os.path.exists(registry_file)
    with open(registry_file, "r") as f:
        reg = json.load(f)
    models = reg.get("models", {})
    for expected in ["logistic_regression", "random_forest", "xgboost", "lightgbm", "lstm", "attention_gru"]:
        assert expected in models
        assert "test_metrics" in models[expected]

def test_lead_time_csv_horizons():
    """Verify results/lead_time_results.csv contains records for T+1, T+2, T+3."""
    csv_file = "results/lead_time_results.csv"
    assert os.path.exists(csv_file)
    df = pd.read_csv(csv_file)
    horizons = df["horizon"].unique().tolist()
    assert "T+1" in horizons
    assert "T+2" in horizons
    assert "T+3" in horizons

def test_ablation_results_csv_deltas():
    """Verify results/ablation_results.csv contains delta_f1 and 5 levels."""
    csv_file = "results/ablation_results.csv"
    assert os.path.exists(csv_file)
    df = pd.read_csv(csv_file)
    assert len(df) == 5
    assert "delta_f1" in df.columns

def test_batch_predictions_csv():
    """Verify results/predictions.csv contains 69 predictions (23 locations x 3 horizons)."""
    csv_file = "results/predictions.csv"
    assert os.path.exists(csv_file)
    df = pd.read_csv(csv_file)
    assert len(df) == 69
    assert set(df["horizon"].unique()) == {"T+1", "T+2", "T+3"}
    assert len(df["location"].unique()) == 23
    assert np.all(df["probability"] >= 0.0) and np.all(df["probability"] <= 1.0)

def test_research_figures_exist():
    """Verify all 14 research figures exist in results/plots/."""
    plots_dir = "results/plots"
    for i in range(1, 15):
        pattern_matches = [f for f in os.listdir(plots_dir) if f.startswith(f"figure{i}_")]
        assert len(pattern_matches) >= 1, f"Missing figure {i} in {plots_dir}"

def test_cds_spells_evaluation_metrics():
    """Verify results/cds_spells_evaluation.csv exists and maintains high accuracy (>90%) across all 6 models."""
    csv_file = "results/cds_spells_evaluation.csv"
    assert os.path.exists(csv_file)
    df = pd.read_csv(csv_file)
    assert len(df) == 6
    # Verify accuracy is maintained at a high level (>90%)
    for acc in df["accuracy"]:
        assert acc >= 0.90, f"Accuracy {acc} fell below 90%"
    # Verify Attention-GRU precision is high (>80%)
    agru_prec = float(df[df["model"] == "Attention-GRU"]["precision"].iloc[0])
    assert agru_prec >= 0.80
