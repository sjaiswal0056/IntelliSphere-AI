"""
IntelliSphere AI — Retail Sales Forecasting Engine
Trains Seasonal Naive baseline, LightGBM, and XGBoost regressor models on daily sales.
Evaluates using chronological split, MAE, WAPE, RMSE, and 95% prediction intervals.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import timedelta
import lightgbm as lgb
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from statsmodels.tsa.seasonal import seasonal_decompose
import mlflow

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "retail_daily_sales.csv")
MODELS_DIR = os.path.join(BASE_DIR, "artifacts", "models")
REPORTS_DIR = os.path.join(BASE_DIR, "artifacts", "reports")

def create_time_series_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)

    # Calendar features
    df["day_of_week"] = df["Date"].dt.dayofweek
    df["day_of_month"] = df["Date"].dt.day
    df["month"] = df["Date"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # Lag features
    for lag in [1, 2, 7, 14, 21, 28]:
        df[f"lag_{lag}"] = df["TotalSales"].shift(lag)

    # Rolling window statistics (closed='left' to prevent lookahead leakage)
    for w in [7, 14, 28]:
        df[f"rolling_mean_{w}"] = df["TotalSales"].shift(1).rolling(w).mean()
        df[f"rolling_std_{w}"] = df["TotalSales"].shift(1).rolling(w).std().fillna(0)
        df[f"rolling_min_{w}"] = df["TotalSales"].shift(1).rolling(w).min()
        df[f"rolling_max_{w}"] = df["TotalSales"].shift(1).rolling(w).max()

    # Trend indicator
    df["rolling_ratio_7_28"] = df["rolling_mean_7"] / (df["rolling_mean_28"] + 1e-5)

    return df.dropna().reset_index(drop=True)

def train_and_evaluate_forecasting():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    print("[*] Starting Retail Sales Forecasting Training...")
    raw_df = pd.read_csv(DATA_PATH)
    featured_df = create_time_series_features(raw_df)

    # Chronological Split: last 28 days held-out as test set
    test_days = 28
    train_df = featured_df.iloc[:-test_days].copy()
    test_df = featured_df.iloc[-test_days:].copy()

    feature_cols = [c for c in featured_df.columns if c not in ["Date", "TotalSales", "TotalQuantity", "OrderCount", "CustomerCount", "AvgOrderValue"]]
    X_train = train_df[feature_cols]
    y_train = train_df["TotalSales"]
    X_test = test_df[feature_cols]
    y_test = test_df["TotalSales"]

    # 1. Baseline: Seasonal Naive (7-day lag)
    y_pred_naive = test_df["lag_7"].values
    mae_naive = float(mean_absolute_error(y_test, y_pred_naive))
    wape_naive = float(np.sum(np.abs(y_test - y_pred_naive)) / np.sum(y_test))

    # 2. LightGBM Regressor
    lgb_model = lgb.LGBMRegressor(
        n_estimators=150,
        learning_rate=0.04,
        max_depth=5,
        num_leaves=20,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbose=-1
    )
    lgb_model.fit(X_train, y_train)
    y_pred_lgb = lgb_model.predict(X_test)
    y_pred_lgb = np.maximum(y_pred_lgb, 0.0)

    mae_lgb = float(mean_absolute_error(y_test, y_pred_lgb))
    rmse_lgb = float(root_mean_squared_error(y_test, y_pred_lgb))
    wape_lgb = float(np.sum(np.abs(y_test - y_pred_lgb)) / np.sum(y_test))
    r2_lgb = float(r2_score(y_test, y_pred_lgb))

    # 3. XGBoost Regressor
    xgb_model = xgb.XGBRegressor(
        n_estimators=150,
        learning_rate=0.04,
        max_depth=4,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    xgb_model.fit(X_train, y_train)
    y_pred_xgb = xgb_model.predict(X_test)
    y_pred_xgb = np.maximum(y_pred_xgb, 0.0)

    mae_xgb = float(mean_absolute_error(y_test, y_pred_xgb))
    wape_xgb = float(np.sum(np.abs(y_test - y_pred_xgb)) / np.sum(y_test))

    # Calculate residual std for 95% confidence intervals (+/- 1.96 * residual_std)
    train_residuals = y_train.values - lgb_model.predict(X_train)
    residual_std = float(np.std(train_residuals))

    # Seasonal Decomposition of the full series
    full_ts = raw_df.set_index(pd.to_datetime(raw_df["Date"]))["TotalSales"]
    # Decompose weekly pattern (period=7)
    decomp = seasonal_decompose(full_ts, model='additive', period=7, extrapolate_trend='freq')
    decomp_data = {
        "dates": [d.strftime("%Y-%m-%d") for d in full_ts.index[-60:]],
        "observed": [round(float(v), 2) for v in decomp.observed[-60:]],
        "trend": [round(float(v), 2) for v in decomp.trend[-60:]],
        "seasonal": [round(float(v), 2) for v in decomp.seasonal[-60:]],
        "residual": [round(float(v), 2) for v in decomp.resid[-60:]]
    }

    # Save artifacts
    model_artifact_path = os.path.join(MODELS_DIR, "retail_forecast_lgb.joblib")
    joblib.dump({
        "model": lgb_model,
        "feature_cols": feature_cols,
        "residual_std": residual_std,
        "metrics": {"mae": mae_lgb, "rmse": rmse_lgb, "wape": wape_lgb, "r2": r2_lgb}
    }, model_artifact_path)

    # Actual vs Predicted comparison for test set
    test_results = []
    for d, act, pred in zip(test_df["Date"], y_test, y_pred_lgb):
        test_results.append({
            "date": d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d),
            "actual": round(float(act), 2),
            "predicted": round(float(pred), 2),
            "lower_bound": round(max(0.0, float(pred - 1.96 * residual_std)), 2),
            "upper_bound": round(float(pred + 1.96 * residual_std), 2)
        })

    # Future 28-Day Recursive Forecast
    last_known_row = featured_df.iloc[-1].copy()
    future_forecast = generate_future_forecast(lgb_model, raw_df, feature_cols, residual_std, horizon_days=28)

    evaluation_report = {
        "model_name": "LightGBM Demand Forecaster",
        "validation_strategy": "Chronological Hold-out (last 28 days)",
        "models_comparison": [
            {"model": "Seasonal Naive (7-day lag)", "mae": round(mae_naive, 2), "wape": round(wape_naive, 4)},
            {"model": "XGBoost Regressor", "mae": round(mae_xgb, 2), "wape": round(wape_xgb, 4)},
            {"model": "LightGBM Regressor (Selected)", "mae": round(mae_lgb, 2), "rmse": round(rmse_lgb, 2), "wape": round(wape_lgb, 4), "r2": round(r2_lgb, 4)}
        ],
        "feature_importance": [
            {"feature": f, "importance": round(float(imp), 4)}
            for f, imp in sorted(zip(feature_cols, lgb_model.feature_importances_), key=lambda x: x[1], reverse=True)[:10]
        ],
        "test_comparison": test_results,
        "future_forecast": future_forecast,
        "decomposition": decomp_data
    }

    report_path = os.path.join(REPORTS_DIR, "retail_forecast_report.json")
    with open(report_path, "w") as f:
        json.dump(evaluation_report, f, indent=2)

    print(f"[+] Retail forecasting trained. MAE: {mae_lgb:.2f}, WAPE: {wape_lgb*100:.2f}%. Saved to {report_path}")
    return evaluation_report

def generate_future_forecast(model, raw_daily_df: pd.DataFrame, feature_cols: list, residual_std: float, horizon_days: int = 28):
    """Generate recursive future forecasts for 7, 14, 28 days."""
    df = raw_daily_df.copy()
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)

    future_preds = []
    last_date = df["Date"].max()

    for h in range(1, horizon_days + 1):
        next_date = last_date + timedelta(days=h)
        
        # Build features for next_date using past data + past predictions
        day_of_week = next_date.dayofweek
        day_of_month = next_date.day
        month = next_date.month
        is_weekend = 1 if day_of_week in [5, 6] else 0

        # Extract lags from existing df
        feat_dict = {
            "day_of_week": day_of_week,
            "day_of_month": day_of_month,
            "month": month,
            "is_weekend": is_weekend
        }

        for lag in [1, 2, 7, 14, 21, 28]:
            idx = len(df) - lag
            feat_dict[f"lag_{lag}"] = df["TotalSales"].iloc[idx] if idx >= 0 else df["TotalSales"].mean()

        for w in [7, 14, 28]:
            past_w = df["TotalSales"].iloc[-w:]
            feat_dict[f"rolling_mean_{w}"] = past_w.mean()
            feat_dict[f"rolling_std_{w}"] = past_w.std() if len(past_w) > 1 else 0.0
            feat_dict[f"rolling_min_{w}"] = past_w.min()
            feat_dict[f"rolling_max_{w}"] = past_w.max()

        feat_dict["rolling_ratio_7_28"] = feat_dict["rolling_mean_7"] / (feat_dict["rolling_mean_28"] + 1e-5)

        x_row = pd.DataFrame([feat_dict])[feature_cols]
        pred_val = float(max(0.0, model.predict(x_row)[0]))

        future_preds.append({
            "date": next_date.strftime("%Y-%m-%d"),
            "forecast": round(pred_val, 2),
            "lower_bound": round(max(0.0, pred_val - 1.96 * residual_std), 2),
            "upper_bound": round(pred_val + 1.96 * residual_std, 2)
        })

        # Append row to df to allow subsequent recursive lag calculations
        new_row = pd.DataFrame([{
            "Date": next_date,
            "TotalSales": pred_val,
            "TotalQuantity": 0,
            "OrderCount": 0,
            "CustomerCount": 0,
            "AvgOrderValue": 0
        }])
        df = pd.concat([df, new_row], ignore_index=True)

    return future_preds

if __name__ == "__main__":
    train_and_evaluate_forecasting()
