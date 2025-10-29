// cuadrangulares.js - Sistema de cuadrangulares para los 8 primeros equipos
(function(){

const STORAGE_KEY = "liga_state_v4"; // Misma clave que main.js
const CUADRANGULARES_KEY = "cuadrangulares_state_v1";

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

let cuadrangularesState = {
  grupos: {
    A: [],
    B: []
  },
  partidos: [],
  resultados: []
};

/* ----------------------------
   Utilidades
-----------------------------*/
function uid(prefix="id"){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){ const raw = localStorage.getItem(STORAGE_KEY); if (raw) state = JSON.parse(raw); }
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function saveCuadState(){ localStorage.setItem(CUADRANGULARES_KEY, JSON.stringify(cuadrangularesState)); }
function loadCuadState(){ const raw = localStorage.getItem(CUADRANGULARES_KEY); if (raw) { try { cuadrangularesState = JSON.parse(raw) || cuadrangularesState; } catch(_){} } }

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
   Obtener los 8 primeros equipos
-----------------------------*/
function obtenerTop8Equipos() {
  // Asegurar que traemos el mismo estado guardado por main.js
  loadState();
  if (!state.standings || state.standings.length === 0) {
    alert("No hay tabla de posiciones calculada. Ve a la página principal y genera el calendario.");
    return null;
  }
  
  if (state.standings.length < 8) {
    alert(`Solo hay ${state.standings.length} equipos en la tabla. Necesitas al menos 8 equipos para crear cuadrangulares.`);
    return null;
  }
  
  // Ordenar por los mismos criterios (pts desc, gd desc, gf desc)
  const ordenados = [...state.standings].sort((a,b)=>{
    if (a.pts !== b.pts) return b.pts - a.pts;
    const gdA = (a.gf||0) - (a.gc||0);
    const gdB = (b.gf||0) - (b.gc||0);
    if (gdA !== gdB) return gdB - gdA;
    if ((a.gf||0) !== (b.gf||0)) return (b.gf||0) - (a.gf||0);
    return 0;
  });
  return ordenados.slice(0, 8);
}

/* ----------------------------
   Organizar equipos en grupos A y B
-----------------------------*/
function organizarGrupos(top8Equipos) {
  // Sembrado en serpiente (1-8):
  // Grupo A: 1, 4, 5, 8  |  Grupo B: 2, 3, 6, 7
  const gA = [ top8Equipos[0], top8Equipos[3], top8Equipos[4], top8Equipos[7] ];
  const gB = [ top8Equipos[1], top8Equipos[2], top8Equipos[5], top8Equipos[6] ];
  cuadrangularesState.grupos.A = gA;
  cuadrangularesState.grupos.B = gB;
  return cuadrangularesState.grupos;
}

/* ----------------------------
   Generar partidos de cuadrangulares
-----------------------------*/
function generarPartidosCuadrangulares() {
  cuadrangularesState.partidos = [];
  const generarConJornadas = (grupoClave, equipos) => {
    // Algoritmo round-robin (método del círculo) para 4 equipos
    // Jornadas de ida (1..3)
    const idx = [0,1,2,3];
    const jornadas = [
      [ [idx[0], idx[3]], [idx[1], idx[2]] ], // J1
      [ [idx[3], idx[2]], [idx[0], idx[1]] ], // J2
      [ [idx[2], idx[0]], [idx[1], idx[3]] ]  // J3
    ];
    // Crear partidos ida
    jornadas.forEach((pares, rIdx) => {
      pares.forEach(([l,v]) => {
        cuadrangularesState.partidos.push({
          id: `${grupoClave.toLowerCase()}_${l}${v}_r${rIdx+1}_${uid('m')}`,
          grupo: grupoClave,
          round: rIdx + 1,
          local: equipos[l],
          visitante: equipos[v],
          localScore: null,
          visitanteScore: null,
          jugado: false
        });
      });
    });
    // Jornadas de vuelta (4..6) invirtiendo localía
    jornadas.forEach((pares, rIdx) => {
      pares.forEach(([l,v]) => {
        cuadrangularesState.partidos.push({
          id: `${grupoClave.toLowerCase()}_${l}${v}_r${rIdx+4}_${uid('m')}`,
          grupo: grupoClave,
          round: rIdx + 4,
          local: equipos[v],
          visitante: equipos[l],
          localScore: null,
          visitanteScore: null,
          jugado: false
        });
      });
    });
  };
  generarConJornadas('A', cuadrangularesState.grupos.A);
  generarConJornadas('B', cuadrangularesState.grupos.B);
  return cuadrangularesState.partidos;
}

/* ----------------------------
   Calcular tabla de cuadrangulares
-----------------------------*/
function calcularTablaCuadrangulares() {
  const tablas = { A: [], B: [] };
  
  // Inicializar estadísticas para cada equipo
  [...cuadrangularesState.grupos.A, ...cuadrangularesState.grupos.B].forEach(equipo => {
    const grupo = cuadrangularesState.grupos.A.includes(equipo) ? 'A' : 'B';
    tablas[grupo].push({
      equipo: equipo,
      pts: 0,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      gd: 0,
      esCabezaSerie: equipo === cuadrangularesState.grupos[grupo][0]
    });
  });
  
  // Procesar resultados de partidos
  cuadrangularesState.partidos.forEach(partido => {
    if (!partido.jugado || partido.localScore === null || partido.visitanteScore === null) return;
    
    const grupo = partido.grupo;
    const tablaGrupo = tablas[grupo];
    
    const local = tablaGrupo.find(t => t.equipo.teamId === partido.local.teamId);
    const visitante = tablaGrupo.find(t => t.equipo.teamId === partido.visitante.teamId);
    
    if (!local || !visitante) return;
    
    // Actualizar estadísticas
    local.pj++;
    visitante.pj++;
    local.gf += partido.localScore;
    local.gc += partido.visitanteScore;
    visitante.gf += partido.visitanteScore;
    visitante.gc += partido.localScore;
    
    if (partido.localScore > partido.visitanteScore) {
      local.pg++;
      local.pts += 3;
      visitante.pp++;
    } else if (partido.localScore < partido.visitanteScore) {
      visitante.pg++;
      visitante.pts += 3;
      local.pp++;
    } else {
      local.pe++;
      local.pts += 1;
      visitante.pe++;
      visitante.pts += 1;
    }
  });
  
  // Calcular diferencia de goles
  Object.keys(tablas).forEach(grupo => {
    tablas[grupo].forEach(equipo => {
      equipo.gd = equipo.gf - equipo.gc;
    });
    
    // Ordenar tabla (cabezas de serie tienen ventaja en empates)
    tablas[grupo].sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.gd !== b.gd) return b.gd - a.gd;
      if (a.gf !== b.gf) return b.gf - a.gf;
      
      // En caso de empate total, la cabeza de serie gana
      if (a.esCabezaSerie && !b.esCabezaSerie) return -1;
      if (!a.esCabezaSerie && b.esCabezaSerie) return 1;
      return 0;
    });
  });
  
  return tablas;
}

