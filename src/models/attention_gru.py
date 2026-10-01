"""Model 6: Proposed Architecture: Attention-GRU for Spatiotemporal Heatwave Forecasting.

Integrates:
1. Gated Recurrent Unit (GRU) temporal representations across historical sequences [Day -7 to Day -1].
2. Learnable additive self-attention mechanism computing dynamic temporal weights over all 7 past timesteps.
3. Temporal context vector aggregation representing multi-day heat accumulation.
4. Non-linear classification projection with dropout regularization.
5. Extraction and visual export of learned attention weights for research explainability.
"""

import time
import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np
from typing import Dict, Any, Tuple, Optional, List

class TemporalAttention(nn.Module):
    """Computes learnable scalar attention weights over sequence timesteps."""
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.w_omega = nn.Parameter(torch.Tensor(hidden_dim, hidden_dim))
        self.u_omega = nn.Parameter(torch.Tensor(hidden_dim, 1))
        nn.init.xavier_uniform_(self.w_omega)
        nn.init.xavier_uniform_(self.u_omega)

    def forward(self, gru_output: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # gru_output: [batch_size, seq_len=7, hidden_dim]
        # u: [batch_size, seq_len, hidden_dim]
        u = torch.tanh(torch.matmul(gru_output, self.w_omega))
        # att_scores: [batch_size, seq_len, 1]
        att_scores = torch.matmul(u, self.u_omega)
        # att_weights: [batch_size, seq_len]
        att_weights = torch.softmax(att_scores.squeeze(-1), dim=-1)
        # context: sum_t (att_weights_t * gru_output_t) -> [batch_size, hidden_dim]
        context = torch.sum(gru_output * att_weights.unsqueeze(-1), dim=1)
        return context, att_weights

class AttentionGRUNetwork(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 128, dense_dim: int = 64, dropout: float = 0.25):
        super().__init__()
        self.gru = nn.GRU(
            input_size=input_dim,
            hidden_size=hidden_dim,
            batch_first=True,
            num_layers=1
        )
        self.attention = TemporalAttention(hidden_dim)
        self.dropout1 = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_dim, dense_dim)
        self.relu = nn.ReLU()
        self.dropout2 = nn.Dropout(dropout)
        self.fc_out = nn.Linear(dense_dim, 1)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        # x: [batch_size, seq_len, input_dim]
        gru_out, _ = self.gru(x) # [batch_size, seq_len, hidden_dim]
        context, att_weights = self.attention(gru_out)
        dropped = self.dropout1(context)
        h = self.relu(self.fc1(dropped))
        h = self.dropout2(h)
        logits = self.fc_out(h)
        probs = torch.sigmoid(logits)
        return probs, logits, att_weights

class HeatwaveAttentionGRU:
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 128,
        dense_dim: int = 64,
        dropout: float = 0.25,
        learning_rate: float = 0.001,
        pos_weight: float = 4.0,
        device: Optional[str] = None
    ):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.dense_dim = dense_dim
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.net = AttentionGRUNetwork(input_dim, hidden_dim, dense_dim, dropout).to(self.device)
        self.learning_rate = learning_rate
        self.pos_weight = torch.tensor([pos_weight], device=self.device)
        self.criterion = nn.BCEWithLogitsLoss(pos_weight=self.pos_weight)
        self.optimizer = torch.optim.Adam(self.net.parameters(), lr=self.learning_rate)
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(self.optimizer, mode="min", factor=0.5, patience=3)
        self.training_time_s = 0.0
        self.inference_time_ms = 0.0
        self.latest_attention_weights: Optional[np.ndarray] = None

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        epochs: int = 40,
        patience: int = 10,
        save_path: str = "models/trained/attention_gru.pt"
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
                probs, logits, att = self.net(X_b)
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
                    probs, logits, att = self.net(X_b)
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

    def predict_proba_and_attention(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Returns both prediction probabilities and the learned temporal attention weights."""
        start_time = time.perf_counter()
        self.net.eval()
        X_t = torch.tensor(X, dtype=torch.float32).to(self.device)
        with torch.no_grad():
            probs, logits, att_weights = self.net(X_t)
            probs_np = probs.squeeze(-1).cpu().numpy()
            att_np = att_weights.cpu().numpy()

        self.inference_time_ms = (time.perf_counter() - start_time) * 1000.0 / max(1, len(X))
        self.latest_attention_weights = att_np
        return probs_np, att_np

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        probs, _ = self.predict_proba_and_attention(X)
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
