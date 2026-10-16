import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "IntelliSphere AI — Unified Predictive Intelligence Platform"
    TAGLINE: str = "One Platform. Multiple Intelligence Engines. Smarter Decisions."
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Security & Auth
    SECRET_KEY: str = "intellisphere-ai-super-secret-production-grade-jwt-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Demo Admin Account Configuration
    ADMIN_EMAIL: str = "demo@intellisphere.ai"
    ADMIN_PASSWORD: str = "IntelliSphere2026!"
    SEED_DEMO_ADMIN: bool = True

    # Database & Postgres Credentials
    DATABASE_URL: str = "sqlite:///./data/intellisphere.db"
    POSTGRES_USER: str = "intellisphere_user"
    POSTGRES_PASSWORD: str = "intellisphere_dev_password_2026"
    POSTGRES_DB: str = "intellisphere"

    # MLOps
    MLFLOW_TRACKING_URI: str = "sqlite:///./data/mlflow.db"
    MLFLOW_EXPERIMENT_NAME: str = "IntelliSphere-Unified-Platform"

    # GenAI
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    MAX_LLM_TOKENS: int = 4096
    TEMPERATURE: float = 0.2

    # Storage & Limits
    MAX_UPLOAD_SIZE_MB: int = 50
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    def validate_production_security(self):
        """Enforces that production environments do not use default dev credentials or secrets."""
        if self.ENVIRONMENT.lower() == "production":
            insecure_secret_defaults = [
                "intellisphere-ai-super-secret-production-grade-jwt-key-2026",
                "secret",
                "change-me",
            ]
            if any(default in self.SECRET_KEY for default in insecure_secret_defaults):
                raise ValueError(
                    "CRITICAL SECURITY ERROR: SECRET_KEY must be overridden with a secure random key in production "
                    "(e.g., generated with `openssl rand -hex 32`)."
                )
            if self.ADMIN_PASSWORD == "IntelliSphere2026!":
                raise ValueError(
                    "CRITICAL SECURITY ERROR: ADMIN_PASSWORD must be changed from the development default in production."
                )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
settings.validate_production_security()
