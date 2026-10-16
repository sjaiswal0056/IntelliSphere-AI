"""
IntelliSphere AI — Retail Repeat Purchase Risk Classification
Trains Logistic Regression baseline and LightGBM classifier on leakage-free customer features.
Computes ROC-AUC, PR-AUC, F1, Brier score, and SHAP explainability.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score, average_precision_score, f1_score,
    precision_score, recall_score, brier_score_loss, roc_curve, precision_recall_curve
)
import lightgbm as lgb
import shap

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "retail_repeat_purchase.csv")
MODELS_DIR = os.path.join(BASE_DIR, "artifacts", "models")
REPORTS_DIR = os.path.join(BASE_DIR, "artifacts", "reports")

def run_repeat_purchase_training():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    print("[*] Training Repeat-Purchase Classifier...")

    df = pd.read_csv(DATA_PATH)
    feature_cols = ["RecencyDays", "Frequency", "Monetary", "AvgBasketValue", "TotalItems"]
    X = df[feature_cols]
    y = df["RepeatPurchased"]

    # Stratified Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 1. Baseline: Logistic Regression
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    y_prob_lr = lr.predict_proba(X_test)[:, 1]
    roc_auc_lr = float(roc_auc_score(y_test, y_prob_lr))
    pr_auc_lr = float(average_precision_score(y_test, y_prob_lr))

    # 2. LightGBM Classifier
    lgb_clf = lgb.LGBMClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        num_leaves=15,
        random_state=42,
        verbose=-1
    )
    lgb_clf.fit(X_train, y_train)
    y_prob_lgb = lgb_clf.predict_proba(X_test)[:, 1]
    y_pred_lgb = (y_prob_lgb >= 0.5).astype(int)

    roc_auc_lgb = float(roc_auc_score(y_test, y_prob_lgb))
    pr_auc_lgb = float(average_precision_score(y_test, y_prob_lgb))
    f1_lgb = float(f1_score(y_test, y_pred_lgb))
    prec_lgb = float(precision_score(y_test, y_pred_lgb))
    rec_lgb = float(recall_score(y_test, y_pred_lgb))
    brier_lgb = float(brier_score_loss(y_test, y_prob_lgb))

    # Compute ROC and PR curves
    fpr, tpr, _ = roc_curve(y_test, y_prob_lgb)
    pr_prec, pr_rec, _ = precision_recall_curve(y_test, y_prob_lgb)

    roc_curve_points = [
        {"fpr": round(float(f), 4), "tpr": round(float(t), 4)}
        for f, t in zip(fpr[::max(1, len(fpr)//40)], tpr[::max(1, len(tpr)//40)])
    ]
    pr_curve_points = [
        {"recall": round(float(r), 4), "precision": round(float(p), 4)}
        for r, p in zip(pr_rec[::max(1, len(pr_rec)//40)], pr_prec[::max(1, len(pr_prec)//40)])
    ]

    # SHAP Explainer
    print("[*] Computing SHAP values for repeat purchase model...")
    explainer = shap.TreeExplainer(lgb_clf)
    sample_X = X_test.head(100)
    shap_values = explainer.shap_values(sample_X)
    if isinstance(shap_values, list):
        shap_vals = shap_values[1]  # positive class
    else:
        shap_vals = shap_values

    mean_abs_shap = np.mean(np.abs(shap_vals), axis=0)
    shap_feature_importance = [
        {"feature": feat, "mean_abs_shap": round(float(val), 4)}
        for feat, val in sorted(zip(feature_cols, mean_abs_shap), key=lambda x: x[1], reverse=True)
    ]

    # Save trained model
    joblib.dump({
        "model": lgb_clf,
        "feature_cols": feature_cols,
        "explainer": explainer,
        "metrics": {
            "roc_auc": roc_auc_lgb,
            "pr_auc": pr_auc_lgb,
            "f1": f1_lgb,
            "brier_score": brier_lgb
        }
    }, os.path.join(MODELS_DIR, "retail_repeat_clf.joblib"))

    report = {
        "model_name": "LightGBM Repeat Purchase Predictor",
        "baseline_comparison": {
            "logistic_regression": {"roc_auc": round(roc_auc_lr, 4), "pr_auc": round(pr_auc_lr, 4)},
            "lightgbm_classifier": {
                "roc_auc": round(roc_auc_lgb, 4),
                "pr_auc": round(pr_auc_lgb, 4),
                "f1_score": round(f1_lgb, 4),
                "precision": round(prec_lgb, 4),
                "recall": round(rec_lgb, 4),
                "brier_score": round(brier_lgb, 4)
            }
        },
        "roc_curve": roc_curve_points,
        "pr_curve": pr_curve_points,
        "shap_importance": shap_feature_importance
    }

    report_path = os.path.join(REPORTS_DIR, "retail_repeat_purchase_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[+] Repeat Purchase training complete. ROC-AUC: {roc_auc_lgb:.4f}, PR-AUC: {pr_auc_lgb:.4f}. Saved to {report_path}")
    return report

if __name__ == "__main__":
    run_repeat_purchase_training()
