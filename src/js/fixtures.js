// fixtures.js - Lógica de calendario y partidos

import { state, saveState } from './state.js';
import { uid } from './utils.js';

export function generateRoundRobinFixtures() {
  const n = state.teams.length;
  if (n < 2) {
    alert("Necesitas al menos 2 equipos.");
    return false;
  }

  const teamsIds = state.teams.map(t => t.id);
  const isOdd = teamsIds.length % 2 === 1;
  let ids = teamsIds.slice();
  if (isOdd) ids.push("__BYE__");

  // Generar calendario para 20 fechas
  const targetRounds = 20;
  const fixtures = [];
  
  // Set para rastrear partidos ya programados
  const usedMatches = new Set();
  
  // Función para crear key de partido
  const matchKey = (home, away) => `${home}-${away}`;
  const isMatchUsed = (home, away) => usedMatches.has(matchKey(home, away)) || usedMatches.has(matchKey(away, home));
  
  // Primero, marcar los clásicos regionales como usados
  const clasicosRegional = [
    { home: "santa_fe", away: "millonarios" },
    { home: "atletico_nacional", away: "independiente_medellin" },
    { home: "america_cali", away: "deportivo_cali" },
    { home: "junior", away: "union_magdalena" },
    { home: "once_caldas", away: "deportivo_pereira" },
    { home: "deportivo_pasto", away: "boyaca_chico" },
    { home: "deportes_tolima", away: "llaneros" },
    { home: "equidad", away: "fortaleza" },
    { home: "aguilas_doradas", away: "envigado" },
    { home: "atletico_bucaramanga", away: "alianza_petrolera" }
  ];
  
  clasicosRegional.forEach(clasico => {
    usedMatches.add(matchKey(clasico.home, clasico.away));
  });

  // Generar rondas usando round-robin
  for (let r = 0; r < targetRounds; r++) {
    const roundNum = r + 1;
    
    // En la fecha 10, programar clásicos regionales
    if (roundNum === 10) {
      clasicosRegional.forEach(clasico => {
        const homeTeam = state.teams.find(t => t.id === clasico.home);
        const awayTeam = state.teams.find(t => t.id === clasico.away);
        if (homeTeam && awayTeam) {
          fixtures.push({ 
            id: uid("m"), 
            round: 10, 
            homeId: homeTeam.id, 
            awayId: awayTeam.id, 
            homeScore: null, 
            awayScore: null,
            homeScorers: [],
            awayScorers: []
          });
        }
      });
      
      // Rotar para la siguiente ronda
      ids = [ids[0], ids[ids.length-1], ...ids.slice(1, ids.length-1)];
      continue;
    }

    // Para las demás fechas, usar round-robin normal
    const roundMatches = [];
    for (let i = 0; i < ids.length / 2; i++) {
      const a = ids[i];
      const b = ids[ids.length - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") {
        if (!isMatchUsed(a, b)) {
          roundMatches.push({ home: a, away: b });
          usedMatches.add(matchKey(a, b));
        }
      }
    }
    
    // Si no hay suficientes partidos, buscar partidos adicionales
    if (roundMatches.length < Math.floor((ids.length - (isOdd ? 1 : 0)) / 2)) {
      const remainingTeams = teamsIds.filter(id => {
        return !roundMatches.some(m => m.home === id || m.away === id);
      });
      
      for (let i = 0; i < remainingTeams.length - 1 && roundMatches.length < Math.floor(teamsIds.length / 2); i++) {
        for (let j = i + 1; j < remainingTeams.length && roundMatches.length < Math.floor(teamsIds.length / 2); j++) {
          const home = remainingTeams[i];
          const away = remainingTeams[j];
          if (!isMatchUsed(home, away)) {
            roundMatches.push({ home, away });
            usedMatches.add(matchKey(home, away));
            break;
          }
        }
      }
    }
    
    // Agregar partidos de esta fecha
    roundMatches.forEach(m => {
      fixtures.push({ 
        id: uid("m"), 
        round: roundNum, 
        homeId: m.home, 
        awayId: m.away, 
        homeScore: null, 
        awayScore: null,
        homeScorers: [],
        awayScorers: []
      });
    });
    
    // Rotar para la siguiente ronda
    ids = [ids[0], ids[ids.length-1], ...ids.slice(1, ids.length-1)];
  }

  state.fixtures = fixtures;
  saveState();
  
  return true;
}

