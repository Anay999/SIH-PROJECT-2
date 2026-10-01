"""Spatiotemporal Sequence Dataset Generator for PyTorch Temporal Models (LSTM & Attention-GRU).

Enforces strict physical and scientific rules:
1. Sequences NEVER cross location boundaries (location continuity guaranteed).
2. Sequences NEVER cross missing calendar days (daily chronological continuity guaranteed).
3. Sequences look strictly 7 days into the past [Day -7 to Day -1] to predict forecast horizon [Day 0 / T+k].
4. Output shape: [N_samples, sequence_length=7, num_features]
"""

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
from typing import Tuple, List, Dict, Optional

class SpatiotemporalSequenceDataset(Dataset):
    """PyTorch Dataset generating valid chronological sequences per location without cross-location leakage."""

    def __init__(
        self,
        X_seq: np.ndarray,
        y: np.ndarray,
        metadata: Optional[List[Dict]] = None
    ):
        self.X_seq = torch.tensor(X_seq, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32).unsqueeze(1)
        self.metadata = metadata or []

    def __len__(self) -> int:
        return len(self.X_seq)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.X_seq[idx], self.y[idx]

def build_temporal_sequences(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str = "target_hw_t1",
    seq_len: int = 7
) -> Tuple[np.ndarray, np.ndarray, List[Dict]]:
    """Constructs 3D sequence tensors [samples, seq_len, features] grouped strictly by location.
    
    Verifies that all 7 consecutive days belong to the EXACT same location and have sequential dates.
    """
    X_list = []
    y_list = []
    meta_list = []

    # Process each location independently
    for loc_id, group in df.groupby("location_id"):
        group = group.sort_values("time").reset_index(drop=True)
        times = pd.to_datetime(group["time"]).values
        features = group[feature_cols].values
        targets = group[target_col].values

        n_rows = len(group)
        if n_rows < seq_len:
            continue

        for i in range(seq_len - 1, n_rows):
            # Check date continuity: time[i] - time[i - (seq_len - 1)] should be (seq_len - 1) days
            t_start = pd.Timestamp(times[i - (seq_len - 1)])
            t_end = pd.Timestamp(times[i])
            day_diff = (t_end - t_start).days

            if day_diff != (seq_len - 1):
                # Discontinuous time period; skip invalid sequence
                continue

            target_val = targets[i]
            if np.isnan(target_val):
                continue

            # Historical slice: [i - seq_len + 1 to i]
            seq_slice = features[i - seq_len + 1 : i + 1]
            X_list.append(seq_slice)
            y_list.append(target_val)
            meta_list.append({
                "location_id": loc_id,
                "forecast_reference_time": str(t_end.date()),
                "target_val": float(target_val)
            })

    if len(X_list) == 0:
        raise ValueError("No valid continuous sequences could be constructed from the dataset!")

    X_arr = np.array(X_list, dtype=np.float32)
    y_arr = np.array(y_list, dtype=np.float32)

    return X_arr, y_arr, meta_list
