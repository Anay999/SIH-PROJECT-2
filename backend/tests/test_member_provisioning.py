import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import UserRole

client = TestClient(app)

def test_public_registration_blocks_officer_and_admin():
    # Public registration with MUNICIPAL_OFFICER must be rejected
    res_officer = client.post("/api/v1/auth/register", json={
        "phone_number": "+919999900001",
        "full_name": "Rogue Officer Candidate",
        "city": "Chennai",
        "password": "Password@1234",
        "role": "MUNICIPAL_OFFICER"
    })
    assert res_officer.status_code == 403
    assert res_officer.json()["detail"]["code"] == "PUBLIC_REGISTRATION_RESTRICTED"

    # Public registration with ADMIN must be rejected
    res_admin = client.post("/api/v1/auth/register", json={
        "phone_number": "+919999900002",
        "full_name": "Rogue Admin Candidate",
        "city": "Chennai",
        "password": "Password@1234",
        "role": "ADMIN"
    })
    assert res_admin.status_code == 403
    assert res_admin.json()["detail"]["code"] == "PUBLIC_REGISTRATION_RESTRICTED"

def test_admin_can_provision_officer_and_new_admin():
    # 1. Login as primary admin
    admin_login = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "Admin@123"
    })
    assert admin_login.status_code == 200
    assert admin_login.json()["user"]["role"] == "ADMIN"

    # 2. Provision new Municipal Officer
    new_officer_phone = "+919777711111"
    res_off = client.post("/api/v1/admin/users", json={
        "username": "officer_test_unit",
        "full_name": "Unit Test Officer",
        "role": "MUNICIPAL_OFFICER",
        "city": "Chennai",
        "phone_number": new_officer_phone,
        "password": "OfficerTest@123"
    })
    assert res_off.status_code in [201, 400] # 400 if already created in DB

    # 3. Provision new Admin
    new_admin_phone = "+919777722222"
    res_adm = client.post("/api/v1/admin/users", json={
        "username": "admin_test_unit",
        "full_name": "Unit Test Admin",
        "role": "ADMIN",
        "city": "Delhi NCR",
        "phone_number": new_admin_phone,
        "password": "AdminTest@123"
    })
    assert res_adm.status_code in [201, 400]
