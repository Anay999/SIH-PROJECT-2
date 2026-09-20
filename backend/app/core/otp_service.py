"""
Secure OTP Service for HEATSHIELD AI.
Handles cryptographic OTP generation, HMAC hashing, phone normalization,
rate limiting, brute-force lockout, single-use enforcement, and session issuance.
"""
import re
import hmac
import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.otp import OtpChallenge, OtpStatus, AuthSession

PHONE_REGEX = re.compile(r"^\+[1-9]\d{7,14}$")
LOCAL_CLIENT_IPS = {"127.0.0.1", "::1", "localhost", "testclient"}

def normalize_phone_number(raw_phone: str) -> str:
    """Normalizes phone number to E.164 standard."""
    cleaned = re.sub(r"[\s\-\(\)]", "", raw_phone)
    if not cleaned.startswith("+"):
        if len(cleaned) == 10 and cleaned.isdigit():
            cleaned = f"+91{cleaned}"
        else:
            cleaned = f"+{cleaned}"
    if not PHONE_REGEX.match(cleaned):
        raise ValueError("Invalid phone number format. Must conform to E.164 (e.g. +919000000001).")
    return cleaned

def mask_phone_number(normalized_phone: str) -> str:
    """Masks phone number for safe display (e.g. +91 90000****1)."""
    if len(normalized_phone) < 8:
        return "****"
    prefix = normalized_phone[:5]
    suffix = normalized_phone[-2:]
    return f"{prefix}****{suffix}"

