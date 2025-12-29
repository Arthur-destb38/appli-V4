import uuid
from sqlmodel import Session

from api.db import get_engine
from api.models import Exercise, Share, User, Workout, WorkoutExercise, WorkoutSet


def create_user(session: Session, consent: bool = True) -> str:
  user = User(id=str(uuid.uuid4()), username=f'user-{uuid.uuid4().hex[:6]}', consent_to_public_share=consent)
  session.add(user)
  session.commit()
  return user.id


def create_workout_with_data(session: Session) -> int:
  workout = Workout(title='Full body', status='completed')
  session.add(workout)
  session.commit()

  exercise = Exercise(slug=f'slug-{uuid.uuid4().hex[:6]}', name='Squat', muscle_group='legs', equipment='barbell')
  session.add(exercise)
  session.commit()

  workout_exercise = WorkoutExercise(workout_id=workout.id, exercise_id=exercise.id, order_index=0)
  session.add(workout_exercise)
  session.commit()

  workout_set = WorkoutSet(workout_exercise_id=workout_exercise.id, reps=5, weight=100, rpe=8)
  session.add(workout_set)
  session.commit()

  return workout.id


def test_share_workout_success(client):
  with Session(get_engine()) as session:
    user_id = create_user(session)
    workout_id = create_workout_with_data(session)

  response = client.post(f"/share/workouts/{workout_id}", json={"user_id": user_id})
  assert response.status_code == 201
  payload = response.json()
  assert payload["share_id"].startswith("sh_")
  assert payload["owner_id"] == user_id
  assert payload["exercise_count"] == 1
  assert payload["set_count"] == 1

  with Session(get_engine()) as session:
    share = session.get(Share, payload["share_id"])
    assert share is not None
    assert share.snapshot["title"] == 'Full body'


def test_share_requires_consent(client):
  with Session(get_engine()) as session:
    user_id = create_user(session, consent=False)
    workout_id = create_workout_with_data(session)
  response = client.post(f"/share/workouts/{workout_id}", json={"user_id": user_id})
  assert response.status_code == 403
  assert response.json()["detail"] == "user_without_consent"


def test_share_non_completed_workout(client):
  with Session(get_engine()) as session:
    user_id = create_user(session)
    workout = Workout(title='Draft', status='draft')
    session.add(workout)
    session.commit()
    workout_id = workout.id
  response = client.post(f"/share/workouts/{workout_id}", json={"user_id": user_id})
  assert response.status_code == 400
  assert response.json()["detail"] == "workout_not_completed"


def test_share_workout_not_found(client):
  with Session(get_engine()) as session:
    user_id = create_user(session)
  response = client.post("/share/workouts/9999", json={"user_id": user_id})
  assert response.status_code == 404
  assert response.json()["detail"] == "workout_not_found"
