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
    ${workout.bodyweight != null ? `<div class="detail-bodyweight">Bodyweight: <strong>${workout.bodyweight} kg</strong></div>` : ''}
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
      <button class="btn btn-secondary" onclick="duplicateWorkoutAsNew('${id}')">Duplicate</button>
      <button class="btn btn-secondary" onclick="startEditWorkout('${id}')">Edit</button>
      <button class="btn btn-danger" onclick="confirmDeleteWorkout('${id}')">Delete</button>
    </div>`;

  document.getElementById('detail-modal').classList.add('active');
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('active');
}

async function duplicateWorkoutAsNew(id) {
  const source = await getWorkout(id);
  if (!source) return;
  closeDetail();
  openAddWorkout();
  const container = document.getElementById('exercises-container');
  container.replaceChildren();
  source.exercises.forEach(e => {
    addExerciseEntry(e.name, e.sets.map(s => ({ reps: s.reps, weight: s.weight })));
  });
  if (source.notes) document.getElementById('workout-notes').value = source.notes;
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
  document.getElementById('workout-bodyweight').value = '';
  document.getElementById('workout-notes').value = '';
  document.getElementById('exercises-container').innerHTML = '';
  document.getElementById('copy-from-row').style.display = 'block';
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
  document.getElementById('workout-bodyweight').value = workout.bodyweight ?? '';
  document.getElementById('workout-notes').value = workout.notes || '';
  document.getElementById('copy-from-row').style.display = 'none';

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
      <input type="text" class="exercise-name-input" placeholder="Exercise name" value="${escapeHtml(name)}">
      <button class="btn-icon" onclick="openExercisePicker(this)">📋</button>
    </div>
    <div class="last-time-hint" style="display:none"></div>
    <div class="sets-container">
      ${sets.map((s, i) => createSetRow(i + 1, s.reps, s.weight)).join('')}
    </div>
    <div class="set-actions">
      <button class="btn btn-small" onclick="addSetRow(this)">+ Add Set</button>
      <button class="btn btn-small btn-text-danger" onclick="removeLastSet(this)">- Remove Set</button>
    </div>`;

  container.appendChild(div);

  const nameInput = div.querySelector('.exercise-name-input');
  nameInput.addEventListener('change', () => annotateLastTimeHint(div));
  nameInput.addEventListener('blur', () => annotateLastTimeHint(div));

  // Populate hint immediately if we have a name already
  if (name) {
    annotateLastTimeHint(div);
  }
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
  const bodyweightRaw = document.getElementById('workout-bodyweight').value.trim();
  const bodyweight = bodyweightRaw === '' ? null : parseFloat(bodyweightRaw);
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
    bodyweight: Number.isFinite(bodyweight) ? bodyweight : null,
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
  const lcFilter = filter.toLowerCase();
  let html = '';

  const custom = getCustomExercises();
  const customFiltered = filter
    ? custom.filter(e => e.toLowerCase().includes(lcFilter))
    : custom;

  if (customFiltered.length > 0) {
    html += `<div class="picker-group">My Exercises</div>`;
    html += customFiltered.map(e =>
      `<div class="picker-item picker-item-custom" data-name="${escapeHtml(e)}">
        <span class="picker-item-label">${escapeHtml(e)}</span>
        <button class="btn-icon-sm" data-action="delete-custom" aria-label="Delete">🗑</button>
      </div>`
    ).join('');
  }

  for (const [group, exercises] of Object.entries(COMMON_EXERCISES)) {
    const filtered = filter
      ? exercises.filter(e => e.toLowerCase().includes(lcFilter))
      : exercises;

    if (filtered.length === 0) continue;

    html += `<div class="picker-group">${group}</div>`;
    html += filtered.map(e =>
      `<div class="picker-item" data-name="${escapeHtml(e)}">${escapeHtml(e)}</div>`
    ).join('');
  }

  container.innerHTML = html || '<div class="empty-state"><p>No exercises found</p></div>';
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function handlePickerClick(event) {
  const deleteBtn = event.target.closest('[data-action="delete-custom"]');
  if (deleteBtn) {
    event.stopPropagation();
    const name = deleteBtn.closest('.picker-item').dataset.name;
    if (confirm(`Remove "${name}" from your list?`)) {
      removeCustomExercise(name);
      renderExerciseList(document.getElementById('picker-search').value);
    }
    return;
  }
  const item = event.target.closest('.picker-item');
  if (item) {
    pickExercise(item.dataset.name);
  }
}

function addCustomExerciseFromPicker() {
  const name = prompt('Name for new exercise:');
  if (!name) return;
  const added = addCustomExercise(name);
  if (!added) {
    alert('That exercise already exists.');
    return;
  }
  const searchInput = document.getElementById('picker-search');
  searchInput.value = '';
  renderExerciseList('');
}

function filterExercises(value) {
  renderExerciseList(value);
}

