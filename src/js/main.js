// main.js - Calculadora Liga BetPlay 2025 (Versión moderna + simulador)
const STORAGE_KEY = "liga_state_v4";

let state = {
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

/* ----------------------------
   Utilidades
-----------------------------*/
function uid(prefix="id"){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){ const raw = localStorage.getItem(STORAGE_KEY); if (raw) state = JSON.parse(raw); }
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* ----------------------------
   Elementos UI
-----------------------------*/
const teamsListEl = document.getElementById("teams-list");
const roundsContainer = document.getElementById("rounds-container");
const standingsTbody = document.querySelector("#standings-table tbody");
const roundFilterEl = document.getElementById("round-filter");
const showOnlyPlayedEl = document.getElementById("show-only-played");
const showOnlyUnplayedEl = document.getElementById("show-only-unplayed");
const clearFiltersBtn = document.getElementById("clear-filters");

/* ----------------------------
   Placeholders
-----------------------------*/
function placeholderCrest(name){
  const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' rx='12' fill='#0b2035'/><text x='50%' y='50%' font-family='Arial' font-size='48' fill='#9fd6b6' dominant-baseline='middle' text-anchor='middle'>${initials}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function placeholderDataURI(){ return placeholderCrest("EQ"); }

/* ----------------------------
   Cargar equipos desde JSON
-----------------------------*/
async function loadTeamsFromLocalJSON() {
  try {
    // Ruta actualizada según la ubicación del index.html
    const res = await fetch("../data/teams.json");
    if (!res.ok) throw new Error("Error al cargar JSON");
    const data = await res.json();

    state.teams = data.map(t => ({
      id: t.id || uid("t"),
      name: t.name,
      crest: t.crest || placeholderCrest(t.name)
    }));

    state.fixtures = [];
    saveState();
    recalcStandings();
    renderAll();
    alert("Equipos cargados correctamente.");
  } catch (err) {
    console.error("Error al cargar equipos:", err);
    alert("No se pudieron cargar los equipos.");
  }
}


/* ----------------------------
   Render equipos
-----------------------------*/
function renderTeams() {
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
      <div class="team-actions">
        <button class="small-btn" data-action="remove" data-id="${t.id}">Eliminar</button>
      </div>
    `;
    teamsListEl.appendChild(div);
  });
}

/* ----------------------------
   Generar calendario
-----------------------------*/
function generateRoundRobinFixtures() {
  const n = state.teams.length;
  if (n < 2) return alert("Necesitas al menos 2 equipos.");

  const teamsIds = state.teams.map(t=>t.id);
  const isOdd = teamsIds.length % 2 === 1;
  let ids = teamsIds.slice();
  if (isOdd) ids.push("__BYE__");

  const rounds = ids.length - 1;
  const fixtures = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < ids.length / 2; i++) {
      const a = ids[i];
      const b = ids[ids.length - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") {
        fixtures.push({ id: uid("m"), round: r + 1, homeId: a, awayId: b, homeScore: null, awayScore: null });
      }
    }
    ids = [ids[0], ids[ids.length-1], ...ids.slice(1, ids.length-1)];
  }

  state.fixtures = fixtures;
  saveState();
  recalcStandings();
  populateRoundFilter();
  renderAll();
}

/* ----------------------------
   Poblar selector de fechas
-----------------------------*/
function populateRoundFilter() {
  roundFilterEl.innerHTML = `<option value="all">Todas las fechas</option>`;
  const rounds = [...new Set(state.fixtures.map(f => f.round))].sort((a,b)=>a-b);
  rounds.forEach(r=>{
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = `Fecha ${r}`;
    roundFilterEl.appendChild(opt);
  });
  roundFilterEl.value = state.ui.roundFilter;
}

/* ----------------------------
   Render calendario (versión moderna minimalista)
-----------------------------*/
let currentRoundIndex = 0;

function renderFixtures() {
  roundsContainer.innerHTML = "";

  if (!state.fixtures.length) {
    roundsContainer.innerHTML = `<div class="note">⚠️ No hay calendario. Genera uno primero.</div>`;
    populateRoundFilter();
    return;
  }

  populateRoundFilter();

  const allRounds = [...new Set(state.fixtures.map(f => f.round))].sort((a,b)=>a-b);
  const filter = state.ui.roundFilter;
  let filteredRounds = allRounds;
  if (filter !== "all") filteredRounds = allRounds.filter(r => String(r) === String(filter));

  currentRoundIndex = Math.max(0, Math.min(currentRoundIndex, filteredRounds.length - 1));
  const currentRound = filteredRounds[currentRoundIndex];

  const matches = state.fixtures.filter(f => f.round === currentRound);
  const total = matches.length;
  const playedCount = matches.filter(f => f.homeScore != null && f.awayScore != null).length;

  const wrapper = document.createElement("div");
  wrapper.className = "calendar-card";

  const nav = document.createElement("div");
  nav.className = "calendar-nav";
  nav.innerHTML = `
    <button class="nav-btn" id="prev-round" ${currentRoundIndex === 0 ? "disabled" : ""}>←</button>
    <h3>Fecha ${currentRound} <span class="sub">(${playedCount}/${total} partidos)</span></h3>
    <button class="nav-btn" id="next-round" ${currentRoundIndex === filteredRounds.length - 1 ? "disabled" : ""}>→</button>
  `;

  const list = document.createElement("div");
  list.className = "matches-grid";

  matches.forEach(m => {
    const home = state.teams.find(t=>t.id===m.homeId);
    const away = state.teams.find(t=>t.id===m.awayId);
    const homeCrest = home?.crest || placeholderDataURI();
    const awayCrest = away?.crest || placeholderDataURI();

    const div = document.createElement("div");
    div.className = "match-item";
    div.innerHTML = `
      <div class="team-box home"><img src="${homeCrest}" /><span>${escapeHtml(home?.name ?? "")}</span></div>
      <div class="score-box" data-mid="${m.id}">
      <span class="score home" contenteditable="true" inputmode="numeric" maxlength="2">${m.homeScore ?? ""}</span>
      <span class="dash">-</span>
      <span class="score away" contenteditable="true" inputmode="numeric" maxlength="2">${m.awayScore ?? ""}</span>
      
      </div>
      <div class="team-box away"><span>${escapeHtml(away?.name ?? "")}</span><img src="${awayCrest}" /></div>
    `;
    list.appendChild(div);
  });

  wrapper.appendChild(nav);
  wrapper.appendChild(list);
  roundsContainer.appendChild(wrapper);

  // Navegación entre fechas
  document.getElementById("prev-round").addEventListener("click", ()=>{ currentRoundIndex--; renderFixtures(); });
  document.getElementById("next-round").addEventListener("click", ()=>{ currentRoundIndex++; renderFixtures(); });

  // Editar marcador con teclado
  roundsContainer.querySelectorAll(".score").forEach(el=>{
    el.addEventListener("input", e=>{
      const mid = el.parentElement.dataset.mid;
      const match = state.fixtures.find(x=>x.id===mid);
      const homeEl = el.parentElement.querySelector(".home");
      const awayEl = el.parentElement.querySelector(".away");
      const homeVal = homeEl.textContent.trim();
      const awayVal = awayEl.textContent.trim();
      match.homeScore = homeVal === "" ? null : parseInt(homeVal);
      match.awayScore = awayVal === "" ? null : parseInt(awayVal);
      saveState(); recalcStandings(); renderStandings();
    });
  });
}


/* ----------------------------
   Simular campeonato completo
-----------------------------*/
function simulateChampionship() {
  if (!state.fixtures.length) return alert("Primero genera el calendario.");

  const nacional = state.teams.find(t => t.name.toLowerCase().includes("nacional"));
  const rivals = ["millonarios", "america", "medellin", "independiente medellin"];

  state.fixtures.forEach(match => {
    const home = state.teams.find(t=>t.id===match.homeId);
    const away = state.teams.find(t=>t.id===match.awayId);

    // Atlético Nacional siempre gana contra sus rivales
    if (nacional && (
      (match.homeId === nacional.id && rivals.some(r=>away.name.toLowerCase().includes(r))) ||
      (match.awayId === nacional.id && rivals.some(r=>home.name.toLowerCase().includes(r)))
    )) {
      if (match.homeId === nacional.id) { match.homeScore = 3; match.awayScore = 1; }
      else { match.homeScore = 1; match.awayScore = 3; }
    } else {
      // Resto aleatorio
      const g1 = Math.floor(Math.random()*4);
      const g2 = Math.floor(Math.random()*4);
      match.homeScore = g1;
      match.awayScore = g2;
    }
  });

  saveState();
  recalcStandings();
  renderAll();
  alert("⚽ Campeonato simulado con éxito (Nacional siempre gana a sus clásicos 😎)");
}

/* ----------------------------
   Tabla de posiciones
-----------------------------*/
function recalcStandings() {
  const map = {};
  state.teams.forEach(t=>{
    map[t.id] = { teamId: t.id, name: t.name, played:0,wins:0,draws:0,losses:0,gf:0,gc:0,gd:0,pts:0 };
  });

  state.fixtures.forEach(m=>{
    if (m.homeScore == null || m.awayScore == null) return;
    const home = map[m.homeId];
    const away = map[m.awayId];
    if (!home || !away) return;
    home.played++; away.played++;
    home.gf += m.homeScore; home.gc += m.awayScore;
    away.gf += m.awayScore; away.gc += m.homeScore;
    if (m.homeScore > m.awayScore){ home.wins++; away.losses++; home.pts+=3; }
    else if (m.homeScore < m.awayScore){ away.wins++; home.losses++; away.pts+=3; }
    else { home.draws++; away.draws++; home.pts++; away.pts++; }
  });

  state.standings = Object.values(map).map(s=>{ s.gd=s.gf-s.gc; return s; })
    .sort((a,b)=>b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  saveState();
}

/* ----------------------------
   Render tabla posiciones
-----------------------------*/
function renderStandings() {
  standingsTbody.innerHTML = "";
  state.standings.forEach((s, idx)=>{
    const team = state.teams.find(t=>t.id===s.teamId);
    const crest = team?.crest || placeholderDataURI();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td class="teamcell"><img src="${crest}" alt="${team?.name ?? ''}" /> <span>${escapeHtml(s.name)}</span></td>
      <td>${s.played}</td><td>${s.wins}</td><td>${s.draws}</td><td>${s.losses}</td>
      <td>${s.gf}</td><td>${s.gc}</td><td>${s.gd}</td><td>${s.pts}</td>
    `;
    standingsTbody.appendChild(tr);
  });
}

