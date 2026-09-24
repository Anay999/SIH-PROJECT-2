from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class ProviderResult:
    success: bool
    provider: str
    message_id: Optional[str] = None
    status: str = "SENT" # SENT | DELIVERED | FAILED | RETRYING | NOT_CONFIGURED
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[str] = None
    is_retryable: bool = False
    is_simulated: bool = False


class ProviderError(Exception):
    def __init__(
        self,
        provider: str,
        code: str,
        message: str,
        retryable: bool = False,
        raw_status: Optional[int] = None
    ):
        super().__init__(f"[{provider}] {code}: {message}")
        self.provider = provider
        self.code = code
        self.message = message
        self.retryable = retryable
        self.raw_status = raw_status


class BaseNotificationProvider:
    channel: str = "GENERIC"
    provider_name: str = "BASE"

    async def send_message(
        self,
        recipient_phone: str,
        message_text: str,
        template_name: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
        priority: str = "HIGH"
    ) -> ProviderResult:
        raise NotImplementedError

    def validate_configuration(self) -> Dict[str, Any]:
        raise NotImplementedError

    def get_health_status(self) -> str:
        """CONNECTED | DEGRADED | NOT_CONFIGURED | ERROR | SIMULATED"""
        raise NotImplementedError
