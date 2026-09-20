import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.otp import OtpChallenge, OtpStatus, AuthSession
from app.models.audit import AuditLog
from app.core.otp_service import hash_phone_number, hash_otp

client = TestClient(app)

SYNTHETIC_TEST_PHONE = "+919000000001"
SYNTHETIC_TEST_PHONE_2 = "+919000000002"

@pytest.fixture(autouse=True)
def clean_otp_tables():
    db = SessionLocal()
    db.query(OtpChallenge).delete()
    db.query(AuthSession).delete()
    db.commit()
    db.close()
    yield

def test_otp_request_success():
    payload = {"phone_number": SYNTHETIC_TEST_PHONE, "channel": "whatsapp"}
    res = client.post("/api/v1/auth/otp/request", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    assert "challenge_id" in data
    assert data["channel"] == "whatsapp"
    assert data["mode"] == "MOCK"
    assert data["phone_masked"].startswith("+91")
    assert "****" in data["phone_masked"]
    # In test environment with loopback, demo_otp is provided for testing
    assert data["demo_otp"] is not None
    assert len(data["demo_otp"]) == 6

def test_otp_request_invalid_phone():
    payload = {"phone_number": "invalid_number_123", "channel": "whatsapp"}
    res = client.post("/api/v1/auth/otp/request", json=payload)
    assert res.status_code == 400

def test_otp_verify_success_and_default_viewer_role():
    # 1. Request OTP
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": SYNTHETIC_TEST_PHONE})
    assert req_res.status_code == 200
    req_data = req_res.json()["data"]
    challenge_id = req_data["challenge_id"]
    demo_otp = req_data["demo_otp"]

    # 2. Verify with valid OTP
    verify_payload = {"challenge_id": challenge_id, "otp": demo_otp}
    verify_res = client.post("/api/v1/auth/otp/verify", json=verify_payload)
    assert verify_res.status_code == 200
    v_data = verify_res.json()["data"]
    assert v_data["authenticated"] is True
    assert v_data["role"] == "VIEWER" # New user strictly defaults to VIEWER
    assert "session_id" in v_data
    assert "session_token" in v_data

    # 3. Check DB that challenge is marked CONSUMED
    db: Session = SessionLocal()
    ch = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == challenge_id).first()
    assert ch.status == OtpStatus.CONSUMED.value
    assert ch.consumed_at_utc is not None
    db.close()

def test_otp_verify_wrong_code_and_lockout():
    # 1. Request OTP
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": SYNTHETIC_TEST_PHONE_2})
    req_data = req_res.json()["data"]
    challenge_id = req_data["challenge_id"]

    # 2. Attempt 4 wrong codes
    for attempt in range(1, 5):
        res = client.post("/api/v1/auth/otp/verify", json={"challenge_id": challenge_id, "otp": "000000"})
        assert res.status_code == 400
        assert f"{5 - attempt} attempts remaining" in res.json()["detail"]["message"]

    # 3. 5th wrong code triggers lockout
    lock_res = client.post("/api/v1/auth/otp/verify", json={"challenge_id": challenge_id, "otp": "000000"})
    assert lock_res.status_code == 400
    assert "Challenge locked" in lock_res.json()["detail"]["message"]

    # 4. Check DB status
    db: Session = SessionLocal()
    ch = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == challenge_id).first()
    assert ch.status == OtpStatus.LOCKED.value
    assert ch.failed_attempts >= 5
    db.close()

def test_otp_single_use_enforcement():
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": "+919000000003"})
    req_data = req_res.json()["data"]
    challenge_id = req_data["challenge_id"]
    demo_otp = req_data["demo_otp"]

    # First verification succeeds
    v1 = client.post("/api/v1/auth/otp/verify", json={"challenge_id": challenge_id, "otp": demo_otp})
    assert v1.status_code == 200

    # Second verification fails
    v2 = client.post("/api/v1/auth/otp/verify", json={"challenge_id": challenge_id, "otp": demo_otp})
    assert v2.status_code == 400
    assert "already been verified" in v2.json()["detail"]["message"]

