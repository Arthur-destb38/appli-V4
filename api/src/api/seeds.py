from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlmodel import Session
from sqlmodel import delete
from sqlmodel import select

from .db import get_engine
from .db import init_db
from .models import Exercise, Share, User, Workout, WorkoutExercise, Set, Story
from .utils.slug import make_exercise_slug


@dataclass(frozen=True)
class SeedExercise:
    name: str
    muscle_group: str
    equipment: str
    description: str
    source_type: str = "local"
    source_value: Optional[str] = None


SEED_EXERCISES: tuple[SeedExercise, ...] = (
    SeedExercise(
        name="Squat",
        muscle_group="legs",
        equipment="barbell",
        description="Back squat focusing on quads and glutes.",
    ),
    SeedExercise(
        name="Deadlift",
        muscle_group="posterior_chain",
        equipment="barbell",
        description="Conventional deadlift from the floor.",
    ),
    SeedExercise(
        name="Bench Press",
        muscle_group="chest",
        equipment="barbell",
        description="Flat bench press with barbell.",
    ),
    SeedExercise(
        name="Overhead Press",
        muscle_group="shoulders",
        equipment="barbell",
        description="Standing press with full lockout overhead.",
    ),
    SeedExercise(
        name="Bent-Over Row",
        muscle_group="back",
        equipment="barbell",
        description="Row focusing on mid-back engagement.",
    ),
    SeedExercise(
        name="Pull-Up",
        muscle_group="back",
        equipment="bodyweight",
        description="Pronated grip pull-up to bar.",
    ),
    SeedExercise(
        name="Dip",
        muscle_group="chest",
        equipment="bodyweight",
        description="Parallel bar dips with upright torso.",
    ),
    SeedExercise(
        name="Lunge",
        muscle_group="legs",
        equipment="dumbbell",
        description="Alternating walking lunges.",
    ),
    SeedExercise(
        name="Romanian Deadlift",
        muscle_group="posterior_chain",
        equipment="barbell",
        description="Hip hinge Romanian deadlift.",
    ),
    SeedExercise(
        name="Lat Pulldown",
        muscle_group="back",
        equipment="machine",
        description="Wide grip pulldown to chest.",
    ),
    SeedExercise(
        name="Cable Row",
        muscle_group="back",
        equipment="machine",
        description="Seated cable row with neutral grip.",
    ),
    SeedExercise(
        name="Leg Press",
        muscle_group="legs",
        equipment="machine",
        description="45-degree sled leg press.",
    ),
    SeedExercise(
        name="Calf Raise",
        muscle_group="calves",
        equipment="machine",
        description="Standing calf raise machine.",
    ),
    SeedExercise(
        name="Bicep Curl",
        muscle_group="arms",
        equipment="dumbbell",
        description="Alternating dumbbell curl.",
    ),
    SeedExercise(
        name="Tricep Extension",
        muscle_group="arms",
        equipment="cable",
        description="Cable rope tricep pushdown.",
    ),
)


def seed_exercises(force: bool = False) -> int:
    """Populate the database with default exercises.

    Args:
        force: if True, truncate existing exercises before inserting.

    Returns:
        The number of exercises inserted.
    """

    init_db()
    engine = get_engine()
    with Session(engine) as session:
        if force:
            session.exec(delete(Exercise))
            session.commit()

        existing_count = session.exec(select(func.count()).select_from(Exercise)).one()
        if existing_count >= len(SEED_EXERCISES):
            return 0

        for item in SEED_EXERCISES:
            data = item.__dict__.copy()
            data["slug"] = make_exercise_slug(item.name, item.muscle_group)
            # Ajouter une catégorie basée sur le muscle_group
            data["category"] = item.muscle_group
            # Supprimer les champs qui ne sont pas dans le modèle Exercise
            data.pop("description", None)
            data.pop("source_type", None)
            data.pop("source_value", None)
            session.add(Exercise(**data))
        session.commit()
        return len(SEED_EXERCISES)


