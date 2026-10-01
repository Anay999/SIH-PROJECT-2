"""Root CLI entry point for Batch Heatwave Prediction.

Usage:
    python batch_predict.py
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.forecasting.batch_predict import run_batch_prediction

if __name__ == "__main__":
    run_batch_prediction()
