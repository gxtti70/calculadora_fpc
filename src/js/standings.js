// standings.js - Lógica de tabla de posiciones

import { saveState } from './state.js';

export function recalcStandings(state) {
  const map = {};
  state.teams.forEach(t => {
    map[t.id] = { teamId: t.id, name: t.name, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, gc: 0, gd: 0, pts: 0 };
  });

  state.fixtures.forEach(m => {
    if (m.homeScore == null || m.awayScore == null) return;
    const home = map[m.homeId];
    const away = map[m.awayId];
    if (!home || !away) return;
    home.played++;
    away.played++;
    home.gf += m.homeScore;
    home.gc += m.awayScore;
    away.gf += m.awayScore;
    away.gc += m.homeScore;
    if (m.homeScore > m.awayScore) { home.wins++; away.losses++; home.pts += 3; }
    else if (m.homeScore < m.awayScore) { away.wins++; home.losses++; away.pts += 3; }
    else { home.draws++; away.draws++; home.pts++; away.pts++; }
  });

  state.standings = Object.values(map).map(s => { s.gd = s.gf - s.gc; return s; })
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  saveState();
}

