// IndexedDB persistence layer for the Gym Tracker app.
// Stores workouts, exercises, and sets locally on the device.

const DB_NAME = 'GymTrackerDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Workouts store: { id, date, notes }
      if (!db.objectStoreNames.contains('workouts')) {
        const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
        workoutStore.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save a complete workout object:
// { id, date, notes, exercises: [{ name, sets: [{ reps, weight }] }] }
async function saveWorkout(workout) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readwrite');
    tx.objectStore('workouts').put(workout);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get all workouts sorted by date (newest first)
async function getAllWorkouts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readonly');
    const request = tx.objectStore('workouts').getAll();
    request.onsuccess = () => {
      const workouts = request.result;
      workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
      resolve(workouts);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get a single workout by ID
async function getWorkout(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readonly');
    const request = tx.objectStore('workouts').get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete a workout by ID
async function deleteWorkout(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readwrite');
    tx.objectStore('workouts').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get all unique exercise names ever logged
async function getAllExerciseNames() {
  const workouts = await getAllWorkouts();
  const names = new Set();
  workouts.forEach(w => {
    w.exercises.forEach(e => {
      if (e.name) names.add(e.name);
    });
  });
  return [...names].sort();
}

// Get progress data for a specific exercise: [{ date, maxWeight, maxReps, totalVolume }]
async function getExerciseProgress(exerciseName) {
  const workouts = await getAllWorkouts();
  const dayMap = {};

  workouts.forEach(w => {
    const dayKey = w.date;
    w.exercises.forEach(e => {
      if (e.name.toLowerCase() === exerciseName.toLowerCase()) {
        if (!dayMap[dayKey]) {
          dayMap[dayKey] = { date: dayKey, maxWeight: 0, maxReps: 0, totalVolume: 0 };
        }
        e.sets.forEach(s => {
          const weight = parseFloat(s.weight) || 0;
          const reps = parseInt(s.reps) || 0;
          dayMap[dayKey].maxWeight = Math.max(dayMap[dayKey].maxWeight, weight);
          dayMap[dayKey].maxReps = Math.max(dayMap[dayKey].maxReps, reps);
          dayMap[dayKey].totalVolume += weight * reps;
        });
      }
    });
  });

  return Object.values(dayMap).sort((a, b) => new Date(a.date) - new Date(b.date));
}
