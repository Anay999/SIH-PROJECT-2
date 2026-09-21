"""
Authentication API Endpoints for HEATSHIELD AI.
Handles strict RBAC credential login, HttpOnly session cookies,
OTP verification, session introspection (/me), and logout.
"""
import uuid
import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Header, Cookie, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import (
    record_audit,
    CurrentActor,
    UserRole,
    ROLE_PERMISSIONS,
    verify_password,
    hash_password,
    hash_session_token,
    get_current_actor,
)
from app.core.otp_service import (
    normalize_phone_number,
    hash_phone_number,
    hash_client_ip,
    is_local_dev_environment,
    ensure_utc,
    OtpService,
)
from app.models.otp import OtpChallenge, AuthSession, OtpStatus
from app.models.user import User
from app.engines.whatsapp_otp_provider import get_whatsapp_otp_provider
from app.data.cities_registry import CITIES_REGISTRY, get_city_profile, list_supported_cities

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

# Pydantic Schemas
class LoginPayload(BaseModel):
    username: str = Field(..., description="Registered mobile number or username")
    password: str = Field(..., min_length=1, description="Account password")

class RegisterPayload(BaseModel):
    phone_number: str = Field(..., description="10-digit mobile number with or without country code")
    full_name: str = Field(..., min_length=2, description="Full Name of citizen or officer")
    city: str = Field("Chennai", description="Municipal city jurisdiction (Chennai, Delhi, Ahmedabad, Jaipur, Lucknow)")
    password: str = Field(..., min_length=6, description="Account password (min 6 characters)")
    email: Optional[str] = Field(None, description="Optional contact or official email address")
    role: Optional[str] = Field("CITIZEN", description="Role: CITIZEN or MUNICIPAL_OFFICER")

class UpdateLocationPayload(BaseModel):
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_live_gps: Optional[bool] = False

class OtpRequestPayload(BaseModel):
    phone_number: str = Field(..., json_schema_extra={"example": "+919000000001"}, description="Phone number with country code")
    purpose: Optional[str] = Field("LOGIN_2FA", description="Purpose: LOGIN_2FA, CITIZEN_PASSWORDLESS, PASSWORD_RESET")
    channel: Optional[str] = Field("sms", description="Verification channel: sms, whatsapp")

class OtpVerifyPayload(BaseModel):
    challenge_id: str = Field(..., description="Public reference ID returned from request")
    otp: str = Field(..., min_length=4, max_length=10, description="Numeric verification code")
    purpose: Optional[str] = Field("LOGIN_2FA", description="Purpose of verification")

class LogoutPayload(BaseModel):
    session_id: Optional[str] = Field(None, description="Active session ID to revoke")

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    client_host = request.client.host if request.client else "127.0.0.1"
    if forwarded and (settings.APP_ENV in ["development", "testing"] or client_host in ["127.0.0.1", "testclient"]):
        return forwarded.split(",")[0].strip()
    return client_host

