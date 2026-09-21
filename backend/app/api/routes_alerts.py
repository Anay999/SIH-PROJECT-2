import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_actor, require_roles, CurrentActor, UserRole, record_audit
from app.models.alert_intervention import Alert, Intervention, AlertDeliveryRecord
from app.models.city_ward import Ward, Zone, City
from app.models.user import User
from app.engines.mock_notification import MockNotificationProvider

router = APIRouter(tags=["Alerts & Heat Action Plan"])

# Pydantic Request Models
class AcknowledgeRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Operational acknowledgment notes")

class MockBroadcastRequest(BaseModel):
    alert_id: str
    channel: str = Field("sms", description="'sms' or 'whatsapp'")
    audience: Optional[str] = Field("Outdoor Workers & Vulnerable Residents", description="Target recipient category")

class UpdateInterventionRequest(BaseModel):
    status: str = Field(..., description="Target status: DISPATCHED, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED")
    completion_note: Optional[str] = None
    blocker_reason: Optional[str] = None
    assigned_to: Optional[str] = None

# Envelope Helper
def unified_response(data: Any, request_id: Optional[str] = None) -> Dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "error": null_if_none(),
        "request_id": request_id or f"req_{uuid.uuid4().hex[:10]}",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "display_timezone": "Asia/Kolkata"
    }

def null_if_none():
    return None

VALID_INTERVENTION_TRANSITIONS = {
    "RECOMMENDED": ["DISPATCHED", "CANCELLED"],
    "DISPATCHED": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["COMPLETED", "BLOCKED"],
    "BLOCKED": ["IN_PROGRESS", "CANCELLED"],
    "COMPLETED": [],
    "CANCELLED": ["RECOMMENDED"] # Only admin
}

# --- ALERTS ENDPOINTS ---

@router.get("/alerts")
def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by Advisory, Watch, Warning, Extreme Warning"),
    ward_id: Optional[str] = Query(None, description="Filter by specific ward ID"),
    lifecycle_status: Optional[str] = Query(None, description="Filter by ACTIVE, ACKNOWLEDGED, RESOLVED, EXPIRED"),
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """List active and historical biometeorological alerts."""
    query = db.query(Alert)
    
    if severity:
        query = query.filter(Alert.severity.ilike(severity))
    if ward_id:
        query = query.filter(Alert.ward_id == ward_id)
    if lifecycle_status:
        query = query.filter(Alert.status == lifecycle_status.upper())

    alerts = query.order_by(Alert.issued_at.desc()).all()
    
    result = []
    for a in alerts:
        ward = db.query(Ward).filter(Ward.id == a.ward_id).first()
        result.append({
            "id": a.id,
            "ward_id": a.ward_id,
            "ward_name": ward.name if ward else a.ward_id,
            "severity": a.severity,
            "trigger_metric": a.trigger_metric,
            "status": a.status,
            "escalation_level": a.escalation_level,
            "headline": a.headline,
            "message": a.message,
            "recommended_actions": a.recommended_actions or [],
            "target_audience": a.target_audience,
            "acknowledged": a.acknowledged,
            "acknowledged_at_utc": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "acknowledged_by": a.acknowledged_by,
            "issued_at_utc": a.issued_at.isoformat() if a.issued_at else None,
            "expires_at_utc": a.expires_at.isoformat() if a.expires_at else None,
            "source_pedigree": "HEATSHIELD_DEMO_ALERT_ENGINE"
        })

    return unified_response({
        "alerts_count": len(result),
        "alerts": result,
        "current_actor": {"id": actor.actor_id, "role": actor.role.value}
    })

