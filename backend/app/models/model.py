from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    module_type = Column(String(50), index=True, nullable=False)  # retail, fraud, maintenance, healthcare, recommendations, autods
    task_type = Column(String(50), nullable=False)                # regression, classification, clustering, anomaly_detection, collaborative_filtering
    algorithm = Column(String(100), nullable=False)               # LightGBM, XGBoost, RandomForest, LogisticRegression, IsolationForest, SVD, etc.
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    versions = relationship("ModelVersion", back_populates="model", cascade="all, delete-orphan")

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(50), nullable=False)  # v1.0.0
    artifact_path = Column(String(512), nullable=False)
    metrics = Column(Text, nullable=True)         # JSON string: e.g. {"roc_auc": 0.98, "f1": 0.92, "mae": 12.4}
    parameters = Column(Text, nullable=True)      # JSON string: hyperparameters
    feature_names = Column(Text, nullable=True)   # JSON list of feature names
    target_column = Column(String(255), nullable=True)
    validation_strategy = Column(String(100), nullable=True)
    status = Column(String(50), default="ready", nullable=False)  # ready, archived, training, failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    model = relationship("MLModel", back_populates="versions")
    predictions = relationship("Prediction", back_populates="model_version")
