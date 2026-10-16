"""
IntelliSphere AI — Retail Customer Segmentation Engine
RFM Analysis, Log Scaling, K-Means Clustering, PCA Projection, and Silhouette Evaluation.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "retail_rfm.csv")
MODELS_DIR = os.path.join(BASE_DIR, "artifacts", "models")
REPORTS_DIR = os.path.join(BASE_DIR, "artifacts", "reports")

def run_customer_segmentation():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    print("[*] Running Customer Segmentation on RFM data...")

    df = pd.read_csv(DATA_PATH)
    # Filter positive monetary
    df = df[df["Monetary"] > 0].reset_index(drop=True)

    # Log transform RFM features to handle right skewness
    features = ["RecencyDays", "Frequency", "Monetary"]
    log_df = pd.DataFrame()
    log_df["Recency_log"] = np.log1p(df["RecencyDays"])
    log_df["Frequency_log"] = np.log1p(df["Frequency"])
    log_df["Monetary_log"] = np.log1p(df["Monetary"])

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(log_df)

    # K-Means clustering (k=4)
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X_scaled)
    df["Cluster"] = clusters

    # Silhouette score for cluster validation
    sil_score = float(silhouette_score(X_scaled, clusters))

    # PCA 2D and 3D Projection for visualization
    pca = PCA(n_components=3, random_state=42)
    pca_coords = pca.fit_transform(X_scaled)
    df["pca_x"] = pca_coords[:, 0]
    df["pca_y"] = pca_coords[:, 1]
    df["pca_z"] = pca_coords[:, 2]

    # Assign meaningful business segment labels based on cluster medians
    cluster_stats = df.groupby("Cluster").agg(
        Recency_median=("RecencyDays", "median"),
        Frequency_median=("Frequency", "median"),
        Monetary_median=("Monetary", "median"),
        Count=("Customer ID", "count"),
        TotalRevenue=("Monetary", "sum")
    ).reset_index()

    # Assign personas
    # Sort by Monetary descending
    sorted_clusters = cluster_stats.sort_values(by="Monetary_median", ascending=False)["Cluster"].tolist()
    label_map = {
        sorted_clusters[0]: "Champions & VIPs",
        sorted_clusters[1]: "Loyal Customers",
        sorted_clusters[2]: "Potential Loyalists",
        sorted_clusters[3]: "At-Risk / Hibernating"
    }
    df["Segment"] = df["Cluster"].map(label_map)
    cluster_stats["Segment"] = cluster_stats["Cluster"].map(label_map)

    # Prepare summary profiles
    profiles = []
    for _, row in cluster_stats.iterrows():
        profiles.append({
            "cluster_id": int(row["Cluster"]),
            "segment_name": str(row["Segment"]),
            "customer_count": int(row["Count"]),
            "percentage": round(float(row["Count"] / len(df) * 100), 1),
            "median_recency_days": round(float(row["Recency_median"]), 1),
            "median_orders": round(float(row["Frequency_median"]), 1),
            "median_revenue": round(float(row["Monetary_median"]), 2),
            "total_revenue": round(float(row["TotalRevenue"]), 2)
        })

    # Sample points for interactive scatter chart (first 400 points)
    sample_points = []
    sample_df = df.sample(min(400, len(df)), random_state=42)
    for _, r in sample_df.iterrows():
        sample_points.append({
            "id": int(r["Customer ID"]),
            "recency": int(r["RecencyDays"]),
            "frequency": int(r["Frequency"]),
            "monetary": round(float(r["Monetary"]), 2),
            "cluster": int(r["Cluster"]),
            "segment": str(r["Segment"]),
            "pca_x": round(float(r["pca_x"]), 3),
            "pca_y": round(float(r["pca_y"]), 3),
            "pca_z": round(float(r["pca_z"]), 3)
        })

    # Save model artifacts
    joblib.dump({
        "kmeans": kmeans,
        "scaler": scaler,
        "pca": pca,
        "label_map": label_map
    }, os.path.join(MODELS_DIR, "retail_kmeans.joblib"))

    report = {
        "model_name": "K-Means RFM Customer Segmentation",
        "n_clusters": 4,
        "silhouette_score": round(sil_score, 4),
        "total_analyzed_customers": len(df),
        "cluster_profiles": profiles,
        "sample_points": sample_points,
        "pca_explained_variance_ratio": [round(float(v), 4) for v in pca.explained_variance_ratio_]
    }

    report_path = os.path.join(REPORTS_DIR, "retail_segmentation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[+] Retail customer segmentation complete. Silhouette: {sil_score:.4f}. Saved to {report_path}")
    return report

if __name__ == "__main__":
    run_customer_segmentation()
