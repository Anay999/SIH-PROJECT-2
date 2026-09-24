import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.alert_intervention import Alert
from app.models.notifications import NotificationPreference, NotificationJob, NotificationDelivery
from app.services.notification.message_builder import AlertMessageBuilder
from app.services.notification.renderers.whatsapp_renderer import WhatsAppRenderer
from app.services.notification.renderers.sms_renderer import SMSRenderer
from app.services.notification.recipient_resolver import RecipientResolver, normalize_phone, mask_phone_number
from app.services.notification.orchestrator import NotificationOrchestrator

client = TestClient(app)

def test_phone_normalization_and_masking():
    assert normalize_phone("9876543210") == "+919876543210"
    assert normalize_phone("+919876543210") == "+919876543210"
    assert normalize_phone("+91 98765 43210") == "+919876543210"
    assert normalize_phone("invalid-phone") is None
    assert mask_phone_number("+919876543210") == "+91 ******3210"

def test_canonical_message_and_renderers():
    db = SessionLocal()
    try:
        alert = db.query(Alert).first()
        if not alert:
            pytest.skip("No alert in DB to test canonical builder")

        msg = AlertMessageBuilder.build(db, alert)
        assert msg.alert_id == alert.id
        assert msg.severity in ["EXTREME", "VERY_HIGH", "HIGH", "MODERATE"]
        assert len(msg.affected_wards) > 0

        wa_rendered = WhatsAppRenderer.render(msg, "Officer Kumar")
        sms_rendered = SMSRenderer.render(msg)

        # Both channels must share identical key facts and alert ID
        assert alert.id in wa_rendered
        assert alert.id in sms_rendered
        assert msg.severity in wa_rendered
        assert msg.severity in sms_rendered
        assert f"{msg.htsi:.2f}" in wa_rendered
        assert f"{msg.htsi:.2f}" in sms_rendered
    finally:
        db.close()

def test_recipient_resolution():
    db = SessionLocal()
    try:
        alert = db.query(Alert).first()
        if not alert:
            pytest.skip("No alert in DB")

        recipients = RecipientResolver.resolve_recipients(db, alert.id)
        assert "whatsapp" in recipients
        assert "sms" in recipients
        # All resolved recipients must have normalized phone and valid names
        for r in recipients["whatsapp"] + recipients["sms"]:
            assert r.phone_number.startswith("+")
            assert len(r.phone_number) >= 12
    finally:
        db.close()

@pytest.mark.asyncio
async def test_notification_orchestrator_and_idempotency():
    db = SessionLocal()
    try:
        alert = db.query(Alert).first()
        if not alert:
            pytest.skip("No alert in DB")

        # 1. Dispatch
        res = await NotificationOrchestrator.dispatch_alert(db, alert.id, actor_id="TEST_RUNNER", force=True)
        assert res["success"] is True
        assert res["alert_id"] == alert.id
        assert "whatsapp" in res
        assert "sms" in res

        # 2. Idempotency test (triggering again without force within dedup window)
        res_dedup = await NotificationOrchestrator.dispatch_alert(db, alert.id, actor_id="TEST_RUNNER", force=False)
        assert res_dedup["success"] is True
        assert res_dedup.get("deduplicated") is True
    finally:
        db.close()

def test_dashboard_notification_operations_endpoint():
    resp = client.get("/api/dashboard/notification-operations")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "active_alerts" in data
    assert "eligible_recipients" in data
    assert "whatsapp" in data
    assert "sms" in data
    assert "delivered" in data["whatsapp"]
    assert "delivered" in data["sms"]
    assert "provider_health" in data

def test_notification_center_overview_and_logs():
    # Login as admin or officer
    auth_resp = client.post("/api/auth/login", json={"username": "officer_chennai", "password": "Password123!"})
    token = None
    if auth_resp.status_code == 200:
        token = auth_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 1. Overview
    overview_resp = client.get("/api/notifications/overview", headers=headers)
    assert overview_resp.status_code == 200
    ov_data = overview_resp.json()["data"]
    assert "total_recipients" in ov_data
    assert "whatsapp" in ov_data
    assert "sms" in ov_data

    # 2. Logs
    logs_resp = client.get("/api/notifications/logs", headers=headers)
    assert logs_resp.status_code == 200
    logs_data = logs_resp.json()["data"]
    assert "logs" in logs_data

def test_live_mode_diagnostics_and_phone_validation(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "NOTIFICATION_MODE", "live")
    monkeypatch.setattr(settings, "WHATSAPP_ACCESS_TOKEN", None)
    monkeypatch.setattr(settings, "WHATSAPP_PHONE_NUMBER_ID", None)
    monkeypatch.setattr(settings, "CALLMEBOT_API_KEY", "")
    monkeypatch.setattr(settings, "MSG91_AUTH_KEY", None)
    monkeypatch.setattr(settings, "FAST2SMS_API_KEY", "")
    monkeypatch.setattr(settings, "INFOBIP_API_KEY", "")
    monkeypatch.setattr(settings, "WHATSAPP_ENABLE_DIRECT_BRIDGE", False)

    # Login as officer
    auth_resp = client.post("/api/auth/login", json={"username": "officer", "password": "Officer@123"})
    assert auth_resp.status_code == 200
    token = auth_resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 1. Non-Indian or malformed phone numbers must be rejected with 400
    bad_resp = client.post("/api/notifications/test", json={
        "recipient_phone": "+1234567890",
        "channel": "BOTH"
    }, headers=headers)
    assert bad_resp.status_code == 400
    assert "Indian mobile" in bad_resp.json()["detail"]

    # 2. Valid 10-digit Indian phone (e.g. 8838930577) in LIVE mode with unconfigured credentials
    test_resp = client.post("/api/notifications/test", json={
        "recipient_phone": "8838930577",
        "channel": "BOTH",
        "ward": "Ward 14 (Royapettah)",
        "severity": "EXTREME",
        "custom_message": "THERMOSAFE AI Live Test Dispatch"
    }, headers=headers)
    assert test_resp.status_code == 200
    resp_data = test_resp.json()["data"]
    assert resp_data["mode"] == "live"
    assert resp_data["is_simulated"] is False
    assert resp_data["raw_recipient"] == "+918838930577"
    
    # WhatsApp should honestly report NOT_CONFIGURED without faking delivery or generating wamid_sim
    wa_result = resp_data["results"]["whatsapp"]
    assert wa_result["is_simulated"] is False
    assert wa_result["status"] == "NOT_CONFIGURED"
    assert wa_result["success"] is False
    assert wa_result["message_id"] is None or not wa_result["message_id"].startswith("wamid_sim")

    # SMS should honestly report NOT_CONFIGURED without faking delivery or generating sms_sim
    sms_result = resp_data["results"]["sms"]
    assert sms_result["is_simulated"] is False
    assert sms_result["status"] == "NOT_CONFIGURED"
    assert sms_result["success"] is False
    assert sms_result["message_id"] is None or not sms_result["message_id"].startswith("sms_sim")

    # 3. Delivery logs must contain this test record
    logs_resp = client.get("/api/notifications/logs", headers=headers)
    assert logs_resp.status_code == 200
    logs = logs_resp.json()["data"]["logs"]
    assert len(logs) > 0
    top_log = logs[0]
    assert "+91" in top_log["recipient_phone_masked"]