/* ----------------------------
   Crear cuadrangulares completos
-----------------------------*/
function crearCuadrangulares() {
  const top8 = obtenerTop8Equipos();
  if (!top8) return false;
  
  organizarGrupos(top8);
  generarPartidosCuadrangulares();
  
  console.log("✅ Cuadrangulares creados:");
  console.log("Grupo A:", cuadrangularesState.grupos.A.map(e => e.name));
  console.log("Grupo B:", cuadrangularesState.grupos.B.map(e => e.name));
  console.log("Partidos:", cuadrangularesState.partidos.length);
  
  return true;
}

/* ----------------------------
   Renderizar cuadrangulares en HTML
-----------------------------*/
function renderizarCuadrangulares() {
  let container = document.getElementById('cuadrangulares-container');
  if (!container) {
    container = document.getElementById('groups-container');
  }
  if (!container) {
    console.error("No se encontró el contenedor de cuadrangulares");
    return;
  }
  
  if (!cuadrangularesState.partidos.length) {
    container.innerHTML = '<div class="note">No hay cuadrangulares creados. Usa "Crear Cuadrangulares" primero.</div>';
    return;
  }
  
  const tablas = calcularTablaCuadrangulares();
  
  let html = '<div class="cuadrangulares-wrapper">';
  
  // Mostrar grupos y tablas
  ['A', 'B'].forEach(grupo => {
    html += `<div class="grupo-cuadrangulares">`;
    html += `<h3>Grupo ${grupo}</h3>`;
    // Encabezado de equipos del grupo con escudos
    const equiposGrupo = cuadrangularesState.grupos[grupo];
    if (equiposGrupo && equiposGrupo.length) {
      html += `<div class="teams-row" style="display:flex;gap:.5rem;justify-content:center;margin-bottom:0.75rem;flex-wrap:wrap">`;
      equiposGrupo.forEach(eq => {
        const crest = state.teams.find(t => t.id === eq.teamId)?.crest || placeholderCrest(eq.name);
        html += `<div style="display:flex;align-items:center;gap:.35rem;background:rgba(255,255,255,0.04);padding:.35rem .5rem;border-radius:6px;border:1px solid rgba(255,255,255,0.06)">`;
        html += `<img src="${crest}" alt="${eq.name}" style="width:22px;height:22px;border-radius:4px;background:transparent;object-fit:contain" />`;
        html += `<span style="font-size:.9rem;color:#e6eef8">${eq.name}</span>`;
        html += `</div>`;
      });
      html += `</div>`;
    }
    
    // Tabla del grupo
    html += `<table class="tabla-grupo">`;
    html += `<thead><tr><th>Pos</th><th>Equipo</th><th>Pts</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>GD</th></tr></thead>`;
    html += `<tbody>`;
    
    tablas[grupo].forEach((equipo, idx) => {
      const esCabezaSerie = equipo.esCabezaSerie ? ' ⭐' : '';
      html += `<tr class="${equipo.esCabezaSerie ? 'cabeza-serie' : ''}">`;
      html += `<td>${idx + 1}</td>`;
      html += `<td>${equipo.equipo.name}${esCabezaSerie}</td>`;
      html += `<td>${equipo.pts}</td>`;
      html += `<td>${equipo.pj}</td>`;
      html += `<td>${equipo.pg}</td>`;
      html += `<td>${equipo.pe}</td>`;
      html += `<td>${equipo.pp}</td>`;
      html += `<td>${equipo.gf}</td>`;
      html += `<td>${equipo.gc}</td>`;
      html += `<td>${equipo.gd}</td>`;
      html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    
    // Partidos del grupo
    html += `<h4>Partidos del Grupo ${grupo}</h4>`;
    
    // Agrupar por jornada
    const partidosGrupo = cuadrangularesState.partidos.filter(p => p.grupo === grupo);
    const roundsMap = {};
    partidosGrupo.forEach(p => { const r = p.round || 1; (roundsMap[r] ||= []).push(p); });
    const rounds = Object.keys(roundsMap).map(n=>parseInt(n,10)).sort((a,b)=>a-b);
    
    rounds.forEach((r, idxRound) => {
      html += `<details ${idxRound===0 ? 'open' : ''} class="round-wrapper">`;
      html += `<summary style="cursor:pointer;user-select:none">Jornada ${r}</summary>`;
      html += `<div class="partidos-grupo">`;
      roundsMap[r].forEach(partido => {
        const localCrest = state.teams.find(t => t.id === partido.local.teamId)?.crest || placeholderCrest(partido.local.name);
        const visitanteCrest = state.teams.find(t => t.id === partido.visitante.teamId)?.crest || placeholderCrest(partido.visitante.name);
        
        html += `<div class="partido-cuadrangulares">`;
        html += `<div class="equipo-local">`;
        html += `<img src="${localCrest}" alt="${partido.local.name}" />`;
        html += `<span>${partido.local.name}</span>`;
        html += `</div>`;
        html += `<div class="marcador">`;
        html += `<input type="number" min="0" value="${partido.localScore ?? ''}" data-partido="${partido.id}" data-lado="local" />`;
        html += `<span> - </span>`;
        html += `<input type="number" min="0" value="${partido.visitanteScore ?? ''}" data-partido="${partido.id}" data-lado="visitante" />`;
        html += `</div>`;
        html += `<div class="equipo-visitante">`;
        html += `<span>${partido.visitante.name}</span>`;
        html += `<img src="${visitanteCrest}" alt="${partido.visitante.name}" />`;
        html += `</div>`;
        html += `</div>`;
      });
      html += `</div>`; // partidos-grupo
      html += `</details>`;
    });
    
    html += `</div>`;
  });
  
  html += '</div>';
  
  container.innerHTML = html;
  const section = document.getElementById('cuadrangulares-section');
  if (section && section.classList.contains('hidden')) {
    section.classList.remove('hidden');
  }
  
  // Agregar event listeners para los inputs de marcadores
  container.querySelectorAll('input[type="number"]').forEach(input => {
    // Forzar entrada por teclado solamente (sin flechas/rueda)
    input.setAttribute('step','1');
    input.setAttribute('inputmode','numeric');
    input.addEventListener('keydown', (ev)=>{
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') ev.preventDefault();
    });
    input.addEventListener('wheel', (ev)=>{
      ev.preventDefault();
    }, { passive: false });
    input.addEventListener('change', function() {
      const partidoId = this.dataset.partido;
      const lado = this.dataset.lado;
      const valor = this.value === '' ? null : parseInt(this.value);
      
      const partido = cuadrangularesState.partidos.find(p => p.id === partidoId);
      if (!partido) return;
      
      if (lado === 'local') {
        partido.localScore = valor;
      } else {
        partido.visitanteScore = valor;
      }
      
      partido.jugado = partido.localScore !== null && partido.visitanteScore !== null;
      
      // Guardar y re-renderizar para actualizar tablas
      saveCuadState();
      renderizarCuadrangulares();
    });
  });
}

/* ----------------------------
   Función principal para inicializar cuadrangulares
-----------------------------*/
function inicializarCuadrangulares() {
  // Cargar datos del localStorage
  loadState();
  
  // Verificar que hay datos suficientes
  if (!state.teams || state.teams.length < 8) {
    alert("❌ No hay suficientes equipos para crear cuadrangulares.\n\nTe llevaré al inicio para que cargues los equipos.");
    window.location.href = '/src/pages/index';
    return;
  }
  
  if (!state.standings || state.standings.length < 8) {
    alert("❌ No hay tabla de posiciones calculada.\n\nTe llevaré al inicio para que generes el calendario y juegues partidos.");
    window.location.href = '/src/pages/index';
    return;
  }
  
  if (crearCuadrangulares()) {
    renderizarCuadrangulares();
    saveCuadState();
    // Mejorar UX en la página dedicada: deshabilitar botón y hacer scroll a resultados
    const container = document.getElementById('cuadrangulares-container');
    if (container) {
      const actions = container.closest('.container')?.querySelector('.actions');
      const createBtn = actions?.querySelector('button.btn.primary');
      if (createBtn) {
        createBtn.disabled = true;
        createBtn.textContent = '✅ Cuadrangulares creados';
      }
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Exportar funciones para uso global
window.cuadrangulares = {
  crear: inicializarCuadrangulares,
  renderizar: renderizarCuadrangulares,
  calcularTabla: calcularTablaCuadrangulares,
  obtenerEstado: () => cuadrangularesState
};

/* ----------------------------
   Inicialización automática robusta
-----------------------------*/
function initCuadrangularesPage(){
  loadState();
  loadCuadState();

  const createBtn = document.getElementById('create-cuad-btn');
  if (createBtn && !createBtn.__wired) {
    createBtn.addEventListener('click', (e) => {
      e.preventDefault();
      inicializarCuadrangulares();
    });
    createBtn.__wired = true;
  }

  const backBtn = document.getElementById('back-home-btn');
  if (backBtn && !backBtn.__wired) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/src/pages/';
    });
    backBtn.__wired = true;
  }

  if (cuadrangularesState.partidos.length > 0) {
    renderizarCuadrangulares();
  } else {
    const container = document.getElementById('cuadrangulares-container');
    if (container) {
      container.innerHTML = `
        <div class="note">
          <h3>🏆 Sistema de Cuadrangulares</h3>
          <p>Este sistema toma los 8 primeros equipos de la tabla de posiciones y los organiza en dos grupos:</p>
          <ul style="text-align: left; margin: 1rem 0;">
            <li><strong>Grupo A:</strong> 1º, 4º, 5º y 8º (cabeza de serie: 1º)</li>
            <li><strong>Grupo B:</strong> 2º, 3º, 6º y 7º (cabeza de serie: 2º)</li>
          </ul>
          <p><strong>Total:</strong> 12 partidos (6 por grupo)</p>
          <br>
          <p>Haz clic en "Crear Cuadrangulares" para comenzar.</p>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCuadrangularesPage);
} else {
  initCuadrangularesPage();
}

})();
