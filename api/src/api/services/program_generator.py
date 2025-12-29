"""
Service de génération de programmes d'entraînement personnalisés
Adapté de la V1 avec logique complète de génération
"""
import random
from typing import Optional, Literal, Tuple
from collections import defaultdict
from sqlmodel import Session, select

from ..models import Exercise


# Mapping des groupes musculaires
MUSCLE_GROUP_MAP = {
    'Pectoraux': 'chest',
    'Dos': 'back',
    'Épaules': 'shoulders',
    'Bras': 'arms',
    'Abdos': 'abs',
    'Quadriceps': 'quads',
    'Quadris': 'quads',
    'Ischios': 'hamstrings',
    'Ischiojambiers': 'hamstrings',
    'Fessiers': 'glutes',
    'Mollets': 'calves',
}

# Mapping des blessures vers équipements à éviter
INJURY_EQUIPMENT_MAP = {
    'Dos': ['barbell', 'heavy'],
    'Épaules': ['overhead', 'press'],
    'Genoux': ['squat', 'lunge', 'jump'],
    'Coudes': ['heavy', 'barbell'],
    'Poignets': ['barbell', 'heavy'],
}


def determine_split(frequency: int, preferred_method: Optional[str] = None) -> list[str]:
    """Détermine le split d'entraînement en fonction de la fréquence"""
    if preferred_method:
        method = preferred_method.lower()
    else:
        if frequency <= 2:
            method = 'fullbody'
        elif frequency == 3:
            method = random.choice(['fullbody', 'upperlower', 'split'])
        else:
            method = random.choice(['fullbody', 'upperlower', 'split', 'ppl'])

    if method == 'fullbody':
        if frequency == 3:
            return ['Full Body A', 'Full Body B', 'Full Body C']
        return ['Full Body'] * frequency
    elif method == 'upperlower':
        if frequency == 1:
            return ['Haut du corps']
        if frequency == 2:
            return ['Haut du corps', 'Bas du corps']
        if frequency == 3:
            return ['Haut du corps', 'Bas du corps', 'Haut du corps']
        return ['Haut du corps' if i % 2 == 0 else 'Bas du corps' for i in range(frequency)]
    elif method == 'split':
        if frequency == 1:
            return ['Full Body']
        if frequency == 2:
            return ['Haut du corps', 'Bas du corps']
        if frequency == 3:
            return ['Poussée', 'Tirage', 'Jambes']
        if frequency == 4:
            return ['Poussée', 'Tirage', 'Jambes', 'Haut du corps']
        return ['Poussée', 'Tirage', 'Jambes', 'Haut du corps', 'Bas du corps'][:frequency]
    elif method == 'ppl':
        return ['Poussée', 'Tirage', 'Jambes'][:frequency]
    
    # Fallback
    if frequency <= 2:
        return ['Full Body'] * frequency
    if frequency == 3:
        return ['Full Body A', 'Full Body B', 'Full Body C']
    if frequency == 4:
        return ['Haut du corps A', 'Bas du corps A', 'Haut du corps B', 'Bas du corps B']
    if frequency == 5:
        return ['Poussée', 'Tirage', 'Jambes', 'Haut du corps', 'Bas du corps']
    if frequency == 6:
        return ['Poussée A', 'Tirage A', 'Jambes A', 'Poussée B', 'Tirage B', 'Jambes B']
    return ['Poussée', 'Tirage', 'Jambes', 'Haut du corps', 'Bas du corps', 'Full Body', 'Récupération active']


def get_difficulty_level(niveau: str) -> Literal['Beginner', 'Intermediate', 'Advanced']:
    """Convertit le niveau du questionnaire"""
    niveau_lower = niveau.lower()
    if 'débutant' in niveau_lower or 'debutant' in niveau_lower:
        return 'Beginner'
    if 'avancé' in niveau_lower or 'avance' in niveau_lower:
        return 'Advanced'
    return 'Intermediate'


def get_goal_type(objectif: str) -> Literal['force', 'prise_de_masse', 'tonification', 'endurance']:
    """Convertit l'objectif en format pour la bibliothèque"""
    objectif_lower = objectif.lower()
    if 'force' in objectif_lower:
        return 'force'
    if 'masse' in objectif_lower or 'volume' in objectif_lower:
        return 'prise_de_masse'
    if 'tonif' in objectif_lower or 'ton' in objectif_lower:
        return 'tonification'
    if 'endurance' in objectif_lower or 'cardio' in objectif_lower:
        return 'endurance'
    return 'prise_de_masse'


