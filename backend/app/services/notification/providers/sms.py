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
        self.fast2sms_key = getattr(settings, "FAST2SMS_API_KEY", "")
        self.infobip_key = getattr(settings, "INFOBIP_API_KEY", "")
        self.infobip_base_url = getattr(settings, "INFOBIP_BASE_URL", "https://api.infobip.com")
        self.infobip_sender_id = getattr(settings, "INFOBIP_SENDER_ID", "InfoSMS")

    def validate_configuration(self) -> Dict[str, Any]:
        has_msg91 = bool(self.auth_key and self.flow_id)
        has_infobip = bool(self.infobip_key and self.infobip_key.strip())
        has_fast2sms = bool(self.fast2sms_key and self.fast2sms_key.strip())
        configured = has_msg91 or has_infobip or has_fast2sms

        active_provider = (
            self.provider_name if has_msg91
            else ("INFOBIP_SMS" if has_infobip
            else ("FAST2SMS_INDIA" if has_fast2sms
            else self.provider_name))
        )

        missing = []
        if not configured:
            if not self.auth_key:
                missing.append("MSG91_AUTH_KEY")
            if not self.flow_id:
                missing.append("MSG91_FLOW_ID")

        return {
            "channel": self.channel,
            "provider": active_provider,
            "is_enabled": self.is_enabled,
            "is_configured": configured,
            "missing_fields": missing,
            "sender_id": self.sender_id,
            "dlt_template_id": self.dlt_template_id
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
        Dispatches SMS via MSG91 (DLT Flow) or Fast2SMS.
        In LIVE mode, performs real external HTTPS request.
        Never silently fakes delivery in LIVE mode.
        """
        # Clean strictly 10-digit number for Indian gateways
        clean_number = recipient_phone.replace("+91", "").replace("+", "").strip()

        # 1. EXPLICIT MOCK MODE
        if settings.NOTIFICATION_MODE == "mock":
            sim_msg_id = f"sms_sim_{abs(hash(clean_number + message_text[:20]))}"
            logger.info(f"[MOCK SMS] Simulated text dispatch to {clean_number}")
            return ProviderResult(
                success=True,
                provider="MOCK_SMS",
                message_id=sim_msg_id,
                status="SENT",
                raw_response='{"status": "success", "simulated": true}',
                is_simulated=True
            )

        # 2. LIVE MODE: Infobip SMS Gateway (Global CPaaS with Indian Route Support)
        if self.infobip_key and self.infobip_key.strip():
            url = f"{self.infobip_base_url.rstrip('/')}/sms/2/text/advanced"
            headers = {
                "Authorization": f"App {self.infobip_key.strip()}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            # Infobip expects country code without + sign (e.g. 918838930577)
            clean_digits = recipient_phone.replace("+", "").strip()
            payload = {
                "messages": [
                    {
                        "destinations": [{"to": clean_digits}],
                        "from": self.infobip_sender_id or "InfoSMS",
                        "text": message_text
                    }
                ]
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    try:
                        data = resp.json()
                    except Exception:
                        data = {}
                    
                    if resp.status_code in [200, 201] and "messages" in data and len(data["messages"]) > 0:
                        msg_info = data["messages"][0]
                        msg_id = str(msg_info.get("messageId") or f"ib_{clean_digits}")
                        status_obj = msg_info.get("status", {})
                        status_name = status_obj.get("name", "PENDING_ACCEPTED")
                        logger.info(f"[INFOBIP SENT] Accepted by Infobip Gateway. Message ID: {msg_id}, Status: {status_name}")
                        return ProviderResult(
                            success=True,
                            provider="INFOBIP_SMS",
                            message_id=msg_id,
                            status="SENT",
                            raw_response=str(data)[:400],
                            is_simulated=False
                        )
                    
                    err_msg = ""
                    if isinstance(data, dict):
                        m = data.get("requestError", {}).get("serviceException", {}).get("text") or data.get("message")
                        err_msg = str(m or "")
                    if not err_msg:
                        err_msg = resp.text[:200] or "Infobip Gateway error"
                    logger.error(f"[INFOBIP FAILED] {resp.status_code}: {err_msg}")
                    return ProviderResult(
                        success=False,
                        provider="INFOBIP_SMS",
                        status="FAILED",
                        error_code="INFOBIP_REJECTED",
                        error_message=err_msg,
                        is_retryable=resp.status_code in [429, 500, 502],
                        is_simulated=False
                    )
            except Exception as e:
                logger.error(f"[INFOBIP EXCEPTION] {e}")
                return ProviderResult(
                    success=False,
                    provider="INFOBIP_SMS",
                    status="FAILED",
                    error_code="NETWORK_EXCEPTION",
                    error_message=str(e),
                    is_retryable=True,
                    is_simulated=False
                )

        # 3. LIVE MODE: MSG91 SMS Gateway (Primary Indian DLT provider)
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
                        msg_id = str(data.get("message"))
                        logger.info(f"[MSG91 SENT] Accepted by MSG91 Gateway. Message ID: {msg_id}")
                        return ProviderResult(
                            success=True,
                            provider=self.provider_name,
                            message_id=msg_id,
                            status="SENT",
                            raw_response=resp.text[:500],
                            is_simulated=False
                        )
                    is_retryable = resp.status_code in [429, 500, 502, 503]
                    logger.error(f"[MSG91 FAILED] Status {resp.status_code}: {resp.text[:200]}")
                    return ProviderResult(
                        success=False,
                        provider=self.provider_name,
                        status="FAILED",
                        error_code=str(resp.status_code),
                        error_message=data.get("message") or resp.text[:200],
                        is_retryable=is_retryable,
                        is_simulated=False
                    )
            except Exception as e:
                logger.error(f"[MSG91 NETWORK EXCEPTION] {e}")
                return ProviderResult(
                    success=False,
                    provider=self.provider_name,
                    status="FAILED",
                    error_code="NETWORK_EXCEPTION",
                    error_message=str(e),
                    is_retryable=True,
                    is_simulated=False
                )

        # 3. LIVE MODE: Fast2SMS Gateway Fallback (if configured)
        if self.fast2sms_key and self.fast2sms_key.strip():
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": self.fast2sms_key,
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
                    try:
                        data = resp.json()
                    except Exception:
                        data = {}
                    success = resp.status_code == 200 and data.get("return") is True
                    if success:
                        msg_id = str(data.get("request_id") or f"f2s_{clean_number}_{abs(hash(message_text[:15]))}")
                        logger.info(f"[FAST2SMS SENT] Accepted by Fast2SMS Gateway. Request ID: {msg_id}")
                        return ProviderResult(
                            success=True,
                            provider="FAST2SMS_INDIA",
                            message_id=msg_id,
                            status="SENT",
                            raw_response=str(data)[:400],
                            is_simulated=False
                        )
                    err_msg = ""
                    if isinstance(data, dict):
                        m = data.get("message")
                        err_msg = "; ".join(m) if isinstance(m, list) else str(m or "")
                    if not err_msg:
                        err_msg = resp.text[:200] or "Gateway error"
                    logger.error(f"[FAST2SMS FAILED] {resp.status_code}: {err_msg}")
                    return ProviderResult(
                        success=False,
                        provider="FAST2SMS_INDIA",
                        status="FAILED",
                        error_code="FAST2SMS_REJECTED",
                        error_message=err_msg,
                        is_retryable=resp.status_code in [429, 500, 502],
                        is_simulated=False
                    )
            except Exception as e:
                logger.error(f"[FAST2SMS EXCEPTION] {e}")
                return ProviderResult(
                    success=False,
                    provider="FAST2SMS_INDIA",
                    status="FAILED",
                    error_code="NETWORK_EXCEPTION",
                    error_message=str(e),
                    is_retryable=True,
                    is_simulated=False
                )

        # 4. LIVE MODE & NOT CONFIGURED: Return honest error (Never fake delivery!)
        logger.warning("[SMS NOT CONFIGURED] Live credentials missing in LIVE mode.")
        return ProviderResult(
            success=False,
            provider=self.provider_name,
            status="NOT_CONFIGURED",
            error_code="PROVIDER_NOT_CONFIGURED",
            error_message="SMS gateway credentials missing. Please set INFOBIP_API_KEY, MSG91_AUTH_KEY, or FAST2SMS_API_KEY in backend/.env.",
            is_simulated=False,
            is_retryable=False
        )
