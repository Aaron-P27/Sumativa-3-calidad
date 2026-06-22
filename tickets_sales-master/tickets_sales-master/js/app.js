/**
 * app.js — Post-it Notes Dashboard
 *
 * Archivo corregido y optimizado para la evaluación de SonarQube.
 */

'use strict';

// ─── Estado global ───────────────────────────────────────────────────────────
// CORRECCIÓN: Se reemplazó 'var' por 'let' (Maintainability)
let notesCache = [];

const STORAGE_KEY_NOTES = 'notes';
const STORAGE_KEY_USER = 'currentUser';

let currentFilter = 'all';

// ─── Utilidades de almacenamiento y seguridad ────────────────────────────────
function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_NOTES)) || [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  // CORRECCIÓN: Se eliminó el console.log en producción (Code Smell)
  notesCache = notes;
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
}

function getUser() {
  return localStorage.getItem(STORAGE_KEY_USER);
}

// CORRECCIÓN: Función añadida para sanitizar entradas y evitar XSS (Vulnerabilidad)
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
  }[tag] || tag));
}

// ─── Renderizado principal ────────────────────────────────────────────────────
function renderApp() {
  const user = getUser();
  const shell = document.getElementById('app');

  // CORRECCIÓN: Se invirtió la condición negada (!user) a positiva (Maintainability)
  if (user) {
    shell.innerHTML = buildDashboard(user);
    bindDashboardEvents();
    renderNotes();
  } else {
    shell.innerHTML = buildAuthScreen();
    bindAuthEvents();
  }
}

// ─── Construcción del dashboard ───────────────────────────────────────────────
function buildDashboard(user) {
  return `
    <div class="dashboard-header py-3 px-4 d-flex align-items-center justify-content-between">
      <div>
        <span class="brand-title fs-3">Post-it Notes</span>
        <div class="text-white-50 small">Notas privadas guardadas en este navegador.</div>
      </div>
      <div class="d-flex align-items-center gap-3">
        <span class="header-user px-3 py-2">
          <i class="bi bi-person-circle me-1"></i>${escapeHTML(user)}
        </span>
        <button class="btn btn-outline-light btn-sm" id="btnLogout">Cerrar sesión</button>
      </div>
    </div>
    <div class="container-fluid py-4 px-4">
      <div class="toolbar p-4 mb-4 dashboard-actions d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h1 class="fs-4 fw-bold mb-1">Mis notas</h1>
          <p class="text-white-50 small mb-0">Crea, marca como importante y filtra tus Post-it.</p>
        </div>
        <div class="d-flex gap-2 flex-wrap dashboard-actions">
          <ul class="nav nav-pills">
            <li class="nav-item">
              <button class="nav-link ${currentFilter === 'all' ? 'active' : ''}" id="filterAll">Todas</button>
            </li>
            <li class="nav-item">
              <button class="nav-link ${currentFilter === 'important' ? 'active' : ''}" id="filterImportant">Importantes</button>
            </li>
          </ul>
          <button class="btn btn-gradient px-4" data-bs-toggle="modal" data-bs-target="#noteModal">+ Crear nota</button>
        </div>
      </div>
      <div id="notesContainer"></div>
    </div>
  `;
}

// ─── Renderizado de notas ─────────────────────────────────────────────────────
function renderNotes() {
  const notes = getNotes();
  const container = document.getElementById('notesContainer');
  const filtered = currentFilter === 'important'
    ? notes.filter(n => n.important)
    : notes;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state text-center py-5">
        <p class="text-white-50">No hay notas todavía. ¡Crea una!</p>
      </div>`;
    return;
  }

  const html = filtered.map(note => {
    // CORRECCIÓN: Eliminado el literal booleano (== true) (Maintainability)
    const cssClass = note.important ? 'important' : 'normal';

    // CORRECCIÓN: Uso de generador seguro en lugar de Math.random() (Security Hotspot)
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    const rotation = (randomValue * 6 - 3).toFixed(2);

    // CORRECCIÓN: Inserción de escapeHTML() para prevenir XSS
    return `
      <div class="postit-card ${cssClass}" style="--rotation:${rotation}deg">
        <button class="delete-note" data-id="${note.id}" title="Eliminar">✕</button>
        <div class="postit-title">${escapeHTML(note.title)}</div>
        <div class="postit-description">${escapeHTML(note.description)}</div>
        <div class="postit-meta">
          <span>${escapeHTML(note.author)}</span>
          <span>${formatDate(note.createdAt)}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="notes-grid">${html}</div>`;
  bindDeleteEvents();
}

// CORRECCIÓN: Se eliminó la función duplicada renderNoteCard (Code Smell)

// ─── Creación de notas ────────────────────────────────────────────────────────
function createNote(title, description, important) {
  const user = getUser();
  const notes = getNotes();

  // CORRECCIÓN: Verificación segura por si user es null (Bug)
  const author = user ? '@' + user.toUpperCase() : '@ANONIMO';

  const note = {
    id: Date.now(),
    title,
    description,
    important,
    author,
    createdAt: new Date().toISOString(),
  };

  notes.push(note);
  saveNotes(notes);
  return note;
}

// ─── Manejo del formulario ────────────────────────────────────────────────────
// CORRECCIÓN: Se extrajo la validación para no tener una función tan larga (Code Smell)
function validateForm() {
  const titleInput = document.getElementById('noteTitle');
  const descInput = document.getElementById('noteDescription');
  let isValid = true;

  if (!titleInput.value.trim()) {
    titleInput.classList.add('is-invalid');
    isValid = false;
  } else {
    titleInput.classList.remove('is-invalid');
  }

  if (!descInput.value.trim()) {
    descInput.classList.add('is-invalid');
    isValid = false;
  } else {
    descInput.classList.remove('is-invalid');
  }

  return isValid;
}

function processAndRenderAllNotesOnFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const titleInput = document.getElementById('noteTitle');
  const descInput = document.getElementById('noteDescription');
  const importantCb = document.getElementById('noteImportant');

  createNote(
    titleInput.value.trim(),
    descInput.value.trim(),
    importantCb.checked
  );

  titleInput.value = '';
  descInput.value = '';
  importantCb 
  