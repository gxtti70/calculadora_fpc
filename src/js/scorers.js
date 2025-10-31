// scorers.js - Lógica de goleadores y asistentes

import { state, playersData, saveState } from './state.js';
import { loadPlayersData } from './data.js';

export function getTeamScorers(teamId, numGoals) {
  const teamScorers = playersData.goleadores.filter(p => p.teamId === teamId);
  if (teamScorers.length === 0 || numGoals === 0) return [];
  
  // Ordenar por cantidad de goles (mayor a menor)
  const sortedScorers = [...teamScorers].sort((a, b) => b.goals - a.goals);
  
  const scorers = [];
  let remainingGoals = numGoals;
  
  // Calcular total de goles de todos los goleadores del equipo
  const totalTeamGoals = sortedScorers.reduce((sum, s) => sum + s.goals, 0);
  
  // Distribuir goles proporcionalmente
  sortedScorers.forEach((scorer, idx) => {
    if (remainingGoals <= 0) return;
    
    // Calcular proporción de goles que debería tener este jugador
    const proportion = scorer.goals / totalTeamGoals;
    const allocatedGoals = Math.max(1, Math.round(numGoals * proportion));
    const actualGoals = Math.min(allocatedGoals, remainingGoals);
    
    if (actualGoals > 0) {
      scorers.push({ name: scorer.name, goals: actualGoals });
      remainingGoals -= actualGoals;
    }
  });
  
  // Si aún quedan goles, distribuirlos al máximo goleador
  if (remainingGoals > 0 && scorers.length > 0) {
    scorers[0].goals += remainingGoals;
  } else if (remainingGoals > 0 && sortedScorers.length > 0) {
    // Si no se asignó ningún gol, asignar al máximo goleador
    scorers.push({ name: sortedScorers[0].name, goals: remainingGoals });
  }
  
  // Consolidar goleadores con el mismo nombre
  const consolidated = {};
  scorers.forEach(s => {
    if (consolidated[s.name]) {
      consolidated[s.name].goals += s.goals;
    } else {
      consolidated[s.name] = { name: s.name, goals: s.goals };
    }
  });
  
  return Object.values(consolidated);
}

export function calcularGoleadores(state) {
  const goleadores = {};
  
  state.fixtures.forEach(match => {
    if (match.homeScore === null || match.awayScore === null) return;
    
    const homeTeam = state.teams.find(t => t.id === match.homeId);
    const awayTeam = state.teams.find(t => t.id === match.awayId);
    
    // Inicializar arrays si no existen
    if (!match.homeScorers) match.homeScorers = [];
    if (!match.awayScorers) match.awayScorers = [];
    
    // Procesar goleadores del equipo local
    match.homeScorers.forEach(scorer => {
      const key = `${scorer.name}|${homeTeam?.id || match.homeId}`;
      if (!goleadores[key]) {
        goleadores[key] = {
          name: scorer.name,
          teamId: homeTeam?.id || match.homeId,
          teamName: homeTeam?.name || 'Desconocido',
          goals: 0,
          matches: new Set()
        };
      }
      goleadores[key].goals += scorer.goals || 1;
      goleadores[key].matches.add(match.id);
    });
    
    // Procesar goleadores del equipo visitante
    match.awayScorers.forEach(scorer => {
      const key = `${scorer.name}|${awayTeam?.id || match.awayId}`;
      if (!goleadores[key]) {
        goleadores[key] = {
          name: scorer.name,
          teamId: awayTeam?.id || match.awayId,
          teamName: awayTeam?.name || 'Desconocido',
          goals: 0,
          matches: new Set()
        };
      }
      goleadores[key].goals += scorer.goals || 1;
      goleadores[key].matches.add(match.id);
    });
  });
  
  // Convertir Set a número y ordenar
  return Object.values(goleadores)
    .map(g => ({ ...g, matches: g.matches.size }))
    .sort((a, b) => b.goals - a.goals || b.matches - a.matches);
}

export async function showScorersDialog(matchId, side, totalGoals) {
  const match = state.fixtures.find(m => m.id === matchId);
  if (!match) return;
  
  // Asegurar que los datos de jugadores están cargados
  if (playersData.goleadores.length === 0) {
    await loadPlayersData();
  }
  
  const scorers = side === 'home' ? match.homeScorers : match.awayScorers;
  const teamId = side === 'home' ? match.homeId : match.awayId;
  const team = state.teams.find(t => t.id === teamId);
  
  // Obtener goleadores reales del equipo
  const realScorers = playersData.goleadores.filter(p => p.teamId === teamId);
  
  // Si hay goleadores reales y no se han asignado, usar los reales automáticamente
  if (realScorers.length > 0 && (!scorers || scorers.length === 0)) {
    const autoScorers = getTeamScorers(teamId, totalGoals);
    if (side === 'home') {
      match.homeScorers = autoScorers;
    } else {
      match.awayScorers = autoScorers;
    }
    saveState();
    if (window.renderAll) window.renderAll();
    return;
  }
  
  // Si ya hay goleadores, permitir edición manual
  let promptText = `Ingresa los goleadores de ${team?.name || 'el equipo'} (separados por comas):\n`;
  promptText += `Ejemplo: Juan Pérez, Carlos López (2), Mario Gómez\n`;
  promptText += `Total de goles: ${totalGoals}\n`;
  
  if (realScorers.length > 0) {
    promptText += `\nGoleadores reales del equipo:\n`;
    realScorers.slice(0, 5).forEach(s => {
      promptText += `- ${s.name} (${s.goals} goles en la liga)\n`;
    });
  }
  
  if (scorers && scorers.length > 0) {
    promptText += `\nGoleadores actuales: ${scorers.map(s => `${s.name}${s.goals > 1 ? ` (${s.goals})` : ''}`).join(', ')}`;
  }
  
  const input = prompt(promptText);
  if (input === null) return;
  
  if (input.trim() === '' && realScorers.length > 0) {
    // Si está vacío, usar los reales
    const autoScorers = getTeamScorers(teamId, totalGoals);
    if (side === 'home') {
      match.homeScorers = autoScorers;
    } else {
      match.awayScorers = autoScorers;
    }
  } else {
    // Parsear goleadores manuales
    const newScorers = [];
    const parts = input.split(',').map(s => s.trim()).filter(s => s);
    
    parts.forEach(part => {
      const matchGoal = part.match(/^(.+?)\s*\((\d+)\)$/);
      if (matchGoal) {
        newScorers.push({ name: matchGoal[1].trim(), goals: parseInt(matchGoal[2], 10) });
      } else {
        newScorers.push({ name: part.trim(), goals: 1 });
      }
    });
    
    // Validar que los goles sumen correctamente
    const totalScoredGoals = newScorers.reduce((sum, s) => sum + s.goals, 0);
    if (totalScoredGoals !== totalGoals && totalGoals > 0) {
      alert(`⚠️ La suma de goles de los goleadores (${totalScoredGoals}) no coincide con el marcador (${totalGoals}).\n\nSe ajustará automáticamente.`);
      // Ajustar el último goleador o agregar uno genérico
      if (newScorers.length > 0) {
        const diff = totalGoals - totalScoredGoals;
        newScorers[newScorers.length - 1].goals += diff;
      } else if (totalGoals > 0) {
        newScorers.push({ name: 'Gol(es)', goals: totalGoals });
      }
    }
    
    if (side === 'home') {
      match.homeScorers = newScorers;
    } else {
      match.awayScorers = newScorers;
    }
  }
  
  saveState();
  if (window.renderAll) window.renderAll();
}
