// render.js - Funciones de renderizado de la UI

import { state, saveState, playersData } from './state.js';
import { escapeHtml, placeholderCrest, placeholderDataURI } from './utils.js';
import { recalcStandings } from './standings.js';
import { calcularGoleadores } from './scorers.js';
import { renderEvolutionChart } from './charts.js';

// Elementos UI
const teamsListEl = document.getElementById("teams-list");
const roundsContainer = document.getElementById("rounds-container");
const standingsTbody = document.querySelector("#standings-table tbody");
const roundFilterEl = document.getElementById("round-filter");
const showOnlyPlayedEl = document.getElementById("show-only-played");
const showOnlyUnplayedEl = document.getElementById("show-only-unplayed");
const clearFiltersBtn = document.getElementById("clear-filters");

let currentRoundIndex = 0;

export function renderTeams() {
  if (!teamsListEl) return;
  
  teamsListEl.innerHTML = "";
  state.teams.forEach((t) => {
    const div = document.createElement("div");
    div.className = "team-item";
    const crest = t.crest || placeholderCrest(t.name);
    div.innerHTML = `
      <div class="team-left">
        <img src="${crest}" alt="${t.name} escudo" />
        <input data-id="${t.id}" type="text" value="${escapeHtml(t.name)}" />
      </div>
    `;
    teamsListEl.appendChild(div);
  });
  
  // Agregar event listeners para inputs de nombres de equipos
  teamsListEl.querySelectorAll('input[data-id]').forEach(input => {
    input.addEventListener('change', (e) => {
      const teamId = e.target.dataset.id;
      const newName = e.target.value.trim();
      if (newName) {
        const team = state.teams.find(t => t.id === teamId);
        if (team) {
          team.name = newName;
          saveState();
          recalcStandings(state);
          renderStandings();
        }
      }
    });
  });
}

export function populateRoundFilter() {
  if (!roundFilterEl) return;
  
  roundFilterEl.innerHTML = `<option value="all">Todas las fechas</option>`;
  const rounds = [...new Set(state.fixtures.map(f => f.round))].sort((a, b) => a - b);
  rounds.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = `Fecha ${r}`;
    roundFilterEl.appendChild(opt);
  });
  roundFilterEl.value = state.ui.roundFilter;
}

