"""
IntelliSphere AI — Retail Module Preprocessing
Processes UCI Online Retail II dataset into:
1. Daily aggregated sales time series
2. Customer RFM dataset
3. Repeat purchase risk classification dataset (leakage-free windowing)
"""

import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DATA_PATH = os.path.join(BASE_DIR, "data", "raw", "online_retail_II.xlsx")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

def clean_retail_data(sample_max_rows: int = None) -> pd.DataFrame:
    print("[*] Loading UCI Online Retail II dataset...")
    # Load Year 2010-2011 sheet
    df = pd.read_excel(RAW_DATA_PATH, sheet_name="Year 2010-2011", nrows=sample_max_rows)
    print(f"    Raw records loaded: {len(df)}")

    # Clean Cancellations (Invoices starting with 'C')
    df = df[~df["Invoice"].astype(str).str.startswith("C")].copy()

    # Drop non-positive quantities and prices
    df = df[(df["Quantity"] > 0) & (df["Price"] > 0)].copy()

    # Parse dates
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"])
    df["Sales"] = df["Quantity"] * df["Price"]
    df["Date"] = df["InvoiceDate"].dt.date

    # Drop null Customer IDs for customer-level analytics
    print(f"    Valid cleaned transactions: {len(df)}")
    return df

def generate_daily_sales_series(df: pd.DataFrame) -> pd.DataFrame:
    print("[*] Generating daily sales time series...")
    daily = df.groupby("Date").agg(
        TotalSales=("Sales", "sum"),
        TotalQuantity=("Quantity", "sum"),
        OrderCount=("Invoice", "nunique"),
        CustomerCount=("Customer ID", "nunique"),
        AvgOrderValue=("Sales", "mean")
    ).reset_index()

    daily["Date"] = pd.to_datetime(daily["Date"])
    daily = daily.sort_values("Date").reset_index(drop=True)

    # Fill any missing dates in range with 0 sales
    idx = pd.date_range(daily["Date"].min(), daily["Date"].max())
    daily = daily.set_index("Date").reindex(idx).fillna({
        "TotalSales": 0.0,
        "TotalQuantity": 0.0,
        "OrderCount": 0,
        "CustomerCount": 0,
        "AvgOrderValue": 0.0
    }).reset_index().rename(columns={"index": "Date"})

    out_path = os.path.join(PROCESSED_DIR, "retail_daily_sales.csv")
    daily.to_csv(out_path, index=False)
    print(f"    Saved daily time series to {out_path} ({len(daily)} days)")
    return daily

def generate_rfm_and_repeat_purchase(df: pd.DataFrame):
    print("[*] Generating RFM and Repeat-Purchase dataset...")
    cust_df = df.dropna(subset=["Customer ID"]).copy()
    cust_df["Customer ID"] = cust_df["Customer ID"].astype(int)

    max_date = cust_df["InvoiceDate"].max()
    min_date = cust_df["InvoiceDate"].min()
    
    # 1. Full RFM metrics for segmentation
    rfm = cust_df.groupby("Customer ID").agg(
        RecencyDays=("InvoiceDate", lambda x: (max_date - x.max()).days),
        Frequency=("Invoice", "nunique"),
        Monetary=("Sales", "sum"),
        AvgBasketSize=("Quantity", "mean"),
        TotalItems=("Quantity", "sum"),
        Country=("Country", "first")
    ).reset_index()

    rfm_path = os.path.join(PROCESSED_DIR, "retail_rfm.csv")
    rfm.to_csv(rfm_path, index=False)
    print(f"    Saved RFM profiles for {len(rfm)} customers to {rfm_path}")

    # 2. Leakage-free repeat purchase classification:
    # Observation window: first 180 days. Outcome window: next 90 days.
    split_date = min_date + pd.Timedelta(days=180)
    end_outcome_date = split_date + pd.Timedelta(days=90)

    obs_df = cust_df[cust_df["InvoiceDate"] <= split_date]
    outcome_df = cust_df[(cust_df["InvoiceDate"] > split_date) & (cust_df["InvoiceDate"] <= end_outcome_date)]

    repeat_cust_ids = set(outcome_df["Customer ID"].unique())

    # Features calculated STRICTLY inside observation window
    obs_features = obs_df.groupby("Customer ID").agg(
        RecencyDays=("InvoiceDate", lambda x: (split_date - x.max()).days),
        Frequency=("Invoice", "nunique"),
        Monetary=("Sales", "sum"),
        AvgBasketValue=("Sales", "mean"),
        TotalItems=("Quantity", "sum")
    ).reset_index()

    obs_features["RepeatPurchased"] = obs_features["Customer ID"].apply(
        lambda cid: 1 if cid in repeat_cust_ids else 0
    )

    repeat_path = os.path.join(PROCESSED_DIR, "retail_repeat_purchase.csv")
    obs_features.to_csv(repeat_path, index=False)
    print(f"    Saved repeat purchase training set ({len(obs_features)} records, {obs_features['RepeatPurchased'].mean()*100:.1f}% positive) to {repeat_path}")

def run():
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    df = clean_retail_data()
    generate_daily_sales_series(df)
    generate_rfm_and_repeat_purchase(df)
    print("[+] Retail preprocessing completed successfully!")

if __name__ == "__main__":
    run()
