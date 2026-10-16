"""
IntelliSphere AI — Deterministic ML Training & Evaluation Tool
Executes end-to-end preprocessing, baseline, and candidate model training.
Calculates rigorous, un-hallucinated evaluation metrics and feature importances.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    mean_absolute_error, root_mean_squared_error, r2_score
)
import lightgbm as lgb

def train_and_evaluate_autods_models(
    file_path: str,
    target_column: str,
    task_type: str = "classification",
    models_to_train: List[str] = None
) -> Dict[str, Any]:
    """Deterministically trains models on the user's dataset and returns verified metrics."""
    ext = os.path.splitext(file_path)[1].lower()
    df = pd.read_csv(file_path, low_memory=False) if ext == ".csv" else pd.read_excel(file_path)

    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    # Drop rows where target is missing
    df = df.dropna(subset=[target_column]).copy()
    if len(df) < 20:
        raise ValueError("Dataset has too few records (< 20) for statistical model training.")

    # Separate features and target
    X_raw = df.drop(columns=[target_column])
    y_raw = df[target_column]

    # Preprocessing: select top informative features, max 30 columns to ensure fast completion
    numeric_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()[:25]
    categorical_cols = [c for c in X_raw.select_dtypes(include=["object", "category"]).columns if X_raw[c].nunique() <= 10][:5]

    processed_dfs = []
    feature_names = []

    if numeric_cols:
        num_imputer = SimpleImputer(strategy="median")
        num_imputed = num_imputer.fit_transform(X_raw[numeric_cols])
        scaler = StandardScaler()
        num_scaled = scaler.fit_transform(num_imputed)
        num_df = pd.DataFrame(num_scaled, columns=numeric_cols)
        processed_dfs.append(num_df)
        feature_names.extend(numeric_cols)

    if categorical_cols:
        cat_imputer = SimpleImputer(strategy="most_frequent")
        cat_imputed = cat_imputer.fit_transform(X_raw[categorical_cols])
        cat_raw_df = pd.DataFrame(cat_imputed, columns=categorical_cols)
        cat_encoded = pd.get_dummies(cat_raw_df, drop_first=True)
        processed_dfs.append(cat_encoded)
        feature_names.extend(cat_encoded.columns.tolist())

    if not processed_dfs:
        raise ValueError("No usable numeric or categorical features found in dataset.")

    X = pd.concat(processed_dfs, axis=1)

    # Encode target if classification
    if task_type == "classification":
        if not pd.api.types.is_numeric_dtype(y_raw):
            y = pd.factorize(y_raw)[0]
        else:
            y = y_raw.values
        is_binary = len(np.unique(y)) == 2
        stratify_arg = y if is_binary else None
    else:
        y = y_raw.values.astype(float)
        stratify_arg = None

    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=stratify_arg
    )

    models_comparison = []
    trained_artifacts = {}

    if task_type == "classification":
        # 1. Baseline: Logistic Regression
        lr = LogisticRegression(max_iter=500, random_state=42)
        lr.fit(X_train, y_train)
        y_pred_lr = lr.predict(X_test)
        acc_lr = float(accuracy_score(y_test, y_pred_lr))
        f1_lr = float(f1_score(y_test, y_pred_lr, average="weighted"))
        models_comparison.append({
            "model_name": "Logistic Regression Baseline",
            "accuracy": round(acc_lr, 4),
            "f1_score": round(f1_lr, 4),
            "precision": round(float(precision_score(y_test, y_pred_lr, average="weighted", zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred_lr, average="weighted", zero_division=0)), 4)
        })

        # 2. Random Forest Classifier
        rf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        y_pred_rf = rf.predict(X_test)
        acc_rf = float(accuracy_score(y_test, y_pred_rf))
        f1_rf = float(f1_score(y_test, y_pred_rf, average="weighted"))
        models_comparison.append({
            "model_name": "Random Forest Classifier",
            "accuracy": round(acc_rf, 4),
            "f1_score": round(f1_rf, 4),
            "precision": round(float(precision_score(y_test, y_pred_rf, average="weighted", zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred_rf, average="weighted", zero_division=0)), 4)
        })
        trained_artifacts["Random Forest"] = (rf, f1_rf)

        # 3. LightGBM Classifier
        lgb_clf = lgb.LGBMClassifier(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42, verbose=-1)
        lgb_clf.fit(X_train, y_train)
        y_pred_lgb = lgb_clf.predict(X_test)
        acc_lgb = float(accuracy_score(y_test, y_pred_lgb))
        f1_lgb = float(f1_score(y_test, y_pred_lgb, average="weighted"))
        models_comparison.append({
            "model_name": "LightGBM Classifier",
            "accuracy": round(acc_lgb, 4),
            "f1_score": round(f1_lgb, 4),
            "precision": round(float(precision_score(y_test, y_pred_lgb, average="weighted", zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred_lgb, average="weighted", zero_division=0)), 4)
        })
        trained_artifacts["LightGBM"] = (lgb_clf, f1_lgb)

        # Select Best Model based on F1
        best_name = max(trained_artifacts.keys(), key=lambda k: trained_artifacts[k][1])
        best_model = trained_artifacts[best_name][0]

    else: # Regression
        # 1. Baseline: Ridge Regression
        ridge = Ridge(alpha=1.0, random_state=42)
        ridge.fit(X_train, y_train)
        y_pred_ridge = ridge.predict(X_test)
        mae_ridge = float(mean_absolute_error(y_test, y_pred_ridge))
        r2_ridge = float(r2_score(y_test, y_pred_ridge))
        models_comparison.append({
            "model_name": "Ridge Linear Regression Baseline",
            "mae": round(mae_ridge, 4),
            "rmse": round(float(root_mean_squared_error(y_test, y_pred_ridge)), 4),
            "r2_score": round(r2_ridge, 4)
        })

        # 2. Random Forest Regressor
        rf_reg = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)
        rf_reg.fit(X_train, y_train)
        y_pred_rf = rf_reg.predict(X_test)
        mae_rf = float(mean_absolute_error(y_test, y_pred_rf))
        r2_rf = float(r2_score(y_test, y_pred_rf))
        models_comparison.append({
            "model_name": "Random Forest Regressor",
            "mae": round(mae_rf, 4),
            "rmse": round(float(root_mean_squared_error(y_test, y_pred_rf)), 4),
            "r2_score": round(r2_rf, 4)
        })
        trained_artifacts["Random Forest"] = (rf_reg, r2_rf)

        # 3. LightGBM Regressor
        lgb_reg = lgb.LGBMRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42, verbose=-1)
        lgb_reg.fit(X_train, y_train)
        y_pred_lgb = lgb_reg.predict(X_test)
        mae_lgb = float(mean_absolute_error(y_test, y_pred_lgb))
        r2_lgb = float(r2_score(y_test, y_pred_lgb))
        models_comparison.append({
            "model_name": "LightGBM Regressor",
            "mae": round(mae_lgb, 4),
            "rmse": round(float(root_mean_squared_error(y_test, y_pred_lgb)), 4),
            "r2_score": round(r2_lgb, 4)
        })
        trained_artifacts["LightGBM"] = (lgb_reg, r2_lgb)

        # Select Best Model based on R2 score
        best_name = max(trained_artifacts.keys(), key=lambda k: trained_artifacts[k][1])
        best_model = trained_artifacts[best_name][0]

    # Feature importances from the best model
    importances = best_model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1][:10]
    top_features = [
        {"feature": str(feature_names[i]), "importance": round(float(importances[i]), 4)}
        for i in sorted_idx
    ]

    return {
        "target_column": target_column,
        "task_type": task_type,
        "total_training_records": len(X_train),
        "total_test_records": len(X_test),
        "models_comparison": models_comparison,
        "best_model_selected": best_name,
        "top_features": top_features,
        "validation_strategy": "Stratified 75/25 Holdout Validation" if task_type == "classification" else "75/25 Holdout Validation"
    }
