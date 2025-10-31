// charts.js - Gráficos y visualizaciones

import { state } from './state.js';

let evolutionChart = null;

export function calcularEvolucionPuntos() {
  const evolucion = {};
  const rounds = [...new Set(state.fixtures.map(f => f.round))].sort((a, b) => a - b);
  
  // Inicializar evolución por equipo
  state.teams.forEach(team => {
    evolucion[team.id] = {
      name: team.name,
      points: []
    };
  });
  
  // Calcular puntos acumulados por fecha
  rounds.forEach(round => {
    const pointsAtRound = {};
    state.teams.forEach(team => {
      pointsAtRound[team.id] = 0;
    });
    
    // Calcular puntos hasta esta fecha
    state.fixtures.forEach(match => {
      if (match.round > round || match.homeScore === null || match.awayScore === null) return;
      
      const homePts = match.homeScore > match.awayScore ? 3 : 
                     match.homeScore < match.awayScore ? 0 : 1;
      const awayPts = match.awayScore > match.homeScore ? 3 : 
                     match.awayScore < match.homeScore ? 0 : 1;
      
      pointsAtRound[match.homeId] = (pointsAtRound[match.homeId] || 0) + homePts;
      pointsAtRound[match.awayId] = (pointsAtRound[match.awayId] || 0) + awayPts;
    });
    
    // Guardar puntos acumulados
    Object.keys(evolucion).forEach(teamId => {
      evolucion[teamId].points.push(pointsAtRound[teamId] || 0);
    });
  });
  
  return { evolucion, rounds };
}

export function renderEvolutionChart() {
  const canvas = document.getElementById('evolution-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const { evolucion, rounds } = calcularEvolucionPuntos();
  const filterValue = document.getElementById('teams-chart-filter')?.value || 'top5';
  
  // Determinar qué equipos mostrar
  let teamsToShow = Object.values(evolucion);
  if (filterValue === 'top5') {
    teamsToShow = teamsToShow
      .sort((a, b) => {
        const aPts = a.points[a.points.length - 1] || 0;
        const bPts = b.points[b.points.length - 1] || 0;
        return bPts - aPts;
      })
      .slice(0, 5);
  } else if (filterValue === 'top10') {
    teamsToShow = teamsToShow
      .sort((a, b) => {
        const aPts = a.points[a.points.length - 1] || 0;
        const bPts = b.points[b.points.length - 1] || 0;
        return bPts - aPts;
      })
      .slice(0, 10);
  }
  
  // Destruir gráfico anterior si existe
  if (evolutionChart) {
    evolutionChart.destroy();
  }
  
  // Generar colores
  const colors = [
    'rgba(22, 163, 74, 1)',   // verde
    'rgba(59, 130, 246, 1)',  // azul
    'rgba(168, 85, 247, 1)',  // púrpura
    'rgba(236, 72, 153, 1)',  // rosa
    'rgba(251, 146, 60, 1)',  // naranja
    'rgba(34, 197, 94, 1)',   // verde claro
    'rgba(99, 102, 241, 1)',  // índigo
    'rgba(244, 63, 94, 1)',   // rojo
    'rgba(234, 179, 8, 1)',   // amarillo
    'rgba(14, 165, 233, 1)',  // cyan
  ];
  
  evolutionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rounds.map(r => `Fecha ${r}`),
      datasets: teamsToShow.map((team, idx) => ({
        label: team.name,
        data: team.points,
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length].replace('1)', '0.1)'),
        tension: 0.3,
        fill: false,
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#e6eef8',
            font: { size: 12 }
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: { color: '#95a0b3' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: { color: '#95a0b3' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          beginAtZero: true
        }
      }
    }
  });
}

