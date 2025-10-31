// main.js - Calculadora Liga BetPlay 2025 - Punto de entrada principal
import { state, saveState, loadState } from './state.js';
import { loadPlayersData, loadTeamsFromLocalJSON, applyRealResults } from './data.js';
import { generateRoundRobinFixtures } from './fixtures.js';
import { recalcStandings } from './standings.js';
import { simulateChampionship } from './simulation.js';
import { renderAll, renderStandings, populateRoundFilter, initFilters } from './render.js';
import { showScorersDialog, getTeamScorers } from './scorers.js';
import { renderEvolutionChart } from './charts.js';

/* ----------------------------
   Inicialización de listeners
-----------------------------*/

// Listener para cargar equipos
document.getElementById("load-sample-btn")?.addEventListener("click", async () => {
  if (confirm("¿Cargar equipos reales (archivo local)?")) {
    const success = await loadTeamsFromLocalJSON();
    if (success) {
      recalcStandings(state);
      renderAll();
      alert("✅ Equipos cargados correctamente.");
    }
  }
});

// Listener para cargar desde API
document.getElementById("load-api-football")?.addEventListener("click", async () => {
  try {
    const res = await fetch("http://localhost:3000/teams");
    if (!res.ok) throw new Error("Error al cargar desde API");
    const data = await res.json();
    
    state.teams = data.map(t => ({
      id: t.id,
      name: t.name,
      crest: t.crest
    }));
    
    state.fixtures = [];
    saveState();
    recalcStandings(state);
    renderAll();
    alert("✅ Equipos cargados desde API-Football.");
  } catch (err) {
    console.error("❌ Error al cargar equipos:", err);
    alert("No se pudieron cargar los equipos desde la API.");
  }
});

// Listener para generar calendario
document.getElementById("generate-fixtures-btn")?.addEventListener("click", async () => {
  if (confirm("Esto sobrescribirá el calendario actual. ¿Continuar?")) {
    const success = generateRoundRobinFixtures();
    if (success) {
      await applyRealResults(getTeamScorers);
      recalcStandings(state);
      populateRoundFilter();
      renderAll();
    }
  }
});

// Listener para exportar JSON
document.getElementById("export-json")?.addEventListener("click", () => {
  const dataStr = JSON.stringify(state, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'liga_data.json';
  link.click();
  URL.revokeObjectURL(url);
});

// Listener para importar JSON
document.getElementById("import-json")?.addEventListener("click", () => {
  document.getElementById("import-file").click();
});

document.getElementById("import-file")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedState = JSON.parse(e.target.result);
      Object.assign(state, importedState);
      saveState();
      renderAll();
      alert("✅ Datos importados correctamente.");
    } catch (err) {
      console.error("Error al importar:", err);
      alert("❌ Error al importar el archivo JSON.");
    }
  };
  reader.readAsText(file);
});

// Listener para ir a cuadrangulares
document.getElementById("generate-cuadrangulares")?.addEventListener("click", () => {
  // Verificar que hay al menos 8 equipos
  if (state.teams.length < 8) {
    alert("❌ Necesitas al menos 8 equipos para crear cuadrangulares.\n\nActualmente tienes: " + state.teams.length + " equipos");
    return;
  }
  
  // Verificar que hay una tabla de posiciones calculada
  if (!state.standings || state.standings.length < 8) {
    alert("❌ Necesitas generar el calendario y tener resultados para crear cuadrangulares.\n\nGenera el calendario primero y juega algunos partidos.");
    return;
  }
  
  // Guardar el estado actual antes de ir a cuadrangulares
  saveState();
  
  // Redirigir a la página de cuadrangulares
  window.location.href = '/cuadrangulares';
});

// Listener para reiniciar
document.getElementById("reset-btn")?.addEventListener("click", () => {
  if (confirm("¿Borrar todo y reiniciar?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

// Botón simulador
const simBtn = document.createElement("button");
simBtn.textContent = "🎮 Simular Campeonato";
simBtn.className = "btn primary";
simBtn.addEventListener("click", async () => {
  await simulateChampionship();
  recalcStandings(state);
  renderAll();
});
const actionsRow = document.querySelector(".actions.row");
if (actionsRow) {
  actionsRow.appendChild(simBtn);
}

// Funciones globales
window.showScorersDialog = showScorersDialog;
window.renderAll = renderAll;

// Listener para filtro de gráfico
if (document.getElementById("standings-table")) {
  const teamsChartFilter = document.getElementById('teams-chart-filter');
  if (teamsChartFilter) {
    teamsChartFilter.addEventListener('change', () => {
      renderEvolutionChart();
    });
  }
}

/* ----------------------------
   Inicialización
-----------------------------*/
loadState();
loadPlayersData(); // Cargar datos de jugadores reales

// Solo inicializar UI completa si estamos en la página principal
if (document.getElementById("standings-table")) {
  recalcStandings(state);
  populateRoundFilter();
  initFilters();
  renderAll();
}
