"""
Service de génération de programmes d'entraînement — V2
Basé sur les recommandations de Renaissance Periodization (Mike Israetel)
et la recherche en science du sport.

Principes clés:
- Volume hebdomadaire par groupe musculaire (MEV → MAV → MRV)
- Fréquence ≥2x/semaine par muscle
- Progression du volume et de l'intensité au fil du mésocycle
- Semaine de deload automatique (≥5 semaines)
- Composés en premier, isolations en dernier
- Schémas de reps différenciés par rôle d'exercice
"""
import random
import math
from typing import Optional, Literal, Tuple
from collections import defaultdict
from sqlmodel import Session, select

from ..models import Exercise


# ═══════════════════════════════════════════════════════════════════════════════
# DONNÉES EVIDENCE-BASED
# ═══════════════════════════════════════════════════════════════════════════════

MUSCLE_GROUP_MAP = {
    'Pectoraux': 'chest', 'Dos': 'back', 'Épaules': 'shoulders',
    'Bras': 'arms', 'Abdos': 'abs', 'Quadriceps': 'quads',
    'Quadris': 'quads', 'Ischios': 'hamstrings',
    'Ischiojambiers': 'hamstrings', 'Fessiers': 'glutes',
    'Mollets': 'calves', 'Biceps': 'biceps', 'Triceps': 'triceps',
}

# Reverse map pour matching flexible (english → french variants)
_REVERSE_MAP: dict[str, list[str]] = defaultdict(list)
for _fr, _en in MUSCLE_GROUP_MAP.items():
    _REVERSE_MAP[_en].append(_fr.lower())

# Map DB muscle_group values → blueprint keys they can match
_DB_TO_BLUEPRINT: dict[str, list[str]] = {
    'legs': ['quads', 'glutes'],
    'posterior_chain': ['hamstrings', 'glutes'],
    'arms': ['biceps', 'triceps'],
}


# Volume hebdomadaire optimal (séries directes/semaine)
# (MV, MEV, MAV_low, MAV_high, MRV)
# Source: Renaissance Periodization — Training Volume Landmarks
VOLUME_LANDMARKS = {
    'chest':      ( 8, 10, 12, 20, 22),
    'back':       ( 8, 10, 14, 22, 25),
    'quads':      ( 6,  8, 12, 18, 20),
    'hamstrings': ( 4,  6, 10, 16, 20),
    'shoulders':  ( 0,  8, 16, 22, 26),
    'biceps':     ( 5,  8, 14, 20, 26),
    'triceps':    ( 4,  6, 10, 14, 18),
    'glutes':     ( 0,  0,  4, 12, 16),
    'calves':     ( 6,  8, 12, 16, 20),
    'abs':        ( 0,  0, 10, 16, 25),
}

# Volume indirect des composés (fraction de set créditée)
COMPOUND_INDIRECT = {
    'chest':      {'triceps': 0.5, 'shoulders': 0.3},
    'back':       {'biceps': 0.5},
    'shoulders':  {'triceps': 0.3},
    'quads':      {'glutes': 0.5},
    'hamstrings': {'glutes': 0.5, 'back': 0.2},
}

# Blueprints de séances : liste ordonnée de (muscle, rôle)
# Compounds en premier → isolations en dernier
SESSION_BLUEPRINTS = {
    'Full Body': [
        ('chest', 'compound'),
        ('back', 'compound'),
        ('quads', 'compound'),
        ('hamstrings', 'compound'),
        ('shoulders', 'accessory'),
        ('arms', 'isolation'),
        ('abs', 'isolation'),
    ],
    'Haut du corps': [
        ('chest', 'compound'),
        ('back', 'compound'),
        ('shoulders', 'compound'),
        ('back', 'accessory'),
        ('chest', 'accessory'),
        ('biceps', 'isolation'),
        ('triceps', 'isolation'),
    ],
    'Bas du corps': [
        ('quads', 'compound'),
        ('hamstrings', 'compound'),
        ('glutes', 'compound'),
        ('quads', 'accessory'),
        ('hamstrings', 'accessory'),
        ('calves', 'isolation'),
        ('abs', 'isolation'),
    ],
    'Poussée': [
        ('chest', 'compound'),
        ('chest', 'compound'),
        ('shoulders', 'compound'),
        ('shoulders', 'accessory'),
        ('chest', 'accessory'),
        ('triceps', 'isolation'),
        ('triceps', 'isolation'),
    ],
    'Tirage': [
        ('back', 'compound'),
        ('back', 'compound'),
        ('back', 'accessory'),
        ('shoulders', 'accessory'),
        ('biceps', 'isolation'),
        ('biceps', 'isolation'),
    ],
    'Jambes': [
        ('quads', 'compound'),
        ('hamstrings', 'compound'),
        ('quads', 'compound'),
        ('glutes', 'accessory'),
        ('hamstrings', 'accessory'),
        ('calves', 'isolation'),
        ('abs', 'isolation'),
    ],
}