/* ----------------------------
   Filtros
-----------------------------*/
roundFilterEl.addEventListener("change", ()=>{
  state.ui.roundFilter = roundFilterEl.value;
  currentRoundIndex = 0;
  saveState(); renderFixtures();
});
showOnlyPlayedEl.addEventListener("change", ()=>{
  state.ui.showOnlyPlayed = showOnlyPlayedEl.checked;
  if (state.ui.showOnlyPlayed) state.ui.showOnlyUnplayed = false;
  showOnlyUnplayedEl.checked = state.ui.showOnlyUnplayed;
  saveState(); renderFixtures();
});
showOnlyUnplayedEl.addEventListener("change", ()=>{
  state.ui.showOnlyUnplayed = showOnlyUnplayedEl.checked;
  if (state.ui.showOnlyUnplayed) state.ui.showOnlyPlayed = false;
  showOnlyPlayedEl.checked = state.ui.showOnlyPlayed;
  saveState(); renderFixtures();
});
clearFiltersBtn.addEventListener("click", ()=>{
  state.ui.roundFilter = "all";
  state.ui.showOnlyPlayed = false;
  state.ui.showOnlyUnplayed = false;
  roundFilterEl.value = "all";
  showOnlyPlayedEl.checked = false;
  showOnlyUnplayedEl.checked = false;
  saveState(); renderFixtures();
});

