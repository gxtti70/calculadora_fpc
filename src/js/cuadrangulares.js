// cuadrangulares.js - Sistema de cuadrangulares para los 8 primeros equipos

const STORAGE_KEY = "liga_state_v4"; // Misma clave que main.js

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
  if (!state.standings || state.standings.length === 0) {
    alert("No hay tabla de posiciones calculada. Ve a la página principal y genera el calendario.");
    return null;
  }
  
  if (state.standings.length < 8) {
    alert(`Solo hay ${state.standings.length} equipos en la tabla. Necesitas al menos 8 equipos para crear cuadrangulares.`);
    return null;
  }
  
  return state.standings.slice(0, 8);
}

/* ----------------------------
   Organizar equipos en grupos A y B
-----------------------------*/
function organizarGrupos(top8Equipos) {
  // Los primeros 2 son cabezas de serie
  const cabezaSerieA = top8Equipos[0];
  const cabezaSerieB = top8Equipos[1];
  
  // Los equipos 3, 4, 5, 6 se distribuyen aleatoriamente
  const equiposRestantes = top8Equipos.slice(2, 6);
  
  // Mezclar aleatoriamente los equipos restantes
  const equiposMezclados = equiposRestantes.sort(() => Math.random() - 0.5);
  
  // Grupo A: Cabeza de serie + 2 equipos aleatorios
  cuadrangularesState.grupos.A = [
    cabezaSerieA,
    equiposMezclados[0],
    equiposMezclados[1]
  ];
  
  // Grupo B: Cabeza de serie + 2 equipos aleatorios
  cuadrangularesState.grupos.B = [
    cabezaSerieB,
    equiposMezclados[2],
    equiposMezclados[3]
  ];
  
  return cuadrangularesState.grupos;
}

/* ----------------------------
   Generar partidos de cuadrangulares
-----------------------------*/
function generarPartidosCuadrangulares() {
  cuadrangularesState.partidos = [];
  
  // Partidos del Grupo A (3 equipos = 3 partidos)
  const grupoA = cuadrangularesState.grupos.A;
  cuadrangularesState.partidos.push({
    id: "cuad_a_1",
    grupo: "A",
    local: grupoA[0],
    visitante: grupoA[1],
    localScore: null,
    visitanteScore: null,
    jugado: false
  });
  
  cuadrangularesState.partidos.push({
    id: "cuad_a_2", 
    grupo: "A",
    local: grupoA[1],
    visitante: grupoA[2],
    localScore: null,
    visitanteScore: null,
    jugado: false
  });
  
  cuadrangularesState.partidos.push({
    id: "cuad_a_3",
    grupo: "A", 
    local: grupoA[2],
    visitante: grupoA[0],
    localScore: null,
    visitanteScore: null,
    jugado: false
  });
  
  // Partidos del Grupo B (3 equipos = 3 partidos)
  const grupoB = cuadrangularesState.grupos.B;
  cuadrangularesState.partidos.push({
    id: "cuad_b_1",
    grupo: "B",
    local: grupoB[0],
    visitante: grupoB[1],
    localScore: null,
    visitanteScore: null,
    jugado: false
  });
  
  cuadrangularesState.partidos.push({
    id: "cuad_b_2",
    grupo: "B", 
    local: grupoB[1],
    visitante: grupoB[2],
    localScore: null,
    visitanteScore: null,
    jugado: false
  });
  
  cuadrangularesState.partidos.push({
    id: "cuad_b_3",
    grupo: "B",
    local: grupoB[2], 
    visitante: grupoB[0],
    localScore: null,
    visitanteScore: null,
    jugado: false
  });
  
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
  const container = document.getElementById('cuadrangulares-container');
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
    html += `<div class="partidos-grupo">`;
    
    cuadrangularesState.partidos
      .filter(p => p.grupo === grupo)
      .forEach(partido => {
        const localCrest = state.teams.find(t => t.id === partido.local.teamId)?.crest || placeholderCrest(partido.local.name);
        const visitanteCrest = state.teams.find(t => t.id === partido.visitante.teamId)?.crest || placeholderCrest(partido.visitante.name);
        
        html += `<div class="partido-cuadrangulares">`;
        html += `<div class="equipo-local">`;
        html += `<img src="${localCrest}" alt="${partido.local.name}" />`;
        html += `<span>${partido.local.name}</span>`;
        html += `</div>`;
        html += `<div class="marcador">`;
        html += `<input type="number" min="0" value="${partido.localScore || ''}" data-partido="${partido.id}" data-lado="local" />`;
        html += `<span> - </span>`;
        html += `<input type="number" min="0" value="${partido.visitanteScore || ''}" data-partido="${partido.id}" data-lado="visitante" />`;
        html += `</div>`;
        html += `<div class="equipo-visitante">`;
        html += `<span>${partido.visitante.name}</span>`;
        html += `<img src="${visitanteCrest}" alt="${partido.visitante.name}" />`;
        html += `</div>`;
        html += `</div>`;
      });
    
    html += `</div></div>`;
  });
  
  html += '</div>';
  
  container.innerHTML = html;
  
  // Agregar event listeners para los inputs de marcadores
  container.querySelectorAll('input[type="number"]').forEach(input => {
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
      
      // Re-renderizar para actualizar tablas
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
    alert("❌ No hay suficientes equipos para crear cuadrangulares.\n\nVe a la página principal y carga al menos 8 equipos.");
    return;
  }
  
  if (!state.standings || state.standings.length < 8) {
    alert("❌ No hay tabla de posiciones calculada.\n\nVe a la página principal, genera el calendario y juega algunos partidos.");
    return;
  }
  
  if (crearCuadrangulares()) {
    renderizarCuadrangulares();
    alert("✅ Cuadrangulares creados exitosamente!\n\nLos primeros 2 equipos son cabezas de serie y tienen ventaja en caso de empate.");
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
   Inicialización automática
-----------------------------*/
// Cargar datos y verificar si ya hay cuadrangulares creados
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  
  // Si ya hay cuadrangulares creados, mostrarlos
  if (cuadrangularesState.partidos.length > 0) {
    renderizarCuadrangulares();
  } else {
    // Mostrar mensaje de bienvenida
    const container = document.getElementById('cuadrangulares-container');
    if (container) {
      container.innerHTML = `
        <div class="note">
          <h3>🏆 Sistema de Cuadrangulares</h3>
          <p>Este sistema toma los 8 primeros equipos de la tabla de posiciones y los organiza en dos grupos:</p>
          <ul style="text-align: left; margin: 1rem 0;">
            <li><strong>Grupo A:</strong> 1º lugar (cabeza de serie) + 2 equipos aleatorios</li>
            <li><strong>Grupo B:</strong> 2º lugar (cabeza de serie) + 2 equipos aleatorios</li>
          </ul>
          <p><strong>Total:</strong> 6 partidos (3 por grupo)</p>
          <p><strong>Ventaja:</strong> Las cabezas de serie tienen ventaja en caso de empate</p>
          <br>
          <p>Haz clic en "Crear Cuadrangulares" para comenzar.</p>
        </div>
      `;
    }
  }
});
