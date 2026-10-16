"""
IntelliSphere AI — Financial Fraud Detection Intelligence Engine
Handles severe class imbalance with scale_pos_weight, Isolation Forest anomaly detection,
XGBoost classification, ROC-AUC, PR-AUC, Confusion Matrix, and SHAP explainability.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    roc_auc_score, average_precision_score, f1_score,
    precision_score, recall_score, confusion_matrix,
    roc_curve, precision_recall_curve
)
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import shap

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "raw", "creditcard.csv")
MODELS_DIR = os.path.join(BASE_DIR, "artifacts", "models")
REPORTS_DIR = os.path.join(BASE_DIR, "artifacts", "reports")

def train_fraud_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    print("[*] Loading Financial Fraud dataset (creditcard.csv)...")

    # Read dataset
    df = pd.read_csv(DATA_PATH)
    print(f"    Loaded {len(df)} transactions. Frauds: {df['Class'].sum()} ({df['Class'].mean()*100:.3f}%)")

    # Feature scaling for Time and Amount
    scaler = StandardScaler()
    df["scaled_amount"] = scaler.fit_transform(df["Amount"].values.reshape(-1, 1))
    df["scaled_time"] = scaler.fit_transform(df["Time"].values.reshape(-1, 1))

    feature_cols = [f"V{i}" for i in range(1, 29)] + ["scaled_amount", "scaled_time"]
    X = df[feature_cols]
    y = df["Class"]

    # Stratified split: 70% train, 30% test (preserving all fraud distribution)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )

    # 1. Baseline: Logistic Regression with balanced class weights
    print("[*] Training Baseline Logistic Regression...")
    lr = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    y_prob_lr = lr.predict_proba(X_test)[:, 1]
    roc_auc_lr = float(roc_auc_score(y_test, y_prob_lr))
    pr_auc_lr = float(average_precision_score(y_test, y_prob_lr))

    # 2. Unsupervised Anomaly Detection: Isolation Forest
    print("[*] Training Isolation Forest...")
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.002,  # approx expected anomaly rate
        random_state=42,
        n_jobs=-1
    )
    # Fit on normal samples in training set
    iso_forest.fit(X_train[y_train == 0])
    # Anomaly score: negative is more anomalous
    iso_scores = -iso_forest.score_samples(X_test)
    roc_auc_iso = float(roc_auc_score(y_test, iso_scores))
    pr_auc_iso = float(average_precision_score(y_test, iso_scores))

    # 3. XGBoost Classifier with scale_pos_weight
    print("[*] Training XGBoost Fraud Classifier...")
    pos_weight = (len(y_train) - sum(y_train)) / sum(y_train)
    xgb_clf = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.08,
        scale_pos_weight=pos_weight,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="aucpr"
    )
    xgb_clf.fit(X_train, y_train)
    y_prob_xgb = xgb_clf.predict_proba(X_test)[:, 1]
    y_pred_xgb = (y_prob_xgb >= 0.5).astype(int)

    roc_auc_xgb = float(roc_auc_score(y_test, y_prob_xgb))
    pr_auc_xgb = float(average_precision_score(y_test, y_prob_xgb))
    f1_xgb = float(f1_score(y_test, y_pred_xgb))
    prec_xgb = float(precision_score(y_test, y_pred_xgb))
    rec_xgb = float(recall_score(y_test, y_pred_xgb))

    cm = confusion_matrix(y_test, y_pred_xgb).tolist()

    # ROC and PR Curves for XGBoost
    fpr, tpr, _ = roc_curve(y_test, y_prob_xgb)
    pr_prec, pr_rec, _ = precision_recall_curve(y_test, y_prob_xgb)

    roc_curve_points = [
        {"fpr": round(float(f), 4), "tpr": round(float(t), 4)}
        for f, t in zip(fpr[::max(1, len(fpr)//40)], tpr[::max(1, len(tpr)//40)])
    ]
    pr_curve_points = [
        {"recall": round(float(r), 4), "precision": round(float(p), 4)}
        for r, p in zip(pr_rec[::max(1, len(pr_rec)//40)], pr_prec[::max(1, len(pr_prec)//40)])
    ]

    # SHAP Tree Explainer
    print("[*] Computing SHAP values for XGBoost...")
    explainer = shap.TreeExplainer(xgb_clf)
    sample_fraud_X = X_test[y_test == 1].head(30)
    sample_normal_X = X_test[y_test == 0].head(70)
    shap_sample = pd.concat([sample_fraud_X, sample_normal_X])
    shap_values = explainer.shap_values(shap_sample)

    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
    shap_importance = [
        {"feature": feat, "mean_abs_shap": round(float(val), 4)}
        for feat, val in sorted(zip(feature_cols, mean_abs_shap), key=lambda x: x[1], reverse=True)[:12]
    ]

    # Save model artifacts
    joblib.dump({
        "xgb_model": xgb_clf,
        "iso_forest": iso_forest,
        "scaler": scaler,
        "feature_cols": feature_cols,
        "explainer": explainer,
        "metrics": {
            "roc_auc": roc_auc_xgb,
            "pr_auc": pr_auc_xgb,
            "f1": f1_xgb,
            "precision": prec_xgb,
            "recall": rec_xgb
        }
    }, os.path.join(MODELS_DIR, "fraud_models.joblib"))

    # Sample transaction fixtures for instant live testing in UI
    fraud_sample_tx = X_test[y_test == 1].head(3).to_dict(orient="records")
    normal_sample_tx = X_test[y_test == 0].head(3).to_dict(orient="records")

    report = {
        "model_name": "XGBoost Cost-Sensitive Fraud Detector",
        "dataset_total_records": len(df),
        "total_test_records": len(y_test),
        "test_fraud_cases": int(y_test.sum()),
        "test_legit_cases": int((y_test == 0).sum()),
        "models_comparison": [
            {"model": "Logistic Regression (Balanced)", "roc_auc": round(roc_auc_lr, 4), "pr_auc": round(pr_auc_lr, 4)},
            {"model": "Isolation Forest (Unsupervised)", "roc_auc": round(roc_auc_iso, 4), "pr_auc": round(pr_auc_iso, 4)},
            {"model": "XGBoost Classifier (Selected)", "roc_auc": round(roc_auc_xgb, 4), "pr_auc": round(pr_auc_xgb, 4), "f1_score": round(f1_xgb, 4), "precision": round(prec_xgb, 4), "recall": round(rec_xgb, 4)}
        ],
        "confusion_matrix": {
            "true_negative": cm[0][0],
            "false_positive": cm[0][1],
            "false_negative": cm[1][0],
            "true_positive": cm[1][1]
        },
        "roc_curve": roc_curve_points,
        "pr_curve": pr_curve_points,
        "shap_importance": shap_importance,
        "sample_fixtures": {
            "fraud": fraud_sample_tx,
            "normal": normal_sample_tx
        }
    }

    report_path = os.path.join(REPORTS_DIR, "fraud_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[+] Fraud model training complete. ROC-AUC: {roc_auc_xgb:.4f}, PR-AUC: {pr_auc_xgb:.4f}. Saved to {report_path}")
    return report

if __name__ == "__main__":
    train_fraud_models()