def get_set_rep_scheme(objectif: str, niveau: str) -> dict:
    """Détermine le nombre de séries et répétitions en fonction de l'objectif"""
    goal = get_goal_type(objectif)
    difficulty = get_difficulty_level(niveau)
    
    base_schemes = {
        'force': {'sets': 4, 'reps': '4-6', 'rpe': 8.5},
        'prise_de_masse': {'sets': 3, 'reps': '8-12', 'rpe': 7.5},
        'tonification': {'sets': 3, 'reps': '12-15', 'rpe': 7.0},
        'endurance': {'sets': 2, 'reps': '15-20', 'rpe': 6.5},
    }
    
    scheme = base_schemes[goal].copy()
    
    # Ajuster selon le niveau
    if difficulty == 'Beginner':
        scheme['sets'] = max(2, scheme['sets'] - 1)
        scheme['rpe'] = scheme['rpe'] - 1
    elif difficulty == 'Advanced':
        scheme['sets'] = scheme['sets'] + 1
        scheme['rpe'] = min(9, scheme['rpe'] + 0.5)
    
    return scheme


def estimate_exercise_minutes(sets: int) -> int:
    """Estime la durée d'un exercice selon le nombre de séries"""
    if sets >= 6:
        return 12
    if sets == 5:
        return 10
    if sets == 4:
        return 8
    if sets == 3:
        return 6
    if sets == 2:
        return 4
    return 3


def get_target_minutes(duree_seance: str) -> int:
    """Parse target duration from profile and return target minutes"""
    try:
        minutes = int(str(duree_seance or '').replace('min', '').replace(' ', '')) or 0
        return minutes if minutes > 0 else 45
    except (ValueError, AttributeError):
        return 45


def select_exercises_for_muscle(
    all_exercises: list[Exercise],
    muscle_group: str,
    count: int,
    profile: dict,
    week_number: int,
    avoid_equipment: list[str] = None,
    equipment_available: list[str] = None,
) -> list[Exercise]:
    """Sélectionne des exercices pour un groupe musculaire"""
    avoid_equipment = avoid_equipment or []
    equipment_available = equipment_available or []
    
    # Récupérer les exercices par groupe musculaire
    muscle_group_db = MUSCLE_GROUP_MAP.get(muscle_group, muscle_group.lower())
    exercises = [
        ex for ex in all_exercises
        if muscle_group_db.lower() in (ex.muscle_group or '').lower()
    ]
    
    # Filtrer par équipement disponible
    if equipment_available:
        filtered = []
        for ex in exercises:
            ex_equipment = (ex.equipment or '').lower()
            if any(eq.lower() in ex_equipment for eq in equipment_available) or 'bodyweight' in ex_equipment or not ex_equipment:
                filtered.append(ex)
        if filtered:
            exercises = filtered
    
    # Filtrer les équipements à éviter
    if avoid_equipment:
        exercises = [
            ex for ex in exercises
            if not any(avoid.lower() in (ex.equipment or '').lower() for avoid in avoid_equipment)
        ]
    
    # Si pas d'exercices, fallback sur tous les exercices
    if not exercises:
        exercises = all_exercises[:10]
    
    # Shuffle et prendre count
    random.shuffle(exercises)
    return exercises[:count]