@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(
    alert_id: str,
    payload: Optional[AcknowledgeRequest] = None,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Acknowledge an active early warning alert.
    Requires OFFICER or ADMIN role. Returns HTTP 409 if already acknowledged.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Actor role '{actor.role.value}' cannot acknowledge alerts. Required: OFFICER or ADMIN."
        )

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert '{alert_id}' not found.")

    # Guard: prevent duplicate acknowledgment without admin override
    if alert.status in ["ACKNOWLEDGED", "RESOLVED"] and actor.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Alert '{alert_id}' is already {alert.status} by '{alert.acknowledged_by}'. Duplicate acknowledgment rejected."
        )

    prev_state = {
        "status": alert.status,
        "acknowledged": alert.acknowledged,
        "acknowledged_by": alert.acknowledged_by,
        "acknowledged_at_utc": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None
    }

    now_utc = datetime.now(timezone.utc)
    alert.acknowledged = True
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = now_utc
    alert.acknowledged_by = actor.actor_id

    new_state = {
        "status": alert.status,
        "acknowledged": alert.acknowledged,
        "acknowledged_by": alert.acknowledged_by,
        "acknowledged_at_utc": now_utc.isoformat(),
        "notes": payload.notes if payload else None
    }

    # Record persistent audit trail
    req_id = f"req_{uuid.uuid4().hex[:10]}"
    record_audit(
        db=db,
        actor=actor,
        action="ACKNOWLEDGE_ALERT",
        entity_type="ALERT",
        entity_id=alert.id,
        previous_state=prev_state,
        new_state=new_state,
        request_id=req_id
    )

    db.commit()

    return unified_response({
        "message": f"Alert '{alert_id}' successfully acknowledged by {actor.actor_id}.",
        "alert_id": alert.id,
        "status": alert.status,
        "acknowledged_at_utc": alert.acknowledged_at.isoformat(),
        "acknowledged_by": alert.acknowledged_by
    }, request_id=req_id)

@router.post("/alerts/send-demo")
async def send_mock_broadcast(
    payload: MockBroadcastRequest,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Execute simulated mock emergency mass notification dispatch (SMS / WhatsApp).
    Safe: 100% local, no real SMS/WhatsApp messages sent.
    Requires OFFICER or ADMIN role.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Actor role '{actor.role.value}' cannot dispatch broadcasts. Required: OFFICER or ADMIN."
        )

    alert = db.query(Alert).filter(Alert.id == payload.alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert '{payload.alert_id}' not found.")

    ward = db.query(Ward).filter(Ward.id == alert.ward_id).first()
    ward_name = ward.name if ward else alert.ward_id

    # 1. Enforce Municipality Boundary Isolation
    officer_city = "Chennai"
    if actor.role != UserRole.ADMIN:
        officer = db.query(User).filter(User.username == actor.actor_id).first()
        if not officer:
            officer = db.query(User).filter(User.id == actor.actor_id).first()
        officer_city = getattr(officer, "city", "Chennai") or "Chennai"

        # Check ward -> zone -> city
        if ward and ward.zone_id:
            zone = db.query(Zone).filter(Zone.id == ward.zone_id).first()
            if zone and zone.city_id:
                city = db.query(City).filter(City.id == zone.city_id).first()
                if city and city.name.strip().lower() != officer_city.strip().lower():
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Municipal boundary violation: Officer jurisdiction is '{officer_city}', cannot dispatch alert to '{city.name}'."
                    )

    # 2. Simulated local broadcast execution
    recipients_est = ward.total_population if ward else 45000
    dispatch_result = await MockNotificationProvider.send_message(
        channel=payload.channel,
        audience=payload.audience or alert.target_audience,
        headline=alert.headline,
        body=alert.message,
        ward_name=ward_name,
        recipients_count_estimate=recipients_est
    )

    # 3. Create persistent delivery record for tracking & retry mechanisms
    delivery_id = f"del_{uuid.uuid4().hex[:10]}"
    delivery_record = AlertDeliveryRecord(
        id=delivery_id,
        alert_id=alert.id,
        channel=payload.channel.upper(),
        municipality=officer_city,
        recipient_type="MUNICIPAL_TARGETED",
        recipient_count=recipients_est,
        status="DELIVERED",
        retry_count=0,
        max_retries=3,
        error_detail=None,
        dispatched_by=actor.actor_id,
        dispatched_at_utc=datetime.now(timezone.utc)
    )
    db.add(delivery_record)

    # 4. Persist audit record
    req_id = f"req_{uuid.uuid4().hex[:10]}"
    record_audit(
        db=db,
        actor=actor,
        action="DISPATCH_MOCK_BROADCAST",
        entity_type="ALERT",
        entity_id=alert.id,
        previous_state={"channel": payload.channel},
        new_state={**dispatch_result, "delivery_id": delivery_id, "municipality": officer_city},
        request_id=req_id
    )
    db.commit()

    return unified_response({
        **dispatch_result,
        "delivery_id": delivery_id,
        "municipality": officer_city,
        "status": "DELIVERED",
        "retry_count": 0
    }, request_id=req_id)