def seed_virtual_user_feed(force: bool = False) -> None:
    """Create a virtual user sharing workouts (2 séances visibles dans le feed)."""
    init_db()
    engine = get_engine()
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        if force:
            session.exec(delete(Share))
            session.exec(delete(Set))
            session.exec(delete(WorkoutExercise))
            session.exec(delete(Workout))
            session.commit()

        user = session.get(User, "virtual-bot")
        if user is None:
            user = User(
                id="virtual-bot",
                username="CoachBot",
                consent_to_public_share=True,
                created_at=now,
            )
            session.add(user)
            session.commit()

        current_shares = session.exec(
            select(func.count()).select_from(Share).where(Share.owner_id == user.id)
        ).one()
        if current_shares >= 2:
            return

        exercises = session.exec(select(Exercise)).all()
        if not exercises:
            raise RuntimeError("Seed exercises first.")

        def get_ex(slug_prefix: str, default_idx: int = 0) -> Exercise:
            for ex in exercises:
                if ex.slug.startswith(slug_prefix):
                    return ex
            return exercises[default_idx]

        # Séance 1 : Full body
        full_body_exos = [
            get_ex("squat"),
            get_ex("bench-press", 1),
            get_ex("bent-over-row", 2),
        ]
        # Séance 2 : Push
        push_exos = [
            get_ex("overhead-press", 0),
            get_ex("dip", 1),
            get_ex("tricep-extension", 2),
        ]

        def create_shared_workout(title: str, exos: list[Exercise], share_id: str):
            wk = Workout(
                client_id=None,
                title=title,
                status="completed",
                created_at=now,
                updated_at=now,
            )
            session.add(wk)
            session.flush()

            snapshot_exos = []
            set_count = 0
            for idx, ex in enumerate(exos):
                w_exo = WorkoutExercise(
                    client_id=None,
                    workout_id=wk.id,
                    exercise_id=ex.id,
                    order_index=idx,
                    created_at=now,
                    updated_at=now,
                )
                session.add(w_exo)
                session.flush()

                sets_payload = [
                    Set(
                        client_id=None,
                        workout_exercise_id=w_exo.id,
                        reps=10,
                        weight=40 + idx * 5,
                        created_at=now,
                        updated_at=now,
                    ),
                    Set(
                        client_id=None,
                        workout_exercise_id=w_exo.id,
                        reps=8,
                        weight=45 + idx * 5,
                        created_at=now,
                        updated_at=now,
                    ),
                ]
                for s in sets_payload:
                    session.add(s)
                set_count += len(sets_payload)

                snapshot_exos.append(
                    {
                        "slug": ex.slug,
                        "name": ex.name,
                        "muscle_group": ex.muscle_group,
                        "planned_sets": len(sets_payload),
                        "sets": [{"reps": s.reps, "weight": s.weight} for s in sets_payload],
                    }
                )

            session.commit()
            share = Share(
                share_id=share_id,
                owner_id=user.id,
                owner_username=user.username,
                workout_title=wk.title,
                exercise_count=len(exos),
                set_count=set_count,
                snapshot={
                    "workout_id": wk.id,
                    "title": wk.title,
                    "status": wk.status,
                    "created_at": wk.created_at.isoformat(),
                    "updated_at": wk.updated_at.isoformat(),
                    "exercises": snapshot_exos,
                },
                created_at=now,
            )
            session.add(share)
            session.commit()

        create_shared_workout("Full body virtuel", full_body_exos, "sh_virtual_fullbody")
        create_shared_workout("Push virtuel", push_exos, "sh_virtual_push")

        # Stories démo
        session.exec(delete(Story).where(Story.owner_id == user.id))
        session.commit()
        stories = [
            Story(
                owner_id=user.id,
                owner_username=user.username,
                media_url="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
                title="Recette post-workout",
                link="https://www.allrecipes.com/recipe/24074/black-bean-and-corn-salad-ii/",
                created_at=now,
            ),
            Story(
                owner_id=user.id,
                owner_username=user.username,
                media_url="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
                title="Routine mobilité",
                link="https://www.youtube.com/results?search_query=mobility+routine",
                created_at=now,
            ),
            Story(
                owner_id=user.id,
                owner_username=user.username,
                media_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
                title="Astuce récup",
                link="https://www.healthline.com/nutrition/post-workout-recovery",
                created_at=now,
            ),
        ]
        session.add_all(stories)
        session.commit()
