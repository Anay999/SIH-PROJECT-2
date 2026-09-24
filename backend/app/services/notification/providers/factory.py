from typing import Dict, Any
from app.services.notification.providers.base import BaseNotificationProvider
from app.services.notification.providers.whatsapp import MetaWhatsAppProvider
from app.services.notification.providers.sms import MSG91SMSProvider

class ProviderFactory:
    _wa_provider: MetaWhatsAppProvider = None
    _sms_provider: MSG91SMSProvider = None

    @classmethod
    def get_whatsapp_provider(cls) -> BaseNotificationProvider:
        if cls._wa_provider is None:
            cls._wa_provider = MetaWhatsAppProvider()
        return cls._wa_provider

    @classmethod
    def get_sms_provider(cls) -> BaseNotificationProvider:
        if cls._sms_provider is None:
            cls._sms_provider = MSG91SMSProvider()
        return cls._sms_provider

    @classmethod
    def get_all_providers_status(cls) -> Dict[str, Any]:
        wa = cls.get_whatsapp_provider()
        sms = cls.get_sms_provider()

        return {
            "whatsapp": {
                "health": wa.get_health_status(),
                "details": wa.validate_configuration()
            },
            "sms": {
                "health": sms.get_health_status(),
                "details": sms.validate_configuration()
            }
        }
