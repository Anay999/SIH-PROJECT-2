"""
WhatsApp OTP Provider Abstraction for HEATSHIELD AI.
Handles login verification OTP messaging strictly decoupled from emergency broadcasts.
Default provider is 100% simulated MockWhatsAppOtpProvider.
Enterprise Meta and Twilio adapters remain inactive unless explicitly configured.
"""
import abc
import uuid
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger("heatshield.whatsapp_otp")

class ProviderSendResult(BaseModel):
    success: bool
    provider: str
    message_id: str
    status: str
    is_mock: bool
    details: Dict[str, Any]

class WhatsAppOtpProvider(abc.ABC):
    """Abstract base class for WhatsApp OTP messaging."""

    @abc.abstractmethod
    async def send_otp(
        self,
        phone_number: str,
        otp_code: str,
        challenge_id: str
    ) -> ProviderSendResult:
        """Dispatches an OTP verification code to the recipient."""
        pass

class MockWhatsAppOtpProvider(WhatsAppOtpProvider):
    """
    100% Simulated Local WhatsApp OTP Provider.
    GUARANTEE: Sends zero external network requests or real messages.
    Generates deterministic mock IDs and logs masked audit records.
    """

    async def send_otp(
        self,
        phone_number: str,
        otp_code: str,
        challenge_id: str
    ) -> ProviderSendResult:
        # Mask phone number for logging: keep country code and last 2 digits
        masked = phone_number[:4] + "****" + phone_number[-2:] if len(phone_number) >= 6 else "****"
        msg_id = f"mock_wa_msg_{uuid.uuid4().hex[:12]}"
        
        logger.info(
            f"[MOCK WHATSAPP OTP] Simulated dispatch to {masked} for challenge {challenge_id}. "
            f"Zero external network calls made. Status: MOCK_DELIVERED."
        )

        return ProviderSendResult(
            success=True,
            provider="mock",
            message_id=msg_id,
            status="MOCK_DELIVERED",
            is_mock=True,
            details={
                "channel": "whatsapp",
                "simulated_delivery_ms": 45,
                "banner": "DEMO MODE · NO REAL WHATSAPP MESSAGE SENT",
            }
        )

class MetaWhatsAppCloudApiProvider(WhatsAppOtpProvider):
    """
    Enterprise Meta WhatsApp Cloud API Adapter (Template-based).
    Strictly disabled by default. Requires explicit credentials and administrator enablement.
    """

    def __init__(self):
        self.enabled = settings.META_WHATSAPP_ENABLED
        self.access_token = settings.META_WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = settings.META_WHATSAPP_PHONE_NUMBER_ID
        self.template_name = settings.META_WHATSAPP_TEMPLATE_NAME
        self.language = settings.META_WHATSAPP_TEMPLATE_LANGUAGE

    async def send_otp(
        self,
        phone_number: str,
        otp_code: str,
        challenge_id: str
    ) -> ProviderSendResult:
        if not (self.enabled and self.access_token and self.phone_number_id):
            logger.warning(
                "[META WHATSAPP] Live provider invoked but configuration incomplete or disabled. "
                "Falling back safely to Mock provider."
            )
            mock = MockWhatsAppOtpProvider()
            return await mock.send_otp(phone_number, otp_code, challenge_id)

        # Implementation for live Meta Cloud API (Prepared adapter)
        # Note: External calls require verified template approval on Meta Business Manager
        try:
            import httpx
            url = f"https://graph.facebook.com/v20.0/{self.phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            }
            payload = {
                "messaging_product": "whatsapp",
                "to": phone_number.replace("+", "").strip(),
                "type": "template",
                "template": {
                    "name": self.template_name,
                    "language": {"code": self.language},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [{"type": "text", "text": otp_code}]
                        },
                        {
                            "type": "button",
                            "sub_type": "url",
                            "index": "0",
                            "parameters": [{"type": "text", "text": otp_code}]
                        }
                    ]
                }
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in [200, 201]:
                    data = res.json()
                    msg_id = data.get("messages", [{}])[0].get("id", f"meta_{uuid.uuid4().hex[:8]}")
                    return ProviderSendResult(
                        success=True,
                        provider="meta_whatsapp",
                        message_id=msg_id,
                        status="QUEUED_META",
                        is_mock=False,
                        details={"http_status": res.status_code}
                    )
                else:
                    logger.error(f"[META WHATSAPP ERROR] HTTP {res.status_code}: {res.text}")
                    # Fallback to mock on error
                    return ProviderSendResult(
                        success=False,
                        provider="meta_whatsapp",
                        message_id="failed",
                        status="PROVIDER_ERROR",
                        is_mock=False,
                        details={"error": res.text}
                    )
        except Exception as exc:
            logger.error(f"[META WHATSAPP EXCEPTION] {exc}")
            return ProviderSendResult(
                success=False,
                provider="meta_whatsapp",
                message_id="error",
                status="PROVIDER_EXCEPTION",
                is_mock=False,
                details={"error": str(exc)}
            )

class TwilioWhatsAppProvider(WhatsAppOtpProvider):
    """
    Twilio WhatsApp Messaging API Adapter.
    Strictly disabled by default. Requires explicit credentials and administrator enablement.
    """

    def __init__(self):
        self.enabled = settings.TWILIO_WHATSAPP_ENABLED
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_WHATSAPP_FROM

    async def send_otp(
        self,
        phone_number: str,
        otp_code: str,
        challenge_id: str
    ) -> ProviderSendResult:
        if not (self.enabled and self.account_sid and self.auth_token and self.from_number):
            logger.warning(
                "[TWILIO WHATSAPP] Live provider invoked but configuration incomplete or disabled. "
                "Falling back safely to Mock provider."
            )
            mock = MockWhatsAppOtpProvider()
            return await mock.send_otp(phone_number, otp_code, challenge_id)

        try:
            import httpx
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
            data = {
                "From": f"whatsapp:{self.from_number}",
                "To": f"whatsapp:{phone_number}",
                "Body": f"Your HEATSHIELD AI verification code is: {otp_code}. Valid for 5 minutes. Do not share.",
            }
            async with httpx.AsyncClient(auth=(self.account_sid, self.auth_token), timeout=10.0) as client:
                res = await client.post(url, data=data)
                if res.status_code in [200, 201]:
                    res_data = res.json()
                    return ProviderSendResult(
                        success=True,
                        provider="twilio",
                        message_id=res_data.get("sid", f"tw_{uuid.uuid4().hex[:8]}"),
                        status="QUEUED_TWILIO",
                        is_mock=False,
                        details={"status": res_data.get("status")}
                    )
                else:
                    return ProviderSendResult(
                        success=False,
                        provider="twilio",
                        message_id="failed",
                        status="PROVIDER_ERROR",
                        is_mock=False,
                        details={"error": res.text}
                    )
        except Exception as exc:
            return ProviderSendResult(
                success=False,
                provider="twilio",
                message_id="error",
                status="PROVIDER_EXCEPTION",
                is_mock=False,
                details={"error": str(exc)}
            )

def get_whatsapp_otp_provider() -> WhatsAppOtpProvider:
    """Factory resolving the active WhatsApp OTP provider based on configuration."""
    provider_type = (settings.WHATSAPP_OTP_PROVIDER or "mock").lower()

    if provider_type == "meta_whatsapp" and settings.META_WHATSAPP_ENABLED:
        return MetaWhatsAppCloudApiProvider()
    elif provider_type == "twilio" and settings.TWILIO_WHATSAPP_ENABLED:
        return TwilioWhatsAppProvider()

    # Default to 100% Mock
    return MockWhatsAppOtpProvider()
