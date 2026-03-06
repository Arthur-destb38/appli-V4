"""Endpoint pour seeder les données de démo."""
import uuid
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter
from sqlmodel import Session, select

from api.db import get_engine
from api.models import (
    User, Share, Follower, Workout, WorkoutExercise, 
    Set, Exercise, Like, Notification, Comment, Conversation, Message
)

router = APIRouter(prefix="/seed", tags=["seed"])


def get_exercises_by_muscle(session: Session) -> dict:
    """Récupère les exercices groupés par groupe musculaire."""
    exercises = session.exec(select(Exercise)).all()
    by_muscle = {}
    
    muscle_mapping = {
        "pectorals": "chest", "upper pectorals": "chest", "lower pectorals": "chest",
        "mid pectorals": "chest", "pectorals (sternal head)": "chest",
        "pectorals (clavicular head)": "chest",
        "anterior deltoids": "shoulders", "lateral deltoids": "shoulders",
        "posterior deltoids": "shoulders", "rear deltoids": "shoulders",
        "deltoids": "shoulders", "deltoids (anterior, medial)": "shoulders",
        "deltoids (lateral, posterior)": "shoulders", "rear delts": "shoulders",
        "lats": "back", "mid back": "back", "upper trapezius": "back",
        "trapezius (upper)": "back",
        "triceps": "triceps", "triceps (medial, lateral)": "triceps",
        "triceps (lateral head)": "triceps", "triceps (long head)": "triceps",
        "biceps brachii": "biceps", "brachialis": "biceps",
        "biceps (long head)": "biceps", "biceps (short head)": "biceps",
        "quadriceps": "quadriceps", "quadriceps,glutes": "quadriceps",
        "hamstrings": "hamstrings", "glutes,hamstrings": "hamstrings",
        "glutes": "glutes", "gluteus medius": "glutes", "adductors": "glutes",
        "calves": "calves", "soleus": "calves", "gastrocnemius": "calves",
        "tibialis anterior": "calves",
        "rectus abdominis": "core", "obliques": "core", "lower abs": "core",
        "grip,traps,core": "core",
        "forearms": "forearms",
    }
    
    for ex in exercises:
        original = (ex.muscle_group or "other").lower()
        simplified = muscle_mapping.get(original, original)
        if simplified not in by_muscle:
            by_muscle[simplified] = []
        by_muscle[simplified].append(ex)
    
    return by_muscle


def create_workout_with_exercises(
    session: Session,
    user_id: str,
    title: str,
    exercises_config: list[dict],
    hours_ago: int,
    exercises_by_muscle: dict,
) -> tuple[str, int, int]:
    """Crée une séance avec exercices et sets."""
    workout_time = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    workout = Workout(
        user_id=user_id,
        title=title,
        status="completed",
        started_at=workout_time - timedelta(minutes=random.randint(45, 90)),
        ended_at=workout_time,
        created_at=workout_time,
        updated_at=workout_time,
    )
    session.add(workout)
    session.flush()
    
    total_exercises = 0
    total_sets = 0
    
    for idx, config in enumerate(exercises_config):
        muscle = config["muscle"].lower()
        available = exercises_by_muscle.get(muscle, [])
        
        if not available:
            all_exercises = [ex for exs in exercises_by_muscle.values() for ex in exs]
            if not all_exercises:
                continue
            exercise = random.choice(all_exercises)
        else:
            exercise = random.choice(available)
        
        workout_exercise = WorkoutExercise(
            workout_id=workout.id,
            exercise_id=exercise.id,
            order_index=idx,
            planned_sets=config["sets"],
        )
        session.add(workout_exercise)
        session.flush()
        
        total_exercises += 1
        
        for set_idx in range(config["sets"]):
            reps_range = config.get("reps", (8, 12))
            weight_range = config.get("weight", (20, 60))
            
            workout_set = Set(
                workout_exercise_id=workout_exercise.id,
                order=set_idx,
                reps=random.randint(reps_range[0], reps_range[1]),
                weight=round(random.uniform(weight_range[0], weight_range[1]), 1),
                rpe=round(random.uniform(7, 9.5), 1),
                completed=True,
                done_at=workout_time - timedelta(minutes=random.randint(5, 60)),
            )
            session.add(workout_set)
            total_sets += 1
    
    return workout.id, total_exercises, total_sets


