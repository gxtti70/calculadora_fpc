// state.js - Manejo de estado y localStorage

const STORAGE_KEY = "liga_state_v4";

export const state = {
  teams: [],
  fixtures: [],
  standings: [],
  ui: {
    roundFilter: "all",
    showOnlyPlayed: false,
    showOnlyUnplayed: false,
    sortBy: "pts",
    sortDir: "desc"
  }
};

export const playersData = {
  goleadores: [],
  asistentes: []
};

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const loaded = JSON.parse(raw);
      Object.assign(state, loaded);
    } catch (err) {
      console.error("Error al cargar estado:", err);
    }
  }
}

