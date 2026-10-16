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

def recursive_multistep_forecast(model, history_df: pd.DataFrame, feature_cols: list, horizon_days: int = 28) -> np.ndarray:
    """
    Generate true multi-step out-of-sample forecasts by recursively computing features
    from model predictions, without using any future ground-truth target values.
    """
    df = history_df.copy()
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values("Date").reset_index(drop=True)

    predictions = []
    last_date = df["Date"].max()

    for h in range(1, horizon_days + 1):
        next_date = last_date + timedelta(days=h)
        day_of_week = next_date.dayofweek
        day_of_month = next_date.day
        month = next_date.month
        is_weekend = 1 if day_of_week in [5, 6] else 0

        feat_dict = {
            "day_of_week": day_of_week,
            "day_of_month": day_of_month,
            "month": month,
            "is_weekend": is_weekend
        }

        for lag in [1, 2, 7, 14, 21, 28]:
            idx = len(df) - lag
            feat_dict[f"lag_{lag}"] = float(df["TotalSales"].iloc[idx]) if idx >= 0 else float(df["TotalSales"].mean())

        for w in [7, 14, 28]:
            past_w = df["TotalSales"].iloc[-w:]
            feat_dict[f"rolling_mean_{w}"] = float(past_w.mean())
            feat_dict[f"rolling_std_{w}"] = float(past_w.std()) if len(past_w) > 1 else 0.0
            feat_dict[f"rolling_min_{w}"] = float(past_w.min())
            feat_dict[f"rolling_max_{w}"] = float(past_w.max())

        feat_dict["rolling_ratio_7_28"] = feat_dict["rolling_mean_7"] / (feat_dict["rolling_mean_28"] + 1e-5)

        x_row = pd.DataFrame([feat_dict])[feature_cols]
        pred_val = float(max(0.0, model.predict(x_row)[0]))
        predictions.append(pred_val)

        new_row = pd.DataFrame([{
            "Date": next_date,
            "TotalSales": pred_val,
            "TotalQuantity": 0,
            "OrderCount": 0,
            "CustomerCount": 0,
            "AvgOrderValue": 0
        }])
        df = pd.concat([df, new_row], ignore_index=True)

    return np.array(predictions)

def seasonal_naive_multistep(history_df: pd.DataFrame, horizon_days: int = 28) -> np.ndarray:
    """Seasonal naive baseline repeating the 7-day seasonal cycle from history."""
    sales = history_df["TotalSales"].tolist()
    preds = []
    for h in range(horizon_days):
        val = sales[-7 + (h % 7)]
        preds.append(float(val))
    return np.array(preds)

