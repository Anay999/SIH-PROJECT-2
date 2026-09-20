import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any

class MockNotificationProvider:
    """
    100% simulated, local mock broadcast provider for municipal disaster response demonstration.
    Strictly isolated: does NOT make external network requests or send real communications.
    """
    DISCLAIMER = "DEMO MODE · NO REAL MESSAGES SENT"

    @classmethod
    async def send_message(
        cls,
        channel: str, # "sms" | "whatsapp" | "in_app"
        audience: str,
        headline: str,
        body: str,
        ward_name: str,
        recipients_count_estimate: int = 42500
    ) -> Dict[str, Any]:
        """Simulates asynchronous queueing, dispatch, and delivery."""
        msg_id = f"mock_msg_{uuid.uuid4().hex[:12]}"
        now_utc = datetime.now(timezone.utc)
        
        # Simulated local processing delay (100ms)
        await asyncio.sleep(0.1)

        return {
            "mock_message_id": msg_id,
            "channel": channel.lower(),
            "audience": audience,
            "ward_name": ward_name,
            "recipients_count_estimate": recipients_count_estimate,
            "payload_preview": {
                "headline": f"[GCC HEATSHIELD ALERT] {headline}",
                "body": body,
                "advisory": "Drink water frequently. Seek nearest municipal cooling center if feeling dizzy.",
                "disclaimer": cls.DISCLAIMER
            },
            "simulated_delay_ms": 320,
            "simulated_status": "MOCK_DELIVERED",
            "delivery_rate_pct": 98.4,
            "created_at_utc": now_utc.isoformat(),
            "display_timezone": "Asia/Kolkata",
            "is_demo": True,
            "demo_banner": cls.DISCLAIMER
        }