@router.post("/demo")
def seed_demo_data():
    """Seed les données de démo (utilisateurs, séances, likes, commentaires, etc.)."""
    engine = get_engine()
    
    with Session(engine) as session:
        exercises_by_muscle = get_exercises_by_muscle(session)
        
        exercise_count = sum(len(v) for v in exercises_by_muscle.values())
        
        # Utilisateurs de démo
        users_data = [
            {"id": "demo-user-1", "username": "FitGirl_Marie", "email": "fitgirl.marie@demo.local",
             "bio": "Coach fitness 💪 Paris | Objectif: inspirer les autres", "objective": "Hypertrophie",
             "avatar_url": "https://i.pravatar.cc/150?u=marie"},
            {"id": "demo-user-2", "username": "MuscleBro_Tom", "email": "musclebro.tom@demo.local",
             "bio": "Powerlifter | 5 ans d'expérience | Never skip leg day 🦵", "objective": "Force",
             "avatar_url": "https://i.pravatar.cc/150?u=tom"},
            {"id": "demo-user-3", "username": "Coach_Alex", "email": "coach.alex@demo.local",
             "bio": "Coach certifié | Spécialiste perte de poids & renfo", "objective": "Perte de poids",
             "avatar_url": "https://i.pravatar.cc/150?u=alex"},
            {"id": "demo-user-4", "username": "Iron_Sophie", "email": "iron.sophie@demo.local",
             "bio": "CrossFit addict 🏋️‍♀️ | Marseille | WOD everyday", "objective": "Endurance",
             "avatar_url": "https://i.pravatar.cc/150?u=sophie"},
            {"id": "demo-user-5", "username": "Yoga_Lucas", "email": "yoga.lucas@demo.local",
             "bio": "Mobilité & force 🧘 | Yoga + Musculation = combo parfait", "objective": "Remise en forme",
             "avatar_url": "https://i.pravatar.cc/150?u=lucas"},
            {"id": "demo-user-6", "username": "RunnerPro_Emma", "email": "runner.emma@demo.local",
             "bio": "Marathon runner 🏃‍♀️ | Semi-marathon 1h28 | Lyon", "objective": "Endurance",
             "avatar_url": "https://i.pravatar.cc/150?u=emma"},
            {"id": "demo-user-7", "username": "BigLift_Max", "email": "biglift.max@demo.local",
             "bio": "Deadlift 250kg 🔥 | Squat 200kg | Bench 150kg", "objective": "Force",
             "avatar_url": "https://i.pravatar.cc/150?u=max"},
            {"id": "demo-user-8", "username": "Fitlife_Julie", "email": "fitlife.julie@demo.local",
             "bio": "Transformation -25kg ✨ | Partage mon parcours fitness", "objective": "Perte de poids",
             "avatar_url": "https://i.pravatar.cc/150?u=julie"},
            {"id": "demo-user-9", "username": "GymRat_Antoine", "email": "gymrat.antoine@demo.local",
             "bio": "6x/semaine à la salle 💪 | Bodybuilding naturel", "objective": "Hypertrophie",
             "avatar_url": "https://i.pravatar.cc/150?u=antoine"},
            {"id": "demo-user-10", "username": "Strong_Léa", "email": "strong.lea@demo.local",
             "bio": "Haltérophilie & Crossfit 🏆 | Bordeaux | Comp Level", "objective": "Force",
             "avatar_url": "https://i.pravatar.cc/150?u=lea"},
            {"id": "guest-user", "username": "Moi", "email": "guest@demo.local",
             "bio": None, "objective": None, "avatar_url": None},
        ]
        
        created_users = 0
        for user_data in users_data:
            existing = session.get(User, user_data["id"])
            if existing:
                existing.bio = user_data.get("bio")
                existing.objective = user_data.get("objective")
                existing.avatar_url = user_data.get("avatar_url")
                session.add(existing)
            else:
                user = User(
                    id=user_data["id"],
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash="demo_hash_not_for_login",
                    consent_to_public_share=True,
                    bio=user_data.get("bio"),
                    objective=user_data.get("objective"),
                    avatar_url=user_data.get("avatar_url"),
                )
                session.add(user)
                created_users += 1
        
        session.commit()
        
        # Séances de démo
        workouts_config = [
            {"owner_id": "demo-user-1", "owner_username": "FitGirl_Marie", "title": "Push Day - Week 4 💪", "hours_ago": 2,
             "exercises": [
                 {"muscle": "chest", "sets": 4, "reps": (8, 12), "weight": (30, 50)},
                 {"muscle": "chest", "sets": 4, "reps": (10, 15), "weight": (20, 35)},
                 {"muscle": "shoulders", "sets": 3, "reps": (10, 12), "weight": (8, 15)},
                 {"muscle": "triceps", "sets": 4, "reps": (10, 15), "weight": (15, 30)},
             ]},
            {"owner_id": "demo-user-2", "owner_username": "MuscleBro_Tom", "title": "Leg Day Intense 🦵", "hours_ago": 5,
             "exercises": [
                 {"muscle": "quadriceps", "sets": 5, "reps": (5, 8), "weight": (100, 160)},
                 {"muscle": "hamstrings", "sets": 4, "reps": (10, 12), "weight": (60, 100)},
                 {"muscle": "glutes", "sets": 4, "reps": (12, 15), "weight": (40, 80)},
                 {"muscle": "calves", "sets": 4, "reps": (15, 20), "weight": (60, 100)},
             ]},
            {"owner_id": "demo-user-3", "owner_username": "Coach_Alex", "title": "Full Body Express ⚡", "hours_ago": 8,
             "exercises": [
                 {"muscle": "chest", "sets": 3, "reps": (10, 15), "weight": (40, 60)},
                 {"muscle": "back", "sets": 3, "reps": (10, 12), "weight": (50, 80)},
                 {"muscle": "quadriceps", "sets": 3, "reps": (12, 15), "weight": (60, 100)},
                 {"muscle": "core", "sets": 2, "reps": (15, 20), "weight": (0, 10)},
             ]},
            {"owner_id": "demo-user-4", "owner_username": "Iron_Sophie", "title": "WOD Murph 🔥", "hours_ago": 3,
             "exercises": [
                 {"muscle": "chest", "sets": 10, "reps": (10, 10), "weight": (0, 0)},
                 {"muscle": "back", "sets": 10, "reps": (5, 5), "weight": (0, 0)},
                 {"muscle": "quadriceps", "sets": 10, "reps": (15, 15), "weight": (0, 0)},
             ]},
            {"owner_id": "demo-user-7", "owner_username": "BigLift_Max", "title": "Deadlift Day 💀", "hours_ago": 18,
             "exercises": [
                 {"muscle": "back", "sets": 5, "reps": (1, 3), "weight": (200, 250)},
                 {"muscle": "back", "sets": 4, "reps": (5, 8), "weight": (140, 180)},
                 {"muscle": "hamstrings", "sets": 4, "reps": (8, 10), "weight": (80, 120)},
             ]},
            {"owner_id": "demo-user-8", "owner_username": "Fitlife_Julie", "title": "Full Body Brûle-Graisse 🔥", "hours_ago": 20,
             "exercises": [
                 {"muscle": "chest", "sets": 3, "reps": (15, 20), "weight": (10, 20)},
                 {"muscle": "back", "sets": 3, "reps": (15, 20), "weight": (20, 35)},
                 {"muscle": "quadriceps", "sets": 3, "reps": (15, 20), "weight": (30, 50)},
                 {"muscle": "core", "sets": 3, "reps": (20, 30), "weight": (0, 5)},
             ]},
            {"owner_id": "demo-user-9", "owner_username": "GymRat_Antoine", "title": "Arms Day 💪", "hours_ago": 30,
             "exercises": [
                 {"muscle": "biceps", "sets": 4, "reps": (10, 12), "weight": (14, 22)},
                 {"muscle": "triceps", "sets": 4, "reps": (10, 12), "weight": (25, 40)},
                 {"muscle": "forearms", "sets": 3, "reps": (15, 20), "weight": (15, 25)},
             ]},
            {"owner_id": "demo-user-10", "owner_username": "Strong_Léa", "title": "Snatch & Clean 🏋️", "hours_ago": 36,
             "exercises": [
                 {"muscle": "quadriceps", "sets": 5, "reps": (2, 3), "weight": (70, 90)},
                 {"muscle": "shoulders", "sets": 4, "reps": (5, 8), "weight": (40, 60)},
                 {"muscle": "back", "sets": 4, "reps": (6, 8), "weight": (80, 110)},
             ]},
        ]
        
        created_shares = 0
        for config in workouts_config:
            workout_id, exercise_count_w, set_count = create_workout_with_exercises(
                session=session,
                user_id=config["owner_id"],
                title=config["title"],
                exercises_config=config["exercises"],
                hours_ago=config["hours_ago"],
                exercises_by_muscle=exercises_by_muscle,
            )
            
            share = Share(
                share_id=f"sh_{uuid.uuid4().hex[:12]}",
                owner_id=config["owner_id"],
                owner_username=config["owner_username"],
                workout_id=workout_id,
                workout_title=config["title"],
                exercise_count=exercise_count_w,
                set_count=set_count,
                created_at=datetime.now(timezone.utc) - timedelta(hours=config["hours_ago"]),
            )
            session.add(share)
            created_shares += 1
        
        session.commit()
        
        # Follows
        follow_relations = [
            ("guest-user", "demo-user-1"), ("guest-user", "demo-user-2"),
            ("guest-user", "demo-user-3"), ("guest-user", "demo-user-4"),
            ("guest-user", "demo-user-7"), ("demo-user-1", "demo-user-2"),
            ("demo-user-2", "demo-user-7"), ("demo-user-3", "demo-user-1"),
        ]
        
        created_follows = 0
        for follower_id, followed_id in follow_relations:
            existing = session.exec(
                select(Follower)
                .where(Follower.follower_id == follower_id)
                .where(Follower.followed_id == followed_id)
            ).first()
            if not existing:
                session.add(Follower(follower_id=follower_id, followed_id=followed_id))
                created_follows += 1
        
        session.commit()
        
        # Likes
        all_shares = session.exec(select(Share)).all()
        all_user_ids = [u["id"] for u in users_data if u["id"] != "guest-user"]
        
        created_likes = 0
        for share in all_shares:
            num_likes = random.randint(2, 8)
            likers = random.sample(all_user_ids, min(num_likes, len(all_user_ids)))
            if share.owner_id in likers:
                likers.remove(share.owner_id)
            
            for liker_id in likers:
                existing_like = session.exec(
                    select(Like)
                    .where(Like.share_id == share.share_id)
                    .where(Like.user_id == liker_id)
                ).first()
                
                if not existing_like:
                    like = Like(
                        share_id=share.share_id,
                        user_id=liker_id,
                        created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 24)),
                    )
                    session.add(like)
                    created_likes += 1
        
        session.commit()
        
        # Comments
        comment_templates = [
            "Super séance ! 💪", "Bien joué, continue comme ça !",
            "Impressionnant ! 🔥", "T'es une machine 💪💪",
            "GG pour cette perf !", "Inspirant !",
            "Belle progression !", "Les gains arrivent 📈",
        ]
        
        user_comments_map = {
            "demo-user-1": "FitGirl_Marie", "demo-user-2": "MuscleBro_Tom",
            "demo-user-3": "Coach_Alex", "demo-user-4": "Iron_Sophie",
            "demo-user-7": "BigLift_Max", "demo-user-8": "Fitlife_Julie",
        }
        
        created_comments = 0
        for share in all_shares:
            num_comments = random.randint(1, 4)
            commenters = random.sample(list(user_comments_map.keys()), min(num_comments, len(user_comments_map)))
            if share.owner_id in commenters:
                commenters.remove(share.owner_id)
            
            for commenter_id in commenters:
                comment = Comment(
                    share_id=share.share_id,
                    user_id=commenter_id,
                    username=user_comments_map[commenter_id],
                    content=random.choice(comment_templates),
                    created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 48)),
                )
                session.add(comment)
                created_comments += 1
        
        session.commit()
        
        # Notifications
        notifications_data = [
            {"type": "like", "actor_id": "demo-user-1", "actor_username": "FitGirl_Marie", 
             "message": "a aimé ta séance", "hours_ago": 1},
            {"type": "follow", "actor_id": "demo-user-4", "actor_username": "Iron_Sophie",
             "message": "a commencé à te suivre", "hours_ago": 2},
            {"type": "comment", "actor_id": "demo-user-2", "actor_username": "MuscleBro_Tom",
             "message": "a commenté : \"Belle perf ! 💪\"", "hours_ago": 5},
        ]
        
        created_notifications = 0
        for notif_data in notifications_data:
            notif = Notification(
                user_id="guest-user",
                type=notif_data["type"],
                actor_id=notif_data["actor_id"],
                actor_username=notif_data["actor_username"],
                message=notif_data["message"],
                read=False,
                created_at=datetime.now(timezone.utc) - timedelta(hours=notif_data["hours_ago"]),
            )
            session.add(notif)
            created_notifications += 1
        
        session.commit()
        
        return {
            "status": "success",
            "message": "Données de démo créées avec succès !",
            "details": {
                "exercises_available": exercise_count,
                "users_created": created_users,
                "workouts_shared": created_shares,
                "follows_created": created_follows,
                "likes_created": created_likes,
                "comments_created": created_comments,
                "notifications_created": created_notifications,
            }
        }


