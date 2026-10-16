from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from backend.app.database.session import Base

class RecommendationRun(Base):
    __tablename__ = "recommendation_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_identifier = Column(String(255), index=True, nullable=False)
    algorithm_used = Column(String(100), nullable=False)  # SVD, ItemItem, Popularity, Hybrid
    k = Column(Integer, default=10, nullable=False)
    recommendations_json = Column(Text, nullable=False)  # JSON list of {item_id, title, score, reason}
    evaluation_metrics = Column(Text, nullable=True)     # JSON: precision@k, recall@k, ndcg@k
    latency_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
