import httpx
import logging
from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.notification.providers.base import BaseNotificationProvider, ProviderResult

logger = logging.getLogger("thermosafe.notifications.whatsapp")

class MetaWhatsAppProvider(BaseNotificationProvider):
    channel: str = "WHATSAPP"
    provider_name: str = "META_WHATSAPP_CLOUD_API"

    def __init__(self):
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN or settings.META_WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID or settings.META_WHATSAPP_PHONE_NUMBER_ID
        self.api_version = settings.WHATSAPP_API_VERSION or "v20.0"
        self.is_enabled = settings.WHATSAPP_ENABLED

    def validate_configuration(self) -> Dict[str, Any]:
        has_token = bool(self.access_token and self.access_token.strip())
        has_phone_id = bool(self.phone_number_id and self.phone_number_id.strip())
        configured = has_token and has_phone_id

        return {
            "channel": self.channel,
            "provider": self.provider_name,
            "is_enabled": self.is_enabled,
            "is_configured": configured,
            "missing_fields": [
                f for f, present in [
                    ("WHATSAPP_ACCESS_TOKEN", has_token),
                    ("WHATSAPP_PHONE_NUMBER_ID", has_phone_id)
                ] if not present
            ],
            "api_version": self.api_version,
            "masked_phone_id": (self.phone_number_id[:4] + "..." + self.phone_number_id[-2:]) if has_phone_id else "Not set"
        }

    def get_health_status(self) -> str:
        cfg = self.validate_configuration()
        if not self.is_enabled:
            return "DEGRADED"
        if not cfg["is_configured"]:
            if settings.DEMO_MODE:
                return "SIMULATED"
            return "NOT_CONFIGURED"
        return "CONNECTED"

    async def send_message(
        self,
        recipient_phone: str,
        message_text: str,
        template_name: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
        priority: str = "HIGH"
    ) -> ProviderResult:
        """
        Dispatches WhatsApp message via Meta Cloud API or enters graceful demonstration mode.
        Phone is normalized (+91...).
        """
        cfg = self.validate_configuration()

        # If live credentials are missing
        if not cfg["is_configured"]:
            if settings.DEMO_MODE:
                # High-fidelity simulated dispatch
                sim_msg_id = f"wamid_sim_{abs(hash(recipient_phone + message_text[:20]))}"
                logger.info(f"[SIMULATED WHATSAPP] Dispatched alert to {recipient_phone[:4]}****{recipient_phone[-2:]}")
                return ProviderResult(
                    success=True,
                    provider=self.provider_name,
                    message_id=sim_msg_id,
                    status="DELIVERED",
                    raw_response='{"messaging_product": "whatsapp", "simulated": true}',
                    is_simulated=True
                )
            return ProviderResult(
                success=False,
                provider=self.provider_name,
                status="NOT_CONFIGURED",
                error_code="CREDENTIALS_MISSING",
                error_message="Meta WhatsApp Cloud API credentials missing (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID).",
                is_retryable=False
            )

        # Live Meta WhatsApp Cloud API endpoint
        url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        # Meta expects phone number without '+' sign
        wa_recipient = recipient_phone.replace("+", "").strip()

        # If an approved template is specified
        if template_name:
            payload: Dict[str, Any] = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": wa_recipient,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "en_US"},
                    "components": []
                }
            }
            if variables:
                body_params = [{"type": "text", "text": str(v)} for v in variables.values()]
                payload["template"]["components"].append({
                    "type": "body",
                    "parameters": body_params
                })
        else:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": wa_recipient,
                "type": "text",
                "text": {"preview_url": True, "body": message_text}
            }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                data = resp.json() if resp.status_code in [200, 201] else {}
                
                if resp.status_code in [200, 201] and "messages" in data:
                    msg_id = data["messages"][0]["id"]
                    return ProviderResult(
                        success=True,
                        provider=self.provider_name,
                        message_id=msg_id,
                        status="SENT",
                        raw_response=resp.text[:500]
                    )
                
                # Check for rate limiting / transient errors
                error_info = data.get("error", {})
                code = error_info.get("code") or resp.status_code
                message = error_info.get("message") or resp.text[:200]
                is_retryable = resp.status_code in [429, 500, 502, 503, 504] or code in [130429, 80007]

                return ProviderResult(
                    success=False,
                    provider=self.provider_name,
                    status="FAILED",
                    error_code=str(code),
                    error_message=message,
                    raw_response=resp.text[:500],
                    is_retryable=is_retryable
                )
        except Exception as exc:
            logger.error(f"Meta WhatsApp dispatch network error: {exc}")
            return ProviderResult(
                success=False,
                provider=self.provider_name,
                status="FAILED",
                error_code="NETWORK_EXCEPTION",
                error_message=str(exc),
                is_retryable=True
            )
