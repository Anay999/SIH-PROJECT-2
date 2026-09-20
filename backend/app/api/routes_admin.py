"""
Admin Management Endpoints for HEATSHIELD AI.
Provides strict role-restricted operations for user provisioning, role adjustments,
account status management, session revocation, audit inspection, and integration health.
Zero Client Trust: Enforced via server-side require_permission dependencies.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db, check_db_health
from app.core.config import settings
from app.core.auth import (
    CurrentActor,
    UserRole,
    ROLE_PERMISSIONS,
    require_permission,
    hash_password,
    record_audit,
)
from app.models.user import User
from app.models.otp import AuthSession
from app.models.audit import AuditLog

router = APIRouter(prefix="/admin", tags=["Admin & User Management"])

# Pydantic Schemas
class CreateUserPayload(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, description="Unique login handle")
    full_name: str = Field(..., min_length=2, max_length=100, description="Official full name")
    role: str = Field(..., description="Role: CITIZEN, MUNICIPAL_OFFICER, ADMIN")
    phone_number: str = Field(..., min_length=10, max_length=20, description="Contact phone with country code")
    city: Optional[str] = Field("Chennai", description="Assigned municipal city jurisdiction")
    email: Optional[str] = Field(None, max_length=100, description="Email address")
    password: str = Field(..., min_length=6, description="Initial temporary or permanent password")

class UpdateUserStatusPayload(BaseModel):
    is_active: bool = Field(..., description="Active state of the user account")

class UpdateUserRolePayload(BaseModel):
    role: str = Field(..., description="Target role: CITIZEN, MUNICIPAL_OFFICER, ADMIN")


@router.get("/users")
def list_users(
    actor: CurrentActor = Depends(require_permission("admin.users.view")),
    db: Session = Depends(get_db)
):
    """
    Lists all platform users with role, status, and activity dates.
    Requires 'admin.users.view' permission.
    """
    users = db.query(User).order_by(desc(User.created_at_utc)).all()
    results = []
    for u in users:
        # Mask phone partially for security, but allow administrative review
        phone_masked = u.phone_number[-4:].rjust(len(u.phone_number), '*') if u.phone_number else "***"
        results.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "city": getattr(u, "city", "Chennai") or "Chennai",
            "phone_masked": phone_masked,
            "phone_number": u.phone_number, # Admin can view unmasked for official communication
            "email": u.email,
            "is_active": u.is_active,
            "phone_verified": u.phone_verified,
            "created_at_utc": u.created_at_utc.isoformat() if u.created_at_utc else None,
            "last_login_at_utc": u.last_login_at_utc.isoformat() if u.last_login_at_utc else None,
            "permissions": sorted(list(ROLE_PERMISSIONS.get(u.role, set())))
        })
    return {"users": results, "total": len(results)}


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: CreateUserPayload,
    actor: CurrentActor = Depends(require_permission("admin.users.create")),
    db: Session = Depends(get_db)
):
    """
    Provisions a new Municipal Officer, Citizen, or Admin account.
    Requires 'admin.users.create' permission.
    """
    target_role = payload.role.strip().upper()
    if target_role not in [UserRole.CITIZEN.value, UserRole.MUNICIPAL_OFFICER.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of CITIZEN, MUNICIPAL_OFFICER, ADMIN."
        )

    # Check for duplicate username
    existing_user = db.query(User).filter(User.username == payload.username.strip().lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{payload.username}' is already in use."
        )

    # Normalize phone
    clean_phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    if not clean_phone.startswith("+"):
        clean_phone = "+91" + clean_phone if len(clean_phone) == 10 else "+" + clean_phone

    # Check for duplicate phone
    existing_phone = db.query(User).filter(User.phone_number == clean_phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mobile number '{clean_phone}' is already registered to '{existing_phone.username}'."
        )

    new_id = f"usr_{uuid.uuid4().hex[:12]}"
    user = User(
        id=new_id,
        username=payload.username.strip().lower(),
        full_name=payload.full_name.strip(),
        phone_number=clean_phone,
        email=payload.email.strip() if payload.email else None,
        password_hash=hash_password(payload.password),
        role=target_role,
        city=payload.city.strip() if payload.city else "Chennai",
        is_active=True,
        phone_verified=True,
        created_at_utc=datetime.now(timezone.utc),
        updated_at_utc=datetime.now(timezone.utc),
    )
    db.add(user)

    # Audit log creation
    record_audit(
        db=db,
        actor=actor,
        action="USER_CREATE",
        entity_type="USER",
        entity_id=new_id,
        previous_state=None,
        new_state={
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "city": user.city,
            "phone_number": clean_phone
        }
    )
    db.commit()

    return {
        "success": True,
        "message": f"Account '{user.username}' successfully provisioned as {user.role} in {user.city}.",
        "user_id": user.id
    }


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: UpdateUserStatusPayload,
    actor: CurrentActor = Depends(require_permission("admin.users.disable")),
    db: Session = Depends(get_db)
):
    """
    Enables or disables a user account.
    If disabled, revokes all active sessions for that user.
    Prevents disabling the last active admin account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    if not payload.is_active:
        # Guard: Check if disabling the last active admin
        if user.role == UserRole.ADMIN.value:
            active_admins = db.query(User).filter(User.role == UserRole.ADMIN.value, User.is_active == True).count()
            if active_admins <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot disable the last active administrator account."
                )

        # Revoke all active sessions
        now_utc = datetime.now(timezone.utc)
        active_sessions = db.query(AuthSession).filter(
            AuthSession.actor_id == user_id,
            AuthSession.revoked_at_utc.is_(None)
        ).all()
        for s in active_sessions:
            s.revoked_at_utc = now_utc

    prev_status = user.is_active
    user.is_active = payload.is_active
    user.updated_at_utc = datetime.now(timezone.utc)

    record_audit(
        db=db,
        actor=actor,
        action="USER_STATUS_CHANGE",
        entity_type="USER",
        entity_id=user.id,
        previous_state={"is_active": prev_status},
        new_state={"is_active": user.is_active}
    )
    db.commit()

    return {
        "success": True,
        "user_id": user.id,
        "is_active": user.is_active,
        "message": f"User '{user.username}' status updated to {'Active' if user.is_active else 'Disabled'}."
    }


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: UpdateUserRolePayload,
    actor: CurrentActor = Depends(require_permission("admin.users.role_change")),
    db: Session = Depends(get_db)
):
    """
    Adjusts a user's role.
    Revokes all active sessions so the user must re-authenticate to acquire new permissions.
    Prevents demoting the last active admin account.
    """
    new_role = payload.role.strip().upper()
    if new_role not in [UserRole.CITIZEN.value, UserRole.MUNICIPAL_OFFICER.value, UserRole.ADMIN.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of CITIZEN, MUNICIPAL_OFFICER, ADMIN."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    if user.role == UserRole.ADMIN.value and new_role != UserRole.ADMIN.value:
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN.value, User.is_active == True).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active administrator account."
            )

    prev_role = user.role
    user.role = new_role
    user.updated_at_utc = datetime.now(timezone.utc)

    # Invalidate existing sessions so the client cannot retain prior permissions
    now_utc = datetime.now(timezone.utc)
    active_sessions = db.query(AuthSession).filter(
        AuthSession.actor_id == user_id,
        AuthSession.revoked_at_utc.is_(None)
    ).all()
    for s in active_sessions:
        s.revoked_at_utc = now_utc

    record_audit(
        db=db,
        actor=actor,
        action="USER_ROLE_CHANGE",
        entity_type="USER",
        entity_id=user.id,
        previous_state={"role": prev_role},
        new_state={"role": new_role, "revoked_sessions": len(active_sessions)}
    )
    db.commit()

    return {
        "success": True,
        "user_id": user.id,
        "role": user.role,
        "revoked_sessions": len(active_sessions),
        "message": f"User '{user.username}' role changed from {prev_role} to {new_role}. Active sessions revoked."
    }


