// data.js - Carga de datos externos

import { playersData, state, saveState } from './state.js';

export async function loadPlayersData() {
  try {
    const res = await fetch("/src/data/players.json");
    if (res.ok) {
      const data = await res.json();
      playersData.goleadores = data.goleadores || [];
      playersData.asistentes = data.asistentes || [];
    }
  } catch (err) {
    console.error("Error al cargar datos de jugadores:", err);
  }
}

export async function loadRealFixtures() {
  try {
    const res = await fetch("/src/data/fixtures.json");
    if (res.ok) {
      const data = await res.json();
      return data.fixtures || [];
    }
  } catch (err) {
    console.error("Error al cargar resultados reales:", err);
  }
  return [];
}

export async function applyRealResults(getTeamScorersFn) {
  const realFixtures = await loadRealFixtures();
  if (realFixtures.length === 0) return;
  
  // Asegurar que los datos de jugadores están cargados
  if (playersData.goleadores.length === 0) {
    await loadPlayersData();
  }
  
  let appliedCount = 0;
  
  realFixtures.forEach(realMatch => {
    if (!realMatch.played) return;
    
    // Buscar el partido correspondiente en el calendario generado
    const match = state.fixtures.find(m => {
      // Normalizar IDs de equipos para comparar
      const normalizeTeamId = (teamId) => {
        return String(teamId).toLowerCase().replace(/\s+/g, '_');
      };
      
      const realHome = normalizeTeamId(realMatch.home);
      const realAway = normalizeTeamId(realMatch.away);
      const matchHome = normalizeTeamId(m.homeId);
      const matchAway = normalizeTeamId(m.awayId);
      
      // Verificar coincidencia por ID o nombre
      const homeMatch = (matchHome === realHome || 
                        state.teams.find(t => normalizeTeamId(t.id) === realHome)?.id === m.homeId ||
                        state.teams.find(t => t.id === m.homeId)?.name.toLowerCase().replace(/\s+/g, '_') === realHome);
      
      const awayMatch = (matchAway === realAway ||
                        state.teams.find(t => normalizeTeamId(t.id) === realAway)?.id === m.awayId ||
                        state.teams.find(t => t.id === m.awayId)?.name.toLowerCase().replace(/\s+/g, '_') === realAway);
      
      // Si hay fecha, verificar que coincida
      if (realMatch.round) {
        return homeMatch && awayMatch && m.round === realMatch.round;
      }
      return homeMatch && awayMatch;
    });
    
    if (match && realMatch.homeScore !== null && realMatch.awayScore !== null) {
      match.homeScore = realMatch.homeScore;
      match.awayScore = realMatch.awayScore;
      
      // Inicializar arrays de goleadores si no existen
      if (!match.homeScorers) match.homeScorers = [];
      if (!match.awayScorers) match.awayScorers = [];
      
      // Asignar goleadores reales si hay goles
      if (realMatch.homeScore > 0 && getTeamScorersFn) {
        match.homeScorers = getTeamScorersFn(match.homeId, realMatch.homeScore);
      } else {
        match.homeScorers = [];
      }
      
      if (realMatch.awayScore > 0 && getTeamScorersFn) {
        match.awayScorers = getTeamScorersFn(match.awayId, realMatch.awayScore);
      } else {
        match.awayScorers = [];
      }
      
      appliedCount++;
    }
  });
  
  if (appliedCount > 0) {
    saveState();
    console.log(`✅ ${appliedCount} resultados reales aplicados al calendario`);
    return appliedCount;
  }
  return 0;
}

export async function loadTeamsFromLocalJSON() {
  try {
    const res = await fetch("/src/teams.json");
    if (!res.ok) throw new Error("Error al cargar JSON");
    const data = await res.json();

    state.teams = data.map(t => ({
      id: t.id,
      name: t.name,
      crest: t.crest
    }));

    state.fixtures = [];
    saveState();
    return true;
  } catch (err) {
    console.error("❌ Error al cargar equipos:", err);
    return false;
  }
}
