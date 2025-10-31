// simulation.js - Simulación de campeonato

import { state, saveState, playersData } from './state.js';
import { getTeamScorers } from './scorers.js';
import { loadPlayersData } from './data.js';

export async function simulateChampionship() {
  if (!state.fixtures.length) {
    alert("Primero genera el calendario.");
    return;
  }
  
  // Asegurar que los datos de jugadores están cargados
  if (playersData.goleadores.length === 0) {
    await loadPlayersData();
  }

  const nacional = state.teams.find(t => t.name.toLowerCase().includes("nacional"));
  const rivals = ["millonarios", "america", "medellin", "independiente medellin"];
  
  state.fixtures.forEach(match => {
    const home = state.teams.find(t => t.id === match.homeId);
    const away = state.teams.find(t => t.id === match.awayId);
    
    // Inicializar arrays de goleadores
    if (!match.homeScorers) match.homeScorers = [];
    if (!match.awayScorers) match.awayScorers = [];

    // Atlético Nacional siempre gana contra sus rivales
    if (nacional && (
      (match.homeId === nacional.id && rivals.some(r => away.name.toLowerCase().includes(r))) ||
      (match.awayId === nacional.id && rivals.some(r => home.name.toLowerCase().includes(r)))
    )) {
      if (match.homeId === nacional.id) { 
        match.homeScore = 3; 
        match.awayScore = 1;
        // Goleadores reales para Nacional
        match.homeScorers = getTeamScorers(match.homeId, 3);
        match.awayScorers = getTeamScorers(match.awayId, 1);
      } else { 
        match.homeScore = 1; 
        match.awayScore = 3;
        match.homeScorers = getTeamScorers(match.homeId, 1);
        match.awayScorers = getTeamScorers(match.awayId, 3);
      }
    } else {
      // Resto aleatorio
      const g1 = Math.floor(Math.random() * 4);
      const g2 = Math.floor(Math.random() * 4);
      match.homeScore = g1;
      match.awayScore = g2;
      
      // Generar goleadores reales del equipo
      match.homeScorers = getTeamScorers(match.homeId, g1);
      match.awayScorers = getTeamScorers(match.awayId, g2);
    }
  });

  saveState();
  alert("⚽ Campeonato simulado con éxito (Nacional siempre gana a sus clásicos 😎)");
}