def generate_session_exercises(
    all_exercises: list[Exercise],
    session_type: str,
    profile: dict,
    week_number: int,
    session_index: int,
) -> Tuple[list[dict], int]:
    """Génère les exercices pour une session donnée"""
    generated_exercises = []
    
    # Déterminer les équipements à éviter selon les blessures
    avoid_equipment = []
    if profile.get('has_blessure'):
        blessure_first = profile.get('blessure_first', '')
        blessure_second = profile.get('blessure_second', '')
        if blessure_first and blessure_first in INJURY_EQUIPMENT_MAP:
            avoid_equipment.extend(INJURY_EQUIPMENT_MAP[blessure_first])
        if blessure_second and blessure_second in INJURY_EQUIPMENT_MAP:
            avoid_equipment.extend(INJURY_EQUIPMENT_MAP[blessure_second])
    
    equipment_available = profile.get('equipment_available', [])
    scheme = get_set_rep_scheme(profile.get('objectif', ''), profile.get('niveau', ''))
    
    # Progression simple : augmenter légèrement les séries chaque semaine
    week_progression = (week_number - 1) // 2
    add_sets = 1 if week_progression % 2 == 1 else 0
    series_count = scheme['sets'] + add_sets
    
    # Grouper les exercices par groupe musculaire
    by_group: dict[str, list[Exercise]] = defaultdict(list)
    for ex in all_exercises:
        if ex.muscle_group:
            group = ex.muscle_group.lower()
            by_group[group].append(ex)
    
    # Déterminer les groupes musculaires selon le type de séance
    if 'Full Body' in session_type:
        upper_groups = ['chest', 'back', 'shoulders', 'arms']
        lower_groups = ['quads', 'hamstrings', 'glutes', 'calves']
        core_groups = ['abs']
        
        # Déterminer le nombre d'exercices selon la durée
        target_total = 6
        duree_seance = profile.get('duree_seance', '45')
        minutes = get_target_minutes(duree_seance)
        if minutes <= 30:
            target_total = 5
        elif minutes <= 45:
            target_total = 6
        elif minutes <= 60:
            target_total = 8
        else:
            target_total = 9
        
        # Distribution 50/50 upper/lower
        upper_fraction = 0.5
        if profile.get('priorite') == 'haut':
            upper_fraction = 0.65
        elif profile.get('priorite') == 'bas':
            upper_fraction = 0.35
        
        upper_target = int(target_total * upper_fraction)
        lower_target = target_total - upper_target
        
        # Sélectionner les exercices
        for group in upper_groups:
            if upper_target > 0:
                selected = select_exercises_for_muscle(
                    all_exercises, group, min(2, upper_target), profile, week_number,
                    avoid_equipment, equipment_available
                )
                for ex in selected:
                    generated_exercises.append({
                        'exercise': ex,
                        'series': series_count,
                        'reps': scheme['reps'],
                        'rpe': scheme['rpe'],
                        'estimated_minutes': estimate_exercise_minutes(series_count),
                    })
                upper_target -= len(selected)
        
        for group in lower_groups:
            if lower_target > 0:
                selected = select_exercises_for_muscle(
                    all_exercises, group, min(2, lower_target), profile, week_number,
                    avoid_equipment, equipment_available
                )
                for ex in selected:
                    generated_exercises.append({
                        'exercise': ex,
                        'series': series_count,
                        'reps': scheme['reps'],
                        'rpe': scheme['rpe'],
                        'estimated_minutes': estimate_exercise_minutes(series_count),
                    })
                lower_target -= len(selected)
        
        # Ajouter un exercice core si nécessaire
        if len(generated_exercises) < target_total:
            selected = select_exercises_for_muscle(
                all_exercises, 'abs', 1, profile, week_number,
                avoid_equipment, equipment_available
            )
            if selected:
                ex = selected[0]
                generated_exercises.append({
                    'exercise': ex,
                    'series': series_count,
                    'reps': scheme['reps'],
                    'rpe': scheme['rpe'],
                    'estimated_minutes': estimate_exercise_minutes(series_count),
                })
    
    elif 'Haut du corps' in session_type:
        groups = ['chest', 'back', 'shoulders', 'arms', 'abs']
        counts = {'chest': 2, 'back': 2, 'shoulders': 2, 'arms': 2, 'abs': 1}
        
        for group in groups:
            selected = select_exercises_for_muscle(
                all_exercises, group, counts.get(group, 1), profile, week_number,
                avoid_equipment, equipment_available
            )
            for ex in selected:
                generated_exercises.append({
                    'exercise': ex,
                    'series': series_count,
                    'reps': scheme['reps'],
                    'rpe': scheme['rpe'],
                    'estimated_minutes': estimate_exercise_minutes(series_count),
                })
    
    elif 'Bas du corps' in session_type:
        groups = ['quads', 'hamstrings', 'glutes', 'calves', 'abs']
        counts = {'quads': 2, 'hamstrings': 2, 'glutes': 2, 'calves': 1, 'abs': 1}
        
        for group in groups:
            selected = select_exercises_for_muscle(
                all_exercises, group, counts.get(group, 1), profile, week_number,
                avoid_equipment, equipment_available
            )
            for ex in selected:
                generated_exercises.append({
                    'exercise': ex,
                    'series': series_count,
                    'reps': scheme['reps'],
                    'rpe': scheme['rpe'],
                    'estimated_minutes': estimate_exercise_minutes(series_count),
                })
    
    elif 'Poussée' in session_type:
        groups = ['chest', 'shoulders', 'arms']
        counts = {'chest': 3, 'shoulders': 2, 'arms': 2}
        
        for group in groups:
            selected = select_exercises_for_muscle(
                all_exercises, group, counts.get(group, 1), profile, week_number,
                avoid_equipment, equipment_available
            )
            for ex in selected:
                generated_exercises.append({
                    'exercise': ex,
                    'series': series_count,
                    'reps': scheme['reps'],
                    'rpe': scheme['rpe'],
                    'estimated_minutes': estimate_exercise_minutes(series_count),
                })
    
    elif 'Tirage' in session_type:
        groups = ['back', 'shoulders', 'arms']
        counts = {'back': 3, 'shoulders': 1, 'arms': 2}
        
        for group in groups:
            selected = select_exercises_for_muscle(
                all_exercises, group, counts.get(group, 1), profile, week_number,
                avoid_equipment, equipment_available
            )
            for ex in selected:
                generated_exercises.append({
                    'exercise': ex,
                    'series': series_count,
                    'reps': scheme['reps'],
                    'rpe': scheme['rpe'],
                    'estimated_minutes': estimate_exercise_minutes(series_count),
                })
    
    elif 'Jambes' in session_type or 'Legs' in session_type:
        groups = ['quads', 'hamstrings', 'glutes', 'calves']
        counts = {'quads': 2, 'hamstrings': 2, 'glutes': 2, 'calves': 2}
        
        for group in groups:
            selected = select_exercises_for_muscle(
                all_exercises, group, counts.get(group, 1), profile, week_number,
                avoid_equipment, equipment_available
            )
            for ex in selected:
                generated_exercises.append({
                    'exercise': ex,
                    'series': series_count,
                    'reps': scheme['reps'],
                    'rpe': scheme['rpe'],
                    'estimated_minutes': estimate_exercise_minutes(series_count),
                })
    
    # Calculer la durée totale estimée
    total_minutes = sum(ex['estimated_minutes'] for ex in generated_exercises)
    # Ajouter le temps de repos entre exercices (1.5 min par exercice)
    rest_time = max(0, len(generated_exercises) - 1) * 1.5
    total_minutes += int(rest_time)
    
    return generated_exercises, total_minutes