def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware UTC, even when retrieved from SQLite as naive."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def hash_phone_number(normalized_phone: str) -> str:
    """Computes SHA-256 HMAC of normalized phone number for lookup and rate limiting."""
    return hmac.new(
        settings.OTP_HASH_SECRET.encode("utf-8"),
        normalized_phone.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def hash_client_ip(client_ip: str) -> str:
    """Computes SHA-256 HMAC of client IP address."""
    return hmac.new(
        settings.OTP_HASH_SECRET.encode("utf-8"),
        (client_ip or "unknown").encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def generate_secure_otp(length: int = 6) -> str:
    """Generates a cryptographically secure numeric OTP."""
    # 6 digits: 100000 to 999999
    return str(secrets.randbelow(900000) + 100000)

def hash_otp(otp_code: str, challenge_id: str) -> str:
    """Computes a salted HMAC-SHA256 hash of the OTP code."""
    salt = challenge_id.encode("utf-8")
    pepper = settings.OTP_HASH_SECRET.encode("utf-8")
    return hmac.new(
        pepper,
        salt + otp_code.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def verify_otp_hash(provided_otp: str, stored_hash: str, challenge_id: str) -> bool:
    """Performs constant-time comparison of OTP hash."""
    computed_hash = hash_otp(provided_otp, challenge_id)
    return hmac.compare_digest(stored_hash, computed_hash)

def is_local_dev_environment(client_ip: Optional[str] = None) -> bool:
    """
    Evaluates whether demo OTP helper is allowed.
    Strictly False under staging/production or external requests.
    """
    if settings.APP_ENV in ["production", "staging"]:
        return False
    if not settings.OTP_DEMO_MODE:
        return False
    if settings.WHATSAPP_OTP_PROVIDER != "mock":
        return False
    
    clean_ip = (client_ip or "").split(":")[0].strip()
    return clean_ip in LOCAL_CLIENT_IPS or client_ip in LOCAL_CLIENT_IPS

class OtpService:
    @staticmethod
    def check_rate_limits(db: Session, phone_hash: str, ip_hash: str) -> Tuple[bool, Optional[str]]:
        """Enforces rate limits on OTP generation per phone and IP."""
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        
        # Check phone rate limit
        phone_count = db.query(func.count(OtpChallenge.id)).filter(
            OtpChallenge.phone_number_hash == phone_hash,
            OtpChallenge.created_at_utc >= one_hour_ago
        ).scalar()
        if phone_count >= settings.OTP_MAX_REQUESTS_PER_HOUR:
            return False, "Too many verification requests for this phone number. Please try again in an hour."

        # Check IP rate limit
        ip_count = db.query(func.count(OtpChallenge.id)).filter(
            OtpChallenge.request_ip_hash == ip_hash,
            OtpChallenge.created_at_utc >= one_hour_ago
        ).scalar()
        if ip_count >= (settings.OTP_MAX_REQUESTS_PER_HOUR * 3):
            return False, "Too many verification requests from this IP address. Please try again later."

        return True, None

    @staticmethod
    def create_challenge(
        db: Session,
        normalized_phone: str,
        client_ip: str,
        user_agent: str
    ) -> Tuple[OtpChallenge, str]:
        """
        Creates a new OTP challenge, generates secure OTP, and persists hash.
        Cancels previous active challenges for the same phone.
        """
        phone_hash = hash_phone_number(normalized_phone)
        ip_hash = hash_client_ip(client_ip)
        ua_hash = hash_client_ip(user_agent or "generic")

        # Invalidate previous unconsumed challenges for this phone
        db.query(OtpChallenge).filter(
            OtpChallenge.phone_number_hash == phone_hash,
            OtpChallenge.status.in_([OtpStatus.CREATED.value, OtpStatus.SENT.value])
        ).update({"status": OtpStatus.CANCELLED.value}, synchronize_session=False)

        challenge_id = f"ch_{uuid.uuid4().hex}"
        raw_otp = generate_secure_otp(settings.OTP_LENGTH)
        otp_hashed = hash_otp(raw_otp, challenge_id)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)

        challenge = OtpChallenge(
            id=f"otp_{uuid.uuid4().hex[:12]}",
            challenge_id=challenge_id,
            phone_number_hash=phone_hash,
            phone_number_masked=mask_phone_number(normalized_phone),
            otp_hash=otp_hashed,
            created_at_utc=now,
            expires_at_utc=expires_at,
            failed_attempts=0,
            resend_count=0,
            status=OtpStatus.SENT.value,
            provider=settings.WHATSAPP_OTP_PROVIDER,
            request_ip_hash=ip_hash,
            user_agent_hash=ua_hash,
            demo_mode=settings.OTP_DEMO_MODE,
            last_attempt_at_utc=None
        )

        db.add(challenge)
        db.flush()
        return challenge, raw_otp

    @staticmethod
    def verify_challenge(
        db: Session,
        challenge_id: str,
        provided_otp: str
    ) -> Tuple[bool, Optional[str], Optional[OtpChallenge]]:
        """
        Verifies an OTP challenge with brute-force lockout, expiry, and single-use checks.
        """
        challenge = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == challenge_id).first()
        if not challenge:
            return False, "Invalid or expired challenge reference.", None

        now = datetime.now(timezone.utc)

        # Check status
        if challenge.status == OtpStatus.LOCKED.value:
            return False, "Challenge is locked due to too many failed attempts. Request a new OTP.", challenge
        if challenge.status in [OtpStatus.VERIFIED.value, OtpStatus.CONSUMED.value]:
            return False, "This OTP has already been verified and used.", challenge
        if challenge.status in [OtpStatus.EXPIRED.value, OtpStatus.CANCELLED.value]:
            return False, "This OTP challenge has expired or was cancelled.", challenge

        # Check expiry
        if now > ensure_utc(challenge.expires_at_utc):
            challenge.status = OtpStatus.EXPIRED.value
            db.flush()
            return False, "The verification code has expired. Please request a new one.", challenge

        # Check attempts
        if challenge.failed_attempts >= settings.OTP_MAX_ATTEMPTS:
            challenge.status = OtpStatus.LOCKED.value
            db.flush()
            return False, "Maximum verification attempts exceeded. Challenge locked.", challenge

        # Check OTP match
        is_valid = verify_otp_hash(provided_otp, challenge.otp_hash, challenge.challenge_id)
        challenge.last_attempt_at_utc = now

        if not is_valid:
            challenge.failed_attempts += 1
            if challenge.failed_attempts >= settings.OTP_MAX_ATTEMPTS:
                challenge.status = OtpStatus.LOCKED.value
                db.flush()
                return False, "Invalid verification code. Maximum attempts reached. Challenge locked.", challenge
            db.flush()
            remaining = settings.OTP_MAX_ATTEMPTS - challenge.failed_attempts
            return False, f"Invalid verification code. {remaining} attempts remaining.", challenge

        # Mark verified & consumed
        challenge.status = OtpStatus.CONSUMED.value
        challenge.verified_at_utc = now
        challenge.consumed_at_utc = now
        db.flush()
        return True, None, challenge

    @staticmethod
    def resend_challenge(
        db: Session,
        challenge_id: str,
        client_ip: str
    ) -> Tuple[bool, Optional[str], Optional[OtpChallenge], Optional[str]]:
        """
        Resends an OTP for an active challenge respecting the 60-second cooldown and max resend limit.
        """
        challenge = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == challenge_id).first()
        if not challenge:
            return False, "Invalid challenge reference.", None, None

        now = datetime.now(timezone.utc)
        if challenge.status not in [OtpStatus.SENT.value, OtpStatus.CREATED.value]:
            return False, f"Cannot resend code for challenge with status '{challenge.status}'.", challenge, None

        # Check cooldown (60 seconds)
        time_since_creation = (now - ensure_utc(challenge.created_at_utc)).total_seconds()
        if time_since_creation < settings.OTP_RESEND_COOLDOWN_SECONDS:
            remaining_cooldown = int(settings.OTP_RESEND_COOLDOWN_SECONDS - time_since_creation)
            return False, f"Please wait {remaining_cooldown} seconds before requesting a resend.", challenge, None

        # Check max resends (3)
        if challenge.resend_count >= settings.OTP_MAX_RESENDS:
            return False, "Maximum resend limit reached for this session. Please request a new verification.", challenge, None

        # Generate fresh OTP code and extend expiry
        raw_otp = generate_secure_otp(settings.OTP_LENGTH)
        challenge.otp_hash = hash_otp(raw_otp, challenge.challenge_id)
        challenge.resend_count += 1
        challenge.expires_at_utc = now + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)
        db.flush()

        return True, None, challenge, raw_otp

    @staticmethod
    def create_session(
        db: Session,
        actor_id: str,
        phone_masked: str,
        client_ip: str,
        user_agent: str,
        role: str = "VIEWER"
    ) -> Tuple[AuthSession, str]:
        """Creates an authenticated session token for the user."""
        session_id = f"sess_{uuid.uuid4().hex}"
        raw_token = f"hstok_{uuid.uuid4().hex}_{secrets.token_urlsafe(24)}"
        token_hash = hmac.new(
            settings.SESSION_SECRET.encode("utf-8"),
            raw_token.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=12)

        session_record = AuthSession(
            id=f"as_{uuid.uuid4().hex[:12]}",
            session_id=session_id,
            session_token_hash=token_hash,
            actor_id=actor_id,
            role=role,
            phone_masked=phone_masked,
            created_at_utc=now,
            expires_at_utc=expires_at,
            revoked_at_utc=None,
            last_seen_at_utc=now,
            request_ip_hash=hash_client_ip(client_ip),
            user_agent_hash=hash_client_ip(user_agent or "generic"),
            demo_mode=settings.OTP_DEMO_MODE
        )
        db.add(session_record)
        db.flush()
        return session_record, raw_token

    @staticmethod
    def revoke_session(db: Session, session_id: str) -> bool:
        """Revokes an active session immediately."""
        session_record = db.query(AuthSession).filter(AuthSession.session_id == session_id).first()
        if session_record:
            session_record.revoked_at_utc = datetime.now(timezone.utc)
            db.flush()
            return True
        return False