export function renderFixtures() {
  if (!roundsContainer) return;
  
  roundsContainer.innerHTML = "";

  if (!state.fixtures.length) {
    roundsContainer.innerHTML = `<div class="note">No hay calendario. Genera el calendario con "Generar calendario".</div>`;
    populateRoundFilter();
    return;
  }

  populateRoundFilter();

  const allRounds = [...new Set(state.fixtures.map(f => f.round))].sort((a, b) => a - b);
  const filter = state.ui.roundFilter;
  let filteredRounds = allRounds;
  if (filter !== "all") filteredRounds = allRounds.filter(r => String(r) === String(filter));

  if (currentRoundIndex >= filteredRounds.length) currentRoundIndex = filteredRounds.length - 1;
  if (currentRoundIndex < 0) currentRoundIndex = 0;

  const currentRound = filteredRounds[currentRoundIndex];
  let matches = state.fixtures.filter(f => f.round === currentRound);

  // Filtros jugados / sin jugar
  matches = matches.filter(m => {
    const played = m.homeScore !== null && m.awayScore !== null;
    if (state.ui.showOnlyPlayed && !played) return false;
    if (state.ui.showOnlyUnplayed && played) return false;
    return true;
  });

  const total = state.fixtures.filter(f => f.round === currentRound).length;
  const playedCount = state.fixtures.filter(f => f.round === currentRound && f.homeScore !== null && f.awayScore !== null).length;

  const wrapper = document.createElement("div");
  wrapper.className = "round-wrapper";

  const nav = document.createElement("div");
  nav.className = "round-nav";
  nav.innerHTML = `
    <button class="nav-btn" id="prev-round" ${currentRoundIndex === 0 ? "disabled" : ""}>⬅️</button>
    <h3>Fecha ${currentRound} de ${allRounds.length}</h3>
    <button class="nav-btn" id="next-round" ${currentRoundIndex === filteredRounds.length - 1 ? "disabled" : ""}>➡️</button>
  `;

  const counter = document.createElement("div");
  counter.className = "match-counter";
  counter.textContent = `Partidos jugados: ${playedCount} / ${total}`;

  const tbl = document.createElement("table");
  tbl.className = "fixtures-table";
  tbl.innerHTML = `<thead><tr><th>Local</th><th>Marcador</th><th>Visitante</th></tr></thead><tbody></tbody>`;

  if (matches.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" style="padding:20px;color:#9fd6b6;">No hay partidos que coincidan con los filtros.</td>`;
    tbl.querySelector("tbody").appendChild(tr);
  } else {
    matches.forEach(m => {
      const home = state.teams.find(t => t.id === m.homeId);
      const away = state.teams.find(t => t.id === m.awayId);
      const tr = document.createElement("tr");
      const homeCrest = home?.crest || placeholderDataURI();
      const awayCrest = away?.crest || placeholderDataURI();

      // Inicializar arrays de goleadores si no existen
      if (!m.homeScorers) m.homeScorers = [];
      if (!m.awayScorers) m.awayScorers = [];
      
      const isPlayed = m.homeScore !== null && m.awayScore !== null;
      const homeGoalsCount = m.homeScore || 0;
      const awayGoalsCount = m.awayScore || 0;
      
      let scorersHtml = '';
      if (isPlayed) {
        scorersHtml = `
          <div class="match-scorers" style="margin-top: 8px; font-size: 0.85rem; color: #9fd6b6;">
            <div style="margin-bottom: 4px;">
              <strong>${home?.name || ''}:</strong>
              ${m.homeScorers.length > 0 ? m.homeScorers.map((s, i) => 
                `<span>${escapeHtml(s.name)}${s.goals > 1 ? ` (${s.goals})` : ''}${i < m.homeScorers.length - 1 ? ', ' : ''}</span>`
              ).join('') : `<button class="btn small" onclick="window.showScorersDialog('${m.id}', 'home', ${homeGoalsCount})" style="padding: 2px 6px; font-size: 0.75rem;">+ Goleadores</button>`}
            </div>
            <div>
              <strong>${away?.name || ''}:</strong>
              ${m.awayScorers.length > 0 ? m.awayScorers.map((s, i) => 
                `<span>${escapeHtml(s.name)}${s.goals > 1 ? ` (${s.goals})` : ''}${i < m.awayScorers.length - 1 ? ', ' : ''}</span>`
              ).join('') : `<button class="btn small" onclick="window.showScorersDialog('${m.id}', 'away', ${awayGoalsCount})" style="padding: 2px 6px; font-size: 0.75rem;">+ Goleadores</button>`}
            </div>
          </div>
        `;
      }
      
      tr.innerHTML = `
        <td class="team"><div class="team-box"><img src="${homeCrest}" alt="${home?.name ?? ""}" /><span>${escapeHtml(home?.name ?? "")}</span></div></td>
        <td class="result">
          <div><input type="number" min="0" value="${m.homeScore ?? ""}" data-mid="${m.id}" data-side="home" /><span> - </span><input type="number" min="0" value="${m.awayScore ?? ""}" data-mid="${m.id}" data-side="away" /></div>
          ${scorersHtml}
        </td>
        <td class="team"><div class="team-box"><span>${escapeHtml(away?.name ?? "")}</span><img src="${awayCrest}" alt="${away?.name ?? ""}" /></div></td>
      `;
      tbl.querySelector("tbody").appendChild(tr);
    });
  }

  wrapper.appendChild(nav);
  wrapper.appendChild(counter);
  wrapper.appendChild(tbl);
  roundsContainer.appendChild(wrapper);

  document.getElementById("prev-round").addEventListener("click", () => { currentRoundIndex--; renderFixtures(); });
  document.getElementById("next-round").addEventListener("click", () => { currentRoundIndex++; renderFixtures(); });

  roundsContainer.querySelectorAll('input[type="number"]').forEach(inp => {
    // Forzar entrada por teclado solamente (sin flechas/rueda)
    inp.setAttribute('step', '1');
    inp.setAttribute('inputmode', 'numeric');
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') ev.preventDefault();
    });
    inp.addEventListener('wheel', (ev) => {
      ev.preventDefault();
    }, { passive: false });
    inp.addEventListener("change", e => {
      const mid = inp.dataset.mid;
      const side = inp.dataset.side;
      const val = inp.value === "" ? null : parseInt(inp.value, 10);
      const match = state.fixtures.find(x => x.id === mid);
      if (!match) return;
      
      // Inicializar arrays de goleadores si no existen
      if (!match.homeScorers) match.homeScorers = [];
      if (!match.awayScorers) match.awayScorers = [];
      
      if (side === "home") {
        match.homeScore = val;
        // Si el nuevo marcador es menor que los goles de goleadores, limpiar goleadores
        if (val !== null && match.homeScorers.length > 0) {
          const totalScored = match.homeScorers.reduce((sum, s) => sum + (s.goals || 1), 0);
          if (totalScored > val) {
            match.homeScorers = [];
          }
        }
      } else {
        match.awayScore = val;
        // Si el nuevo marcador es menor que los goles de goleadores, limpiar goleadores
        if (val !== null && match.awayScorers.length > 0) {
          const totalScored = match.awayScorers.reduce((sum, s) => sum + (s.goals || 1), 0);
          if (totalScored > val) {
            match.awayScorers = [];
          }
        }
      }
      
      saveState();
      recalcStandings(state);
      renderAll();
    });
  });
}

