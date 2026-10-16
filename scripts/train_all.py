"""
IntelliSphere AI — Unified Model Training & Reproducibility Orchestrator
Executes all core ML pipelines deterministically with reproducible random seeds.

Usage:
    python scripts/train_all.py --engine all
    python scripts/train_all.py --engine retail
    python scripts/train_all.py --engine fraud
    python scripts/train_all.py --engine maintenance
    python scripts/train_all.py --engine healthcare
    python scripts/train_all.py --engine recs
"""

import os
import sys
import time
import argparse
import random
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    print(f"[*] Global random seed set to {seed}")

def train_retail(seed: int = 42):
    print("\n" + "="*70)
    print(">>> [1/5] TRAINING RETAIL & BUSINESS INTELLIGENCE ENGINE")
    print("="*70)
    from ml.retail.forecasting import train_forecasting_models
    from ml.retail.segmentation import run_customer_segmentation
    from ml.retail.repeat_purchase import run_repeat_purchase_training

    print("\n--- 1.1 Multi-Horizon Recursive Sales Forecasting ---")
    fc_report = train_forecasting_models()

    print("\n--- 1.2 RFM Customer Segmentation & K-Means ---")
    seg_report = run_customer_segmentation()

    print("\n--- 1.3 Customer Repeat Purchase Classification ---")
    rep_report = run_repeat_purchase_training()

    fc_selected = next((m for m in fc_report.get("models_comparison", []) if "Selected" in m.get("model", "")), {})
    rep_selected = rep_report.get("baseline_comparison", {}).get("lightgbm_classifier", {})

    return {
        "engine": "retail",
        "forecasting_wape": fc_selected.get("wape"),
        "forecasting_mae": fc_selected.get("mae"),
        "segmentation_silhouette": seg_report.get("silhouette_score"),
        "repeat_purchase_auc": rep_selected.get("roc_auc")
    }

def train_fraud(seed: int = 42):
    print("\n" + "="*70)
    print(">>> [2/5] TRAINING FINANCIAL FRAUD DETECTION ENGINE")
    print("="*70)
    from ml.fraud.pipeline import train_fraud_models
    fraud_report = train_fraud_models()
    xgb_metrics = next((m for m in fraud_report.get("models_comparison", []) if "Selected" in m.get("model", "")), {})
    return {
        "engine": "fraud",
        "roc_auc": xgb_metrics.get("roc_auc"),
        "pr_auc": xgb_metrics.get("pr_auc"),
        "f1_score": xgb_metrics.get("f1_score")
    }

def train_maintenance(seed: int = 42):
    print("\n" + "="*70)
    print(">>> [3/5] TRAINING INDUSTRIAL PREDICTIVE MAINTENANCE ENGINE")
    print("="*70)
    from ml.maintenance.pipeline import train_maintenance_models
    maint_report = train_maintenance_models()
    xgb_metrics = next((m for m in maint_report.get("models_comparison", []) if "Selected" in m.get("model", "")), {})
    return {
        "engine": "maintenance",
        "roc_auc": xgb_metrics.get("roc_auc"),
        "pr_auc": xgb_metrics.get("pr_auc"),
        "f1_score": xgb_metrics.get("f1_score")
    }

def train_healthcare(seed: int = 42):
    print("\n" + "="*70)
    print(">>> [4/5] TRAINING HEALTHCARE RISK RESEARCH ENGINE")
    print("="*70)
    from ml.healthcare.pipeline import train_healthcare_models
    health_report = train_healthcare_models()
    xgb_metrics = next((m for m in health_report.get("models_comparison", []) if "Selected" in m.get("model", "")), {})
    return {
        "engine": "healthcare",
        "roc_auc": xgb_metrics.get("roc_auc"),
        "pr_auc": xgb_metrics.get("pr_auc"),
        "sensitivity": xgb_metrics.get("sensitivity"),
        "brier_score": xgb_metrics.get("brier_score")
    }

def train_recs(seed: int = 42):
    print("\n" + "="*70)
    print(">>> [5/5] TRAINING RECOMMENDATION INTELLIGENCE ENGINE")
    print("="*70)
    from ml.recommendations.pipeline import train_recommendation_models
    recs_report = train_recommendation_models()
    metrics = recs_report.get("evaluation_metrics", {})
    return {
        "engine": "recommendations",
        "precision_at_10": metrics.get("precision_at_10"),
        "ndcg_at_10": metrics.get("ndcg_at_10"),
        "catalog_coverage": metrics.get("catalog_coverage")
    }

def main():
    parser = argparse.ArgumentParser(description="IntelliSphere AI Model Training Orchestrator")
    parser.add_argument(
        "--engine",
        type=str,
        default="all",
        choices=["all", "retail", "fraud", "maintenance", "healthcare", "recs"],
        help="Specify engine to train: all, retail, fraud, maintenance, healthcare, recs (default: all)"
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Deterministic random state for reproducibility (default: 42)"
    )

    args = parser.parse_args()
    set_seed(args.seed)

    start_time = time.time()
    results = {}

    if args.engine in ["all", "retail"]:
        results["retail"] = train_retail(args.seed)

    if args.engine in ["all", "fraud"]:
        results["fraud"] = train_fraud(args.seed)

    if args.engine in ["all", "maintenance"]:
        results["maintenance"] = train_maintenance(args.seed)

    if args.engine in ["all", "healthcare"]:
        results["healthcare"] = train_healthcare(args.seed)

    if args.engine in ["all", "recs"]:
        results["recs"] = train_recs(args.seed)

    elapsed = time.time() - start_time
    print("\n" + "="*70)
    print(f"TRAINING COMPLETE — Elapsed Time: {elapsed:.2f}s")
    print("="*70)
    for engine, res in results.items():
        print(f"  • {engine.upper()}: {res}")
    print("="*70)

if __name__ == "__main__":
    main()
