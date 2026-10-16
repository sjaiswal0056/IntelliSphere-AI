from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    module_type = Column(String(50), index=True, nullable=False)  # retail, fraud, maintenance, healthcare, recommendations, autods
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    input_data = Column(Text, nullable=False)           # JSON string of input features
    prediction_result = Column(Text, nullable=False)    # JSON string of output details
    prediction_value = Column(Float, nullable=True)     # Primary scalar output if applicable
    risk_score = Column(Float, nullable=True)           # Normalized risk score 0.0 - 1.0
    is_anomaly = Column(Boolean, nullable=True)
    latency_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    model_version = relationship("ModelVersion", back_populates="predictions")
    explanation = relationship("PredictionExplanation", back_populates="prediction", uselist=False, cascade="all, delete-orphan")

class PredictionExplanation(Base):
    __tablename__ = "prediction_explanations"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="CASCADE"), unique=True, nullable=False)
    method = Column(String(50), default="SHAP", nullable=False)  # SHAP, feature_importance, rule_based
    base_value = Column(Float, nullable=True)
    feature_attributions = Column(Text, nullable=False)      # JSON dict of {feature: shap_value}
    top_positive_features = Column(Text, nullable=True)     # JSON list
    top_negative_features = Column(Text, nullable=True)     # JSON list
    natural_language_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    prediction = relationship("Prediction", back_populates="explanation")

class AnomalyAlert(Base):
    __tablename__ = "anomaly_alerts"

    id = Column(Integer, primary_key=True, index=True)
    module_type = Column(String(50), index=True, nullable=False)
    severity = Column(String(50), default="medium", nullable=False)  # low, medium, high, critical
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    entity_id = Column(String(255), nullable=True)
    entity_type = Column(String(100), nullable=True)  # transaction, machine, sensor, patient_record, user
    score = Column(Float, default=0.0, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