function pickExercise(name) {
  if (activeExerciseInput) {
    activeExerciseInput.value = name;
    const entry = activeExerciseInput.closest('.exercise-entry');
    if (entry) annotateLastTimeHint(entry);
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

// ==================== Backup / Restore ====================

function openBackupMenu() {
  document.getElementById('backup-modal').classList.add('active');
}

function closeBackupMenu() {
  document.getElementById('backup-modal').classList.remove('active');
}

async function exportAllData() {
  const workouts = await getAllWorkouts();
  const payload = {
    app: 'gymtracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    customExercises: getCustomExercises(),
    workouts
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `gymtracker-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let pendingImportMode = 'merge';

function triggerImport(mode) {
  pendingImportMode = mode;
  if (mode === 'replace' && !confirm('Replace will DELETE all current workouts on this device before importing. Continue?')) {
    return;
  }
  document.getElementById('import-file').click();
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    alert('That file is not valid JSON.');
    return;
  }

  if (!data || !Array.isArray(data.workouts)) {
    alert('That file does not look like a Gym Tracker backup.');
    return;
  }

  // Basic shape validation on each workout
  const valid = data.workouts.every(w =>
    w && typeof w.id === 'string' && typeof w.date === 'string' && Array.isArray(w.exercises)
  );
  if (!valid) {
    alert('Backup file is corrupted or has unexpected format.');
    return;
  }

  try {
    if (pendingImportMode === 'replace') {
      await replaceAllWorkouts(data.workouts);
      if (Array.isArray(data.customExercises)) {
        localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(data.customExercises));
      }
      alert(`Imported ${data.workouts.length} workouts (replaced existing data).`);
    } else {
      const result = await mergeWorkouts(data.workouts);
      if (Array.isArray(data.customExercises)) {
        data.customExercises.forEach(addCustomExercise);
      }
      alert(`Imported ${result.added} new workouts. Skipped ${result.skipped} that already existed.`);
    }
  } catch (err) {
    alert('Import failed: ' + (err?.message || 'unknown error'));
    return;
  }

  closeBackupMenu();
  loadWorkoutList();
}

// ==================== Copy From Previous Workout ====================

async function openCopyFromPicker() {
  const workouts = await getAllWorkouts();
  const container = document.getElementById('copy-list');

  if (workouts.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No previous workouts to copy from.</p></div>`;
  } else {
    container.innerHTML = workouts.map(w => {
      const date = new Date(w.date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
      const names = w.exercises.map(e => e.name).filter(Boolean);
      const summary = names.slice(0, 3).join(', ')
        + (names.length > 3 ? ` +${names.length - 3} more` : '');
      return `
        <div class="workout-card" onclick="copyFromWorkout('${w.id}')">
          <div class="workout-card-header">
            <span class="workout-date">${escapeHtml(date)}</span>
            <span class="workout-count">${names.length} exercise${names.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="workout-summary">${escapeHtml(summary)}</div>
        </div>`;
    }).join('');
  }

  document.getElementById('copy-modal').classList.add('active');
}

function closeCopyFromPicker() {
  document.getElementById('copy-modal').classList.remove('active');
}

async function copyFromWorkout(id) {
  const workout = await getWorkout(id);
  if (!workout) return;

  // Clear current exercises and repopulate from source
  const container = document.getElementById('exercises-container');
  container.innerHTML = '';
  workout.exercises.forEach(e => {
    addExerciseEntry(e.name, e.sets.map(s => ({ reps: s.reps, weight: s.weight })));
  });

  // Annotate each exercise with a "last time" hint
  await annotateAllLastTimeHints();

  closeCopyFromPicker();
}

// ==================== "Last time" hint ====================

async function annotateLastTimeHint(entryEl) {
  const input = entryEl.querySelector('.exercise-name-input');
  const hintEl = entryEl.querySelector('.last-time-hint');
  const name = input.value.trim();
  if (!hintEl) return;
  if (!name) {
    hintEl.textContent = '';
    hintEl.style.display = 'none';
    return;
  }
  const last = await getLastExerciseSession(name);
  if (!last) {
    hintEl.textContent = 'No previous data for this exercise.';
    hintEl.style.display = 'block';
    return;
  }
  const date = new Date(last.date + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric'
  });
  const setsSummary = last.sets.map(s => `${s.reps}×${s.weight}kg`).join(', ');
  hintEl.innerHTML = `<span class="hint-label">Last time (${escapeHtml(date)}):</span> ${escapeHtml(setsSummary)}`;
  hintEl.style.display = 'block';
}

async function annotateAllLastTimeHints() {
  const entries = document.querySelectorAll('.exercise-entry');
  for (const entry of entries) {
    await annotateLastTimeHint(entry);
  }
}

// ==================== Init ====================

document.addEventListener('DOMContentLoaded', () => {
  showView('workouts');
  document.getElementById('picker-list').addEventListener('click', handlePickerClick);
});
