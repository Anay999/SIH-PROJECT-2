"""Root CLI entry point for Heatwave Prediction.

Usage:
    python predict.py --location Chennai --horizon 1
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import argparse
from src.forecasting.predict import predict_single_location

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict heatwave event for a location and forecast horizon.")
    parser.add_argument("--location", type=str, default="Chennai", help="Location or ward name")
    parser.add_argument("--horizon", type=int, default=1, choices=[1, 2, 3], help="Lead horizon: 1, 2, or 3 days ahead")
    parser.add_argument("--model", type=str, default="attention_gru", help="Model name")
    args = parser.parse_args()

    predict_single_location(args.location, args.horizon, args.model)