# Schémas de reps différenciés par rôle et objectif
REP_SCHEMES = {
    'force': {
        'compound':  {'reps': '3-5',   'rpe': 8.5},
        'accessory': {'reps': '6-8',   'rpe': 7.5},
        'isolation': {'reps': '8-12',  'rpe': 7.0},
    },
    'prise_de_masse': {
        'compound':  {'reps': '6-8',   'rpe': 8.0},
        'accessory': {'reps': '8-12',  'rpe': 7.5},
        'isolation': {'reps': '12-15', 'rpe': 7.0},
    },
    'tonification': {
        'compound':  {'reps': '8-12',  'rpe': 7.5},
        'accessory': {'reps': '12-15', 'rpe': 7.0},
        'isolation': {'reps': '15-20', 'rpe': 6.5},
    },
    'endurance': {
        'compound':  {'reps': '12-15', 'rpe': 7.0},
        'accessory': {'reps': '15-20', 'rpe': 6.5},
        'isolation': {'reps': '20-25', 'rpe': 6.0},
    },
}

# Séries par exercice selon rôle × niveau
SETS_PER_ROLE = {
    'Beginner':     {'compound': 3, 'accessory': 2, 'isolation': 2},
    'Intermediate': {'compound': 4, 'accessory': 3, 'isolation': 3},
    'Advanced':     {'compound': 4, 'accessory': 4, 'isolation': 3},
}

# Blessures → mots-clés à éviter dans les noms d'exercices
INJURY_AVOID = {
    'Dos':      ['deadlift', 'good morning', 'barbell row', 'heavy'],
    'Épaules':  ['overhead press', 'military press', 'upright row', 'behind neck'],
    'Genoux':   ['squat', 'lunge', 'jump', 'leg extension', 'plyometric'],
    'Coudes':   ['skull crusher', 'close grip', 'dip'],
    'Poignets': ['barbell curl', 'wrist', 'heavy'],
}


# ═══════════════════════════════════════════════════════════════════════════════
# UTILITAIRES
# ═══════════════════════════════════════════════════════════════════════════════

def get_difficulty_level(niveau: str) -> Literal['Beginner', 'Intermediate', 'Advanced']:
    n = niveau.lower()
    if 'débutant' in n or 'debutant' in n:
        return 'Beginner'
    if 'avancé' in n or 'avance' in n:
        return 'Advanced'
    return 'Intermediate'


def get_goal_type(objectif: str) -> str:
    o = objectif.lower()
    if 'force' in o:
        return 'force'
    if any(k in o for k in ('masse', 'volume', 'hypertrophie', 'muscle')):
        return 'prise_de_masse'
    if any(k in o for k in ('tonif', 'remise', 'perte', 'minceur', 'séch')):
        return 'tonification'
    if any(k in o for k in ('endurance', 'cardio', 'stamin')):
        return 'endurance'
    return 'prise_de_masse'


def _normalize_muscle(group: str) -> str:
    """Normalize to English muscle key."""
    return MUSCLE_GROUP_MAP.get(group, group.lower())


