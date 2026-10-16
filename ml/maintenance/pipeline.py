"""
IntelliSphere AI — Industrial Predictive Maintenance Engine
UCI AI4I 2020 Predictive Maintenance Dataset
Features temperature gradients, mechanical power, torque-speed interactions,
failure mode diagnostics, and SHAP explainability.
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
    roc_curve, precision_recall_curve
)
import xgboost as xgb
import shap

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "raw", "ai4i2020.csv")
MODELS_DIR = os.path.join(BASE_DIR, "artifacts", "models")
REPORTS_DIR = os.path.join(BASE_DIR, "artifacts", "reports")

def engineer_maintenance_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Clean column names to remove square brackets for XGBoost compatibility
    df = df.rename(columns={
        "Air temperature [K]": "Air_temperature_K",
        "Process temperature [K]": "Process_temperature_K",
        "Rotational speed [rpm]": "Rotational_speed_rpm",
        "Torque [Nm]": "Torque_Nm",
        "Tool wear [min]": "Tool_wear_min"
    })

    type_map = {"L": 0, "M": 1, "H": 2}
    df["Type_encoded"] = df["Type"].map(type_map).fillna(0)

    # Physical feature interactions
    df["Temp_Difference"] = df["Process_temperature_K"] - df["Air_temperature_K"]
    # Mechanical Power (Watts) = (2 * pi * RPM * Torque) / 60
    df["Mechanical_Power"] = (2 * np.pi * df["Rotational_speed_rpm"] * df["Torque_Nm"]) / 60.0
    # Overstrain index = Tool wear * Torque
    df["Overstrain_Index"] = df["Tool_wear_min"] * df["Torque_Nm"]
    # Torque to speed ratio
    df["Torque_Speed_Ratio"] = df["Torque_Nm"] / (df["Rotational_speed_rpm"] + 1e-5)

    return df

def train_maintenance_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    print("[*] Training Industrial Predictive Maintenance Engine...")

    raw_df = pd.read_csv(DATA_PATH)
    df = engineer_maintenance_features(raw_df)
    print(f"    Loaded {len(df)} machine sensor records. Failures: {df['Machine failure'].sum()} ({df['Machine failure'].mean()*100:.2f}%)")

    feature_cols = [
        "Type_encoded",
        "Air_temperature_K",
        "Process_temperature_K",
        "Rotational_speed_rpm",
        "Torque_Nm",
        "Tool_wear_min",
        "Temp_Difference",
        "Mechanical_Power",
        "Overstrain_Index",
        "Torque_Speed_Ratio"
    ]
    X = df[feature_cols]
    y = df["Machine failure"]

    # Stratified Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 1. Baseline: Logistic Regression
    lr = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    y_prob_lr = lr.predict_proba(X_test)[:, 1]
    roc_auc_lr = float(roc_auc_score(y_test, y_prob_lr))
    pr_auc_lr = float(average_precision_score(y_test, y_prob_lr))

    # 2. Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]
    roc_auc_rf = float(roc_auc_score(y_test, y_prob_rf))
    pr_auc_rf = float(average_precision_score(y_test, y_prob_rf))

    # 3. XGBoost Classifier
    pos_weight = (len(y_train) - sum(y_train)) / sum(y_train)
    xgb_clf = xgb.XGBClassifier(
        n_estimators=120,
        learning_rate=0.06,
        max_depth=4,
        scale_pos_weight=pos_weight,
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

    # Failure Mode Diagnostics Correlation
    failure_modes = ["TWF", "HDF", "PWF", "OSF", "RNF"]
    failure_counts = {mode: int(df[mode].sum()) for mode in failure_modes}

    # ROC & PR Curves
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

    # SHAP Explainer
    print("[*] Computing SHAP values for Predictive Maintenance...")
    explainer = shap.TreeExplainer(xgb_clf)
    sample_X = X_test.head(100)
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
            "f1": f1_xgb,
            "precision": prec_xgb,
            "recall": rec_xgb
        }
    }, os.path.join(MODELS_DIR, "maintenance_model.joblib"))

    # Sample machine test fixtures
    healthy_sample = df[df["Machine failure"] == 0].head(3)[feature_cols].to_dict(orient="records")
    faulty_sample = df[df["Machine failure"] == 1].head(3)[feature_cols].to_dict(orient="records")

    report = {
        "model_name": "XGBoost Equipment Failure Classifier",
        "dataset_total_records": len(df),
        "total_failures": int(df["Machine failure"].sum()),
        "failure_mode_breakdown": failure_counts,
        "models_comparison": [
            {"model": "Logistic Regression (Balanced)", "roc_auc": round(roc_auc_lr, 4), "pr_auc": round(pr_auc_lr, 4)},
            {"model": "Random Forest", "roc_auc": round(roc_auc_rf, 4), "pr_auc": round(pr_auc_rf, 4)},
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
            "healthy": healthy_sample,
            "faulty": faulty_sample
        },
        "limitations_and_disclaimers": "The UCI AI4I 2020 dataset is a synthetic benchmark representing milling machine failures. It does not provide continuous time-series degradation histories; therefore, remaining useful life (RUL) cannot be estimated without dedicated run-to-failure sensory datasets."
    }

    report_path = os.path.join(REPORTS_DIR, "maintenance_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[+] Maintenance training complete. ROC-AUC: {roc_auc_xgb:.4f}, PR-AUC: {pr_auc_xgb:.4f}. Saved to {report_path}")
    return report

if __name__ == "__main__":
    train_maintenance_models()
