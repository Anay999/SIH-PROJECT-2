"""Model 5: Long Short-Term Memory (LSTM) Deep Temporal Baseline.

Implementation details:
- PyTorch implementation for 3D historical sequences [N, 7, F].
- 2-layer LSTM with dropout, dense projection, and sigmoid classification output.
- Weighted BCE Loss with Adam optimizer, EarlyStopping, and ReduceLROnPlateau.
"""

import time
import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np
from typing import Dict, Any, Tuple, Optional

class LSTMNetwork(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_dim, 32)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(32, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch_size, seq_len=7, input_dim]
        out, (hn, cn) = self.lstm(x)
        # Use last timestep representation hn[-1]
        last_hidden = hn[-1]
        dropped = self.dropout(last_hidden)
        h = self.relu(self.fc1(dropped))
        logits = self.fc2(h)
        probs = torch.sigmoid(logits)
        return probs

class HeatwaveLSTM:
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
        learning_rate: float = 0.001,
        pos_weight: float = 4.0,
        device: Optional[str] = None
    ):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.net = LSTMNetwork(input_dim, hidden_dim, num_layers, dropout).to(self.device)
        self.learning_rate = learning_rate
        self.pos_weight = torch.tensor([pos_weight], device=self.device)
        self.criterion = nn.BCEWithLogitsLoss(pos_weight=self.pos_weight)
        self.optimizer = torch.optim.Adam(self.net.parameters(), lr=self.learning_rate)
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(self.optimizer, mode="min", factor=0.5, patience=3)
        self.training_time_s = 0.0
        self.inference_time_ms = 0.0

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        epochs: int = 40,
        patience: int = 10,
        save_path: str = "models/trained/lstm.pt"
    ):
        start_time = time.perf_counter()
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        best_val_loss = float("inf")
        patience_counter = 0

        for epoch in range(epochs):
            self.net.train()
            train_loss = 0.0
            for X_b, y_b in train_loader:
                X_b, y_b = X_b.to(self.device), y_b.to(self.device)
                self.optimizer.zero_grad()
                # Forward
                out, (hn, cn) = self.net.lstm(X_b)
                h = self.net.relu(self.net.fc1(self.net.dropout(hn[-1])))
                logits = self.net.fc2(h)
                loss = self.criterion(logits, y_b)
                loss.backward()
                self.optimizer.step()
                train_loss += loss.item() * len(y_b)

            train_loss /= len(train_loader.dataset)

            # Validation
            self.net.eval()
            val_loss = 0.0
            with torch.no_grad():
                for X_b, y_b in val_loader:
                    X_b, y_b = X_b.to(self.device), y_b.to(self.device)
                    out, (hn, cn) = self.net.lstm(X_b)
                    h = self.net.relu(self.net.fc1(self.net.dropout(hn[-1])))
                    logits = self.net.fc2(h)
                    loss = self.criterion(logits, y_b)
                    val_loss += loss.item() * len(y_b)
            val_loss /= len(val_loader.dataset)
            self.scheduler.step(val_loss)

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                torch.save(self.net.state_dict(), save_path)
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break

        self.training_time_s = time.perf_counter() - start_time
        if os.path.exists(save_path):
            self.net.load_state_dict(torch.load(save_path, map_location=self.device))
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        start_time = time.perf_counter()
        self.net.eval()
        X_t = torch.tensor(X, dtype=torch.float32).to(self.device)
        with torch.no_grad():
            probs = self.net(X_t).squeeze(-1).cpu().numpy()
        self.inference_time_ms = (time.perf_counter() - start_time) * 1000.0 / max(1, len(X))
        return probs

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)

    def save(self, model_path: str):
        torch.save(self.net.state_dict(), model_path)

    def load(self, model_path: str):
        self.net.load_state_dict(torch.load(model_path, map_location=self.device))
        self.net.eval()
        return self