@router.post("/users/{user_id}/revoke-sessions")
def revoke_user_sessions(
    user_id: str,
    actor: CurrentActor = Depends(require_permission("admin.users.session_revoke")),
    db: Session = Depends(get_db)
):
    """
    Forcefully terminates all active sessions for a user.
    Requires 'admin.users.session_revoke' permission.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    now_utc = datetime.now(timezone.utc)
    active_sessions = db.query(AuthSession).filter(
        AuthSession.actor_id == user_id,
        AuthSession.revoked_at_utc.is_(None)
    ).all()

    for s in active_sessions:
        s.revoked_at_utc = now_utc

    record_audit(
        db=db,
        actor=actor,
        action="SESSION_REVOKE_FORCED",
        entity_type="USER",
        entity_id=user_id,
        previous_state=None,
        new_state={"revoked_count": len(active_sessions)}
    )
    db.commit()

    return {
        "success": True,
        "user_id": user_id,
        "revoked_count": len(active_sessions),
        "message": f"Successfully revoked {len(active_sessions)} active session(s) for user '{user.username}'."
    }


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    actor_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    actor: CurrentActor = Depends(require_permission("admin.audit.view")),
    db: Session = Depends(get_db)
):
    """
    Fetches immutable audit logs with optional filters.
    Requires 'admin.audit.view' permission.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(desc(AuditLog.timestamp_utc)).limit(limit).all()

    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "actor_id": l.actor_id,
            "actor_role": l.actor_role,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "timestamp_utc": l.timestamp_utc.isoformat() if l.timestamp_utc else None,
            "previous_state": l.previous_state,
            "new_state": l.new_state,
            "request_id": l.request_id,
            "demo_mode": l.demo_mode
        })

    return {"logs": results, "count": len(results)}


