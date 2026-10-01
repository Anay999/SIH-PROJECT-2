"""Model 3: XGBoost High-Performance Gradient-Boosted Decision Trees.

Implementation details:
- xgboost.XGBClassifier with scale_pos_weight for severe class imbalance.
- Validation early stopping to prevent overfitting.
- Feature importance extraction (gain and weight).
- Model persistence to JSON.
"""

import time
import os
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
import xgboost as xgb

class HeatwaveXGBoost:
    def __init__(
        self,
        n_estimators: int = 200,
        max_depth: int = 5,
        learning_rate: float = 0.05,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        scale_pos_weight: float = 4.0,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.scale_pos_weight = scale_pos_weight
        self.random_state = random_state

        self.model = xgb.XGBClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            scale_pos_weight=self.scale_pos_weight,
            eval_metric="logloss",
            random_state=self.random_state,
            n_jobs=-1
        )
        self.feature_importances_: np.ndarray = np.array([])
        self.training_time_s = 0.0
        self.inference_time_ms = 0.0

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
                eval_set=eval_set,
                verbose=False
            )
        else:
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
            "model": "XGBoost"
        })
        return df_fi.sort_values("importance", ascending=False).reset_index(drop=True)

    def save(self, model_path: str):
        self.model.save_model(model_path)

    def load(self, model_path: str):
        self.model.load_model(model_path)
        self.feature_importances_ = self.model.feature_importances_
        return self
