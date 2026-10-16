import os
import json
import time
import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.models.recommendation import RecommendationRun

router = APIRouter(prefix="/recommendations", tags=["Recommendation Intelligence"])

REPORTS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "reports")
MODELS_DIR = os.path.join(settings.BASE_DIR, "artifacts", "models")

@router.get("/analytics")
def get_recommendation_analytics():
    report_file = os.path.join(REPORTS_DIR, "recommendations_report.json")
    if not os.path.exists(report_file):
        raise HTTPException(status_code=404, detail="Recommendation models have not been trained yet.")
    with open(report_file, "r") as f:
        data = json.load(f)
    return data

@router.get("/users")
def get_sample_users():
    """Returns sample user IDs with different taste profiles for demonstration."""
    return [
        {"user_id": 1, "profile": "Classic Sci-Fi & Action Fan (Matrix, Star Wars, Pulp Fiction)"},
        {"user_id": 15, "profile": "Animation & Family Cinema Lover (Toy Story, Lion King, Aladdin)"},
        {"user_id": 25, "profile": "Drama & Psychological Thriller Enthusiast (Shawshank, Fight Club)"},
        {"user_id": 610, "profile": "Omnivorous Heavy Reviewer (1,300+ diverse ratings)"},
        {"user_id": 9999, "profile": "New User (Cold Start Fallback)"}
    ]

@router.get("/user/{user_id}")
def get_user_recommendations(
    user_id: int,
    k: int = Query(10, ge=1, le=50),
    algorithm: str = Query("hybrid", pattern="^(hybrid|collaborative|popularity)$"),
    db: Session = Depends(get_db)
):
    model_path = os.path.join(MODELS_DIR, "recommender_models.joblib")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Recommender models are not ready.")

    artifact = joblib.load(model_path)
    user_ids = artifact["user_ids"]
    movie_ids = artifact["movie_ids"]
    movie_title_map = artifact["movie_title_map"]
    movie_genres_map = artifact["movie_genres_map"]
    top_popular = artifact["top_popular"]
    svd = artifact["svd"]
    user_latent = artifact["user_latent"]
    item_latent = artifact["item_latent"]

    start_time = time.time()
    is_cold_start = user_id not in user_ids

    recommendations = []
    if is_cold_start or algorithm == "popularity":
        algo_used = "Bayesian Popularity Baseline (Cold-Start)"
        for item in top_popular[:k]:
            recommendations.append({
                "movie_id": int(item["movieId"]),
                "title": item["title"],
                "genres": item["genres"],
                "predicted_affinity": round(float(item["weighted_score"]), 2),
                "rationale": "High global rating consensus across diverse reviewer cohorts."
            })
    else:
        u_idx = user_ids.index(user_id)
        # SVD reconstructed scores for all items
        u_scores = np.dot(user_latent[u_idx], svd.components_)

        if algorithm == "collaborative":
            algo_used = "Matrix Factorization (TruncatedSVD)"
            top_indices = np.argsort(u_scores)[::-1][:k]
            for idx in top_indices:
                mid = movie_ids[idx]
                recommendations.append({
                    "movie_id": int(mid),
                    "title": movie_title_map.get(mid, f"Movie {mid}"),
                    "genres": movie_genres_map.get(mid, "Drama"),
                    "predicted_affinity": round(float(u_scores[idx]), 2),
                    "rationale": "High latent factor resonance with your historical rating vectors."
                })
        else:
            algo_used = "Hybrid (Collaborative Filtering + Latent Similarity)"
            # Blend collaborative score with top item similarities
            top_collab_idx = np.argsort(u_scores)[::-1][:100]
            ranked_items = []
            for idx in top_collab_idx:
                mid = movie_ids[idx]
                collab_score = u_scores[idx]
                sim_boost = float(np.mean(cosine_similarity(item_latent[idx:idx+1], item_latent[top_collab_idx[:5]])))
                hybrid_score = (0.7 * collab_score) + (0.3 * sim_boost * 5.0)
                ranked_items.append((idx, mid, hybrid_score))

            ranked_items.sort(key=lambda x: x[2], reverse=True)
            for idx, mid, hscore in ranked_items[:k]:
                genres = movie_genres_map.get(mid, "")
                recommendations.append({
                    "movie_id": int(mid),
                    "title": movie_title_map.get(mid, f"Movie {mid}"),
                    "genres": genres,
                    "predicted_affinity": round(float(hscore), 2),
                    "rationale": f"Matches your genre preference ({genres.split('|')[0] if genres else 'Top Rated'}) and user cluster."
                })

    latency_ms = round((time.time() - start_time) * 1000, 2)

    # Persist in DB
    run_record = RecommendationRun(
        user_identifier=str(user_id),
        algorithm_used=algo_used,
        k=k,
        recommendations_json=json.dumps(recommendations),
        latency_ms=latency_ms
    )
    db.add(run_record)
    db.commit()

    return {
        "user_id": user_id,
        "is_cold_start": is_cold_start,
        "algorithm_applied": algo_used,
        "recommendations": recommendations,
        "latency_ms": latency_ms
    }

@router.get("/similar/{movie_id}")
def get_similar_movies(movie_id: int, k: int = 5):
    model_path = os.path.join(MODELS_DIR, "recommender_models.joblib")
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Recommender models are not ready.")

    artifact = joblib.load(model_path)
    movie_id_to_idx = artifact["movie_id_to_idx"]
    idx_to_movie_id = artifact["idx_to_movie_id"]
    movie_title_map = artifact["movie_title_map"]
    movie_genres_map = artifact["movie_genres_map"]
    item_latent = artifact["item_latent"]

    if movie_id not in movie_id_to_idx:
        raise HTTPException(status_code=404, detail=f"Movie ID {movie_id} not found in catalog.")

    idx = movie_id_to_idx[movie_id]
    sim_scores = cosine_similarity(item_latent[idx:idx+1], item_latent)[0]
    # Top k excluding itself
    similar_indices = np.argsort(sim_scores)[::-1][1:k+1]

    results = []
    for s_idx in similar_indices:
        s_mid = idx_to_movie_id[s_idx]
        results.append({
            "movie_id": int(s_mid),
            "title": movie_title_map.get(s_mid, f"Movie {s_mid}"),
            "genres": movie_genres_map.get(s_mid, ""),
            "cosine_similarity": round(float(sim_scores[s_idx]), 4)
        })
    return {
        "source_movie": {
            "movie_id": movie_id,
            "title": movie_title_map.get(movie_id, f"Movie {movie_id}"),
            "genres": movie_genres_map.get(movie_id, "")
        },
        "similar_items": results
    }