@router.get("/alerts/deliveries")
def get_alert_deliveries(
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Retrieve tracked alert delivery dispatches and status.
    Municipal officers see deliveries within their municipality; Admins see all.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Municipal Officers and Administrators."
        )

    query = db.query(AlertDeliveryRecord)
    if actor.role != UserRole.ADMIN:
        officer = db.query(User).filter(User.username == actor.actor_id).first()
        if not officer:
            officer = db.query(User).filter(User.id == actor.actor_id).first()
        officer_city = getattr(officer, "city", "Chennai") or "Chennai"
        query = query.filter(AlertDeliveryRecord.municipality == officer_city)

    records = query.order_by(AlertDeliveryRecord.dispatched_at_utc.desc()).limit(50).all()
    results = []
    for r in records:
        alert = db.query(Alert).filter(Alert.id == r.alert_id).first()
        results.append({
            "id": r.id,
            "alert_id": r.alert_id,
            "headline": alert.headline if alert else "Municipal Early Warning",
            "channel": r.channel,
            "municipality": r.municipality,
            "recipient_type": r.recipient_type,
            "recipient_count": r.recipient_count,
            "status": r.status,
            "retry_count": r.retry_count,
            "max_retries": r.max_retries,
            "error_detail": r.error_detail,
            "dispatched_by": r.dispatched_by,
            "dispatched_at_utc": r.dispatched_at_utc.isoformat() if r.dispatched_at_utc else None,
            "last_retry_at_utc": r.last_retry_at_utc.isoformat() if r.last_retry_at_utc else None,
        })

    return unified_response({"deliveries": results, "count": len(results)})


@router.post("/alerts/deliveries/{delivery_id}/retry")
def retry_alert_delivery(
    delivery_id: str,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Retry a failed or pending alert dispatch with backoff limit.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Municipal Officers and Administrators."
        )

    record = db.query(AlertDeliveryRecord).filter(AlertDeliveryRecord.id == delivery_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Delivery record '{delivery_id}' not found.")

    if record.retry_count >= record.max_retries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum retry attempts ({record.max_retries}) reached for this broadcast."
        )

    record.retry_count += 1
    record.status = "DELIVERED"
    record.last_retry_at_utc = datetime.now(timezone.utc)
    record.error_detail = None

    req_id = f"req_{uuid.uuid4().hex[:10]}"
    record_audit(
        db=db,
        actor=actor,
        action="RETRY_ALERT_BROADCAST",
        entity_type="ALERT_DELIVERY",
        entity_id=record.id,
        previous_state={"retry_count": record.retry_count - 1},
        new_state={"retry_count": record.retry_count, "status": record.status},
        request_id=req_id
    )
    db.commit()

    return unified_response({
        "message": f"Broadcast retry #{record.retry_count} executed successfully.",
        "delivery_id": record.id,
        "status": record.status,
        "retry_count": record.retry_count
    }, request_id=req_id)


# --- HEAT ACTION PLAN (INTERVENTIONS) ENDPOINTS ---

