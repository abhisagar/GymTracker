// Predefined list of common gym exercises grouped by muscle group

const CUSTOM_EXERCISES_KEY = 'gymtracker.customExercises';

function getCustomExercises() {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function addCustomExercise(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const list = getCustomExercises();
  const exists = list.some(e => e.toLowerCase() === trimmed.toLowerCase());
  if (exists) return false;
  list.push(trimmed);
  list.sort((a, b) => a.localeCompare(b));
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(list));
  return true;
}

function removeCustomExercise(name) {
  const list = getCustomExercises().filter(e => e !== name);
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(list));
}

const COMMON_EXERCISES = {
  'Chest': [
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
    'Dumbbell Fly', 'Cable Crossover', 'Push-Up', 'Chest Dip'
  ],
  'Back': [
    'Deadlift', 'Barbell Row', 'Pull-Up', 'Lat Pulldown',
    'Seated Cable Row', 'T-Bar Row', 'Dumbbell Row', 'Back Hyperextension',
    'Chin-Up', 'Single Hand Cable Row'
  ],
  'Shoulders': [
    'Overhead Press', 'Lateral Raise', 'Front Raise',
    'Face Pull', 'Arnold Press', 'Upright Row', 'Reverse Fly',
    'Rear-Delt Fly'
  ],
  'Legs': [
    'Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension',
    'Leg Curl', 'Calf Raise', 'Lunge', 'Bulgarian Split Squat', 'Hip Thrust',
    'Single Leg Calf Raise'
  ],
  'Arms': [
    'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl',
    'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension',
    'Preacher Curl', 'Dip', 'Bicep Curls', 'Cable Bicep Curls',
    'Cable Push (long head)', 'Cable Push (short head)', 'Spider Curl'
  ],
  'Core': [
    'Plank', 'Crunch', 'Hanging Leg Raise', 'Cable Crunch',
    'Ab Wheel Rollout', 'Russian Twist', 'Dead Bug'
  ]
};
