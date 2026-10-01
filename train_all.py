"""Master Entry Point for Heatwave AI Model Training, Evaluation and Benchmarking.

Usage:
    python train_all.py
"""

import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.training.train_all import run_train_all

if __name__ == "__main__":
    run_train_all()
