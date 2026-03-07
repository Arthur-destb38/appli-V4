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
    """Sélectionne des exercices pour un groupe musculaire avec logique améliorée"""
    avoid_equipment = avoid_equipment or []
    equipment_available = equipment_available or []
    
    # Récupérer les exercices par groupe musculaire
    muscle_group_db = MUSCLE_GROUP_MAP.get(muscle_group, muscle_group.lower())
    exercises = [
        ex for ex in all_exercises
        if muscle_group_db.lower() in (ex.muscle_group or '').lower()
    ]
    
    # 🎯 NOUVEAU: Filtrage intelligent par équipement
    if equipment_available:
        filtered = []
        for ex in exercises:
            ex_equipment = (ex.equipment or '').lower()
            ex_name = (ex.name or '').lower()
            
            # Toujours inclure les exercices au poids du corps
            if 'bodyweight' in ex_equipment or not ex_equipment:
                filtered.append(ex)
                continue
            
            # Vérifier si l'équipement est disponible
            has_equipment = False
            for eq in equipment_available:
                eq_lower = eq.lower()
                if (eq_lower in ex_equipment or eq_lower in ex_name or
                    ('haltères' in eq_lower and 'dumbbell' in ex_equipment) or
                    ('barre' in eq_lower and 'barbell' in ex_equipment) or
                    ('machine' in eq_lower and 'machine' in ex_equipment)):
                    has_equipment = True
                    break
            
            if has_equipment:
                filtered.append(ex)
        
        if filtered:
            exercises = filtered
    
    # Filtrer les équipements à éviter
    if avoid_equipment:
        exercises = [
            ex for ex in exercises
            if not any(avoid.lower() in (ex.equipment or '').lower() or 
                      avoid.lower() in (ex.name or '').lower() 
                      for avoid in avoid_equipment)
        ]
    
    # Si pas assez d'exercices, fallback sur tous les exercices disponibles
    if len(exercises) < count:
        fallback_exercises = [ex for ex in all_exercises if ex not in exercises]
        exercises.extend(fallback_exercises[:count - len(exercises)])
    
    # 🎯 NOUVEAU: Prioriser la variété des mouvements
    # Catégoriser les exercices par type de mouvement
    movement_categories = {
        'compound': [],  # Exercices polyarticulaires
        'isolation': [], # Exercices d'isolation
        'unilateral': [], # Exercices unilatéraux
        'core': []       # Exercices de gainage
    }
    
    for ex in exercises:
        name_lower = (ex.name or '').lower()
        if any(keyword in name_lower for keyword in ['squat', 'deadlift', 'press', 'row', 'pull']):
            movement_categories['compound'].append(ex)
        elif any(keyword in name_lower for keyword in ['curl', 'extension', 'raise', 'fly']):
            movement_categories['isolation'].append(ex)
        elif any(keyword in name_lower for keyword in ['single', 'unilateral', 'one']):
            movement_categories['unilateral'].append(ex)
        elif muscle_group_db.lower() == 'abs':
            movement_categories['core'].append(ex)
        else:
            movement_categories['compound'].append(ex)  # Par défaut
    
    # Sélectionner avec priorité aux mouvements composés
    selected = []
    
    # D'abord les mouvements composés (priorité)
    if movement_categories['compound'] and len(selected) < count:
        needed = min(count - len(selected), max(1, count // 2))
        random.shuffle(movement_categories['compound'])
        selected.extend(movement_categories['compound'][:needed])
    
    # Ensuite les autres catégories
    remaining_categories = ['isolation', 'unilateral', 'core']
    for category in remaining_categories:
        if movement_categories[category] and len(selected) < count:
            needed = count - len(selected)
            random.shuffle(movement_categories[category])
            selected.extend(movement_categories[category][:needed])
    
    # Si pas assez, compléter avec ce qui reste
    if len(selected) < count:
        remaining = [ex for ex in exercises if ex not in selected]
        random.shuffle(remaining)
        selected.extend(remaining[:count - len(selected)])
    
    return selected[:count]


def generate_session_exercises(
    all_exercises: list[Exercise],
    session_type: str,
    profile: dict,
    week_number: int,
    session_index: int,
) -> Tuple[list[dict], int]:
    """Génère les exercices pour une session donnée avec une logique améliorée"""
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
    scheme = get_set_rep_scheme(profile.get('objective', profile.get('objectif', '')), profile.get('niveau', ''))
    
    # Progression simple : augmenter légèrement les séries chaque semaine
    week_progression = (week_number - 1) // 2
    add_sets = 1 if week_progression % 2 == 1 else 0
    series_count = scheme['sets'] + add_sets
    
    # 🎯 NOUVEAU: Durée cible cohérente pour toutes les séances
    duree_seance = profile.get('duree_seance', '45')
    target_minutes = get_target_minutes(duree_seance)
    
    # Calculer le nombre d'exercices optimal selon la durée cible
    # Formule: (durée_cible - 10min échauffement) / (temps_par_exercice + repos)
    time_per_exercise = estimate_exercise_minutes(series_count) + 2  # +2min repos entre exercices
    optimal_exercise_count = max(4, min(8, (target_minutes - 10) // time_per_exercise))
    
    print(f"🎯 Séance {session_type}: cible {target_minutes}min, {optimal_exercise_count} exercices")
    
    # Grouper les exercices par groupe musculaire
    by_group: dict[str, list[Exercise]] = defaultdict(list)
    for ex in all_exercises:
        if ex.muscle_group:
            group = ex.muscle_group.lower()
            by_group[group].append(ex)
    
    # 🎯 NOUVEAU: Templates de séances équilibrées
    session_templates = {
        'Full Body': {
            'groups': ['chest', 'back', 'quads', 'shoulders', 'arms', 'abs'],
            'distribution': [1, 1, 1, 1, 1, 1],  # 1 exercice par groupe
            'priority_groups': ['chest', 'back', 'quads']  # Groupes prioritaires
        },
        'Haut du corps': {
            'groups': ['chest', 'back', 'shoulders', 'arms', 'abs'],
            'distribution': [2, 2, 1, 1, 1],  # Plus de pecs/dos
            'priority_groups': ['chest', 'back']
        },
        'Bas du corps': {
            'groups': ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
            'distribution': [2, 2, 1, 1, 1],  # Plus de quads/ischios
            'priority_groups': ['quads', 'hamstrings']
        },
        'Poussée': {
            'groups': ['chest', 'shoulders', 'arms'],
            'distribution': [3, 2, 2],  # Focus pectoraux
            'priority_groups': ['chest']
        },
        'Tirage': {
            'groups': ['back', 'arms', 'shoulders'],
            'distribution': [3, 2, 1],  # Focus dos
            'priority_groups': ['back']
        },
        'Jambes': {
            'groups': ['quads', 'hamstrings', 'glutes', 'calves'],
            'distribution': [2, 2, 2, 1],  # Équilibré jambes
            'priority_groups': ['quads', 'hamstrings']
        }
    }
    
    # Déterminer le template selon le type de séance
    template_key = None
    for key in session_templates.keys():
        if key in session_type:
            template_key = key
            break
    
    if not template_key:
        # Fallback pour les types non reconnus
        if 'Full Body' in session_type:
            template_key = 'Full Body'
        else:
            template_key = 'Full Body'  # Fallback par défaut
    
    template = session_templates[template_key]
    
    # 🎯 NOUVEAU: Ajuster la distribution selon le nombre d'exercices optimal
    groups = template['groups']
    base_distribution = template['distribution']
    priority_groups = template['priority_groups']
    
    # Ajuster la distribution pour atteindre le nombre optimal d'exercices
    total_base = sum(base_distribution)
    if optimal_exercise_count != total_base:
        # Ajuster en priorité les groupes prioritaires
        distribution = base_distribution.copy()
        diff = optimal_exercise_count - total_base
        
        if diff > 0:  # Ajouter des exercices
            for _ in range(diff):
                # Ajouter aux groupes prioritaires en premier
                for i, group in enumerate(groups):
                    if group in priority_groups and distribution[i] < 3:
                        distribution[i] += 1
                        break
                else:
                    # Si pas de place dans les prioritaires, ajouter ailleurs
                    for i in range(len(distribution)):
                        if distribution[i] < 2:
                            distribution[i] += 1
                            break
        elif diff < 0:  # Retirer des exercices
            for _ in range(abs(diff)):
                # Retirer des groupes non-prioritaires en premier
                for i, group in enumerate(groups):
                    if group not in priority_groups and distribution[i] > 0:
                        distribution[i] -= 1
                        break
                else:
                    # Si pas possible, retirer des prioritaires
                    for i in range(len(distribution)):
                        if distribution[i] > 1:
                            distribution[i] -= 1
                            break
    else:
        distribution = base_distribution
    
    print(f"   Distribution: {dict(zip(groups, distribution))}")
    
    # 🎯 NOUVEAU: Sélection équilibrée des exercices
    for i, group in enumerate(groups):
        count = distribution[i]
        if count > 0:
            selected = select_exercises_for_muscle(
                all_exercises, group, count, profile, week_number,
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
    
    # 🎯 NOUVEAU: Vérification et ajustement final de la durée
    total_minutes = sum(ex['estimated_minutes'] for ex in generated_exercises)
    rest_time = max(0, len(generated_exercises) - 1) * 1.5  # Repos entre exercices
    total_minutes += int(rest_time)
    
    # Si trop long, réduire les séries des exercices non-prioritaires
    if total_minutes > target_minutes + 10:
        print(f"   ⚠️ Séance trop longue ({total_minutes}min), ajustement...")
        for ex in generated_exercises:
            if ex['exercise'].muscle_group not in [g.upper() for g in priority_groups]:
                if ex['series'] > 2:
                    ex['series'] -= 1
                    ex['estimated_minutes'] = estimate_exercise_minutes(ex['series'])
                    break
        
        # Recalculer
        total_minutes = sum(ex['estimated_minutes'] for ex in generated_exercises)
        total_minutes += int(rest_time)
    
    # Si trop court, ajouter des séries aux exercices prioritaires
    elif total_minutes < target_minutes - 10:
        print(f"   ⚠️ Séance trop courte ({total_minutes}min), ajustement...")
        for ex in generated_exercises:
            if ex['exercise'].muscle_group in [g.upper() for g in priority_groups]:
                if ex['series'] < 5:
                    ex['series'] += 1
                    ex['estimated_minutes'] = estimate_exercise_minutes(ex['series'])
                    break
        
        # Recalculer
        total_minutes = sum(ex['estimated_minutes'] for ex in generated_exercises)
        total_minutes += int(rest_time)
    
    print(f"   ✅ Durée finale: {total_minutes}min (cible: {target_minutes}min)")
    
    return generated_exercises, total_minutes


def generate_program(
    session: Session,
    profile: dict,
    title: str = "Programme personnalisé",
) -> dict:
    """Génère un programme complet basé sur le profil utilisateur avec intelligence avancée"""
    frequency = profile.get('frequency', 3)
    duration_weeks = profile.get('duration_weeks', 4)
    preferred_method = profile.get('methode_preferee')
    
    # 🎯 NOUVEAU: Adaptation intelligente selon le profil utilisateur
    user_height = profile.get('user_height')
    user_weight = profile.get('user_weight')
    user_gender = profile.get('user_gender')
    
    # Ajuster la fréquence selon le niveau d'expérience
    experience_level = profile.get('niveau', 'Intermédiaire')
    if experience_level == 'Débutant' and frequency > 4:
        frequency = min(frequency, 4)  # Limiter les débutants à 4 séances max
        print(f"🎯 Fréquence ajustée pour débutant: {frequency} séances/semaine")
    elif experience_level == 'Avancé' and frequency < 3:
        frequency = max(frequency, 3)  # Minimum 3 séances pour les avancés
        print(f"🎯 Fréquence ajustée pour avancé: {frequency} séances/semaine")
    
    # Ajuster la durée des séances selon le profil
    duree_seance = profile.get('duree_seance', '45')
    target_minutes = get_target_minutes(duree_seance)
    
    # 🎯 Adaptation selon le genre et les mensurations
    if user_gender == 'female':
        # Légère préférence pour le bas du corps chez les femmes
        if not profile.get('priorite'):
            profile['priorite'] = 'bas'
    
    # 🎯 Adaptation selon l'IMC si disponible
    if user_height and user_weight:
        imc = user_weight / ((user_height / 100) ** 2)
        if imc > 25 and profile.get('objective') != 'Perte de poids':
            # Suggérer plus de cardio pour les IMC élevés
            profile['cardio_suggestion'] = True
            print(f"🎯 IMC détecté: {imc:.1f} - Suggestion cardio activée")
    
    # Déterminer le split avec intelligence
    split = determine_split(frequency, preferred_method)
    
    # 🎯 Personnaliser le titre selon le profil
    if title == "Programme personnalisé":
        objective = profile.get('objective', 'Fitness')
        level = profile.get('niveau', 'Intermédiaire')
        title = f"Programme {objective} - {level} ({frequency}x/sem)"
    
    # Récupérer tous les exercices
    all_exercises = list(session.exec(select(Exercise)).all())
    
    # 🎯 NOUVEAU: Filtrage intelligent des exercices selon le profil
    filtered_exercises = _filter_exercises_by_profile(all_exercises, profile)
    
    print(f"🎯 Exercices disponibles: {len(all_exercises)} -> Filtrés: {len(filtered_exercises)}")
    
    # Générer les semaines
    weeks = []
    for week_num in range(1, duration_weeks + 1):
        sessions_data = []
        for day_index, session_type in enumerate(split):
            exercises_data, estimated_minutes = generate_session_exercises(
                filtered_exercises, session_type, profile, week_num, day_index
            )
            
            # 🎯 Ajustement de la durée selon le profil
            if estimated_minutes > target_minutes + 15:
                # Réduire le nombre d'exercices si trop long
                exercises_data = exercises_data[:max(3, len(exercises_data) - 1)]
                estimated_minutes = sum(ex['estimated_minutes'] for ex in exercises_data)
                print(f"🎯 Séance raccourcie: {estimated_minutes}min (cible: {target_minutes}min)")
            
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
    
    # Aplatir toutes les semaines en une seule liste avec day_index séquentiel
    all_sessions = []
    global_index = 0
    for week in weeks:
        for sess in week['sessions']:
            sess['day_index'] = global_index
            all_sessions.append(sess)
            global_index += 1

    return {
        'title': title,
        'objective': profile.get('objective'),
        'duration_weeks': duration_weeks,
        'user_id': profile.get('user_id'),
        'sessions': all_sessions,
    }


def _filter_exercises_by_profile(exercises: list[Exercise], profile: dict) -> list[Exercise]:
    """Filtre les exercices selon le profil utilisateur pour une sélection plus intelligente"""
    filtered = []
    
    # Équipement disponible
    equipment_available = profile.get('equipment_available', [])
    
    # Blessures à éviter
    injuries = profile.get('injuries', '')
    avoid_equipment = []
    if 'Dos' in injuries:
        avoid_equipment.extend(['deadlift', 'squat', 'row'])
    if 'Genoux' in injuries:
        avoid_equipment.extend(['squat', 'lunge', 'jump'])
    if 'Épaules' in injuries:
        avoid_equipment.extend(['overhead', 'press', 'lateral'])
    
    for exercise in exercises:
        exercise_equipment = (exercise.equipment or '').lower()
        exercise_name = (exercise.name or '').lower()
        
        # Filtrer par équipement disponible
        if equipment_available:
            has_equipment = False
            for eq in equipment_available:
                if eq.lower() in exercise_equipment or eq.lower() in exercise_name:
                    has_equipment = True
                    break
            # Toujours inclure les exercices au poids du corps
            if 'bodyweight' in exercise_equipment or not exercise_equipment:
                has_equipment = True
            
            if not has_equipment:
                continue
        
        # Éviter les exercices problématiques selon les blessures
        should_avoid = False
        for avoid in avoid_equipment:
            if avoid in exercise_name or avoid in exercise_equipment:
                should_avoid = True
                break
        
        if should_avoid:
            continue
        
        filtered.append(exercise)
    
    # Si trop peu d'exercices après filtrage, ajouter des exercices au poids du corps
    if len(filtered) < 20:
        bodyweight_exercises = [ex for ex in exercises if 'bodyweight' in (ex.equipment or '').lower()]
        for ex in bodyweight_exercises:
            if ex not in filtered:
                filtered.append(ex)
    
    return filtered