def generate_program(
    session: Session,
    profile: dict,
    title: str = "Programme personnalisé",
) -> dict:
    """Génère un programme complet basé sur le profil utilisateur"""
    frequency = profile.get('frequency', 3)
    duration_weeks = profile.get('duration_weeks', 4)
    preferred_method = profile.get('methode_preferee')
    
    # Déterminer le split
    split = determine_split(frequency, preferred_method)
    
    # Récupérer tous les exercices
    all_exercises = list(session.exec(select(Exercise)).all())
    
    # Générer les semaines
    weeks = []
    for week_num in range(1, duration_weeks + 1):
        sessions_data = []
        for day_index, session_type in enumerate(split):
            exercises_data, estimated_minutes = generate_session_exercises(
                all_exercises, session_type, profile, week_num, day_index
            )
            
            sets_payload = []
            for order_index, ex_data in enumerate(exercises_data):
                sets_payload.append({
                    'exercise_slug': ex_data['exercise'].slug,
                    'reps': ex_data['reps'],
                    'weight': None,
                    'rpe': ex_data['rpe'],
                    'order_index': order_index,
                    'notes': f"{ex_data['series']} séries",
                })
            
            sessions_data.append({
                'day_index': day_index,
                'title': f"{session_type} - Semaine {week_num}",
                'focus': session_type,
                'estimated_minutes': estimated_minutes,
                'sets': sets_payload,
            })
        
        weeks.append({
            'week_number': week_num,
            'sessions': sessions_data,
        })
    
    # Pour la première semaine seulement (comme dans la V2 actuelle)
    first_week_sessions = weeks[0]['sessions'] if weeks else []
    
    return {
        'title': title,
        'objective': profile.get('objective'),
        'duration_weeks': duration_weeks,
        'user_id': profile.get('user_id'),
        'sessions': first_week_sessions,
    }