export function renderStandings() {
  if (!standingsTbody) return;
  
  standingsTbody.innerHTML = "";
  state.standings.forEach((s, idx) => {
    const team = state.teams.find(t => t.id === s.teamId);
    const crest = team?.crest || placeholderDataURI();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="teamcell"><img src="${crest}" alt="${team?.name ?? ''}" /> <span>${escapeHtml(s.name)}</span></td>
      <td>${s.played}</td><td>${s.wins}</td><td>${s.draws}</td><td>${s.losses}</td>
      <td>${s.gf}</td><td>${s.gc}</td><td>${s.gd}</td><td>${s.pts}</td>
    `;
    standingsTbody.appendChild(tr);
  });
}

export function renderTopScorers() {
  const tbody = document.querySelector('#top-scorers-table tbody');
  if (!tbody) return;
  
  const goleadores = calcularGoleadores(state);
  
  if (goleadores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:#9fd6b6;">No hay goleadores registrados. Agrega goleadores en los partidos del calendario.</td></tr>';
    return;
  }
  
  tbody.innerHTML = '';
  goleadores.forEach((gol, idx) => {
    const team = state.teams.find(t => t.id === gol.teamId);
    const crest = team?.crest || placeholderDataURI();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="teamcell"><span>${escapeHtml(gol.name)}</span></td>
      <td class="teamcell"><img src="${crest}" alt="${gol.teamName}" style="width:20px;height:20px;margin-right:5px;" /> <span>${escapeHtml(gol.teamName)}</span></td>
      <td><strong>${gol.goals}</strong></td>
      <td>${gol.matches}</td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderTopAssists() {
  const tbody = document.querySelector('#top-assists-table tbody');
  if (!tbody) return;
  
  // Calcular asistencias desde los partidos (si se implementa en el futuro)
  // Por ahora mostrar los datos reales de la liga
  const asistentes = [...playersData.asistentes].sort((a, b) => b.assists - a.assists);
  
  if (asistentes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9fd6b6;">No hay datos de asistentes disponibles.</td></tr>';
    return;
  }
  
  tbody.innerHTML = '';
  asistentes.forEach((asist, idx) => {
    const team = state.teams.find(t => t.id === asist.teamId);
    const crest = team?.crest || placeholderDataURI();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="teamcell"><span>${escapeHtml(asist.name)}</span></td>
      <td class="teamcell"><img src="${crest}" alt="${asist.teamName}" style="width:20px;height:20px;margin-right:5px;" /> <span>${escapeHtml(asist.teamName)}</span></td>
      <td><strong>${asist.assists}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderAll() {
  renderTeams();
  renderFixtures();
  recalcStandings(state);
  renderStandings();
  renderTopScorers();
  renderTopAssists();
  renderEvolutionChart();
}

// Inicializar filtros
export function initFilters() {
  if (!roundFilterEl || !showOnlyPlayedEl || !showOnlyUnplayedEl || !clearFiltersBtn) return;
  
  roundFilterEl.addEventListener("change", () => {
    state.ui.roundFilter = roundFilterEl.value;
    currentRoundIndex = 0;
    saveState();
    renderFixtures();
  });
  
  showOnlyPlayedEl.addEventListener("change", () => {
    state.ui.showOnlyPlayed = showOnlyPlayedEl.checked;
    if (state.ui.showOnlyPlayed) state.ui.showOnlyUnplayed = false;
    showOnlyUnplayedEl.checked = state.ui.showOnlyUnplayed;
    saveState();
    renderFixtures();
  });
  
  showOnlyUnplayedEl.addEventListener("change", () => {
    state.ui.showOnlyUnplayed = showOnlyUnplayedEl.checked;
    if (state.ui.showOnlyUnplayed) state.ui.showOnlyPlayed = false;
    showOnlyPlayedEl.checked = state.ui.showOnlyPlayed;
    saveState();
    renderFixtures();
  });
  
  clearFiltersBtn.addEventListener("click", () => {
    state.ui.roundFilter = "all";
    state.ui.showOnlyPlayed = false;
    state.ui.showOnlyUnplayed = false;
    roundFilterEl.value = "all";
    showOnlyPlayedEl.checked = false;
    showOnlyUnplayedEl.checked = false;
    saveState();
    renderFixtures();
  });
}

