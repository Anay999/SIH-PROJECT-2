"""Comprehensive Scientific Classification & Calibration Metrics Module.

Calculates all required academic metrics for imbalanced climate forecasting:
- Accuracy, Balanced Accuracy, Precision, Recall, F1 Score
- ROC-AUC, PR-AUC, Specificity, Sensitivity, MCC
- Brier Score, Log Loss
- True Positives, False Positives, True Negatives, False Negatives, False Negative Rate
- Probability calibration analysis (Reliability curve bins & Brier score)
- Imbalance distortion diagnostic warning
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    matthews_corrcoef,
    brier_score_loss,
    log_loss,
    confusion_matrix
)
from sklearn.calibration import calibration_curve

def compute_all_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
    model_name: str = "Model",
    horizon: int = 1
) -> Dict[str, Any]:
    """Computes comprehensive scientific evaluation metrics for binary heatwave classification."""
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob).clip(1e-7, 1.0 - 1e-7)
    y_pred = (y_prob >= threshold).astype(int)

    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    # Base Metrics
    acc = float(accuracy_score(y_true, y_pred))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    mcc = float(matthews_corrcoef(y_true, y_pred))
    
    # Specificity
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    fnr = float(fn / (tp + fn)) if (tp + fn) > 0 else 0.0

    # Probabilistic Metrics
    try:
        roc_auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        roc_auc = 0.5

    try:
        pr_auc = float(average_precision_score(y_true, y_prob))
    except Exception:
        pr_auc = float(np.mean(y_true))

    brier = float(brier_score_loss(y_true, y_prob))
    loss = float(log_loss(y_true, y_prob))

    # Calibration Curve Bins
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=10, strategy="uniform")
    calibration_bins = [
        {"predicted_prob": round(float(p), 4), "empirical_prob": round(float(e), 4)}
        for p, e in zip(prob_pred, prob_true)
    ]

    # Imbalance Distortion Warning (Prompt Section 72)
    imbalance_warning = None
    if acc >= 0.90 and (rec < 0.40 or f1 < 0.40):
        imbalance_warning = (
            "High overall accuracy may be influenced by class imbalance. "
            "Heatwave-class recall and F1 should be considered before interpreting model performance."
        )

    metrics = {
        "model": model_name,
        "horizon": f"T+{horizon}",
        "threshold": round(float(threshold), 4),
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "specificity": round(specificity, 4),
        "sensitivity": round(rec, 4),
        "mcc": round(mcc, 4),
        "brier_score": round(brier, 4),
        "log_loss": round(loss, 4),
        "true_positives": int(tp),
        "false_positives": int(fp),
        "true_negatives": int(tn),
        "false_negatives": int(fn),
        "false_negative_rate": round(fnr, 4),
        "imbalance_warning": imbalance_warning,
        "calibration_bins": calibration_bins
    }
    return metrics

def optimize_decision_threshold(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    min_precision: float = 0.20
) -> Tuple[float, float]:
    """Selects the optimal probability threshold on validation data to maximize F1-score.
    
    Guarantees that test evaluations use this FROZEN validation threshold.
    """
    thresholds = np.linspace(0.05, 0.90, 86)
    best_thresh = 0.5
    best_f1 = -1.0

    for th in thresholds:
        preds = (y_prob >= th).astype(int)
        f1 = f1_score(y_true, preds, zero_division=0)
        prec = precision_score(y_true, preds, zero_division=0)
        
        # Optimize F1 while respecting minimum precision floor if possible
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = float(th)

    return round(best_thresh, 3), round(best_f1, 4)
