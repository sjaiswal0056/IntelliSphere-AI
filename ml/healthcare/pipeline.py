"""
IntelliSphere AI — Healthcare Risk Research Analytics Engine
UCI Heart Disease Dataset (processed.cleveland.data)
Strictly for research, educational, and statistical risk estimation.
NOT FOR CLINICAL DIAGNOSIS OR PRESCRIPTIONS.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    roc_auc_score, average_precision_score, f1_score,
    precision_score, recall_score, confusion_matrix,
    brier_score_loss, roc_curve, precision_recall_curve
)
from sklearn.calibration import calibration_curve
import xgboost as xgb
import shap

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "raw", "heart_disease", "processed.cleveland.data")
MODELS_DIR = os.path.join(BASE_DIR, "artifacts", "models")
REPORTS_DIR = os.path.join(BASE_DIR, "artifacts", "reports")

COL_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope",
    "ca", "thal", "target"
]

def load_and_preprocess_heart_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, header=None, names=COL_NAMES, na_values="?")
    # Impute missing values with column medians
    for col in ["ca", "thal"]:
        df[col] = df[col].fillna(df[col].median())
    
    # Binary classification target: 0 = no presence, 1 = presence (original values 1,2,3,4 represent stages)
    df["binary_target"] = (df["target"] > 0).astype(int)
    return df

def train_healthcare_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    print("[*] Training Healthcare Risk Research Models...")

    df = load_and_preprocess_heart_data()
    print(f"    Loaded {len(df)} patient cohort records. Disease presence: {df['binary_target'].sum()} ({df['binary_target'].mean()*100:.1f}%)")

    feature_cols = [c for c in COL_NAMES if c != "target"]
    X = df[feature_cols]
    y = df["binary_target"]

    # Stratified Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 1. Baseline: Logistic Regression
    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    y_prob_lr = lr.predict_proba(X_test)[:, 1]
    roc_auc_lr = float(roc_auc_score(y_test, y_prob_lr))
    brier_lr = float(brier_score_loss(y_test, y_prob_lr))

    # 2. Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
    rf.fit(X_train, y_train)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]
    roc_auc_rf = float(roc_auc_score(y_test, y_prob_rf))

    # 3. XGBoost Classifier
    xgb_clf = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=3,
        random_state=42,
        eval_metric="logloss"
    )
    xgb_clf.fit(X_train, y_train)
    y_prob_xgb = xgb_clf.predict_proba(X_test)[:, 1]
    y_pred_xgb = (y_prob_xgb >= 0.5).astype(int)

    roc_auc_xgb = float(roc_auc_score(y_test, y_prob_xgb))
    pr_auc_xgb = float(average_precision_score(y_test, y_prob_xgb))
    f1_xgb = float(f1_score(y_test, y_pred_xgb))
    prec_xgb = float(precision_score(y_test, y_pred_xgb))
    rec_xgb = float(recall_score(y_test, y_pred_xgb))
    brier_xgb = float(brier_score_loss(y_test, y_prob_xgb))

    cm = confusion_matrix(y_test, y_pred_xgb)
    tn, fp, fn, tp = cm.ravel()
    sensitivity = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    # Calibration Curve (Reliability diagram)
    prob_true, prob_pred = calibration_curve(y_test, y_prob_xgb, n_bins=5)
    calibration_points = [
        {"mean_predicted_prob": round(float(p), 4), "fraction_positives": round(float(t), 4)}
        for p, t in zip(prob_pred, prob_true)
    ]

    # ROC & PR Curves
    fpr, tpr, _ = roc_curve(y_test, y_prob_xgb)
    pr_prec, pr_rec, _ = precision_recall_curve(y_test, y_prob_xgb)

    roc_curve_points = [
        {"fpr": round(float(f), 4), "tpr": round(float(t), 4)}
        for f, t in zip(fpr[::max(1, len(fpr)//20)], tpr[::max(1, len(tpr)//20)])
    ]
    pr_curve_points = [
        {"recall": round(float(r), 4), "precision": round(float(p), 4)}
        for r, p in zip(pr_rec[::max(1, len(pr_rec)//20)], pr_prec[::max(1, len(pr_prec)//20)])
    ]

    # SHAP Explainer
    explainer = shap.TreeExplainer(xgb_clf)
    sample_X = X_test.head(50)
    shap_values = explainer.shap_values(sample_X)
    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)

    shap_importance = [
        {"feature": feat, "mean_abs_shap": round(float(val), 4)}
        for feat, val in sorted(zip(feature_cols, mean_abs_shap), key=lambda x: x[1], reverse=True)
    ]

    # Save model artifacts
    joblib.dump({
        "model": xgb_clf,
        "feature_cols": feature_cols,
        "explainer": explainer,
        "metrics": {
            "roc_auc": roc_auc_xgb,
            "pr_auc": pr_auc_xgb,
            "sensitivity": sensitivity,
            "specificity": specificity,
            "brier_score": brier_xgb
        }
    }, os.path.join(MODELS_DIR, "healthcare_model.joblib"))

    # De-identified cohort profile distributions
    cohort_stats = {
        "age_distribution": {
            "<45": int((df["age"] < 45).sum()),
            "45-54": int(((df["age"] >= 45) & (df["age"] < 55)).sum()),
            "55-64": int(((df["age"] >= 55) & (df["age"] < 65)).sum()),
            "65+": int((df["age"] >= 65).sum())
        },
        "gender_ratio": {
            "male": int((df["sex"] == 1).sum()),
            "female": int((df["sex"] == 0).sum())
        },
        "mean_cholesterol": round(float(df["chol"].mean()), 1),
        "mean_resting_bp": round(float(df["trestbps"].mean()), 1)
    }

    report = {
        "model_name": "XGBoost Cardiovascular Risk Estimator (Research Only)",
        "cohort_size": len(df),
        "cohort_stats": cohort_stats,
        "models_comparison": [
            {"model": "Logistic Regression Baseline", "roc_auc": round(roc_auc_lr, 4), "brier_score": round(brier_lr, 4)},
            {"model": "Random Forest", "roc_auc": round(roc_auc_rf, 4)},
            {"model": "XGBoost Classifier (Selected)", "roc_auc": round(roc_auc_xgb, 4), "pr_auc": round(pr_auc_xgb, 4), "f1_score": round(f1_xgb, 4), "sensitivity": round(sensitivity, 4), "specificity": round(specificity, 4), "brier_score": round(brier_xgb, 4)}
        ],
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp)
        },
        "roc_curve": roc_curve_points,
        "pr_curve": pr_curve_points,
        "calibration_curve": calibration_points,
        "shap_importance": shap_importance,
        "disclaimer": "RESEARCH & EDUCATIONAL USE ONLY: This model is developed exclusively for statistical risk demonstration on historical de-identified research data. It is NOT a medical device, does not provide clinical diagnoses, and must never be used to guide patient clinical care or prescribe treatments."
    }

    report_path = os.path.join(REPORTS_DIR, "healthcare_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[+] Healthcare research model complete. ROC-AUC: {roc_auc_xgb:.4f}, Sensitivity: {sensitivity:.4f}. Saved to {report_path}")
    return report

if __name__ == "__main__":
    train_healthcare_models()
