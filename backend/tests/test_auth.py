import uuid
import pytest

def test_login_success(client):
    """Test login with demo admin account."""
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@intellisphere.ai", "password": "IntelliSphere2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["email"] == "demo@intellisphere.ai"
    assert data["role"] == "admin"

def test_login_invalid_password(client):
    """Test login with incorrect credentials."""
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@intellisphere.ai", "password": "WrongPassword123!"},
    )
    assert response.status_code == 401

def test_register_and_authenticate_new_user(client):
    """Test self-registration and subsequent token validation."""
    unique_email = f"user_{uuid.uuid4().hex[:8]}@test.intellisphere.ai"
    reg_response = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "SecurePassword123!",
            "full_name": "Test Data Scientist",
            "role": "data_scientist",
        },
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert reg_data["email"] == unique_email
    assert "access_token" in reg_data

    # Test duplicate email rejection
    dup_response = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "SecurePassword123!",
            "full_name": "Duplicate User",
            "role": "data_scientist",
        },
    )
    assert dup_response.status_code == 400

def test_get_current_user_profile(client, auth_headers):
    """Test /api/auth/me with bearer token."""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "demo@intellisphere.ai"
    assert data["role"] == "admin"

def test_unauthorized_access(client):
    """Test that protected endpoint without token returns 401."""
    response = client.get("/api/auth/me")
    assert response.status_code in (401, 403)