@router.get("/system-health")
def get_admin_system_health(
    actor: CurrentActor = Depends(require_permission("admin.system.view")),
    db: Session = Depends(get_db)
):
    """
    Comprehensive system health diagnostic for administrators.
    Checks DB, active sessions, user counts by role, and external provider statuses.
    Requires 'admin.system.view' permission.
    """
    db_status = check_db_health()
    now_utc = datetime.now(timezone.utc)

    # Active sessions
    active_sessions_count = db.query(AuthSession).filter(
        AuthSession.revoked_at_utc.is_(None),
        AuthSession.expires_at_utc > now_utc
    ).count()

    # Users breakdown
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admins_count = db.query(User).filter(User.role == UserRole.ADMIN.value, User.is_active == True).count()
    officers_count = db.query(User).filter(User.role == UserRole.MUNICIPAL_OFFICER.value, User.is_active == True).count()
    citizens_count = db.query(User).filter(User.role == UserRole.CITIZEN.value, User.is_active == True).count()

    # External Provider Telemetry
    fast2sms_status = "configured" if settings.FAST2SMS_API_KEY else "simulation_fallback"
    callmebot_status = "configured" if settings.CALLMEBOT_API_KEY else "simulation_fallback"

    return {
        "status": "healthy" if db_status["status"] == "connected" else "degraded",
        "timestamp_utc": now_utc.isoformat(),
        "database": db_status,
        "security": {
            "active_sessions": active_sessions_count,
            "total_users": total_users,
            "active_users": active_users,
            "roles_breakdown": {
                "ADMIN": admins_count,
                "MUNICIPAL_OFFICER": officers_count,
                "CITIZEN": citizens_count
            }
        },
        "integrations": {
            "fast2sms_otp": {
                "status": fast2sms_status,
                "provider": "Fast2SMS (India Bulk SMS / DLT)"
            },
            "callmebot_whatsapp": {
                "status": callmebot_status,
                "provider": "CallMeBot Gateway (Official API)"
            },
            "open_meteo": {
                "status": "active",
                "provider": "Open-Meteo High Resolution Weather API"
            },
            "osrm_routing": {
                "status": "active",
                "provider": "OpenStreetMap OSRM Public Routing Engine"
            }
        },
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }
