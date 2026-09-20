"""
Test suite for Strict RBAC, Credential Authentication, Session Management,
and Admin Endpoints in HEATSHIELD AI.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.otp import AuthSession
from app.core.auth import hash_password

client = TestClient(app)

def test_login_success_admin():
    """Test standard seeded admin credentials return user info and permissions without token in JSON."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "ADMIN"
    assert "token" not in data  # Token must NOT be in JSON body
    assert "admin.users.view" in data["permissions"]
    # Verify HttpOnly cookie was set
    assert "heatshield_session" in response.cookies

def test_login_success_officer():
    """Test municipal officer login."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "officer", "password": "Officer@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "MUNICIPAL_OFFICER"
    assert "action_plan.view" in data["permissions"]
    assert "admin.users.view" not in data["permissions"]

def test_login_success_citizen():
    """Test citizen login."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "citizen", "password": "Citizen@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "CITIZEN"
    assert "action_plan.view" not in data["permissions"]
    assert "simulation.run" not in data["permissions"]
    assert "public.view" in data["permissions"]

def test_login_invalid_password():
    """Test rejection with invalid password."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "officer", "password": "WrongPassword"}
    )
    assert response.status_code == 401
    assert "INVALID_CREDENTIALS" in response.json()["detail"]["code"]

def test_login_nonexistent_user():
    """Test rejection with nonexistent user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "ghost_officer", "password": "AnyPassword"}
    )
    assert response.status_code == 401
    assert "INVALID_CREDENTIALS" in response.json()["detail"]["code"]

def test_auth_me_with_cookie():
    """Test /me endpoint verifies session from cookie."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "officer", "password": "Officer@123"}
    )
    assert login_res.status_code == 200
    session_cookie = login_res.cookies.get("heatshield_session")

    me_res = client.get("/api/v1/auth/me", cookies={"heatshield_session": session_cookie})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["authenticated"] is True
    assert me_data["user"]["role"] == "MUNICIPAL_OFFICER"
    assert "action_plan.view" in me_data["permissions"]

def test_auth_logout_clears_cookie():
    """Test logout clears session cookie and revokes session in DB."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "officer", "password": "Officer@123"}
    )
    session_cookie = login_res.cookies.get("heatshield_session")

    logout_res = client.post("/api/v1/auth/logout", cookies={"heatshield_session": session_cookie})
    assert logout_res.status_code == 200

    # Next attempt with the same cookie must fail
    me_res = client.get("/api/v1/auth/me", cookies={"heatshield_session": session_cookie})
    assert me_res.status_code == 401

def test_citizen_forbidden_on_municipal_interventions():
    """Citizen must be denied access (403) to municipal Heat Action Plan interventions."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "citizen", "password": "Citizen@123"}
    )
    session_cookie = login_res.cookies.get("heatshield_session")

    res = client.get("/api/v1/interventions", cookies={"heatshield_session": session_cookie})
    assert res.status_code == 403

def test_officer_allowed_on_municipal_interventions():
    """Municipal Officer must be allowed access to interventions."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "officer", "password": "Officer@123"}
    )
    session_cookie = login_res.cookies.get("heatshield_session")

    res = client.get("/api/v1/interventions", cookies={"heatshield_session": session_cookie})
    assert res.status_code == 200

def test_officer_forbidden_on_admin_endpoints():
    """Municipal Officer must be denied access (403) to Admin User Management."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "officer", "password": "Officer@123"}
    )
    session_cookie = login_res.cookies.get("heatshield_session")

    res = client.get("/api/v1/admin/users", cookies={"heatshield_session": session_cookie})
    assert res.status_code == 403

def test_admin_allowed_on_admin_endpoints():
    """Admin must be allowed to list users and system health."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@123"}
    )
    session_cookie = login_res.cookies.get("heatshield_session")

    # List users
    users_res = client.get("/api/v1/admin/users", cookies={"heatshield_session": session_cookie})
    assert users_res.status_code == 200
    assert len(users_res.json()["users"]) >= 3

    # System health
    health_res = client.get("/api/v1/admin/system-health", cookies={"heatshield_session": session_cookie})
    assert health_res.status_code == 200
    assert health_res.json()["security"]["active_sessions"] >= 1

    # Audit logs
    audit_res = client.get("/api/v1/admin/audit-logs", cookies={"heatshield_session": session_cookie})
    assert audit_res.status_code == 200

def test_admin_user_management_lifecycle():
    """Test Admin can create a user, update status, and change role."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@123"}
    )
    session_cookie = login_res.cookies.get("heatshield_session")

    # 1. Create a new test user
    import uuid
    new_username = f"test_officer_{uuid.uuid4().hex[:6]}"
    new_phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
    create_res = client.post(
        "/api/v1/admin/users",
        json={
            "username": new_username,
            "full_name": "Test Sub Officer",
            "role": "MUNICIPAL_OFFICER",
            "phone_number": new_phone,
            "email": "test_officer@chennaicorp.gov.in",
            "password": "SecurePassword123"
        },
        cookies={"heatshield_session": session_cookie}
    )
    assert create_res.status_code == 201
    user_id = create_res.json()["user_id"]

    # 2. Login as new user
    new_login = client.post(
        "/api/v1/auth/login",
        json={"username": new_username, "password": "SecurePassword123"}
    )
    assert new_login.status_code == 200
    new_cookie = new_login.cookies.get("heatshield_session")

    # 3. Admin disables user
    disable_res = client.put(
        f"/api/v1/admin/users/{user_id}/status",
        json={"is_active": False},
        cookies={"heatshield_session": session_cookie}
    )
    assert disable_res.status_code == 200
    assert disable_res.json()["is_active"] is False

    # 4. Attempting to use the new user's session now fails because user is inactive
    me_res = client.get("/api/v1/auth/me", cookies={"heatshield_session": new_cookie})
    assert me_res.status_code == 401

    # 5. Admin re-enables user
    enable_res = client.put(
        f"/api/v1/admin/users/{user_id}/status",
        json={"is_active": True},
        cookies={"heatshield_session": session_cookie}
    )
    assert enable_res.status_code == 200

def test_login_with_mobile_number():
    """Test logging in using phone number instead of username."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "+919876543211", "password": "Officer@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "MUNICIPAL_OFFICER"
    assert data["user"]["city"] == "Chennai"
    assert "heatshield_session" in response.cookies

def test_cities_registry_endpoint():
    """Test getting supported cities list (Chennai, Delhi, Ahmedabad, Jaipur, Lucknow)."""
    response = client.get("/api/v1/auth/cities")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    cities = data["data"]
    assert len(cities) >= 5
    city_names = [c["name"] for c in cities]
    assert "Chennai" in city_names
    assert "Delhi (NCR)" in city_names or "Delhi" in [c["city_id"] for c in cities]
    assert "Ahmedabad" in city_names
    assert "Jaipur" in city_names
    assert "Lucknow" in city_names

def test_register_new_user_with_city():
    """Test mobile number registration with name and municipal city jurisdiction."""
    import uuid
    random_digits = str(uuid.uuid4().int)[:8]
    test_mobile = f"+9198{random_digits}"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "phone_number": test_mobile,
            "full_name": "Dr. Ananya Sharma",
            "city": "Ahmedabad",
            "password": "SecurePassword@123",
            "role": "CITIZEN"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["full_name"] == "Dr. Ananya Sharma"
    assert data["user"]["city"] == "Ahmedabad"
    assert "heatshield_session" in response.cookies

