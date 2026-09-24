import httpx
import logging
from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.notification.providers.base import BaseNotificationProvider, ProviderResult

logger = logging.getLogger("thermosafe.notifications.sms")

class MSG91SMSProvider(BaseNotificationProvider):
    channel: str = "SMS"
    provider_name: str = "MSG91_INDIA_DLT"

    def __init__(self):
        self.auth_key = settings.MSG91_AUTH_KEY
        self.sender_id = settings.MSG91_SENDER_ID or "THMSAF"
        self.dlt_template_id = settings.MSG91_DLT_TEMPLATE_ID
        self.flow_id = settings.MSG91_FLOW_ID
        self.is_enabled = settings.SMS_ENABLED

    def validate_configuration(self) -> Dict[str, Any]:
        has_auth = bool(self.auth_key and self.auth_key.strip())
        has_flow = bool(self.flow_id and self.flow_id.strip())
        configured = has_auth and has_flow

        return {
            "channel": self.channel,
            "provider": self.provider_name,
            "is_enabled": self.is_enabled,
            "is_configured": configured,
            "missing_fields": [
                f for f, present in [
                    ("MSG91_AUTH_KEY", has_auth),
                    ("MSG91_FLOW_ID", has_flow)
                ] if not present
            ],
            "sender_id": self.sender_id,
            "dlt_template_id": self.dlt_template_id
        }

    def get_health_status(self) -> str:
        cfg = self.validate_configuration()
        if not self.is_enabled:
            return "DEGRADED"
        if not cfg["is_configured"]:
            # If Fast2SMS is configured, check it
            if settings.FAST2SMS_API_KEY and settings.FAST2SMS_API_KEY.strip():
                return "CONNECTED"
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
        Dispatches SMS via MSG91 (DLT Flow) or Fast2SMS fallback, or simulated execution.
        """
        # Clean 10-digit number for Indian gateways
        clean_number = recipient_phone.replace("+91", "").replace("+", "").strip()

        # 1. Try MSG91 if configured
        if self.auth_key and self.flow_id:
            url = "https://control.msg91.com/api/v5/flow/"
            headers = {
                "authkey": self.auth_key,
                "Content-Type": "application/json"
            }
            payload = {
                "template_id": self.flow_id,
                "short_url": "0",
                "recipients": [
                    {
                        "mobiles": f"91{clean_number}",
                        **(variables or {})
                    }
                ]
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    data = resp.json() if resp.status_code == 200 else {}
                    if resp.status_code == 200 and data.get("type") == "success":
                        return ProviderResult(
                            success=True,
                            provider=self.provider_name,
                            message_id=data.get("message"),
                            status="SENT",
                            raw_response=resp.text[:500]
                        )
                    is_retryable = resp.status_code in [429, 500, 502, 503]
                    return ProviderResult(
                        success=False,
                        provider=self.provider_name,
                        status="FAILED",
                        error_code=str(resp.status_code),
                        error_message=data.get("message") or resp.text[:200],
                        is_retryable=is_retryable
                    )
            except Exception as e:
                logger.error(f"MSG91 dispatch network error: {e}")
                return ProviderResult(
                    success=False,
                    provider=self.provider_name,
                    status="FAILED",
                    error_code="NETWORK_EXCEPTION",
                    error_message=str(e),
                    is_retryable=True
                )

        # 2. Try Fast2SMS gateway fallback if present
        if settings.FAST2SMS_API_KEY and settings.FAST2SMS_API_KEY.strip():
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": settings.FAST2SMS_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "route": "q",
                "message": message_text,
                "language": "english",
                "flash": 0,
                "numbers": clean_number
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    data = resp.json() if resp.status_code == 200 else {}
                    success = resp.status_code == 200 and data.get("return") is True
                    if success:
                        return ProviderResult(
                            success=True,
                            provider="FAST2SMS_INDIA",
                            message_id=f"f2s_{clean_number}_{abs(hash(message_text[:15]))}",
                            status="SENT",
                            raw_response=str(data)[:400]
                        )
                    return ProviderResult(
                        success=False,
                        provider="FAST2SMS_INDIA",
                        status="FAILED",
                        error_code="FAST2SMS_REJECTED",
                        error_message=str(data.get("message") or "Gateway error"),
                        is_retryable=resp.status_code in [429, 500, 502]
                    )
            except Exception as e:
                logger.error(f"Fast2SMS dispatch network error: {e}")

        # 3. Safe Simulation for Demo mode
        if settings.DEMO_MODE:
            sim_msg_id = f"sms_sim_{abs(hash(clean_number + message_text[:20]))}"
            logger.info(f"[SIMULATED SMS] Dispatched emergency text to {clean_number[:3]}****{clean_number[-2:]}")
            return ProviderResult(
                success=True,
                provider=self.provider_name,
                message_id=sim_msg_id,
                status="DELIVERED",
                raw_response='{"status": "success", "simulated": true}',
                is_simulated=True
            )

        return ProviderResult(
            success=False,
            provider=self.provider_name,
            status="NOT_CONFIGURED",
            error_code="CREDENTIALS_MISSING",
            error_message="SMS gateway credentials missing (MSG91_AUTH_KEY or FAST2SMS_API_KEY).",
            is_retryable=False
        )