@router.get("/interventions")
def get_interventions(
    department: Optional[str] = Query(None, description="Filter by Public Health, Labor & Outdoor Work, Municipal Cooling, Power & Water"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by RECOMMENDED, DISPATCHED, IN_PROGRESS, COMPLETED, BLOCKED"),
    ward_id: Optional[str] = Query(None, description="Filter by Ward ID"),
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """List Heat Action Plan departmental directives."""
    if not (actor.has_permission("action_plan.view") or actor.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access restricted. Role '{actor.role.value}' does not have permission 'action_plan.view'."
        )
    query = db.query(Intervention)
    
    if department and department.lower() != "all":
        query = query.filter(Intervention.department.ilike(f"%{department}%"))
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Intervention.status.ilike(status_filter))
    if ward_id:
        query = query.filter(Intervention.ward_id == ward_id)

    interventions = query.order_by(Intervention.updated_at.desc()).all()

    items = []
    for it in interventions:
        ward = db.query(Ward).filter(Ward.id == it.ward_id).first()
        items.append({
            "id": it.id,
            "ward_id": it.ward_id,
            "ward_name": ward.name if ward else it.ward_id,
            "department": it.department,
            "action_name": it.action_name,
            "priority": it.priority,
            "urgency": it.urgency,
            "status": it.status,
            "assigned_to": it.assigned_to,
            "due_at_utc": it.due_at_utc.isoformat() if it.due_at_utc else None,
            "deadline_utc": it.deadline.isoformat() if it.deadline else None,
            "reason": it.reason,
            "completion_note": it.completion_note,
            "blocker_reason": it.blocker_reason,
            "updated_by": it.updated_by,
            "updated_at_utc": it.updated_at.isoformat() if it.updated_at else None,
            "allowed_next_statuses": VALID_INTERVENTION_TRANSITIONS.get(it.status, [])
        })

    return unified_response({
        "interventions_count": len(items),
        "interventions": items,
        "current_actor": {"id": actor.actor_id, "role": actor.role.value}
    })

@router.patch("/interventions/{intervention_id}")
def update_intervention(
    intervention_id: str,
    payload: UpdateInterventionRequest,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Transition intervention status along validated Heat Action Plan workflow.
    Requires DEPARTMENT_LEAD, OFFICER, or ADMIN role. Returns HTTP 409 on invalid transition.
    """
    if actor.role not in [UserRole.DEPARTMENT_LEAD, UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Actor role '{actor.role.value}' cannot update interventions. Required: DEPARTMENT_LEAD, OFFICER, or ADMIN."
        )

    it = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not it:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Intervention '{intervention_id}' not found.")

    target_status = payload.status.upper()
    current_status = it.status.upper()

    # Validate state transition rules
    allowed = VALID_INTERVENTION_TRANSITIONS.get(current_status, [])
    if target_status not in allowed and actor.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid workflow transition from '{current_status}' to '{target_status}'. Allowed transitions: {allowed}"
        )

    prev_state = {
        "status": it.status,
        "completion_note": it.completion_note,
        "blocker_reason": it.blocker_reason,
        "assigned_to": it.assigned_to,
        "updated_by": it.updated_by
    }

    now_utc = datetime.now(timezone.utc)
    it.status = target_status
    it.updated_at = now_utc
    it.updated_by = actor.actor_id

    if payload.completion_note:
        it.completion_note = payload.completion_note
    if payload.blocker_reason:
        it.blocker_reason = payload.blocker_reason
    if payload.assigned_to:
        it.assigned_to = payload.assigned_to

    new_state = {
        "status": it.status,
        "completion_note": it.completion_note,
        "blocker_reason": it.blocker_reason,
        "assigned_to": it.assigned_to,
        "updated_by": it.updated_by
    }

    # Audit log
    req_id = f"req_{uuid.uuid4().hex[:10]}"
    record_audit(
        db=db,
        actor=actor,
        action="UPDATE_INTERVENTION",
        entity_type="INTERVENTION",
        entity_id=it.id,
        previous_state=prev_state,
        new_state=new_state,
        request_id=req_id
    )

    db.commit()

    return unified_response({
        "message": f"Intervention '{intervention_id}' transitioned to '{target_status}'.",
        "id": it.id,
        "status": it.status,
        "completion_note": it.completion_note,
        "blocker_reason": it.blocker_reason,
        "updated_at_utc": it.updated_at.isoformat(),
        "updated_by": it.updated_by
    }, request_id=req_id)
