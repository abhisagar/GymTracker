// Main application logic for Gym Tracker PWA

let currentView = 'workouts';
let editingWorkoutId = null;

// ==================== Navigation ====================

function showView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${view}-view`).classList.add('active');

  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'workouts') loadWorkoutList();
  if (view === 'progress') loadProgressView();
}

// ==================== Workout List ====================

async function loadWorkoutList() {
  const workouts = await getAllWorkouts();
  const container = document.getElementById('workout-list');

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <h3>No Workouts Yet</h3>
        <p>Tap + to log your first workout</p>
      </div>`;
    return;
  }

  container.innerHTML = workouts.map(w => {
    const date = new Date(w.date + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
    const exerciseNames = w.exercises.map(e => e.name).filter(Boolean);
    const summary = exerciseNames.slice(0, 3).join(', ')
      + (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3} more` : '');

    return `
      <div class="workout-card" onclick="showWorkoutDetail('${w.id}')">
        <div class="workout-card-header">
          <span class="workout-date">${date}</span>
          <span class="workout-count">${exerciseNames.length} exercise${exerciseNames.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="workout-summary">${summary}</div>
        ${w.notes ? `<div class="workout-notes">${w.notes}</div>` : ''}
      </div>`;
  }).join('');
}

// ==================== Workout Detail ====================

async function showWorkoutDetail(id) {
  const workout = await getWorkout(id);
  if (!workout) return;

  const date = new Date(workout.date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const content = document.getElementById('detail-content');
  content.innerHTML = `
    <div class="detail-date">${date}</div>
    ${workout.notes ? `<div class="detail-notes">${workout.notes}</div>` : ''}
    ${workout.exercises.map(e => `
      <div class="exercise-card">
        <div class="exercise-name">${e.name}</div>
        <div class="sets-table">
          <div class="sets-header">
            <span>Set</span><span>Reps</span><span>Weight</span>
          </div>
          ${e.sets.map((s, i) => `
            <div class="sets-row">
              <span>${i + 1}</span>
              <span>${s.reps}</span>
              <span>${s.weight} kg</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
    <div class="detail-actions">
      <button class="btn btn-secondary" onclick="startEditWorkout('${id}')">Edit</button>
      <button class="btn btn-danger" onclick="confirmDeleteWorkout('${id}')">Delete</button>
    </div>`;

  document.getElementById('detail-modal').classList.add('active');
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('active');
}

async function confirmDeleteWorkout(id) {
  if (confirm('Delete this workout?')) {
    await deleteWorkout(id);
    closeDetail();
    loadWorkoutList();
  }
}

// ==================== Add/Edit Workout ====================

function openAddWorkout() {
  editingWorkoutId = null;
  document.getElementById('form-title').textContent = 'New Workout';
  document.getElementById('workout-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('workout-notes').value = '';
  document.getElementById('exercises-container').innerHTML = '';
  addExerciseEntry();
  document.getElementById('form-modal').classList.add('active');
}

async function startEditWorkout(id) {
  closeDetail();
  const workout = await getWorkout(id);
  if (!workout) return;

  editingWorkoutId = id;
  document.getElementById('form-title').textContent = 'Edit Workout';
  document.getElementById('workout-date').value = workout.date;
  document.getElementById('workout-notes').value = workout.notes || '';

  const container = document.getElementById('exercises-container');
  container.innerHTML = '';

  workout.exercises.forEach(e => {
    addExerciseEntry(e.name, e.sets);
  });

  document.getElementById('form-modal').classList.add('active');
}

function closeForm() {
  document.getElementById('form-modal').classList.remove('active');
}

function addExerciseEntry(name = '', sets = [{ reps: 10, weight: 0 }]) {
  const container = document.getElementById('exercises-container');
  const index = container.children.length;

  const div = document.createElement('div');
  div.className = 'exercise-entry';
  div.innerHTML = `
    <div class="exercise-entry-header">
      <span>Exercise ${index + 1}</span>
      <button class="btn-icon remove-exercise" onclick="this.closest('.exercise-entry').remove(); renumberExercises()">✕</button>
    </div>
    <div class="exercise-name-row">
      <input type="text" class="exercise-name-input" placeholder="Exercise name" value="${name}">
      <button class="btn-icon" onclick="openExercisePicker(this)">📋</button>
    </div>
    <div class="sets-container">
      ${sets.map((s, i) => createSetRow(i + 1, s.reps, s.weight)).join('')}
    </div>
    <div class="set-actions">
      <button class="btn btn-small" onclick="addSetRow(this)">+ Add Set</button>
      <button class="btn btn-small btn-text-danger" onclick="removeLastSet(this)">- Remove Set</button>
    </div>`;

  container.appendChild(div);
}

function createSetRow(num, reps = 10, weight = 0) {
  return `
    <div class="set-row">
      <span class="set-num">Set ${num}</span>
      <input type="number" class="set-reps" placeholder="Reps" value="${reps}" min="0" inputmode="numeric">
      <span class="set-at">×</span>
      <input type="number" class="set-weight" placeholder="Weight" value="${weight}" min="0" step="0.5" inputmode="decimal">
      <span class="set-unit">kg</span>
    </div>`;
}

function addSetRow(btn) {
  const setsContainer = btn.closest('.exercise-entry').querySelector('.sets-container');
  const num = setsContainer.children.length + 1;
  // Copy weight from last set as default
  const lastWeight = setsContainer.lastElementChild?.querySelector('.set-weight')?.value || 0;
  const lastReps = setsContainer.lastElementChild?.querySelector('.set-reps')?.value || 10;
  setsContainer.insertAdjacentHTML('beforeend', createSetRow(num, lastReps, lastWeight));
}

function removeLastSet(btn) {
  const setsContainer = btn.closest('.exercise-entry').querySelector('.sets-container');
  if (setsContainer.children.length > 1) {
    setsContainer.lastElementChild.remove();
  }
}

function renumberExercises() {
  document.querySelectorAll('.exercise-entry').forEach((entry, i) => {
    entry.querySelector('.exercise-entry-header span').textContent = `Exercise ${i + 1}`;
  });
}

async function saveWorkoutForm() {
  const date = document.getElementById('workout-date').value;
  const notes = document.getElementById('workout-notes').value.trim();

  if (!date) {
    alert('Please select a date');
    return;
  }

  const exercises = [];
  document.querySelectorAll('.exercise-entry').forEach(entry => {
    const name = entry.querySelector('.exercise-name-input').value.trim();
    if (!name) return;

    const sets = [];
    entry.querySelectorAll('.set-row').forEach(row => {
      sets.push({
        reps: parseInt(row.querySelector('.set-reps').value) || 0,
        weight: parseFloat(row.querySelector('.set-weight').value) || 0
      });
    });
    exercises.push({ name, sets });
  });

  if (exercises.length === 0) {
    alert('Please add at least one exercise');
    return;
  }

  const workout = {
    id: editingWorkoutId || crypto.randomUUID(),
    date,
    notes: notes || null,
    exercises
  };

  await saveWorkout(workout);
  closeForm();
  loadWorkoutList();
}

// ==================== Exercise Picker ====================

let activeExerciseInput = null;

function openExercisePicker(btn) {
  activeExerciseInput = btn.closest('.exercise-name-row').querySelector('.exercise-name-input');
  const modal = document.getElementById('picker-modal');
  const container = document.getElementById('picker-list');
  const searchInput = document.getElementById('picker-search');
  searchInput.value = '';

  renderExerciseList('');
  modal.classList.add('active');
  setTimeout(() => searchInput.focus(), 100);
}

function renderExerciseList(filter) {
  const container = document.getElementById('picker-list');
  let html = '';

  for (const [group, exercises] of Object.entries(COMMON_EXERCISES)) {
    const filtered = filter
      ? exercises.filter(e => e.toLowerCase().includes(filter.toLowerCase()))
      : exercises;

    if (filtered.length === 0) continue;

    html += `<div class="picker-group">${group}</div>`;
    html += filtered.map(e =>
      `<div class="picker-item" onclick="pickExercise('${e}')">${e}</div>`
    ).join('');
  }

  container.innerHTML = html || '<div class="empty-state"><p>No exercises found</p></div>';
}

function filterExercises(value) {
  renderExerciseList(value);
}

function pickExercise(name) {
  if (activeExerciseInput) {
    activeExerciseInput.value = name;
  }
  closePicker();
}

function closePicker() {
  document.getElementById('picker-modal').classList.remove('active');
}

// ==================== Progress View ====================

async function loadProgressView() {
  const names = await getAllExerciseNames();
  const select = document.getElementById('progress-exercise');
  const currentVal = select.value;

  select.innerHTML = '<option value="">Select Exercise</option>'
    + names.map(n => `<option value="${n}" ${n === currentVal ? 'selected' : ''}>${n}</option>`).join('');

  if (currentVal) {
    loadProgressData(currentVal);
  } else {
    document.getElementById('progress-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Track Your Progress</h3>
        <p>Select an exercise above to see your progress over time</p>
      </div>`;
  }
}

async function loadProgressData(exerciseName) {
  if (!exerciseName) return;

  const entries = await getExerciseProgress(exerciseName);
  const container = document.getElementById('progress-content');
  const metric = document.getElementById('progress-metric').value;

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No data found for ${exerciseName}</p>
      </div>`;
    return;
  }

  // Draw chart
  const chartHtml = drawChart(entries, metric);

  // Data table
  const tableHtml = entries.slice().reverse().map(e => {
    const date = new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    return `
      <div class="progress-row">
        <span class="progress-date">${date}</span>
        <div class="progress-stats">
          <span class="progress-weight">${e.maxWeight} kg</span>
          <span class="progress-detail">${e.maxReps} reps · Vol: ${Math.round(e.totalVolume)}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = chartHtml + `<div class="progress-table">${tableHtml}</div>`;
}

function drawChart(entries, metric) {
  if (entries.length < 2) {
    return '<div class="chart-placeholder">Need at least 2 sessions to show chart</div>';
  }

  const values = entries.map(e => {
    if (metric === 'maxWeight') return e.maxWeight;
    if (metric === 'maxReps') return e.maxReps;
    return e.totalVolume;
  });

  const labels = entries.map(e => {
    const d = new Date(e.date + 'T00:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  const chartHeight = 180;
  const chartWidth = Math.max(entries.length * 60, 300);

  // Build SVG polyline
  const points = values.map((v, i) => {
    const x = 40 + (i / (values.length - 1)) * (chartWidth - 60);
    const y = chartHeight - 20 - ((v - minVal) / range) * (chartHeight - 50);
    return { x, y, value: v, label: labels[i] };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // Area fill
  const area = `${points[0].x},${chartHeight - 20} ${polyline} ${points[points.length - 1].x},${chartHeight - 20}`;

  const metricLabel = metric === 'maxWeight' ? 'Max Weight (kg)'
    : metric === 'maxReps' ? 'Max Reps' : 'Total Volume';

  return `
    <div class="chart-container">
      <div class="chart-label">${metricLabel}</div>
      <div class="chart-scroll">
        <svg width="${chartWidth}" height="${chartHeight}" class="chart-svg">
          <polygon points="${area}" fill="rgba(59,130,246,0.15)"/>
          <polyline points="${polyline}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${points.map(p => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#3b82f6"/>
            <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" class="chart-value">${Math.round(p.value * 10) / 10}</text>
            <text x="${p.x}" y="${chartHeight - 4}" text-anchor="middle" class="chart-date">${p.label}</text>
          `).join('')}
        </svg>
      </div>
    </div>`;
}

// ==================== Init ====================

document.addEventListener('DOMContentLoaded', () => {
  showView('workouts');
});