@router.post("/login")
def login_with_password(
    payload: LoginPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticates mobile number, username, or email with password.
    Zero Client Trust: Role & permissions are derived exclusively from the database record.
    Creates a secure server-side session and sets an HttpOnly, SameSite cookie.
    Does NOT return the raw session credential in the JSON body.
    """
    client_ip = get_client_ip(request)
    identifier = payload.username.strip()

    # Search by username, exact phone, normalized mobile number, or email
    normalized_phone = None
    try:
        normalized_phone = normalize_phone_number(identifier)
    except Exception:
        pass

    filters = [
        (User.username == identifier),
        (User.phone_number == identifier),
        (User.email.ilike(identifier)),
    ]
    if normalized_phone:
        filters.append(User.phone_number == normalized_phone)
    clean_digits = "".join(ch for ch in identifier if ch.isdigit())
    if len(clean_digits) == 10:
        filters.append(User.phone_number == f"+91{clean_digits}")

    from sqlalchemy import or_
    user = db.query(User).filter(or_(*filters)).first()

    if not user:
        # Audit failed login attempt
        audit_entry = record_audit(
            db=db,
            actor=CurrentActor(actor_id=identifier, role=UserRole.CITIZEN),
            action="LOGIN_FAILURE",
            entity_type="USER",
            entity_id=identifier,
            previous_state=None,
            new_state={"reason": "USER_NOT_FOUND", "ip": client_ip}
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "We couldn't verify your credentials. Please check your username and password."}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "ACCOUNT_DISABLED", "message": "This account has been disabled. Please contact your system administrator."}
        )

    if not verify_password(payload.password, user.password_hash):
        record_audit(
            db=db,
            actor=CurrentActor(actor_id=user.id, role=UserRole(user.role), username=user.username),
            action="LOGIN_FAILURE",
            entity_type="USER",
            entity_id=user.id,
            previous_state=None,
            new_state={"reason": "INVALID_PASSWORD", "ip": client_ip}
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "We couldn't verify your credentials. Please check your username and password."}
        )

    # Success: Update last login
    now_utc = datetime.now(timezone.utc)
    user.last_login_at_utc = now_utc

    # Generate secure 256-bit random session token
    raw_session_token = secrets.token_urlsafe(36)
    token_hash = hash_session_token(raw_session_token)
    session_id = f"sess_{uuid.uuid4().hex[:14]}"
    expires_at = now_utc + timedelta(hours=24)

    # Mask phone
    masked_phone = user.phone_number[-4:].rjust(len(user.phone_number), '*') if user.phone_number else "***"

    auth_session = AuthSession(
        id=f"as_{uuid.uuid4().hex[:12]}",
        session_id=session_id,
        session_token_hash=token_hash,
        actor_id=user.id,
        role=user.role,
        phone_masked=masked_phone,
        created_at_utc=now_utc,
        expires_at_utc=expires_at,
        request_ip_hash=hash_client_ip(client_ip),
        user_agent_hash=hash_client_ip(request.headers.get("User-Agent", "generic")),
        demo_mode=settings.DEMO_MODE,
    )
    db.add(auth_session)

    # Audit login success
    record_audit(
        db=db,
        actor=CurrentActor(actor_id=user.id, role=UserRole(user.role), username=user.username),
        action="LOGIN_SUCCESS",
        entity_type="USER",
        entity_id=user.id,
        previous_state=None,
        new_state={"role": user.role, "ip": client_ip, "session_id": session_id}
    )
    db.commit()

    # Set secure HttpOnly, SameSite=Lax cookie
    response.set_cookie(
        key="heatshield_session",
        value=raw_session_token,
        httponly=True,
        secure=False,  # In local dev/http, secure=False allows cookie to be sent
        samesite="lax",
        max_age=86400,
        path="/"
    )

    role_perms = sorted(list(ROLE_PERMISSIONS.get(user.role, set())))

    return {
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "city": getattr(user, "city", "Chennai") or "Chennai",
            "phone_masked": masked_phone,
        },
        "permissions": role_perms,
        "message": f"Successfully authenticated as {user.role}."
    }

@router.post("/register")
def register_with_mobile(
    payload: RegisterPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Registers a new user account with Mobile Number, Full Name, and Municipal City.
    Strict identity architecture: Mobile number is the primary identity token.
    Automatically generates session cookie and logs in the user immediately.
    """
    client_ip = get_client_ip(request)
    try:
        normalized_phone = normalize_phone_number(payload.phone_number)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_PHONE", "message": str(val_err)}
        )

    # Check existing user
    existing = db.query(User).filter(User.phone_number == normalized_phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PHONE_REGISTERED", "message": "This mobile number is already registered. Please sign in."}
        )

    # Strict RBAC enforcement: Only an administrator can provision Municipal Officer or Admin roles.
    # Public self-registration is strictly for Citizen accounts.
    if payload.role and payload.role.strip().upper() != UserRole.CITIZEN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PUBLIC_REGISTRATION_RESTRICTED",
                "message": "Only an existing Administrator can provision Municipal Officer or Admin accounts. Public registration is restricted to Citizen accounts."
            }
        )

    # Validate city jurisdiction
    city_prof = get_city_profile(payload.city)
    city_name = city_prof["name"]

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    username = f"user_{normalized_phone[-4:]}_{uuid.uuid4().hex[:4]}"
    now_utc = datetime.now(timezone.utc)

    new_user = User(
        id=user_id,
        username=username,
        full_name=payload.full_name.strip(),
        phone_number=normalized_phone,
        email=payload.email.strip().lower() if payload.email else None,
        password_hash=hash_password(payload.password),
        role=UserRole.CITIZEN.value,
        city=city_name,
        is_active=True,
        phone_verified=True,
        created_at_utc=now_utc,
        updated_at_utc=now_utc,
        last_login_at_utc=now_utc
    )
    db.add(new_user)
    db.commit()

    # Create active session and HttpOnly cookie
    raw_session_token = secrets.token_urlsafe(36)
    token_hash = hash_session_token(raw_session_token)
    session_id = f"sess_{uuid.uuid4().hex[:14]}"
    expires_at = now_utc + timedelta(hours=24)
    masked_phone = normalized_phone[-4:].rjust(len(normalized_phone), '*')

    auth_session = AuthSession(
        id=f"as_{uuid.uuid4().hex[:12]}",
        session_id=session_id,
        session_token_hash=token_hash,
        actor_id=new_user.id,
        role=new_user.role,
        phone_masked=masked_phone,
        created_at_utc=now_utc,
        expires_at_utc=expires_at,
        request_ip_hash=hash_client_ip(client_ip),
        user_agent_hash=hash_client_ip(request.headers.get("User-Agent", "generic")),
        demo_mode=settings.DEMO_MODE,
    )
    db.add(auth_session)

    record_audit(
        db=db,
        actor=CurrentActor(actor_id=new_user.id, role=UserRole(new_user.role), username=new_user.username),
        action="REGISTER_SUCCESS",
        entity_type="USER",
        entity_id=new_user.id,
        previous_state=None,
        new_state={"role": new_user.role, "city": city_name, "phone": masked_phone}
    )
    db.commit()

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="heatshield_session",
        value=raw_session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/"
    )

    role_perms = sorted(list(ROLE_PERMISSIONS.get(new_user.role, set())))

    return {
        "success": True,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "city": new_user.city,
            "phone_masked": masked_phone,
        },
        "permissions": role_perms,
        "message": f"Account successfully registered in {city_name} municipal jurisdiction."
    }