def perform_rolling_origin_backtest(raw_df: pd.DataFrame, feature_cols: list, n_splits: int = 3, horizon_days: int = 28) -> dict:
    """
    Evaluates rolling-origin backtesting across n_splits expanding windows.
    At each origin, fits models strictly on data before the origin, then
    performs recursive multi-step forecasting across the horizon.
    """
    print(f"[*] Executing {n_splits}-Fold Rolling-Origin Backtesting ({horizon_days}-day horizons)...")
    total_len = len(raw_df)
    folds = []

    for fold_idx in range(n_splits):
        split_origin = total_len - (n_splits - fold_idx) * horizon_days
        train_raw = raw_df.iloc[:split_origin].copy()
        test_raw = raw_df.iloc[split_origin:split_origin + horizon_days].copy()

        train_featured = create_time_series_features(train_raw)
        X_tr = train_featured[feature_cols]
        y_tr = train_featured["TotalSales"]
        y_true = test_raw["TotalSales"].values

        # 1. Fit LightGBM
        lgb_fold = lgb.LGBMRegressor(
            n_estimators=120,
            learning_rate=0.04,
            max_depth=5,
            num_leaves=20,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbose=-1
        )
        lgb_fold.fit(X_tr, y_tr)
        pred_lgb = recursive_multistep_forecast(lgb_fold, train_raw, feature_cols, horizon_days)

        # 2. Fit XGBoost
        xgb_fold = xgb.XGBRegressor(
            n_estimators=120,
            learning_rate=0.04,
            max_depth=4,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        xgb_fold.fit(X_tr, y_tr)
        pred_xgb = recursive_multistep_forecast(xgb_fold, train_raw, feature_cols, horizon_days)

        # 3. Naive baseline
        pred_naive = seasonal_naive_multistep(train_raw, horizon_days)

        mae_lgb = float(mean_absolute_error(y_true, pred_lgb))
        wape_lgb = float(np.sum(np.abs(y_true - pred_lgb)) / np.sum(y_true))

        mae_xgb = float(mean_absolute_error(y_true, pred_xgb))
        wape_xgb = float(np.sum(np.abs(y_true - pred_xgb)) / np.sum(y_true))

        mae_naive = float(mean_absolute_error(y_true, pred_naive))
        wape_naive = float(np.sum(np.abs(y_true - pred_naive)) / np.sum(y_true))

        origin_date = str(train_raw["Date"].iloc[-1])[:10]
        eval_window = f"{str(test_raw['Date'].iloc[0])[:10]} to {str(test_raw['Date'].iloc[-1])[:10]}"

        folds.append({
            "fold": fold_idx + 1,
            "origin_date": origin_date,
            "eval_window": eval_window,
            "train_days": len(train_raw),
            "test_days": horizon_days,
            "lightgbm_mae": round(mae_lgb, 2),
            "lightgbm_wape": round(wape_lgb, 4),
            "xgboost_mae": round(mae_xgb, 2),
            "xgboost_wape": round(wape_xgb, 4),
            "naive_mae": round(mae_naive, 2),
            "naive_wape": round(wape_naive, 4)
        })

    avg_lgb_mae = float(np.mean([f["lightgbm_mae"] for f in folds]))
    avg_lgb_wape = float(np.mean([f["lightgbm_wape"] for f in folds]))
    avg_xgb_mae = float(np.mean([f["xgboost_mae"] for f in folds]))
    avg_xgb_wape = float(np.mean([f["xgboost_wape"] for f in folds]))
    avg_naive_mae = float(np.mean([f["naive_mae"] for f in folds]))
    avg_naive_wape = float(np.mean([f["naive_wape"] for f in folds]))

    return {
        "folds": folds,
        "summary": {
            "folds_evaluated": n_splits,
            "horizon_days": horizon_days,
            "lightgbm_mean_mae": round(avg_lgb_mae, 2),
            "lightgbm_mean_wape": round(avg_lgb_wape, 4),
            "xgboost_mean_mae": round(avg_xgb_mae, 2),
            "xgboost_mean_wape": round(avg_xgb_wape, 4),
            "naive_mean_mae": round(avg_naive_mae, 2),
            "naive_mean_wape": round(avg_naive_wape, 4)
        }
    }

def train_and_evaluate_forecasting():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    print("[*] Starting Retail Sales Forecasting Training...")
    raw_df = pd.read_csv(DATA_PATH)
    raw_df["Date"] = pd.to_datetime(raw_df["Date"])
    raw_df = raw_df.sort_values("Date").reset_index(drop=True)

    # Chronological Split: strictly hold out final 28 days for true out-of-sample recursive evaluation
    test_days = 28
    train_raw_df = raw_df.iloc[:-test_days].copy()
    test_raw_df = raw_df.iloc[-test_days:].copy()

    # Feature engineer on training set strictly up to cutoff
    train_featured = create_time_series_features(train_raw_df)
    feature_cols = [c for c in train_featured.columns if c not in ["Date", "TotalSales", "TotalQuantity", "OrderCount", "CustomerCount", "AvgOrderValue"]]

    X_train = train_featured[feature_cols]
    y_train = train_featured["TotalSales"]
    y_test = test_raw_df["TotalSales"].values

    # 1. Baseline: Multi-step Seasonal Naive
    y_pred_naive = seasonal_naive_multistep(train_raw_df, horizon_days=test_days)
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

    # True multi-step recursive forecasting without ground truth leakage
    y_pred_lgb = recursive_multistep_forecast(lgb_model, train_raw_df, feature_cols, horizon_days=test_days)
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
    y_pred_xgb = recursive_multistep_forecast(xgb_model, train_raw_df, feature_cols, horizon_days=test_days)
    mae_xgb = float(mean_absolute_error(y_test, y_pred_xgb))
    wape_xgb = float(np.sum(np.abs(y_test - y_pred_xgb)) / np.sum(y_test))

    # Calculate residual std from train fit for confidence intervals
    train_residuals = y_train.values - lgb_model.predict(X_train)
    residual_std = float(np.std(train_residuals))

    # Perform 3-Fold Rolling-Origin Backtesting
    rolling_backtest = perform_rolling_origin_backtest(raw_df, feature_cols, n_splits=3, horizon_days=28)

    # Seasonal Decomposition of the full series
    full_ts = raw_df.set_index("Date")["TotalSales"]
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
        "metrics": {"mae": mae_lgb, "rmse": rmse_lgb, "wape": wape_lgb, "r2": r2_lgb},
        "rolling_origin_summary": rolling_backtest["summary"]
    }, model_artifact_path)

    # Actual vs Predicted comparison for test set
    test_results = []
    for d, act, pred in zip(test_raw_df["Date"], y_test, y_pred_lgb):
        test_results.append({
            "date": d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d),
            "actual": round(float(act), 2),
            "predicted": round(float(pred), 2),
            "lower_bound": round(max(0.0, float(pred - 1.96 * residual_std)), 2),
            "upper_bound": round(float(pred + 1.96 * residual_std), 2)
        })

    # Future 28-Day Recursive Forecast starting from end of raw_df
    future_preds = recursive_multistep_forecast(lgb_model, raw_df, feature_cols, horizon_days=28)
    last_date = raw_df["Date"].max()
    future_forecast = []
    for h, p in enumerate(future_preds, 1):
        fc_date = last_date + timedelta(days=h)
        future_forecast.append({
            "date": fc_date.strftime("%Y-%m-%d"),
            "forecast": round(float(p), 2),
            "lower_bound": round(max(0.0, float(p - 1.96 * residual_std)), 2),
            "upper_bound": round(float(p + 1.96 * residual_std), 2)
        })

    evaluation_report = {
        "model_name": "LightGBM Demand Forecaster",
        "validation_strategy": "Chronological Recursive Hold-Out (zero future leakage) & 3-Fold Rolling-Origin Backtest",
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
        "rolling_origin_backtest": rolling_backtest,
        "decomposition": decomp_data
    }

    report_path = os.path.join(REPORTS_DIR, "retail_forecast_report.json")
    with open(report_path, "w") as f:
        json.dump(evaluation_report, f, indent=2)

    print(f"[+] Retail forecasting trained. MAE: {mae_lgb:.2f}, WAPE: {wape_lgb*100:.2f}%. Saved to {report_path}")
    return evaluation_report

def generate_future_forecast(model, raw_daily_df: pd.DataFrame, feature_cols: list, residual_std: float, horizon_days: int = 28):
    """Wrapper for backward compatibility."""
    preds = recursive_multistep_forecast(model, raw_daily_df, feature_cols, horizon_days)
    df = raw_daily_df.copy()
    df["Date"] = pd.to_datetime(df["Date"])
    last_date = df["Date"].max()
    res = []
    for h, p in enumerate(preds, 1):
        fc_date = last_date + timedelta(days=h)
        res.append({
            "date": fc_date.strftime("%Y-%m-%d"),
            "forecast": round(float(p), 2),
            "lower_bound": round(max(0.0, float(p - 1.96 * residual_std)), 2),
            "upper_bound": round(float(p + 1.96 * residual_std), 2)
        })
    return res

train_forecasting_models = train_and_evaluate_forecasting

if __name__ == "__main__":
    train_and_evaluate_forecasting()
