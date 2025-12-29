"""
Service pour charger des exercices depuis une source externe (URL, Google Drive, etc.)
"""
import json
import re
from typing import Optional
import httpx
from sqlmodel import Session, select

from ..models import Exercise
from ..utils.slug import make_exercise_slug


def convert_google_drive_url(url: str) -> str:
    """Convertit un lien Google Drive de partage en lien de téléchargement direct"""
    # Pattern pour extraire l'ID du fichier
    patterns = [
        r'/file/d/([a-zA-Z0-9_-]+)',
        r'id=([a-zA-Z0-9_-]+)',
        r'/([a-zA-Z0-9_-]{25,})',  # Google Drive file IDs font généralement 25+ caractères
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            file_id = match.group(1)
            # Retourner le lien de téléchargement direct
            return f"https://drive.google.com/uc?export=download&id={file_id}"
    
    # Si aucun pattern ne correspond, retourner l'URL originale
    return url


def load_exercises_from_url(url: str, timeout: int = 30) -> list[dict]:
    """Charge des exercices depuis une URL (JSON)
    
    Format attendu du JSON :
    [
        {
            "name": "Squat",
            "muscle_group": "legs",
            "equipment": "barbell",
            "description": "Back squat focusing on quads and glutes.",
            "image_url": "https://...",  # optionnel
            "source_type": "external",  # optionnel
            "source_value": "url"  # optionnel
        },
        ...
    ]
    
    Args:
        url: URL du fichier JSON (peut être un lien Google Drive)
        timeout: Timeout en secondes pour la requête HTTP
        
    Returns:
        Liste de dictionnaires représentant les exercices
        
    Raises:
        httpx.HTTPError: Si la requête HTTP échoue
        json.JSONDecodeError: Si le JSON est invalide
        ValueError: Si le format des données est invalide
    """
    # Convertir l'URL Google Drive si nécessaire
    if 'drive.google.com' in url:
        url = convert_google_drive_url(url)
    
    # Faire la requête HTTP
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
        data = response.json()
    
    # Valider le format
    if not isinstance(data, list):
        raise ValueError("Le JSON doit être un tableau d'exercices")
    
    # Valider chaque exercice
    exercises = []
    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            raise ValueError(f"L'exercice à l'index {idx} doit être un objet")
        
        # Vérifier que le nom existe
        if 'name' not in item:
            raise ValueError(f"L'exercice à l'index {idx} manque le champ 'name'")
        
        # Mapper les différents formats possibles
        # Format V1 : muscle_group directement
        # Format V2 : primary_muscle ou category
        muscle_group = (
            item.get('muscle_group') or 
            item.get('primary_muscle') or 
            item.get('category') or 
            item.get('group') or 
            'other'
        )
        
        # Normaliser le groupe musculaire (mettre en minuscules)
        muscle_group = str(muscle_group).lower().strip()
        
        # Gérer equipment (peut être une chaîne ou un tableau)
        equipment_raw = item.get('equipment', '')
        if isinstance(equipment_raw, list):
            # Prendre le premier équipement ou joindre avec virgule
            equipment = equipment_raw[0] if equipment_raw else 'bodyweight'
        else:
            equipment = str(equipment_raw).strip() or 'bodyweight'
        
        # Normaliser l'équipement (mettre en minuscules)
        equipment = equipment.lower()
        
        # Construire la description à partir des champs disponibles
        description_parts = []
        if item.get('description'):
            description_parts.append(str(item['description']).strip())
        if item.get('cues'):
            description_parts.append(f"Cues: {item['cues']}")
        if item.get('common_errors'):
            description_parts.append(f"Common errors: {item['common_errors']}")
        if item.get('movement_pattern'):
            description_parts.append(f"Pattern: {item['movement_pattern']}")
        
        description = ' | '.join(description_parts) if description_parts else None
        
        exercises.append({
            'name': str(item['name']).strip(),
            'muscle_group': muscle_group,
            'equipment': equipment,
            'description': description,
            'image_url': str(item.get('image_url', '')).strip() or None,
            'source_type': item.get('source_type', 'external'),
            'source_value': item.get('source_value', url),
        })
    
    return exercises


def import_exercises_from_url(
    session: Session,
    url: str,
    force: bool = False,
    timeout: int = 30,
) -> dict:
    """Importe des exercices depuis une URL dans la base de données
    
    Args:
        session: Session SQLModel
        url: URL du fichier JSON
        force: Si True, supprime les exercices existants avant d'importer
        timeout: Timeout en secondes pour la requête HTTP
        
    Returns:
        Dictionnaire avec 'imported' (nombre d'exercices importés), 
        'skipped' (nombre d'exercices ignorés car déjà existants),
        'total' (nombre total d'exercices dans le fichier)
    """
    from sqlmodel import delete, func
    
    if force:
        session.exec(delete(Exercise))
        session.commit()
    
    # Charger les exercices depuis l'URL
    exercises_data = load_exercises_from_url(url, timeout)
    
    imported = 0
    skipped = 0
    
    for ex_data in exercises_data:
        slug = make_exercise_slug(ex_data['name'], ex_data['muscle_group'])
        
        # Vérifier si l'exercice existe déjà
        existing = session.exec(select(Exercise).where(Exercise.slug == slug)).first()
        if existing:
            skipped += 1
            continue
        
        # Créer le nouvel exercice
        exercise = Exercise(
            slug=slug,
            name=ex_data['name'],
            muscle_group=ex_data['muscle_group'],
            equipment=ex_data['equipment'],
            description=ex_data['description'],
            image_url=ex_data['image_url'],
            source_type=ex_data['source_type'],
            source_value=ex_data['source_value'],
        )
        session.add(exercise)
        imported += 1
    
    session.commit()
    
    return {
        'imported': imported,
        'skipped': skipped,
        'total': len(exercises_data),
    }