def _muscle_matches(exercise_muscle: str, target_key: str, exercise_name: str = '') -> bool:
    """Flexible muscle group matching (handles EN/FR and DB values)."""
    ex = exercise_muscle.lower()
    # Direct match or French-variant match
    possible = [target_key] + _REVERSE_MAP.get(target_key, [])
    if any(p in ex for p in possible):
        return True
    # DB group → blueprint key mapping
    blueprint_keys = _DB_TO_BLUEPRINT.get(ex, [])
    if target_key not in blueprint_keys:
        return False
    # Name-based disambiguation for 'arms' group
    if ex == 'arms' and exercise_name:
        name_lower = exercise_name.lower()
        if target_key == 'biceps':
            return 'bicep' in name_lower or 'curl' in name_lower
        if target_key == 'triceps':
            return ('tricep' in name_lower or 'extension' in name_lower
                    or 'pushdown' in name_lower or 'dip' in name_lower)
    return True


def _get_target_minutes(duree_seance) -> int:
    try:
        m = int(str(duree_seance or '').replace('min', '').replace(' ', '')) or 0
        return m if m > 0 else 45
    except (ValueError, AttributeError):
        return 45


def _estimate_minutes(sets: int, role: str) -> float:
    """Estimate exercise duration (minutes) including inter-set rest.

    Per-set time = execution (~30-40s) + rest.
    Compound rest ~2-2.5min, accessory ~1.5min, isolation ~1min.
    Plus ~1min setup per exercise.
    """
    if role == 'compound':
        return max(3.0, sets * 2.5 + 1.0)
    if role == 'accessory':
        return max(2.5, sets * 1.8 + 1.0)
    return max(2.0, sets * 1.3 + 0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# VOLUME & PÉRIODISATION
# ═══════════════════════════════════════════════════════════════════════════════

def _plan_weekly_volume(level: str, goal: str) -> dict[str, int]:
    """Volume hebdomadaire cible (séries directes) par groupe musculaire.

    Débutants → proche du MEV
    Intermédiaires → bas-milieu du MAV
    Avancés → milieu-haut du MAV
    """
    pos = {'Beginner': 0.0, 'Intermediate': 0.35, 'Advanced': 0.7}.get(level, 0.35)
    goal_factor = {
        'force': 0.80,          # Moins de volume, plus d'intensité
        'prise_de_masse': 1.0,
        'tonification': 0.90,
        'endurance': 0.75,
    }.get(goal, 1.0)

    targets: dict[str, int] = {}
    for muscle, (mv, mev, mav_lo, mav_hi, mrv) in VOLUME_LANDMARKS.items():
        base = mev + (mav_hi - mev) * pos
        targets[muscle] = max(mev if mev > 0 else 2, round(base * goal_factor))
    return targets


def _week_volume_factor(week: int, total_weeks: int) -> float:
    """Facteur multiplicatif du volume pour la semaine.

    Rampe linéaire : sem 1 ≈ 85 %, dernière sem entraînement ≈ 115 %.
    Deload (si ≥ 5 sem) = 50 %.
    """
    has_deload = total_weeks >= 5
    training_weeks = total_weeks - (1 if has_deload else 0)

    if has_deload and week == total_weeks:
        return 0.50

    if training_weeks <= 1:
        return 1.0
    progress = (week - 1) / (training_weeks - 1)
    return 0.85 + 0.30 * progress


def _week_rpe_offset(week: int, total_weeks: int) -> float:
    """Offset RPE (progression RIR).

    Sem 1 : −1.0 (plus facile, RIR ~3-4)
    Dernière sem entraînement : +0.5 (plus dur, RIR ~0-1)
    Deload : −2.0
    """
    has_deload = total_weeks >= 5
    training_weeks = total_weeks - (1 if has_deload else 0)

    if has_deload and week == total_weeks:
        return -2.0

    if training_weeks <= 1:
        return 0.0
    progress = (week - 1) / (training_weeks - 1)
    return -1.0 + 1.5 * progress


# ═══════════════════════════════════════════════════════════════════════════════
# SPLIT SELECTION
# ═══════════════════════════════════════════════════════════════════════════════

def determine_split(frequency: int, preferred_method: Optional[str] = None) -> list[str]:
    """Détermine le split optimal (déterministe sauf méthode explicite)."""
    if preferred_method:
        method = preferred_method.lower().replace(' ', '').replace('/', '').replace('-', '')
    else:
        # Choix optimal selon la fréquence
        method = {1: 'fullbody', 2: 'fullbody', 3: 'fullbody',
                  4: 'upperlower', 5: 'pplul', 6: 'ppl'}.get(frequency, 'ppl')

    freq = min(7, max(1, frequency))

    if method == 'fullbody':
        labels = ['Full Body A', 'Full Body B', 'Full Body C']
        return [labels[i % len(labels)] for i in range(freq)]

    if method in ('upperlower', 'upper_lower', 'hautbas'):
        if freq <= 2:
            return ['Haut du corps', 'Bas du corps'][:freq]
        if freq == 3:
            return ['Haut du corps', 'Bas du corps', 'Full Body']
        return ['Haut du corps' if i % 2 == 0 else 'Bas du corps' for i in range(freq)]

    if method in ('ppl', 'pushpulllegs'):
        base = ['Poussée', 'Tirage', 'Jambes']
        if freq <= 3:
            return base[:freq]
        if freq == 6:
            return base * 2
        return (base + ['Haut du corps', 'Bas du corps'])[:freq]

    if method in ('pplul',):
        return ['Poussée', 'Tirage', 'Jambes', 'Haut du corps', 'Bas du corps'][:freq]

    if method in ('split',):
        if freq <= 2:
            return ['Haut du corps', 'Bas du corps'][:freq]
        if freq == 3:
            return ['Poussée', 'Tirage', 'Jambes']
        return ['Poussée', 'Tirage', 'Jambes', 'Haut du corps', 'Bas du corps'][:freq]

    # Fallback déterministe
    defaults = {
        1: ['Full Body'],
        2: ['Full Body A', 'Full Body B'],
        3: ['Full Body A', 'Full Body B', 'Full Body C'],
        4: ['Haut du corps', 'Bas du corps', 'Haut du corps', 'Bas du corps'],
        5: ['Poussée', 'Tirage', 'Jambes', 'Haut du corps', 'Bas du corps'],
        6: ['Poussée', 'Tirage', 'Jambes', 'Poussée', 'Tirage', 'Jambes'],
        7: ['Poussée', 'Tirage', 'Jambes', 'Haut du corps', 'Bas du corps',
            'Full Body', 'Full Body'],
    }
    return defaults.get(freq, ['Full Body'] * freq)


# ═══════════════════════════════════════════════════════════════════════════════
# SÉLECTION D'EXERCICES
# ═══════════════════════════════════════════════════════════════════════════════

def _classify_role(exercise: Exercise) -> str:
    """Classifie un exercice : compound / accessory / isolation."""
    name = (exercise.name or '').lower()

    _COMPOUND = [
        'squat', 'deadlift', 'bench press', 'overhead press', 'military press',
        'barbell row', 'pull-up', 'pullup', 'chin-up', 'chinup', 'dip',
        'leg press', 'hip thrust', 'romanian deadlift', 'front squat',
        'incline press', 'dumbbell press', 'pendlay', 't-bar row',
        'hack squat', 'sumo deadlift', 'clean', 'snatch', 'lunge',
    ]
    _ISOLATION = [
        'curl', 'extension', 'raise', 'fly', 'flye', 'kickback',
        'crunch', 'plank', 'sit-up', 'ab wheel', 'cable cross',
        'pec deck', 'wrist', 'calf raise', 'shrug', 'face pull',
        'leg curl', 'leg extension', 'lateral raise', 'front raise',
        'rear delt', 'preacher', 'concentration', 'tricep',
    ]

    if any(kw in name for kw in _COMPOUND):
        return 'compound'
    if any(kw in name for kw in _ISOLATION):
        return 'isolation'
    return 'accessory'


def _select_exercise(
    exercises: list[Exercise],
    muscle_group: str,
    role: str,
    used: set[str],
    equipment_available: list[str],
    avoid_keywords: list[str],
) -> Optional[Exercise]:
    """Sélectionne UN exercice en respectant muscle, rôle, équipement, blessures."""
    target = _normalize_muscle(muscle_group)

    # 'arms' → alterner biceps/triceps
    if target == 'arms':
        target = random.choice(['biceps', 'triceps'])

    best: list[Exercise] = []
    fallback: list[Exercise] = []

    for ex in exercises:
        ex_name = (ex.name or '').lower()
        ex_muscle = (ex.muscle_group or '').lower()

        # Muscle match
        if not _muscle_matches(ex_muscle, target, ex.name or ''):
            continue

        # Already used
        if (ex.slug or ex.name) in used:
            continue

        # Injury avoidance
        if any(kw.lower() in ex_name for kw in avoid_keywords):
            continue

        # Equipment filter
        if equipment_available:
            ex_eq = (ex.equipment or '').lower()
            if ex_eq and 'bodyweight' not in ex_eq:
                if not any(eq.lower() in ex_eq or
                           ('haltères' in eq.lower() and 'dumbbell' in ex_eq) or
                           ('barre' in eq.lower() and 'barbell' in ex_eq) or
                           ('machine' in eq.lower() and 'machine' in ex_eq) or
                           ('câble' in eq.lower() and 'cable' in ex_eq)
                           for eq in equipment_available):
                    continue

        # Classify and prioritize
        ex_role = _classify_role(ex)
        if role == 'compound' and ex_role == 'compound':
            best.append(ex)
        elif role == 'compound' and ex_role == 'accessory':
            fallback.append(ex)
        elif role == 'accessory' and ex_role in ('accessory', 'compound'):
            best.append(ex)
        elif role == 'isolation' and ex_role == 'isolation':
            best.append(ex)
        elif role == 'isolation' and ex_role == 'accessory':
            fallback.append(ex)
        else:
            fallback.append(ex)

    pool = best or fallback
    if not pool:
        # Dernier recours : n'importe quel exercice pour ce muscle
        pool = [ex for ex in exercises
                if _muscle_matches((ex.muscle_group or '').lower(), target, ex.name or '')
                and (ex.slug or ex.name) not in used]
    if not pool:
        return None

    # Variété : pick parmi les 5 meilleurs
    return random.choice(pool[:min(5, len(pool))])


# ═══════════════════════════════════════════════════════════════════════════════
# GÉNÉRATION DE SÉANCE
# ═══════════════════════════════════════════════════════════════════════════════

def _get_blueprint(session_type: str) -> list[tuple[str, str]]:
    for key in SESSION_BLUEPRINTS:
        if key in session_type:
            return SESSION_BLUEPRINTS[key]
    return SESSION_BLUEPRINTS['Full Body']


def generate_session_exercises(
    all_exercises: list[Exercise],
    session_type: str,
    profile: dict,
    week_number: int,
    session_index: int,
    volume_factor: float = 1.0,
    rpe_offset: float = 0.0,
) -> Tuple[list[dict], int]:
    """Génère les exercices d'une séance avec volume et intensité périodisés.

    Strategy: select exercises first (respect exercises_per_session),
    then adjust sets to fit within target duration.
    """

    goal = get_goal_type(profile.get('objective', profile.get('objectif', '')))
    level = get_difficulty_level(profile.get('niveau', 'Intermédiaire'))
    target_minutes = _get_target_minutes(profile.get('duree_seance', '45'))
    max_exercises_user = profile.get('exercises_per_session', 0)
    schemes = REP_SCHEMES.get(goal, REP_SCHEMES['prise_de_masse'])
    base_sets = SETS_PER_ROLE.get(level, SETS_PER_ROLE['Intermediate'])

    # Injury keywords
    avoid_kw: list[str] = []
    if profile.get('has_blessure'):
        for field in ('blessure_first', 'blessure_second'):
            b = profile.get(field, '')
            if b and b in INJURY_AVOID:
                avoid_kw.extend(INJURY_AVOID[b])

    equipment = profile.get('equipment_available', [])
    blueprint = _get_blueprint(session_type)

    # Start with user-specified exercise count, full blueprint available for expansion
    full_blueprint = list(blueprint)
    if max_exercises_user and max_exercises_user > 0:
        initial_count = min(max_exercises_user, len(blueprint))
    else:
        initial_count = len(blueprint)

    # ── Helper: select an exercise for a blueprint slot ──
    def _pick(muscle_group: str, role: str) -> Optional[dict]:
        ex = _select_exercise(
            all_exercises, muscle_group, role, used, equipment, avoid_kw,
        )
        if not ex:
            return None
        used.add(ex.slug or ex.name)
        scheme = schemes[role]
        role_sets = base_sets[role]
        adjusted_sets = max(2, round(role_sets * volume_factor))
        adjusted_rpe = round(min(10, max(5, scheme['rpe'] + rpe_offset)), 1)
        return {
            'exercise': ex,
            'series': adjusted_sets,
            'reps': scheme['reps'],
            'rpe': adjusted_rpe,
            'role': role,
            'estimated_minutes': _estimate_minutes(adjusted_sets, role),
        }

    # ── Phase 1: select initial exercises ──
    generated: list[dict] = []
    used: set[str] = set()

    for muscle_group, role in blueprint[:initial_count]:
        item = _pick(muscle_group, role)
        if item:
            generated.append(item)

    if not generated:
        return generated, 5

    # ── Phase 2: compute initial duration ──
    warmup = 5
    total = warmup + sum(g['estimated_minutes'] for g in generated)

    # ── Phase 3: adjust to fit target ──
    tolerance = 3  # acceptable deviation in minutes
    max_sets_cap = {'compound': 6, 'accessory': 5, 'isolation': 4}

    # 3a. If over budget → reduce sets (isolations first, then accessories, compounds)
    reduction_order = ['isolation', 'accessory', 'compound']
    while total > target_minutes + tolerance:
        reduced = False
        for target_role in reduction_order:
            for g in reversed(generated):
                if g['role'] == target_role and g['series'] > 2:
                    old_min = g['estimated_minutes']
                    g['series'] -= 1
                    g['estimated_minutes'] = _estimate_minutes(g['series'], g['role'])
                    total -= (old_min - g['estimated_minutes'])
                    reduced = True
                    break
            if reduced:
                break
        if not reduced:
            # All at minimum — remove last exercise
            total -= generated[-1]['estimated_minutes']
            generated.pop()
            if not generated:
                break

    # 3b. If under budget → first increase sets, then add exercises from blueprint
    increase_order = ['compound', 'accessory', 'isolation']
    while total < target_minutes - tolerance and generated:
        increased = False

        # Try increasing sets on existing exercises
        for target_role in increase_order:
            for g in generated:
                cap = max_sets_cap.get(target_role, 4)
                if g['role'] == target_role and g['series'] < cap:
                    old_min = g['estimated_minutes']
                    g['series'] += 1
                    g['estimated_minutes'] = _estimate_minutes(g['series'], g['role'])
                    gained = g['estimated_minutes'] - old_min
                    if total + gained <= target_minutes + tolerance:
                        total += gained
                        increased = True
                        break
                    else:
                        g['series'] -= 1
                        g['estimated_minutes'] = old_min
            if increased:
                break

        if not increased:
            # Try adding a new exercise from remaining blueprint slots
            added = False
            for muscle_group, role in full_blueprint[len(generated):]:
                item = _pick(muscle_group, role)
                if item and total + item['estimated_minutes'] <= target_minutes + tolerance:
                    generated.append(item)
                    total += item['estimated_minutes']
                    added = True
                    break
            if not added:
                break

    return generated, round(total)


# ═══════════════════════════════════════════════════════════════════════════════
# GÉNÉRATION DU PROGRAMME COMPLET
# ═══════════════════════════════════════════════════════════════════════════════

def generate_program(
    session: Session,
    profile: dict,
    title: str = "Programme personnalisé",
) -> dict:
    """Génère un programme complet avec mésocycle périodisé."""

    frequency = profile.get('frequency', 3)
    duration_weeks = profile.get('duration_weeks', 4)
    preferred_method = profile.get('methode_preferee')

    # Niveau et objectif
    level_str = profile.get('niveau', 'Intermédiaire')
    level = get_difficulty_level(level_str)
    goal = get_goal_type(profile.get('objective', profile.get('objectif', 'Hypertrophie')))

    # Garde-fous selon le niveau
    if level == 'Beginner' and frequency > 4:
        frequency = 4
    elif level == 'Advanced' and frequency < 3:
        frequency = 3

    # Préférence genrée (bas du corps chez les femmes si pas de priorité)
    if profile.get('user_gender') == 'female' and not profile.get('priorite'):
        profile['priorite'] = 'bas'

    # Split
    split = determine_split(frequency, preferred_method)

    # Volume hebdomadaire cible
    weekly_volume = _plan_weekly_volume(level, goal)

    # Titre personnalisé
    if title == "Programme personnalisé":
        obj = profile.get('objective', 'Fitness')
        title = f"Programme {obj} — {level_str} ({frequency}x/sem)"

    # Exercices
    all_exercises = list(session.exec(select(Exercise)).all())
    filtered = _filter_exercises_by_profile(all_exercises, profile)

    has_deload = duration_weeks >= 5
    all_sessions: list[dict] = []
    global_index = 0

    for week_num in range(1, duration_weeks + 1):
        vol_factor = _week_volume_factor(week_num, duration_weeks)
        rpe_off = _week_rpe_offset(week_num, duration_weeks)
        is_deload = has_deload and week_num == duration_weeks
        week_label = "Deload" if is_deload else f"Semaine {week_num}"

        for day_index, session_type in enumerate(split):
            exercises_data, estimated_minutes = generate_session_exercises(
                filtered, session_type, profile,
                week_num, day_index,
                volume_factor=vol_factor,
                rpe_offset=rpe_off,
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

            # Suffixe A/B si le même type de séance apparaît 2+ fois par semaine
            label = session_type
            if split.count(session_type) > 1:
                occurrence = split[:day_index + 1].count(session_type)
                label = f"{session_type} {'ABCDEFG'[occurrence - 1]}"

            all_sessions.append({
                'day_index': global_index,
                'title': f"{label} — {week_label}",
                'focus': session_type,
                'estimated_minutes': estimated_minutes,
                'sets': sets_payload,
            })
            global_index += 1

    return {
        'title': title,
        'objective': profile.get('objective'),
        'duration_weeks': duration_weeks,
        'user_id': profile.get('user_id'),
        'sessions': all_sessions,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# FILTRAGE PAR PROFIL
# ═══════════════════════════════════════════════════════════════════════════════

def _filter_exercises_by_profile(exercises: list[Exercise], profile: dict) -> list[Exercise]:
    """Filtre les exercices selon équipement et blessures."""
    equipment_available = profile.get('equipment_available', [])

    # Injury keywords
    avoid: list[str] = []
    injuries = profile.get('injuries', '')
    for zone, keywords in INJURY_AVOID.items():
        if zone in injuries:
            avoid.extend(keywords)
    if profile.get('has_blessure'):
        for field in ('blessure_first', 'blessure_second'):
            b = profile.get(field, '')
            if b and b in INJURY_AVOID:
                avoid.extend(INJURY_AVOID[b])

    filtered: list[Exercise] = []
    for ex in exercises:
        ex_eq = (ex.equipment or '').lower()
        ex_name = (ex.name or '').lower()

        # Equipment filter
        if equipment_available:
            if ex_eq and 'bodyweight' not in ex_eq:
                if not any(
                    eq.lower() in ex_eq or eq.lower() in ex_name or
                    ('haltères' in eq.lower() and 'dumbbell' in ex_eq) or
                    ('barre' in eq.lower() and 'barbell' in ex_eq) or
                    ('machine' in eq.lower() and 'machine' in ex_eq) or
                    ('câble' in eq.lower() and 'cable' in ex_eq)
                    for eq in equipment_available
                ):
                    continue

        # Injury filter
        if any(kw.lower() in ex_name for kw in avoid):
            continue

        filtered.append(ex)

    # Fallback : ajouter du bodyweight si trop peu d'exercices
    if len(filtered) < 20:
        for ex in exercises:
            if 'bodyweight' in (ex.equipment or '').lower() and ex not in filtered:
                filtered.append(ex)

    return filtered
