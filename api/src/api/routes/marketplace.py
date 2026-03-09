"""Routes marketplace coachs — profils, templates de programmes, achats."""

import json
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, col

from ..db import get_session, set_session_user_id
from ..models import User, CoachProfile, ProgramTemplate, ProgramPurchase
from ..schemas import (
    CoachApplyRequest, CoachProfileRead,
    ProgramTemplateCreate, ProgramTemplateRead, ProgramTemplateDetail,
    ProgramPurchaseRead, CoachDashboard,
)
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

COMMISSION_RATE = 0.20  # 20% commission plateforme


# ═══════════════════════════════════════════════════════════════════════════════
# COACH PROFILES
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/coaches/apply", summary="Devenir coach")
def apply_as_coach(
    body: CoachApplyRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Un utilisateur fait une demande pour devenir coach."""
    existing = session.exec(
        select(CoachProfile).where(CoachProfile.user_id == current_user.id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="already_coach")

    coach = CoachProfile(
        user_id=current_user.id,
        display_name=body.display_name,
        bio=body.bio,
        specialties=json.dumps(body.specialties) if body.specialties else None,
        certifications=json.dumps(body.certifications) if body.certifications else None,
        hourly_rate=body.hourly_rate,
    )
    session.add(coach)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="apply_coach_failed")
    session.refresh(coach)

    return _coach_to_read(coach)


@router.get("/coaches", response_model=list[CoachProfileRead], summary="Lister les coachs")
def list_coaches(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    coaches = session.exec(
        select(CoachProfile)
        .where(CoachProfile.active == True)
        .order_by(col(CoachProfile.rating).desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [_coach_to_read(c) for c in coaches]


@router.get("/coaches/me/dashboard", response_model=CoachDashboard, summary="Dashboard coach")
def coach_dashboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    coach = session.exec(
        select(CoachProfile).where(CoachProfile.user_id == current_user.id)
    ).first()
    if not coach:
        raise HTTPException(status_code=404, detail="not_a_coach")

    # Stats
    templates_count = session.exec(
        select(func.count()).select_from(ProgramTemplate)
        .where(ProgramTemplate.coach_id == coach.id, ProgramTemplate.active == True)
    ).one()

    purchases = session.exec(
        select(ProgramPurchase).where(ProgramPurchase.coach_id == coach.id)
    ).all()

    total_revenue = sum(p.price_cents for p in purchases)
    total_commission = sum(p.commission_cents for p in purchases)

    return CoachDashboard(
        total_sales=len(purchases),
        total_revenue_cents=total_revenue,
        total_commission_cents=total_commission,
        templates_count=templates_count,
        average_rating=coach.rating,
    )


@router.get("/coaches/{coach_id}", response_model=CoachProfileRead, summary="Profil coach")
def get_coach(
    coach_id: str,
    session: Session = Depends(get_session),
):
    coach = session.get(CoachProfile, coach_id)
    if not coach or not coach.active:
        raise HTTPException(status_code=404, detail="coach_not_found")
    return _coach_to_read(coach)


# ═══════════════════════════════════════════════════════════════════════════════
# PROGRAM TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/templates", response_model=ProgramTemplateRead, summary="Créer un template")
def create_template(
    body: ProgramTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    coach = session.exec(
        select(CoachProfile).where(CoachProfile.user_id == current_user.id)
    ).first()
    if not coach:
        raise HTTPException(status_code=403, detail="not_a_coach")

    template = ProgramTemplate(
        coach_id=coach.id,
        title=body.title,
        description=body.description,
        objective=body.objective,
        difficulty_level=body.difficulty_level,
        duration_weeks=body.duration_weeks,
        price_cents=body.price_cents,
        preview_data=body.preview_data,
        full_program_data=body.full_program_data,
    )
    session.add(template)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="create_template_failed")
    session.refresh(template)
    return template


@router.get("/templates", response_model=list[ProgramTemplateRead], summary="Lister les templates")
def list_templates(
    objective: Optional[str] = None,
    difficulty_level: Optional[str] = None,
    max_price_cents: Optional[int] = None,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    query = select(ProgramTemplate).where(ProgramTemplate.active == True)
    if objective:
        query = query.where(ProgramTemplate.objective == objective)
    if difficulty_level:
        query = query.where(ProgramTemplate.difficulty_level == difficulty_level)
    if max_price_cents is not None:
        query = query.where(ProgramTemplate.price_cents <= max_price_cents)
    query = query.order_by(col(ProgramTemplate.purchase_count).desc()).offset(offset).limit(limit)

    templates = session.exec(query).all()
    return templates


@router.get("/templates/{template_id}", response_model=ProgramTemplateDetail, summary="Détail template")
def get_template(
    template_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    template = session.get(ProgramTemplate, template_id)
    if not template or not template.active:
        raise HTTPException(status_code=404, detail="template_not_found")

    # Vérifier si l'utilisateur a acheté ce template ou est le coach
    coach = session.exec(
        select(CoachProfile).where(CoachProfile.user_id == current_user.id)
    ).first()
    is_owner = coach and coach.id == template.coach_id

    has_purchased = session.exec(
        select(ProgramPurchase).where(
            ProgramPurchase.user_id == current_user.id,
            ProgramPurchase.template_id == template_id,
        )
    ).first()

    result = ProgramTemplateDetail(
        id=template.id,
        coach_id=template.coach_id,
        title=template.title,
        description=template.description,
        objective=template.objective,
        difficulty_level=template.difficulty_level,
        duration_weeks=template.duration_weeks,
        price_cents=template.price_cents,
        currency=template.currency,
        purchase_count=template.purchase_count,
        preview_data=template.preview_data,
        created_at=template.created_at,
        full_program_data=template.full_program_data if (is_owner or has_purchased) else None,
    )
    return result


@router.put("/templates/{template_id}", response_model=ProgramTemplateRead, summary="Modifier un template")
def update_template(
    template_id: str,
    body: ProgramTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    template = session.get(ProgramTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="template_not_found")

    coach = session.exec(
        select(CoachProfile).where(CoachProfile.user_id == current_user.id)
    ).first()
    if not coach or coach.id != template.coach_id:
        raise HTTPException(status_code=403, detail="not_template_owner")

    for field in ("title", "description", "objective", "difficulty_level",
                  "duration_weeks", "price_cents", "preview_data", "full_program_data"):
        value = getattr(body, field, None)
        if value is not None:
            setattr(template, field, value)

    session.add(template)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="update_template_failed")
    session.refresh(template)
    return template


# ═══════════════════════════════════════════════════════════════════════════════
# PURCHASES
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/templates/{template_id}/purchase", response_model=ProgramPurchaseRead, summary="Acheter un template")
def purchase_template(
    template_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    template = session.get(ProgramTemplate, template_id)
    if not template or not template.active:
        raise HTTPException(status_code=404, detail="template_not_found")

    # Vérifier si déjà acheté
    existing = session.exec(
        select(ProgramPurchase).where(
            ProgramPurchase.user_id == current_user.id,
            ProgramPurchase.template_id == template_id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="already_purchased")

    commission = math.ceil(template.price_cents * COMMISSION_RATE)

    purchase = ProgramPurchase(
        user_id=current_user.id,
        template_id=template.id,
        coach_id=template.coach_id,
        price_cents=template.price_cents,
        commission_cents=commission,
    )
    session.add(purchase)

    # Incrémenter le compteur d'achats
    template.purchase_count += 1
    session.add(template)

    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="purchase_failed")
    session.refresh(purchase)
    return purchase


@router.get("/purchases", response_model=list[ProgramPurchaseRead], summary="Mes achats")
def my_purchases(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    purchases = session.exec(
        select(ProgramPurchase)
        .where(ProgramPurchase.user_id == current_user.id)
        .order_by(col(ProgramPurchase.created_at).desc())
    ).all()
    return purchases


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _coach_to_read(coach: CoachProfile) -> CoachProfileRead:
    """Convertit un CoachProfile en CoachProfileRead avec parsing JSON."""
    specialties = None
    if coach.specialties:
        try:
            specialties = json.loads(coach.specialties)
        except (json.JSONDecodeError, TypeError):
            specialties = None

    certifications = None
    if coach.certifications:
        try:
            certifications = json.loads(coach.certifications)
        except (json.JSONDecodeError, TypeError):
            certifications = None

    return CoachProfileRead(
        id=coach.id,
        user_id=coach.user_id,
        display_name=coach.display_name,
        bio=coach.bio,
        specialties=specialties,
        certifications=certifications,
        hourly_rate=coach.hourly_rate,
        rating=coach.rating,
        rating_count=coach.rating_count,
        verified=coach.verified,
        created_at=coach.created_at,
    )