/* ----------------------------
   Botones principales
-----------------------------*/
document.getElementById("load-sample-btn").addEventListener("click", ()=>{
  if (confirm("¿Cargar equipos reales (archivo local)?")) loadTeamsFromLocalJSON();
});
document.getElementById("generate-fixtures-btn").addEventListener("click", ()=>{
  if (confirm("Esto sobrescribirá el calendario actual. ¿Continuar?")) generateRoundRobinFixtures();
});
document.getElementById("reset-btn").addEventListener("click", ()=>{
  if (confirm("¿Borrar todo y reiniciar?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

// 🔥 Nuevo botón simulador
const simBtn = document.createElement("button");
simBtn.textContent = "🎮 Simular Campeonato";
simBtn.className = "btn primary";
simBtn.addEventListener("click", simulateChampionship);
document.querySelector(".actions.row").appendChild(simBtn);

/* ----------------------------
   Render global
-----------------------------*/
function renderAll(){
  renderTeams();
  renderFixtures();
  recalcStandings();
  renderStandings();
}

/* ----------------------------
   Inicio
-----------------------------*/
loadState();
recalcStandings();
populateRoundFilter();
renderAll();

/* =====================
   Selector de tema
===================== */
const themeSelector = document.getElementById("theme-selector");

themeSelector.addEventListener("change", () => {
  const selected = themeSelector.value;
  document.documentElement.setAttribute("data-theme", selected);
  localStorage.setItem("preferred-theme", selected);
});

// Mantener tema al recargar
const savedTheme = localStorage.getItem("preferred-theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeSelector.value = savedTheme;
} else {
  document.documentElement.setAttribute("data-theme", "dark");
}

