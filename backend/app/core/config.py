import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "THERMOSAFE AI"
    PROJECT_TAGLINE: str = "Hyper-Local Heat Risk & Emergency Response Intelligence"
    VERSION: str = "2.5.0"
    API_V1_PREFIX: str = "/api"
    
    # Environment & Demo flags
    ENV: str = "development"
    DEMO_MODE: bool = True
    DATA_DISCLAIMER: str = (
        "PROTOTYPE DEMONSTRATION ONLY. NOT AN OFFICIAL IMD FORECAST. "
        "RISK SCORES AND HEALTH ESTIMATES ARE NOT CLINICALLY VALIDATED."
    )
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./heatshield.db")
    
    # Default geography
    DEFAULT_CITY: str = "Chennai"
    DEFAULT_STATE: str = "Tamil Nadu"
    DEFAULT_COUNTRY: str = "India"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Notification Providers
    CALLMEBOT_PHONE: str = os.getenv("CALLMEBOT_PHONE", "+919876543210")
    CALLMEBOT_API_KEY: str = os.getenv("CALLMEBOT_API_KEY", "")
    FAST2SMS_API_KEY: str = os.getenv("FAST2SMS_API_KEY", "")
    FAST2SMS_SENDER_ID: str = os.getenv("FAST2SMS_SENDER_ID", "TXTIND")
    FAST2SMS_DLT_TEMPLATE_ID: str = os.getenv("FAST2SMS_DLT_TEMPLATE_ID", "")
    
    # GIS & Emergency Routing
    OSRM_ROUTING_URL: str = os.getenv("OSRM_ROUTING_URL", "https://router.project-osrm.org")
    OVERPASS_API_URL: str = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
    
    # Weather Provider
    WEATHER_PROVIDER: str = os.getenv("WEATHER_PROVIDER", "open-meteo")
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")

    # Environment & Auth / OTP settings
    APP_ENV: str = os.getenv("APP_ENV", "development")
    OTP_DEMO_MODE: bool = os.getenv("OTP_DEMO_MODE", "true").lower() == "true"
    WHATSAPP_OTP_PROVIDER: str = os.getenv("WHATSAPP_OTP_PROVIDER", "mock")
    OTP_HASH_SECRET: str = os.getenv("OTP_HASH_SECRET", "heatshield_insecure_default_otp_pepper_secret_dev_only")
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "heatshield_insecure_default_session_secret_dev_only")

    # OTP Security Parameters
    OTP_LENGTH: int = int(os.getenv("OTP_LENGTH", "6"))
    OTP_EXPIRY_SECONDS: int = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    OTP_RESEND_COOLDOWN_SECONDS: int = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))
    OTP_MAX_RESENDS: int = int(os.getenv("OTP_MAX_RESENDS", "3"))
    OTP_MAX_REQUESTS_PER_HOUR: int = int(os.getenv("OTP_MAX_REQUESTS_PER_HOUR", "5"))

    # Meta WhatsApp Cloud API settings
    META_WHATSAPP_ENABLED: bool = os.getenv("META_WHATSAPP_ENABLED", "false").lower() == "true"
    META_WHATSAPP_ACCESS_TOKEN: str = os.getenv("META_WHATSAPP_ACCESS_TOKEN", "")
    META_WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("META_WHATSAPP_PHONE_NUMBER_ID", "")
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("META_WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    META_WHATSAPP_TEMPLATE_NAME: str = os.getenv("META_WHATSAPP_TEMPLATE_NAME", "heatshield_otp")
    META_WHATSAPP_TEMPLATE_LANGUAGE: str = os.getenv("META_WHATSAPP_TEMPLATE_LANGUAGE", "en")

    # Production Emergency Notification System (WhatsApp + SMS)
    WHATSAPP_ENABLED: bool = os.getenv("WHATSAPP_ENABLED", "true").lower() == "true"
    WHATSAPP_API_VERSION: str = os.getenv("WHATSAPP_API_VERSION", "v20.0")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", os.getenv("META_WHATSAPP_PHONE_NUMBER_ID", ""))
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", os.getenv("META_WHATSAPP_BUSINESS_ACCOUNT_ID", ""))
    WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", os.getenv("META_WHATSAPP_ACCESS_TOKEN", ""))
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "thermosafe_wa_webhook_verify_token_secure_2026")
    WHATSAPP_APP_SECRET: str = os.getenv("WHATSAPP_APP_SECRET", "")
    
    WHATSAPP_TEMPLATE_EXTREME_HEAT: str = os.getenv("WHATSAPP_TEMPLATE_EXTREME_HEAT", "thermosafe_extreme_heat")
    WHATSAPP_TEMPLATE_VERY_HIGH_HEAT: str = os.getenv("WHATSAPP_TEMPLATE_VERY_HIGH_HEAT", "thermosafe_very_high_heat")
    WHATSAPP_TEMPLATE_HIGH_HEAT: str = os.getenv("WHATSAPP_TEMPLATE_HIGH_HEAT", "thermosafe_high_heat")
    WHATSAPP_TEMPLATE_MODERATE_HEAT: str = os.getenv("WHATSAPP_TEMPLATE_MODERATE_HEAT", "thermosafe_moderate_heat")

    # SMS Gateway (MSG91 / Fast2SMS / Indian DLT Compliant)
    SMS_ENABLED: bool = os.getenv("SMS_ENABLED", "true").lower() == "true"
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "msg91") # msg91 | fast2sms | mock
    MSG91_AUTH_KEY: str = os.getenv("MSG91_AUTH_KEY", "")
    MSG91_SENDER_ID: str = os.getenv("MSG91_SENDER_ID", "THMSAF")
    MSG91_DLT_TEMPLATE_ID: str = os.getenv("MSG91_DLT_TEMPLATE_ID", "1007161829304918234")
    MSG91_FLOW_ID: str = os.getenv("MSG91_FLOW_ID", "")

    # Multi-Channel Dispatch Strategy & Throttling
    ENABLE_CHANNEL_FALLBACK: bool = os.getenv("ENABLE_CHANNEL_FALLBACK", "true").lower() == "true"
    NOTIFICATION_DELIVERY_MODE: str = os.getenv("NOTIFICATION_DELIVERY_MODE", "PARALLEL") # PARALLEL | FAILOVER
    ALERT_DEDUP_WINDOW_MINUTES: int = int(os.getenv("ALERT_DEDUP_WINDOW_MINUTES", "60"))
    NOTIFICATION_MAX_RETRIES: int = int(os.getenv("NOTIFICATION_MAX_RETRIES", "4"))
    NOTIFICATION_BACKOFF_SECONDS: int = int(os.getenv("NOTIFICATION_BACKOFF_SECONDS", "10"))
    WHATSAPP_RATE_LIMIT_PER_SECOND: int = int(os.getenv("WHATSAPP_RATE_LIMIT_PER_SECOND", "10"))
    SMS_RATE_LIMIT_PER_SECOND: int = int(os.getenv("SMS_RATE_LIMIT_PER_SECOND", "20"))

    # Twilio WhatsApp settings (Disabled by default)
    TWILIO_WHATSAPP_ENABLED: bool = os.getenv("TWILIO_WHATSAPP_ENABLED", "false").lower() == "true"
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM: str = os.getenv("TWILIO_WHATSAPP_FROM", "")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
