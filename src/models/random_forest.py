"""Model 2: Random Forest Nonlinear Classical Machine Learning Baseline.

Implementation details:
- scikit-learn RandomForestClassifier with balanced class weighting.
- Calculates and stores Gini feature importance.
- Records training time and per-sample inference latency.
"""

import time
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier

class HeatwaveRandomForest:
    def __init__(
        self,
        n_estimators: int = 150,
        max_depth: int = 8,
        min_samples_split: int = 5,
        min_samples_leaf: int = 2,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.random_state = random_state
        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_split=self.min_samples_split,
            min_samples_leaf=self.min_samples_leaf,
            class_weight="balanced",
            random_state=self.random_state,
            n_jobs=-1
        )
        self.feature_importances_: np.ndarray = np.array([])
        self.training_time_s = 0.0
        self.inference_time_ms = 0.0

    def fit(self, X_train: np.ndarray, y_train: np.ndarray):
        start_time = time.perf_counter()
        self.model.fit(X_train, y_train)
        self.training_time_s = time.perf_counter() - start_time
        self.feature_importances_ = self.model.feature_importances_
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        start_time = time.perf_counter()
        probs = self.model.predict_proba(X)[:, 1]
        self.inference_time_ms = (time.perf_counter() - start_time) * 1000.0 / max(1, len(X))
        return probs

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)

    def get_feature_importance_df(self, feature_names: List[str]) -> pd.DataFrame:
        df_fi = pd.DataFrame({
            "feature": feature_names,
            "importance": self.feature_importances_,
            "model": "Random Forest"
        })
        return df_fi.sort_values("importance", ascending=False).reset_index(drop=True)

    def save(self, model_path: str):
        joblib.dump(self.model, model_path)

    def load(self, model_path: str):
        self.model = joblib.load(model_path)
        self.feature_importances_ = self.model.feature_importances_
        return self
