// final.js - Sistema de final entre ganadores de cuadrangulares
(function(){

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

let finalState = {
  equipo1: null, // Ganador Grupo A
  equipo2: null, // Ganador Grupo B
  partido: null,
  resultado: {
    localScore: null,
    visitanteScore: null,
    jugado: false
  }
};

/* ----------------------------
   Utilidades
-----------------------------*/
function uid(prefix="id"){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
function loadState(){ const raw = localStorage.getItem(STORAGE_KEY); if (raw) state = JSON.parse(raw); }
function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function saveFinalState(){ localStorage.setItem('final_state', JSON.stringify(finalState)); }
function loadFinalState(){ const raw = localStorage.getItem('final_state'); if (raw) { try { finalState = JSON.parse(raw) || finalState; } catch(_){} } }

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
   Cargar finalistas desde cuadrangulares
-----------------------------*/
function cargarFinalistas() {
  const raw = localStorage.getItem('finalistas_cuadrangulares');
  if (!raw) {
    return false;
  }
  
  try {
    const ganadores = JSON.parse(raw);
    loadState();
    
    // Buscar los equipos completos en state.teams
    if (ganadores.grupoA && ganadores.grupoB) {
      const equipo1 = state.teams.find(t => t.id === ganadores.grupoA.teamId || t.id === ganadores.grupoA.id);
      const equipo2 = state.teams.find(t => t.id === ganadores.grupoB.teamId || t.id === ganadores.grupoB.id);
      
      if (equipo1 && equipo2) {
        finalState.equipo1 = equipo1;
        finalState.equipo2 = equipo2;
        saveFinalState();
        return true;
      }
    }
  } catch (err) {
    console.error("Error al cargar finalistas:", err);
  }
  
  return false;
}

/* ----------------------------
   Renderizar la final
-----------------------------*/
function renderizarFinal() {
  const container = document.getElementById('final-container');
  if (!container) return;
  
  if (!finalState.equipo1 || !finalState.equipo2) {
    if (!cargarFinalistas()) {
      container.innerHTML = `
        <div class="note">
          <h3>🏆 No hay finalistas disponibles</h3>
          <p>Necesitas completar los cuadrangulares primero para que los ganadores pasen a la final.</p>
          <br>
          <p>Ve a la página de <a href="/cuadrangulares" style="color: #9fd6b6; text-decoration: underline;">Cuadrangulares</a> para crear los grupos y jugar los partidos.</p>
        </div>
      `;
      return;
    }
  }
  
  loadFinalState();
  
  const equipo1 = finalState.equipo1;
  const equipo2 = finalState.equipo2;
  const resultado = finalState.resultado || { localScore: null, visitanteScore: null, jugado: false };
  
  const crest1 = equipo1?.crest || placeholderCrest(equipo1?.name || "EQ1");
  const crest2 = equipo2?.crest || placeholderCrest(equipo2?.name || "EQ2");
  
  let html = `
    <div class="final-wrapper" style="max-width: 800px; margin: 0 auto;">
      <h2 style="text-align: center; margin-bottom: 2rem; color: #9fd6b6;">🏆 Gran Final</h2>
      
      <div class="final-match" style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 2rem; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; align-items: center; justify-content: space-around; gap: 2rem; flex-wrap: wrap;">
          <!-- Equipo 1 (Ganador Grupo A) -->
          <div class="team-final" style="flex: 1; min-width: 200px; text-align: center;">
            <div style="margin-bottom: 1rem;">
              <img src="${crest1}" alt="${equipo1.name}" style="width: 120px; height: 120px; border-radius: 12px; object-fit: contain; background: rgba(255,255,255,0.05); padding: 0.5rem;" />
            </div>
            <h3 style="color: #e6eef8; font-size: 1.5rem; margin: 0.5rem 0;">${escapeHtml(equipo1.name)}</h3>
            <p style="color: #9fd6b6; font-size: 0.9rem; margin: 0;">Ganador Grupo A</p>
          </div>
          
          <!-- VS / Resultado -->
          <div class="final-vs" style="text-align: center; min-width: 150px;">
            <div style="font-size: 2rem; font-weight: bold; color: #9fd6b6; margin-bottom: 1rem;">VS</div>
            <div class="final-score" style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1rem;">
              <input type="number" min="0" id="score-equipo1" value="${resultado.localScore ?? ''}" 
                     style="width: 60px; padding: 0.5rem; text-align: center; font-size: 1.5rem; font-weight: bold; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #e6eef8;" 
                     placeholder="0" />
              <span style="font-size: 1.5rem; color: #9fd6b6;">-</span>
              <input type="number" min="0" id="score-equipo2" value="${resultado.visitanteScore ?? ''}" 
                     style="width: 60px; padding: 0.5rem; text-align: center; font-size: 1.5rem; font-weight: bold; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #e6eef8;" 
                     placeholder="0" />
            </div>
            ${resultado.jugado ? '<p style="color: #9fd6b6; font-size: 0.9rem;">✅ Partido jugado</p>' : '<p style="color: #9fd6b6; font-size: 0.9rem;">⏳ Partido pendiente</p>'}
          </div>
          
          <!-- Equipo 2 (Ganador Grupo B) -->
          <div class="team-final" style="flex: 1; min-width: 200px; text-align: center;">
            <div style="margin-bottom: 1rem;">
              <img src="${crest2}" alt="${equipo2.name}" style="width: 120px; height: 120px; border-radius: 12px; object-fit: contain; background: rgba(255,255,255,0.05); padding: 0.5rem;" />
            </div>
            <h3 style="color: #e6eef8; font-size: 1.5rem; margin: 0.5rem 0;">${escapeHtml(equipo2.name)}</h3>
            <p style="color: #9fd6b6; font-size: 0.9rem; margin: 0;">Ganador Grupo B</p>
          </div>
        </div>
        
        ${resultado.jugado && resultado.localScore !== null && resultado.visitanteScore !== null ? `
          <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <h3 style="color: #9fd6b6; font-size: 1.8rem; margin-bottom: 0.5rem;">
              🏆 ${resultado.localScore > resultado.visitanteScore ? escapeHtml(equipo1.name) : 
                   resultado.visitanteScore > resultado.localScore ? escapeHtml(equipo2.name) : 
                   'Empate'} ${resultado.localScore === resultado.visitanteScore ? '(Empate)' : 'es el Campeón!'}
            </h3>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Agregar event listeners para los inputs de resultado
  const score1 = document.getElementById('score-equipo1');
  const score2 = document.getElementById('score-equipo2');
  
  if (score1 && score2) {
    const updateResult = () => {
      const val1 = score1.value === '' ? null : parseInt(score1.value, 10);
      const val2 = score2.value === '' ? null : parseInt(score2.value, 10);
      
      finalState.resultado = {
        localScore: val1,
        visitanteScore: val2,
        jugado: val1 !== null && val2 !== null
      };
      
      saveFinalState();
      
      // Re-renderizar para mostrar el ganador
      if (finalState.resultado.jugado) {
        renderizarFinal();
      }
    };
    
    score1.addEventListener('change', updateResult);
    score2.addEventListener('change', updateResult);
    score1.addEventListener('input', () => {
      if (score1.value !== '' && score2.value !== '') {
        updateResult();
      }
    });
    score2.addEventListener('input', () => {
      if (score1.value !== '' && score2.value !== '') {
        updateResult();
      }
    });
  }
}

/* ----------------------------
   Inicialización
-----------------------------*/
function initFinalPage() {
  loadState();
  loadFinalState();
  
  const backCuadBtn = document.getElementById('back-cuad-btn');
  if (backCuadBtn) {
    backCuadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/cuadrangulares';
    });
  }
  
  const backHomeBtn = document.getElementById('back-home-btn');
  if (backHomeBtn) {
    backHomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/';
    });
  }
  
  renderizarFinal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFinalPage);
} else {
  initFinalPage();
}

})();

