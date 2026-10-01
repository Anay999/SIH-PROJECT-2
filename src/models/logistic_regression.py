"""Model 1: Logistic Regression Statistical Baseline.

Implementation details:
- scikit-learn LogisticRegression with balanced class weighting.
- StandardScaler fitted strictly on training data only.
- Probability output enabled.
- Records training duration and inference latency.
"""

import time
import joblib
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

class HeatwaveLogisticRegression:
    def __init__(self, C: float = 0.1, max_iter: int = 1000, solver: str = "lbfgs"):
        self.C = C
        self.max_iter = max_iter
        self.solver = solver
        self.model = LogisticRegression(
            C=self.C,
            max_iter=self.max_iter,
            solver=self.solver,
            class_weight="balanced",
            random_state=42
        )
        self.scaler = StandardScaler()
        self.training_time_s = 0.0
        self.inference_time_ms = 0.0

    def fit(self, X_train: np.ndarray, y_train: np.ndarray):
        start_time = time.perf_counter()
        X_scaled = self.scaler.fit_transform(X_train)
        self.model.fit(X_scaled, y_train)
        self.training_time_s = time.perf_counter() - start_time
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        start_time = time.perf_counter()
        X_scaled = self.scaler.transform(X)
        probs = self.model.predict_proba(X_scaled)[:, 1]
        self.inference_time_ms = (time.perf_counter() - start_time) * 1000.0 / max(1, len(X))
        return probs

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)

    def save(self, model_path: str, scaler_path: str):
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)

    def load(self, model_path: str, scaler_path: str):
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        return self
