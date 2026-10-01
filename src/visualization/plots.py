"""Scientific Visualizations Generator (Figures 1 to 14).

Produces research-grade, academic figures saved to results/plots/:
Figure 1: System Architecture Diagram
Figure 2: Data Distribution (Temperature & Thermal Indices)
Figure 3: Heatwave Occurrence Over Time (2014-2024)
Figure 4: Model Comparison (Accuracy, F1, Recall, ROC-AUC, PR-AUC)
Figure 5: ROC Curves across all 6 models
Figure 6: Precision-Recall Curves across all 6 models
Figure 7: Confusion Matrices for All Models
Figure 8: Lead-Time Degradation (T+1 vs T+2 vs T+3)
Figure 9: Ablation Study Performance deltas
Figure 10: Comparative Feature Importance
Figure 11: Learned Temporal Attention Weights across 7 Days
Figure 12: Reliability / Calibration Diagrams
Figure 13: Spatial Heatwave Probability Map
Figure 14: Observed vs Predicted Timeline
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from typing import Dict, Any, List

PLOTS_DIR = "results/plots"

def ensure_plots_dir():
    os.makedirs(PLOTS_DIR, exist_ok=True)

def generate_figure1_architecture():
    ensure_plots_dir()
    fig, ax = plt.subplots(figsize=(12, 6), dpi=200)
    ax.axis("off")

    bbox_props = dict(boxstyle="round,pad=0.5", fc="#F8FAFC", ec="#0284C7", lw=1.5)
    gru_props = dict(boxstyle="round,pad=0.5", fc="#EFF6FF", ec="#2563EB", lw=2)
    att_props = dict(boxstyle="round,pad=0.5", fc="#FEF2F2", ec="#DC2626", lw=2)
    out_props = dict(boxstyle="round,pad=0.5", fc="#ECFDF5", ec="#059669", lw=2)

    ax.text(0.1, 0.75, "Multi-Source Meteorological\nData (ECMWF ERA5 / ERA5-Land)\n[Tmax, Tmin, RH, Wind, Pressure, Radiation]", bbox=bbox_props, ha="center", va="center", fontsize=9)
    ax.text(0.35, 0.75, "Geospatial & Microclimate\nMapping (Districts & Wards)\n[LCZ, Builtup, Coastal Distance]", bbox=bbox_props, ha="center", va="center", fontsize=9)
    ax.text(0.6, 0.75, "Feature Engineering\n[Rothfusz HI, WBGT, Lags,\nRolling Trends, Cyclical Season]", bbox=bbox_props, ha="center", va="center", fontsize=9)

    ax.text(0.2, 0.35, "Spatiotemporal Sequence\nConstruction [N, 7 Days, Features]", bbox=bbox_props, ha="center", va="center", fontsize=9)
    ax.text(0.45, 0.35, "Bidirectional / Stacked\nGRU Layer (128 units)", bbox=gru_props, ha="center", va="center", fontsize=9, fontweight="bold")
    ax.text(0.7, 0.35, "Learnable Temporal\nAttention Mechanism\n[Day -7 to Day -1 Weights]", bbox=att_props, ha="center", va="center", fontsize=9, fontweight="bold")
    ax.text(0.9, 0.35, "Multi-Lead Forecast T+1, T+2, T+3\nCalibrated Probability & Class\nEarly-Warning Decision Tiers", bbox=out_props, ha="center", va="center", fontsize=9, fontweight="bold")

    # Arrows
    arrow = dict(arrowstyle="->", lw=1.5, color="#475569")
    ax.annotate("", xy=(0.22, 0.75), xytext=(0.47, 0.75), arrowprops=arrow)
    ax.annotate("", xy=(0.48, 0.75), xytext=(0.72, 0.75), arrowprops=arrow)
    ax.annotate("", xy=(0.6, 0.65), xytext=(0.2, 0.45), arrowprops=arrow)
    ax.annotate("", xy=(0.33, 0.35), xytext=(0.36, 0.35), arrowprops=arrow)
    ax.annotate("", xy=(0.54, 0.35), xytext=(0.61, 0.35), arrowprops=arrow)
    ax.annotate("", xy=(0.79, 0.35), xytext=(0.81, 0.35), arrowprops=arrow)

    plt.title("Figure 1: Multi-Source Spatiotemporal AI Framework for Heatwave Early Warning", fontsize=13, fontweight="bold", pad=20)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure1_architecture.png"))
    plt.close()

def generate_figure2_data_distribution(df: pd.DataFrame):
    ensure_plots_dir()
    fig, axes = plt.subplots(2, 2, figsize=(11, 8), dpi=200)

    axes[0, 0].hist(df["temperature_2m_max"], bins=40, color="#EF4444", alpha=0.75, edgecolor="black")
    axes[0, 0].set_title("Maximum Temperature (Tmax, °C)")
    axes[0, 0].axvline(40.0, color="darkred", linestyle="--", label="Plains HW Threshold (40°C)")
    axes[0, 0].legend()

    axes[0, 1].hist(df["heat_index"], bins=40, color="#F97316", alpha=0.75, edgecolor="black")
    axes[0, 1].set_title("NOAA Rothfusz Heat Index (°C)")

    axes[1, 0].hist(df["diurnal_temp_range"], bins=40, color="#3B82F6", alpha=0.75, edgecolor="black")
    axes[1, 0].set_title("Diurnal Temperature Range (°C)")

    axes[1, 1].hist(df["relative_humidity_mean"], bins=40, color="#10B981", alpha=0.75, edgecolor="black")
    axes[1, 1].set_title("Relative Humidity (%)")

    plt.suptitle("Figure 2: Distribution of Key Physical and Environmental Variables (2014-2024)", fontsize=13, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure2_data_distribution.png"))
    plt.close()

def generate_figure3_heatwave_occurrences(df: pd.DataFrame):
    ensure_plots_dir()
    df_hw = df.copy()
    df_hw["year"] = pd.to_datetime(df_hw["time"]).dt.year
    hw_per_year = df_hw.groupby("year")["heatwave_label"].sum()

    fig, ax = plt.subplots(figsize=(10, 5), dpi=200)
    bars = ax.bar(hw_per_year.index, hw_per_year.values, color="#DC2626", edgecolor="#991B1B", alpha=0.85)
    ax.set_xlabel("Year", fontsize=11)
    ax.set_ylabel("Total Recorded Heatwave Events (Across All Units)", fontsize=11)
    ax.set_title("Figure 3: Spatiotemporal Heatwave Event Occurrences in Study Region (2014-2024)", fontsize=12, fontweight="bold")
    ax.grid(axis="y", linestyle=":", alpha=0.6)

    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 1, f"{int(yval)}", ha="center", va="bottom", fontsize=9)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure3_heatwave_occurrence.png"))
    plt.close()

def generate_figure4_model_comparison(comparison_df: pd.DataFrame):
    ensure_plots_dir()
    fig, ax = plt.subplots(figsize=(12, 6), dpi=200)
    models = comparison_df["model"].tolist()
    x = np.arange(len(models))
    width = 0.16

    ax.bar(x - 2*width, comparison_df["accuracy"], width, label="Accuracy", color="#3B82F6")
    ax.bar(x - width, comparison_df["balanced_accuracy"], width, label="Balanced Acc", color="#6366F1")
    ax.bar(x, comparison_df["recall"], width, label="Recall", color="#EF4444")
    ax.bar(x + width, comparison_df["f1"], width, label="F1-Score", color="#10B981")
    ax.bar(x + 2*width, comparison_df["pr_auc"], width, label="PR-AUC", color="#F59E0B")

    ax.set_ylabel("Score (0.0 to 1.0)", fontsize=11)
    ax.set_title("Figure 4: Comparative Performance Across All Six AI Models on Unseen 2024 Test Set (T+1 Horizon)", fontsize=12, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(models, rotation=15, ha="right", fontsize=10)
    ax.legend(loc="upper right", frameon=True)
    ax.grid(axis="y", linestyle=":", alpha=0.6)
    ax.set_ylim(0.0, 1.05)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure4_model_comparison.png"))
    plt.close()

def generate_figure8_lead_time(lead_time_df: pd.DataFrame):
    ensure_plots_dir()
    fig, axes = plt.subplots(1, 2, figsize=(13, 5), dpi=200)

    for model, grp in lead_time_df.groupby("model"):
        grp = grp.sort_values("horizon")
        horizons = grp["horizon"].tolist()
        axes[0].plot(horizons, grp["f1"], marker="o", lw=2, label=model)
        axes[1].plot(horizons, grp["recall"], marker="s", lw=2, label=model)

    axes[0].set_title("F1-Score Degradation Across Lead Times", fontsize=11, fontweight="bold")
    axes[0].set_xlabel("Forecast Horizon", fontsize=10)
    axes[0].set_ylabel("F1 Score", fontsize=10)
    axes[0].grid(True, linestyle=":", alpha=0.6)
    axes[0].legend(fontsize=8)

    axes[1].set_title("Heatwave Recall Degradation Across Lead Times", fontsize=11, fontweight="bold")
    axes[1].set_xlabel("Forecast Horizon", fontsize=10)
    axes[1].set_ylabel("Recall (Sensitivity)", fontsize=10)
    axes[1].grid(True, linestyle=":", alpha=0.6)
    axes[1].legend(fontsize=8)

    plt.suptitle("Figure 8: Lead-Time Degradation Analysis (T+1, T+2, T+3)", fontsize=13, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure8_lead_time_degradation.png"))
    plt.close()

def generate_figure10_feature_importance(fi_df: pd.DataFrame):
    ensure_plots_dir()
    fig, ax = plt.subplots(figsize=(10, 7), dpi=200)
    top_fi = fi_df.head(15).sort_values("importance", ascending=True)

    ax.barh(top_fi["feature"], top_fi["importance"], color="#0284C7", edgecolor="#0369A1", alpha=0.85)
    ax.set_xlabel("Model-Associated Importance Score", fontsize=11)
    ax.set_title("Figure 10: Top 15 Model-Associated Feature Importances (Gradient Boosted Tree Ensemble)", fontsize=12, fontweight="bold")
    ax.grid(axis="x", linestyle=":", alpha=0.6)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure10_feature_importance.png"))
    plt.close()

def generate_figure11_attention_weights(attention_weights: np.ndarray):
    ensure_plots_dir()
    mean_weights = np.mean(attention_weights, axis=0) # [7]
    days = [f"Day -{7-i}" for i in range(7)]

    fig, ax = plt.subplots(figsize=(9, 5), dpi=200)
    bars = ax.bar(days, mean_weights, color="#DC2626", edgecolor="#991B1B", alpha=0.85)
    ax.set_ylabel("Mean Learned Attention Weight", fontsize=11)
    ax.set_title("Figure 11: Learned Temporal Attention Distribution Over 7 Historical Days (Attention-GRU)", fontsize=12, fontweight="bold")
    ax.grid(axis="y", linestyle=":", alpha=0.6)

    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 0.005, f"{yval:.3f}", ha="center", va="bottom", fontsize=9)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure11_attention_weights.png"))
    plt.close()

def generate_figure12_calibration(calibration_bins: List[Dict]):
    ensure_plots_dir()
    pred_p = [b["predicted_prob"] for b in calibration_bins]
    emp_p = [b["empirical_prob"] for b in calibration_bins]

    fig, ax = plt.subplots(figsize=(7, 6), dpi=200)
    ax.plot([0, 1], [0, 1], "k--", label="Perfect Calibration", alpha=0.7)
    ax.plot(pred_p, emp_p, marker="o", color="#2563EB", lw=2, label="Proposed Attention-GRU")

    ax.set_xlabel("Mean Predicted Probability", fontsize=11)
    ax.set_ylabel("Empirical Event Frequency", fontsize=11)
    ax.set_title("Figure 12: Reliability Diagram (Probability Calibration Curve)", fontsize=12, fontweight="bold")
    ax.legend(loc="upper left")
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure12_calibration_curves.png"))
    plt.close()

def generate_figure5_roc_curves(model_metrics_dict: Dict[str, Dict]):
    ensure_plots_dir()
    fig, ax = plt.subplots(figsize=(8, 6), dpi=200)
    ax.plot([0, 1], [0, 1], "k--", alpha=0.5, label="Random Guess (AUC = 0.50)")

    colors = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777", "#DC2626"]
    for i, (name, metrics) in enumerate(model_metrics_dict.items()):
        rc = metrics.get("roc_curve", {})
        fpr = rc.get("fpr", [0, 1])
        tpr = rc.get("tpr", [0, 1])
        auc_val = metrics.get("roc_auc", 0.5)
        c = colors[i % len(colors)]
        ax.plot(fpr, tpr, color=c, lw=2, label=f"{name} (AUC = {auc_val:.3f})")

    ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=11)
    ax.set_ylabel("True Positive Rate (Recall / Sensitivity)", fontsize=11)
    ax.set_title("Figure 5: Receiver Operating Characteristic (ROC) Curves Across All Six Models", fontsize=12, fontweight="bold")
    ax.legend(loc="lower right", fontsize=9)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure5_roc_curves.png"))
    plt.close()

def generate_figure6_pr_curves(model_metrics_dict: Dict[str, Dict]):
    ensure_plots_dir()
    fig, ax = plt.subplots(figsize=(8, 6), dpi=200)

    colors = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#DB2777", "#DC2626"]
    for i, (name, metrics) in enumerate(model_metrics_dict.items()):
        pr = metrics.get("pr_curve", {})
        prec = pr.get("precision", [1, 0])
        rec = pr.get("recall", [0, 1])
        prauc_val = metrics.get("pr_auc", 0.0)
        c = colors[i % len(colors)]
        ax.plot(rec, prec, color=c, lw=2, label=f"{name} (PR-AUC = {prauc_val:.3f})")

    ax.set_xlabel("Recall (Heatwave Event Sensitivity)", fontsize=11)
    ax.set_ylabel("Precision (Positive Predictive Value)", fontsize=11)
    ax.set_title("Figure 6: Precision-Recall (PR) Curves Under Extreme Class Imbalance", fontsize=12, fontweight="bold")
    ax.legend(loc="upper right", fontsize=9)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.02)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure6_precision_recall_curves.png"))
    plt.close()

def generate_figure7_confusion_matrices(model_metrics_dict: Dict[str, Dict]):
    ensure_plots_dir()
    fig, axes = plt.subplots(2, 3, figsize=(14, 8), dpi=200)
    axes = axes.flatten()

    for i, (name, metrics) in enumerate(model_metrics_dict.items()):
        cm = metrics.get("confusion_matrix", {"tn": 0, "fp": 0, "fn": 0, "tp": 0})
        matrix = np.array([[cm["tn"], cm["fp"]], [cm["fn"], cm["tp"]]])
        ax = axes[i]
        im = ax.imshow(matrix, cmap="Blues", interpolation="nearest")
        ax.set_title(f"{name}\nAcc={metrics.get('accuracy',0):.3f}, Rec={metrics.get('recall',0):.3f}", fontsize=10, fontweight="bold")
        ax.set_xticks([0, 1])
        ax.set_yticks([0, 1])
        ax.set_xticklabels(["Pred No HW", "Pred HW"], fontsize=9)
        ax.set_yticklabels(["True No HW", "True HW"], fontsize=9)

        for row in range(2):
            for col in range(2):
                val = matrix[row, col]
                color = "white" if val > matrix.max() / 2 else "black"
                ax.text(col, row, f"{val:,}", ha="center", va="center", color=color, fontweight="bold", fontsize=11)

    plt.suptitle("Figure 7: Confusion Matrices for All Six AI Models on Unseen 2024 Test Set", fontsize=13, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure7_confusion_matrices.png"))
    plt.close()

def generate_figure9_ablation(ablation_df: pd.DataFrame):
    ensure_plots_dir()
    fig, ax = plt.subplots(figsize=(10, 5), dpi=200)
    configs = ablation_df["configuration"].tolist()
    f1s = ablation_df["f1"].tolist()
    deltas = ablation_df["delta_f1"].tolist()

    y_pos = np.arange(len(configs))
    bars = ax.barh(y_pos, f1s, color="#4F46E5", edgecolor="#3730A3", alpha=0.85)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(configs, fontsize=9)
    ax.set_xlabel("F1-Score on Validation Split", fontsize=11)
    ax.set_title("Figure 9: Feature Ablation Study for Proposed Attention-GRU Architecture", fontsize=12, fontweight="bold")
    ax.grid(axis="x", linestyle=":", alpha=0.6)

    for i, bar in enumerate(bars):
        w = bar.get_width()
        d = deltas[i]
        sign = "+" if d >= 0 else ""
        ax.text(w + 0.005, bar.get_y() + bar.get_height()/2.0, f"F1={w:.3f} ({sign}{d:.3f})", ha="left", va="center", fontsize=9, fontweight="bold")

    ax.set_xlim(0, max(f1s) * 1.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure9_ablation_study.png"))
    plt.close()

def generate_figure13_spatial_probability(df_preds: pd.DataFrame):
    ensure_plots_dir()
    fig, ax = plt.subplots(figsize=(9, 8), dpi=200)

    # If coordinates exist in df_preds, plot spatial scatter
    lat_col = "latitude" if "latitude" in df_preds.columns else None
    lon_col = "longitude" if "longitude" in df_preds.columns else None

    if lat_col and lon_col:
        sc = ax.scatter(
            df_preds[lon_col], df_preds[lat_col],
            c=df_preds["probability"],
            s=df_preds["probability"] * 250 + 50,
            cmap="YlOrRd",
            edgecolors="black",
            linewidth=1.2,
            alpha=0.9
        )
        cbar = plt.colorbar(sc, ax=ax)
        cbar.set_label("Predicted Heatwave Probability", fontsize=10)

        for _, row in df_preds.iterrows():
            name = str(row.get("location_id", "")).replace("loc_", "").replace("ward_", "W")
            ax.annotate(name, (row[lon_col], row[lat_col]), fontsize=8, ha="right", va="bottom", weight="bold")

        ax.set_xlabel("Longitude (°E)", fontsize=11)
        ax.set_ylabel("Latitude (°N)", fontsize=11)
    else:
        # Bar chart across locations
        sub = df_preds.sort_values("probability", ascending=False).head(15)
        ax.barh(sub["location_id"].astype(str), sub["probability"], color="#EA580C")
        ax.set_xlabel("Predicted Heatwave Probability", fontsize=11)

    ax.set_title("Figure 13: Spatial Heatwave Probability Distribution Across Administrative Units", fontsize=12, fontweight="bold")
    ax.grid(True, linestyle=":", alpha=0.5)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure13_spatial_heatwave_probability.png"))
    plt.close()

def generate_figure14_timeline(df_pred: pd.DataFrame, location_id: str = "loc_chennai"):
    ensure_plots_dir()
    time_col = "time" if "time" in df_pred.columns else "forecast_reference_time"
    if time_col not in df_pred.columns:
        return

    loc_sub = df_pred[df_pred["location_id"] == location_id].sort_values(time_col).copy()
    if len(loc_sub) == 0:
        return

    # Focus on summer peak period (April-June 2024)
    loc_sub[time_col] = pd.to_datetime(loc_sub[time_col])
    summer_sub = loc_sub[(loc_sub[time_col] >= "2024-04-15") & (loc_sub[time_col] <= "2024-06-30")]
    if len(summer_sub) == 0:
        summer_sub = loc_sub.tail(60)

    fig, ax1 = plt.subplots(figsize=(13, 5), dpi=200)
    ax2 = ax1.twinx()

    times = summer_sub[time_col].dt.strftime("%b %d")
    tmax_series = summer_sub["temperature_2m_max"] if "temperature_2m_max" in summer_sub.columns else None

    if tmax_series is not None:
        ax1.plot(times, tmax_series, color="#F97316", lw=2, label="Tmax Observed (°C)")
        ax1.set_ylabel("Observed Temperature (°C)", color="#EA580C", fontsize=11)
        ax1.tick_params(axis="y", labelcolor="#EA580C")
    else:
        ax1.set_ylabel("Observed Timeline", color="#EA580C", fontsize=11)

    ax2.plot(times, summer_sub["predicted_probability"], color="#DC2626", lw=2.5, linestyle="--", label="Predicted HW Probability")
    ax2.scatter(times, summer_sub["actual_label"], color="black", s=35, zorder=5, label="Observed IMD Heatwave (0 or 1)")
    ax2.set_ylabel("Predicted Heatwave Probability", color="#DC2626", fontsize=11)
    ax2.tick_params(axis="y", labelcolor="#DC2626")
    ax2.set_ylim(-0.05, 1.1)

    step = max(1, len(times) // 12)
    ax1.set_xticks(range(0, len(times), step))
    ax1.set_xticklabels([times.iloc[i] for i in range(0, len(times), step)], rotation=30, ha="right", fontsize=9)
    plt.title(f"Figure 14: Heatwave Onset Timeline & Prediction Probability Evolution ({location_id})", fontsize=12, fontweight="bold")
    ax1.grid(True, linestyle=":", alpha=0.5)

    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "figure14_observed_vs_predicted_timeline.png"))
    plt.close()