@router.post("/messages")
def seed_messages_data(user_id: str = "guest-user"):
    """Seed des conversations et messages de démo pour un utilisateur spécifique."""
    engine = get_engine()
    
    # Utiliser l'user_id fourni comme "moi" dans les conversations
    my_id = user_id
    
    with Session(engine) as session:
        # S'assurer que les utilisateurs de démo existent
        demo_users = [
            {"id": "demo-user-1", "username": "FitGirl_Marie", "bio": "Coach fitness 💪 Paris", "avatar_url": "https://i.pravatar.cc/150?u=marie"},
            {"id": "demo-user-2", "username": "MuscleBro_Tom", "bio": "Powerlifter | Never skip leg day 🦵", "avatar_url": "https://i.pravatar.cc/150?u=tom"},
            {"id": "demo-user-3", "username": "Coach_Alex", "bio": "Coach certifié | Spécialiste renfo", "avatar_url": "https://i.pravatar.cc/150?u=alex"},
            {"id": "demo-user-4", "username": "Iron_Sophie", "bio": "CrossFit addict 🏋️‍♀️ Marseille", "avatar_url": "https://i.pravatar.cc/150?u=sophie"},
            {"id": "demo-user-7", "username": "BigLift_Max", "bio": "Deadlift 250kg 🔥", "avatar_url": "https://i.pravatar.cc/150?u=max"},
        ]
        
        for u in demo_users:
            existing = session.get(User, u["id"])
            if not existing:
                user = User(
                    id=u["id"],
                    username=u["username"],
                    email=f"{u['id']}@demo.local",
                    password_hash="demo_hash",
                    consent_to_public_share=True,
                    bio=u.get("bio"),
                    avatar_url=u.get("avatar_url"),
                )
                session.add(user)
            else:
                # Mettre à jour les infos existantes
                existing.bio = u.get("bio")
                existing.avatar_url = u.get("avatar_url")
        
        session.commit()
        
        # Conversations et messages de démo
        conversations_data = [
            {
                "participant_id": "demo-user-1",
                "messages": [
                    {"sender": "demo-user-1", "content": "Salut ! J'ai vu ta séance d'hier, impressionnant ! 💪", "mins_ago": 45},
                    {"sender": "ME", "content": "Merci ! J'essaie de progresser régulièrement", "mins_ago": 40},
                    {"sender": "demo-user-1", "content": "Tu fais combien au développé couché maintenant ?", "mins_ago": 35},
                    {"sender": "ME", "content": "Je suis à 80kg pour 8 reps, et toi ?", "mins_ago": 30},
                    {"sender": "demo-user-1", "content": "Nice ! Moi 60kg mais je progresse 📈 On pourrait s'entraîner ensemble un de ces jours ?", "mins_ago": 25},
                    {"sender": "ME", "content": "Carrément ! Tu vas à quelle salle ?", "mins_ago": 15},
                    {"sender": "demo-user-1", "content": "Basic Fit République, toi ?", "mins_ago": 5},
                ],
            },
            {
                "participant_id": "demo-user-2",
                "messages": [
                    {"sender": "demo-user-2", "content": "Hey ! T'as essayé le programme 5x5 dont je t'ai parlé ?", "mins_ago": 180},
                    {"sender": "ME", "content": "Pas encore, tu peux me l'envoyer ?", "mins_ago": 170},
                    {"sender": "demo-user-2", "content": "C'est le StrongLifts 5x5, très efficace pour prendre de la force. Squat, Bench, Row, OHP et Deadlift 💀", "mins_ago": 160},
                    {"sender": "ME", "content": "Ah oui j'en ai entendu parler ! 3 séances par semaine c'est ça ?", "mins_ago": 150},
                    {"sender": "demo-user-2", "content": "Exactement. Tu ajoutes 2.5kg à chaque séance tant que tu réussis tes 5x5", "mins_ago": 140},
                    {"sender": "demo-user-2", "content": "J'ai pris 30kg au squat en 3 mois avec ça 🔥", "mins_ago": 130},
                ],
            },
            {
                "participant_id": "demo-user-3",
                "messages": [
                    {"sender": "demo-user-3", "content": "Bonjour ! Je suis coach et j'ai remarqué ton profil. Tu cherches des conseils ?", "mins_ago": 1440},
                    {"sender": "ME", "content": "Bonjour ! Oui pourquoi pas, j'aimerais optimiser mes entraînements", "mins_ago": 1400},
                    {"sender": "demo-user-3", "content": "Tu fais quoi comme split actuellement ?", "mins_ago": 1350},
                    {"sender": "ME", "content": "Push/Pull/Legs, 6 jours par semaine", "mins_ago": 1300},
                    {"sender": "demo-user-3", "content": "C'est un bon programme ! Tu gères bien la récupération ? Sommeil, nutrition ?", "mins_ago": 1250},
                    {"sender": "ME", "content": "Le sommeil c'est pas toujours ça... 6h en moyenne", "mins_ago": 1200},
                    {"sender": "demo-user-3", "content": "Aïe ! 7-8h minimum pour optimiser la récup et la prise de muscle. C'est vraiment important 💤", "mins_ago": 1150},
                ],
            },
            {
                "participant_id": "demo-user-4",
                "messages": [
                    {"sender": "demo-user-4", "content": "Yo ! Tu viens au challenge CrossFit samedi ? 🏋️‍♀️", "mins_ago": 300},
                    {"sender": "ME", "content": "Je savais pas qu'il y avait un challenge ! C'est où ?", "mins_ago": 280},
                    {"sender": "demo-user-4", "content": "À la box CrossFit Nation, 14h. On fait un Murph modifié", "mins_ago": 260},
                    {"sender": "demo-user-4", "content": "T'es chaud ?", "mins_ago": 255},
                ],
            },
            {
                "participant_id": "demo-user-7",
                "messages": [
                    {"sender": "demo-user-7", "content": "Bro, tu deadlift combien ? 💀", "mins_ago": 600},
                    {"sender": "ME", "content": "140kg 1RM, et toi ?", "mins_ago": 580},
                    {"sender": "demo-user-7", "content": "250kg 😤 Mais j'ai 5 ans d'expérience", "mins_ago": 560},
                    {"sender": "ME", "content": "Wow c'est énorme ! Tu utilises quoi comme accessoires ?", "mins_ago": 540},
                    {"sender": "demo-user-7", "content": "Ceinture de force, straps pour les gros max, et chalk évidemment", "mins_ago": 520},
                    {"sender": "demo-user-7", "content": "Le plus important c'est la technique. Tu tires conventional ou sumo ?", "mins_ago": 510},
                    {"sender": "ME", "content": "Conventional, le sumo je galère", "mins_ago": 490},
                    {"sender": "demo-user-7", "content": "Teste le sumo, parfois ça matche mieux selon ta morphologie 👍", "mins_ago": 480},
                ],
            },
        ]
        
        created_conversations = 0
        created_messages = 0
        
        for conv_data in conversations_data:
            # Vérifier si la conversation existe déjà
            existing_conv = session.exec(
                select(Conversation).where(
                    ((Conversation.participant1_id == my_id) & 
                     (Conversation.participant2_id == conv_data["participant_id"])) |
                    ((Conversation.participant1_id == conv_data["participant_id"]) & 
                     (Conversation.participant2_id == my_id))
                )
            ).first()
            
            if existing_conv:
                # Supprimer les anciens messages pour rafraîchir
                old_messages = session.exec(
                    select(Message).where(Message.conversation_id == existing_conv.id)
                ).all()
                for old_msg in old_messages:
                    session.delete(old_msg)
                conversation = existing_conv
            else:
                # Créer nouvelle conversation
                conversation = Conversation(
                    participant1_id=my_id,
                    participant2_id=conv_data["participant_id"],
                )
                session.add(conversation)
                session.flush()
                created_conversations += 1
            
            # Ajouter les messages
            last_message_time = None
            for msg_data in conv_data["messages"]:
                msg_time = datetime.now(timezone.utc) - timedelta(minutes=msg_data["mins_ago"])
                # Remplacer "ME" par l'ID de l'utilisateur actuel
                actual_sender = my_id if msg_data["sender"] == "ME" else msg_data["sender"]
                message = Message(
                    conversation_id=conversation.id,
                    sender_id=actual_sender,
                    content=msg_data["content"],
                    created_at=msg_time,
                    read_at=msg_time if actual_sender == my_id else None,
                )
                session.add(message)
                created_messages += 1
                
                if last_message_time is None or msg_time > last_message_time:
                    last_message_time = msg_time
            
            # Mettre à jour le timestamp du dernier message
            conversation.last_message_at = last_message_time
        
        session.commit()
        
        return {
            "status": "success",
            "message": "Messages de démo créés avec succès !",
            "details": {
                "conversations_created": created_conversations,
                "messages_created": created_messages,
            }
        }