@router.get("/cities")
def get_jurisdiction_cities():
    """Returns all supported municipal jurisdictions across South and North India."""
    return {
        "success": True,
        "data": list_supported_cities()
    }

@router.patch("/location")
def update_user_location(
    payload: UpdateLocationPayload,
    actor: CurrentActor = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    """
    Updates user's municipal jurisdiction city or dynamic live GPS location coordinates.
    """
    user = db.query(User).filter(User.id == actor.actor_id).first()
    if user and payload.city:
        prof = get_city_profile(payload.city)
        user.city = prof["name"]
        db.commit()

    return {
        "success": True,
        "city": user.city if user else (payload.city or "Chennai"),
        "gps": {
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "is_live_gps": payload.is_live_gps
        },
        "message": "Jurisdiction location updated successfully."
    }

@router.get("/me")
def get_current_user_profile(
    actor: CurrentActor = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    """
    Returns currently authenticated session user profile and effective permissions.
    Verified strictly server-side from HttpOnly cookie or validated bearer token.
    """
    user = db.query(User).filter(User.id == actor.actor_id).first()
    full_name = user.full_name if user else actor.username
    phone_masked = user.phone_number[-4:].rjust(len(user.phone_number), '*') if (user and user.phone_number) else "***"
    city = getattr(user, "city", "Chennai") if user else "Chennai"

    return {
        "authenticated": True,
        "user": {
            "id": actor.actor_id,
            "username": actor.username,
            "full_name": full_name,
            "role": actor.role.value,
            "city": city,
            "phone_masked": phone_masked,
        },
        "permissions": sorted(list(actor.permissions)),
        "session_id": actor.session_id,
        "environment": "Demo Environment" if settings.DEMO_MODE else "Production"
    }

@router.get("/session")
def get_session_status(
    session_id: Optional[str] = Query(None),
    heatshield_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Checks if a given session ID or session cookie is active and valid.
    """
    import hmac
    target_session = None
    if session_id:
        target_session = db.query(AuthSession).filter(AuthSession.session_id == session_id).first()
    elif heatshield_session:
        hmac_h = hmac.new(settings.SESSION_SECRET.encode("utf-8"), heatshield_session.encode("utf-8"), hashlib.sha256).hexdigest()
        sha_h = hashlib.sha256(heatshield_session.encode("utf-8")).hexdigest()
        target_session = db.query(AuthSession).filter(
            (AuthSession.session_token_hash == hmac_h) | (AuthSession.session_token_hash == sha_h)
        ).first()

    now_utc = datetime.now(timezone.utc)
    if target_session and target_session.revoked_at_utc is None and ensure_utc(target_session.expires_at_utc) > now_utc:
        return {
            "success": True,
            "data": {
                "authenticated": True,
                "session_id": target_session.session_id,
                "actor_id": target_session.actor_id,
                "role": target_session.role,
                "phone_masked": target_session.phone_masked,
                "expires_at_utc": target_session.expires_at_utc.isoformat() if target_session.expires_at_utc else None
            }
        }
    return {
        "success": True,
        "data": {
            "authenticated": False,
            "reason": "REVOKED_OR_EXPIRED"
        }
    }

@router.post("/logout")
def logout_current_session(
    payload: Optional[LogoutPayload] = None,
    request: Request = None,
    response: Response = None,
    heatshield_session: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Revokes the active session by ID or cookie, and clears the HttpOnly session cookie.
    """
    import hmac
    revoked = False
    now_utc = datetime.now(timezone.utc)

    # 1. By payload session_id
    if payload and payload.session_id:
        s = db.query(AuthSession).filter(AuthSession.session_id == payload.session_id).first()
        if s and s.revoked_at_utc is None:
            s.revoked_at_utc = now_utc
            revoked = True

    # 2. By cookie or header token
    token = heatshield_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    if token:
        hmac_h = hmac.new(settings.SESSION_SECRET.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).hexdigest()
        sha_h = hashlib.sha256(token.encode("utf-8")).hexdigest()
        s = db.query(AuthSession).filter(
            (AuthSession.session_token_hash == hmac_h) | (AuthSession.session_token_hash == sha_h)
        ).first()
        if s and s.revoked_at_utc is None:
            s.revoked_at_utc = now_utc
            revoked = True

    db.commit()

    if response:
        response.delete_cookie(key="heatshield_session", path="/")

    return {
        "success": True,
        "message": "Session successfully logged out.",
        "data": {"revoked": True}
    }

@router.post("/otp/request")
@router.post("/otp/send")
async def send_otp_challenge(
    payload: OtpRequestPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Dispatches a verification code via Fast2SMS / WhatsApp provider with rate limiting.
    Supports both legacy /otp/request and new /otp/send paths.
    """
    client_ip = get_client_ip(request)
    try:
        normalized = normalize_phone_number(payload.phone_number)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )

    phone_hash = hash_phone_number(normalized)
    ip_hash = hash_client_ip(client_ip)

    allowed, limit_msg = OtpService.check_rate_limits(db, phone_hash, ip_hash)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "RATE_LIMIT_EXCEEDED", "message": limit_msg}
        )

    user_agent = request.headers.get("User-Agent", "generic")
    challenge, raw_otp = OtpService.create_challenge(db, normalized, client_ip, user_agent)
    challenge.purpose = payload.purpose or "LOGIN_2FA"
    db.commit()

    provider = get_whatsapp_otp_provider()
    send_result = await provider.send_otp(normalized, raw_otp, challenge.challenge_id)
    challenge.provider_message_id = send_result.message_id
    db.commit()

    # Demo helper is only exposed in local/test environments and never in production
    is_prod = settings.APP_ENV == "production"
    demo_otp = raw_otp if (not is_prod and (is_local_dev_environment(client_ip) or challenge.demo_mode)) else None
    demo_helper_active = demo_otp is not None

    cooldown_seconds = settings.OTP_RESEND_COOLDOWN_SECONDS
    resend_avail = (ensure_utc(challenge.created_at_utc) + timedelta(seconds=cooldown_seconds)).isoformat() if challenge.created_at_utc else None

    return {
        "success": True,
        "data": {
            "challenge_id": challenge.challenge_id,
            "phone_masked": challenge.phone_number_masked,
            "channel": payload.channel or "whatsapp",
            "mode": "MOCK" if challenge.demo_mode else "LIVE",
            "demo_otp": demo_otp,
            "demo_helper_active": demo_helper_active,
            "expires_at_utc": challenge.expires_at_utc.isoformat() if challenge.expires_at_utc else None,
            "resend_available_at_utc": resend_avail,
            "provider_message_id": challenge.provider_message_id
        },
        "challenge_id": challenge.challenge_id,
        "phone_masked": challenge.phone_number_masked,
        "provider": getattr(send_result, "provider", "mock"),
        "message": "OTP verification code sent successfully."
    }

@router.post("/otp/verify")
def verify_otp_challenge(
    payload: OtpVerifyPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Verifies OTP and creates an authenticated session. Sets HttpOnly cookie.
    Returns both legacy envelope and user details.
    """
    client_ip = get_client_ip(request)
    challenge = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == payload.challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHALLENGE_NOT_FOUND", "message": "Verification challenge not found or expired."}
        )

    is_valid, err_msg, verified_challenge = OtpService.verify_challenge(db, payload.challenge_id, payload.otp)
    if not is_valid:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_OTP", "message": err_msg}
        )

    # Determine actor identity: look up user or issue citizen identity
    user = None
    if challenge.user_id:
        user = db.query(User).filter(User.id == challenge.user_id).first()
    if not user:
        user = db.query(User).filter(User.phone_number == challenge.phone_number_masked).first()

    if user:
        actor_id = user.id
        role = user.role
        username = user.username
        full_name = user.full_name
    else:
        actor_id = f"citizen_{challenge.challenge_id[:8]}"
        role = "VIEWER"
        username = f"citizen_{challenge.phone_number_masked[-4:]}"
        full_name = "Citizen User"

    user_agent = request.headers.get("User-Agent", "generic")
    session_record, raw_token = OtpService.create_session(
        db=db,
        actor_id=actor_id,
        phone_masked=challenge.phone_number_masked,
        client_ip=client_ip,
        user_agent=user_agent,
        role=role
    )
    db.commit()

    # Set HttpOnly session cookie
    response.set_cookie(
        key="heatshield_session",
        value=raw_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/"
    )

    return {
        "success": True,
        "data": {
            "authenticated": True,
            "session_id": session_record.session_id,
            "session_token": raw_token,
            "actor_id": session_record.actor_id,
            "role": session_record.role,
            "phone_masked": session_record.phone_masked,
            "expires_at_utc": session_record.expires_at_utc.isoformat() if session_record.expires_at_utc else None
        },
        "user": {
            "id": actor_id,
            "username": username,
            "full_name": full_name,
            "role": role,
            "city": getattr(user, "city", "Chennai") if user else "Chennai",
            "phone_masked": challenge.phone_number_masked,
        },
        "permissions": sorted(list(ROLE_PERMISSIONS.get(role, set()))),
        "message": f"OTP verified. Authenticated as {role}."
    }

class OtpResendPayload(BaseModel):
    challenge_id: str = Field(..., description="Active challenge ID to resend")

@router.post("/otp/resend")
def resend_otp_challenge(
    payload: OtpResendPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Resends an active OTP challenge respecting 60-second cooldown and rate limits.
    """
    client_ip = get_client_ip(request)
    success, err_msg, challenge, raw_otp = OtpService.resend_challenge(db, payload.challenge_id, client_ip)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "RESEND_FAILED", "message": err_msg}
        )
    db.commit()

    is_prod = settings.APP_ENV == "production"
    demo_otp = raw_otp if (not is_prod and (is_local_dev_environment(client_ip) or challenge.demo_mode)) else None

    return {
        "success": True,
        "data": {
            "challenge_id": challenge.challenge_id,
            "demo_otp": demo_otp,
            "resend_count": challenge.resend_count,
            "message": "Verification code resent."
        }
    }

