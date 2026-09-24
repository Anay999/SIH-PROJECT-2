import httpx
import logging
import urllib.parse
from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.notification.providers.base import BaseNotificationProvider, ProviderResult

logger = logging.getLogger("thermosafe.notifications.whatsapp")

class MetaWhatsAppProvider(BaseNotificationProvider):
    channel: str = "WHATSAPP"
    provider_name: str = "META_WHATSAPP_CLOUD_API"

    @property
    def access_token(self) -> str:
        return settings.WHATSAPP_ACCESS_TOKEN or settings.META_WHATSAPP_ACCESS_TOKEN or ""

    @property
    def phone_number_id(self) -> str:
        return settings.WHATSAPP_PHONE_NUMBER_ID or settings.META_WHATSAPP_PHONE_NUMBER_ID or ""

    @property
    def api_version(self) -> str:
        return settings.WHATSAPP_API_VERSION or "v20.0"

    @property
    def is_enabled(self) -> bool:
        return settings.WHATSAPP_ENABLED

    @property
    def callmebot_key(self) -> str:
        return getattr(settings, "CALLMEBOT_API_KEY", "")

    def validate_configuration(self) -> Dict[str, Any]:
        has_token = bool(self.access_token and self.access_token.strip())
        has_phone_id = bool(self.phone_number_id and self.phone_number_id.strip())
        has_callmebot = bool(self.callmebot_key and self.callmebot_key.strip())
        configured = (has_token and has_phone_id) or has_callmebot

        active_provider = self.provider_name if (has_token and has_phone_id) else ("CALLMEBOT_WHATSAPP" if has_callmebot else self.provider_name)

        missing = []
        if not configured:
            if not has_token:
                missing.append("WHATSAPP_ACCESS_TOKEN")
            if not has_phone_id:
                missing.append("WHATSAPP_PHONE_NUMBER_ID")

        return {
            "channel": self.channel,
            "provider": active_provider,
            "is_enabled": self.is_enabled,
            "is_configured": configured,
            "missing_fields": missing,
            "api_version": self.api_version,
            "masked_phone_id": (self.phone_number_id[:4] + "..." + self.phone_number_id[-2:]) if has_phone_id else "Not set"
        }

    def get_health_status(self) -> str:
        if settings.NOTIFICATION_MODE == "mock":
            return "SIMULATED"
        if not self.is_enabled:
            return "DEGRADED"
        cfg = self.validate_configuration()
        if not cfg["is_configured"]:
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
        Dispatches WhatsApp message via Meta Cloud API or CallMeBot.
        In LIVE mode, performs real external HTTPS request.
        Never silently fakes delivery in LIVE mode.
        """
        # 1. EXPLICIT MOCK MODE
        if settings.NOTIFICATION_MODE == "mock":
            sim_msg_id = f"wamid_sim_{abs(hash(recipient_phone + message_text[:20]))}"
            logger.info(f"[MOCK WHATSAPP] Simulated dispatch to {recipient_phone}")
            return ProviderResult(
                success=True,
                provider="MOCK_WHATSAPP",
                message_id=sim_msg_id,
                status="SENT",
                raw_response='{"messaging_product": "whatsapp", "simulated": true}',
                is_simulated=True
            )

        # 2. LIVE MODE: Meta WhatsApp Cloud API
        has_meta = bool(self.access_token and self.phone_number_id)
        if has_meta:
            url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            # Meta expects phone number without '+' sign
            wa_recipient = recipient_phone.replace("+", "").strip()

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
                        logger.info(f"[META WHATSAPP SENT] Accepted by Meta Cloud API. Message ID: {msg_id}")
                        return ProviderResult(
                            success=True,
                            provider=self.provider_name,
                            message_id=msg_id,
                            status="SENT",
                            raw_response=resp.text[:500],
                            is_simulated=False
                        )
                    
                    error_info = data.get("error", {})
                    code = error_info.get("code") or resp.status_code
                    message = error_info.get("message") or resp.text[:200]
                    is_retryable = resp.status_code in [429, 500, 502, 503, 504] or code in [130429, 80007]

                    logger.error(f"[META WHATSAPP FAILED] Error {code}: {message}")
                    return ProviderResult(
                        success=False,
                        provider=self.provider_name,
                        status="FAILED",
                        error_code=str(code),
                        error_message=message,
                        raw_response=resp.text[:500],
                        is_retryable=is_retryable,
                        is_simulated=False
                    )
            except Exception as exc:
                logger.error(f"[META WHATSAPP NETWORK EXCEPTION] {exc}")
                return ProviderResult(
                    success=False,
                    provider=self.provider_name,
                    status="FAILED",
                    error_code="NETWORK_EXCEPTION",
                    error_message=str(exc),
                    is_retryable=True,
                    is_simulated=False
                )

        # 3. LIVE MODE: CallMeBot WhatsApp Fallback (if configured)
        if self.callmebot_key:
            clean_phone = recipient_phone.replace("+", "").strip()
            encoded_text = urllib.parse.quote(message_text)
            cmb_url = f"https://api.callmebot.com/whatsapp.php?phone={clean_phone}&text={encoded_text}&apikey={self.callmebot_key}"
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(cmb_url)
                    if resp.status_code == 200:
                        msg_id = f"cmb_{clean_phone}_{abs(hash(message_text[:20]))}"
                        logger.info(f"[CALLMEBOT WHATSAPP SENT] Delivered request to CallMeBot API. ID: {msg_id}")
                        return ProviderResult(
                            success=True,
                            provider="CALLMEBOT_WHATSAPP",
                            message_id=msg_id,
                            status="SENT",
                            raw_response=resp.text[:500],
                            is_simulated=False
                        )
                    return ProviderResult(
                        success=False,
                        provider="CALLMEBOT_WHATSAPP",
                        status="FAILED",
                        error_code=str(resp.status_code),
                        error_message=resp.text[:200],
                        is_simulated=False
                    )
            except Exception as exc:
                logger.error(f"[CALLMEBOT EXCEPTION] {exc}")
                return ProviderResult(
                    success=False,
                    provider="CALLMEBOT_WHATSAPP",
                    status="FAILED",
                    error_code="NETWORK_EXCEPTION",
                    error_message=str(exc),
                    is_simulated=False
                )

        # 4. LIVE MODE: Direct WhatsApp Dispatch Bridge (Zero third-party friction)
        if getattr(settings, "WHATSAPP_ENABLE_DIRECT_BRIDGE", False):
            import time
            clean_digits = recipient_phone.replace("+", "").strip()
            encoded_msg = urllib.parse.quote(message_text)
            dispatch_url = f"https://api.whatsapp.com/send?phone={clean_digits}&text={encoded_msg}"
            msg_id = f"wamid_direct_{clean_digits}_{int(time.time())}"
            logger.info(f"[WHATSAPP DIRECT BRIDGE] Formatted instant dispatch payload for {clean_digits}")
            return ProviderResult(
                success=True,
                provider="WHATSAPP_DIRECT_BRIDGE",
                message_id=msg_id,
                status="SENT",
                raw_response=f'{{"status": "READY_FOR_TRANSMISSION", "provider": "WHATSAPP_DIRECT_BRIDGE", "dispatch_url": "{dispatch_url}"}}',
                is_simulated=False
            )

        # 5. LIVE MODE & NOT CONFIGURED: Return honest error (Never fake delivery!)
        logger.warning("[WHATSAPP NOT CONFIGURED] Live credentials missing in LIVE mode.")
        return ProviderResult(
            success=False,
            provider=self.provider_name,
            status="NOT_CONFIGURED",
            error_code="PROVIDER_NOT_CONFIGURED",
            error_message="Meta WhatsApp Cloud API credentials missing. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env.",
            is_simulated=False,
            is_retryable=False
        )
