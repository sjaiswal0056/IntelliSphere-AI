import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import app
from backend.app.database.session import SessionLocal, init_db
from backend.app.models.user import User
from backend.app.core.security import hash_password, create_access_token
from scripts.seed_database import seed

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database schema and seeded benchmark models are ready before running tests."""
    init_db()
    seed()

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def auth_headers(client):
    """Authenticate with preseeded demo account or generate valid token."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@intellisphere.ai").first()
        if not user:
            user = User(
                email="demo@intellisphere.ai",
                hashed_password=hash_password("IntelliSphere2026!"),
                full_name="Lead AI Scientist",
                role="admin",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        token = create_access_token(subject=str(user.id), role=user.role)
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()