def test_otp_expiry_enforcement():
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": "+919000000004"})
    challenge_id = req_res.json()["data"]["challenge_id"]
    demo_otp = req_res.json()["data"]["demo_otp"]

    # Manually backdate expiry in DB
    db: Session = SessionLocal()
    ch = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == challenge_id).first()
    ch.expires_at_utc = datetime.now(timezone.utc) - timedelta(minutes=10)
    db.commit()
    db.close()

    # Attempt verification after expiry
    res = client.post("/api/v1/auth/otp/verify", json={"challenge_id": challenge_id, "otp": demo_otp})
    assert res.status_code == 400
    assert "expired" in res.json()["detail"]["message"].lower()

def test_otp_resend_cooldown():
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": "+919000000005"})
    challenge_id = req_res.json()["data"]["challenge_id"]

    # Immediate resend fails due to 60s cooldown
    resend_res = client.post("/api/v1/auth/otp/resend", json={"challenge_id": challenge_id})
    assert resend_res.status_code == 400
    assert "Please wait" in resend_res.json()["detail"]["message"]

def test_raw_otp_never_stored_in_database():
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": "+919000000006"})
    challenge_id = req_res.json()["data"]["challenge_id"]
    demo_otp = req_res.json()["data"]["demo_otp"]

    db: Session = SessionLocal()
    ch = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == challenge_id).first()
    # Ensure database contains a 64-char hex hash and NOT the 6-digit raw OTP
    assert ch.otp_hash != demo_otp
    assert len(ch.otp_hash) == 64
    assert demo_otp not in ch.otp_hash
    db.close()

def test_production_mode_omits_demo_otp(monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": "+919000000007"})
    assert req_res.status_code == 200
    data = req_res.json()["data"]
    # In production, demo_otp MUST BE NONE
    assert data["demo_otp"] is None
    assert data["demo_helper_active"] is False

def test_session_lifecycle_and_logout():
    # 1. Request and verify
    req_res = client.post("/api/v1/auth/otp/request", json={"phone_number": "+919000000008"})
    req_data = req_res.json()["data"]
    v_res = client.post("/api/v1/auth/otp/verify", json={
        "challenge_id": req_data["challenge_id"],
        "otp": req_data["demo_otp"]
    })
    session_id = v_res.json()["data"]["session_id"]

    # 2. Check active session
    sess_res = client.get(f"/api/v1/auth/session?session_id={session_id}")
    assert sess_res.status_code == 200
    assert sess_res.json()["data"]["authenticated"] is True

    # 3. Logout
    logout_res = client.post("/api/v1/auth/logout", json={"session_id": session_id})
    assert logout_res.status_code == 200
    assert logout_res.json()["data"]["revoked"] is True

    # 4. Check session after logout
    sess_after = client.get(f"/api/v1/auth/session?session_id={session_id}")
    assert sess_after.status_code == 200
    assert sess_after.json()["data"]["authenticated"] is False

def test_repeated_phone_rate_limiting():
    phone = "+919000000099"
    # Send up to OTP_MAX_REQUESTS_PER_HOUR (5)
    for _ in range(settings.OTP_MAX_REQUESTS_PER_HOUR):
        res = client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
        assert res.status_code == 200

    # 6th request must be blocked with HTTP 429
    blocked_res = client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    assert blocked_res.status_code == 429
    assert "Too many verification requests" in blocked_res.json()["detail"]["message"]

def test_auth_audit_records_persisted():
    client.post("/api/v1/auth/otp/request", json={"phone_number": "+919000000010"})
    db: Session = SessionLocal()
    audits = db.query(AuditLog).filter(
        AuditLog.action.in_(["OTP_REQUESTED", "OTP_VERIFICATION_SUCCESS", "LOGOUT"])
    ).all()
    assert len(audits) >= 1
    actions = [a.action for a in audits]
    assert "OTP_REQUESTED" in actions
    db.close()
