"""Model 4: LightGBM High-Efficiency Gradient Boosting.

Implementation details:
- lightgbm.LGBMClassifier optimized for fast tree construction.
- scale_pos_weight handling for extreme imbalance.
- Measures training time, per-inference latency, and serialized model size.
"""

import time
import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
import lightgbm as lgb

class HeatwaveLightGBM:
    def __init__(
        self,
        n_estimators: int = 200,
        learning_rate: float = 0.05,
        num_leaves: int = 31,
        max_depth: int = 6,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        scale_pos_weight: float = 4.0,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.num_leaves = num_leaves
        self.max_depth = max_depth
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.scale_pos_weight = scale_pos_weight
        self.random_state = random_state

        self.model = lgb.LGBMClassifier(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            num_leaves=self.num_leaves,
            max_depth=self.max_depth,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            scale_pos_weight=self.scale_pos_weight,
            random_state=self.random_state,
            n_jobs=-1,
            verbose=-1
        )
        self.feature_importances_: np.ndarray = np.array([])
        self.training_time_s = 0.0
        self.inference_time_ms = 0.0
        self.model_size_kb = 0.0

    def fit(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        eval_set: Optional[List[Tuple[np.ndarray, np.ndarray]]] = None
    ):
        start_time = time.perf_counter()
        if eval_set:
            self.model.fit(
                X_train,
                y_train,
                eval_set=eval_set
            )
        else:
            self.model.fit(X_train, y_train)
        self.training_time_s = time.perf_counter() - start_time
        self.feature_importances_ = self.model.feature_importances_
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        start_time = time.perf_counter()
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X)[:, 1]
        else:
            probs = self.model.predict(X)
        self.inference_time_ms = (time.perf_counter() - start_time) * 1000.0 / max(1, len(X))
        return probs

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)

    def get_feature_importance_df(self, feature_names: List[str]) -> pd.DataFrame:
        df_fi = pd.DataFrame({
            "feature": feature_names,
            "importance": self.feature_importances_,
            "model": "LightGBM"
        })
        return df_fi.sort_values("importance", ascending=False).reset_index(drop=True)

    def save(self, model_path: str):
        self.model.booster_.save_model(model_path)
        if os.path.exists(model_path):
            self.model_size_kb = os.path.getsize(model_path) / 1024.0

    def load(self, model_path: str):
        self.model = lgb.Booster(model_file=model_path)
        return self
