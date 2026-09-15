import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Radar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { exportPlayerReport, exportCoachReport } from './PdfExportUtils';
import { useAuth } from './App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Formate une durée en minutes en "Xh Ymin" (ou "Ymin" si moins d'une heure)
const formatDuration = (totalMinutes) => {
  const minutes = totalMinutes || 0;
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
};

// Register ChartJS components and plugins
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

const ReportsWithEvaluation = () => {
  const { canEdit } = useAuth();
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeTab, setActiveTab] = useState('players');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('');
  const [playerReport, setPlayerReport] = useState(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportAllProgress, setExportAllProgress] = useState({ current: 0, total: 0 });
  const [coachReport, setCoachReport] = useState(null);
  const [playerEvaluation, setPlayerEvaluation] = useState(null);
  const [allPlayerEvaluations, setAllPlayerEvaluations] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [radarFilters, setRadarFilters] = useState({
    showInitial: true,
    showFinal: false,
    showCDFAverage: false,
    showPositionAverage: false,
    allPlayersData: null,
    positionData: null
  });
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: ''
  });

  // Comparaison de 2 joueurs
  const [comparePlayerAId, setComparePlayerAId] = useState('');
  const [comparePlayerBId, setComparePlayerBId] = useState('');
  const [compareDataA, setCompareDataA] = useState(null);
  const [compareDataB, setCompareDataB] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Fiche Joueur (points forts, axes de travail, joueur référence, notes supplémentaires)
  const emptyFiche = { strengths_to_keep: '', work_axes: '', reference_player: '', additional_notes: '' };
  const [ficheEditMode, setFicheEditMode] = useState(false);
  const [ficheForm, setFicheForm] = useState(emptyFiche);
  const [savingFiche, setSavingFiche] = useState(false);

  useEffect(() => {
    fetchPlayers();
    fetchCoaches();
  }, []);

  // Synchronise le formulaire de fiche joueur avec les données chargées
  useEffect(() => {
    if (playerReport && playerReport.player && !ficheEditMode) {
      setFicheForm({
        strengths_to_keep: playerReport.player.strengths_to_keep || '',
        work_axes: playerReport.player.work_axes || '',
        reference_player: playerReport.player.reference_player || '',
        additional_notes: playerReport.player.additional_notes || ''
      });
    }
  }, [playerReport, ficheEditMode]);

  const handleFicheChange = (field, value) => {
    setFicheForm(prev => ({ ...prev, [field]: value }));
  };

  const cancelFicheEdit = () => {
    if (playerReport && playerReport.player) {
      setFicheForm({
        strengths_to_keep: playerReport.player.strengths_to_keep || '',
        work_axes: playerReport.player.work_axes || '',
        reference_player: playerReport.player.reference_player || '',
        additional_notes: playerReport.player.additional_notes || ''
      });
    }
    setFicheEditMode(false);
  };

  const saveFiche = async () => {
    if (!selectedPlayer) return;
    setSavingFiche(true);
    try {
      await axios.put(`${API}/players/${selectedPlayer}`, {
        strengths_to_keep: ficheForm.strengths_to_keep,
        work_axes: ficheForm.work_axes,
        reference_player: ficheForm.reference_player,
        additional_notes: ficheForm.additional_notes
      });
      setFicheEditMode(false);
      await fetchPlayerReport(selectedPlayer);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la fiche joueur:', error);
      alert("Une erreur est survenue lors de l'enregistrement de la fiche joueur.");
    } finally {
      setSavingFiche(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs:', error);
    }
  };

  const fetchCoaches = async () => {
    try {
      const response = await axios.get(`${API}/coaches`);
      setCoaches(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des coachs:', error);
    }
  };

  const fetchPlayerReport = async (playerId) => {
    setLoading(true);
    try {
      // Fetch both report and evaluation data
      const promises = [
        axios.get(`${API}/reports/player/${playerId}${dateFilter.start_date && dateFilter.end_date ? `?start_date=${dateFilter.start_date}&end_date=${dateFilter.end_date}` : ''}`),
        axios.get(`${API}/evaluations/player/${playerId}`), // Get all evaluations
        axios.get(`${API}/attendances/reports/player/${playerId}${dateFilter.start_date && dateFilter.end_date ? `?start_date=${dateFilter.start_date}&end_date=${dateFilter.end_date}` : ''}`) // Get attendance report
      ];

      const results = await Promise.allSettled(promises);
      
      if (results[0].status === 'fulfilled') {
        setPlayerReport(results[0].value.data);
      }
      
      // Set all evaluations for comparison
      if (results[1].status === 'fulfilled') {
        const evaluations = results[1].value.data;
        setAllPlayerEvaluations(evaluations);
        
        // Set latest evaluation as primary
        if (evaluations.length > 0) {
          const latest = evaluations[0]; // Already sorted by date desc
          setPlayerEvaluation(latest);
        } else {
          setPlayerEvaluation(null);
        }
      } else {
        setAllPlayerEvaluations([]);
        setPlayerEvaluation(null);
      }

      // Set attendance report
      if (results[2].status === 'fulfilled') {
        setAttendanceReport(results[2].value.data);
      } else {
        setAttendanceReport(null);
      }
      
      setCoachReport(null);
    } catch (error) {
      console.error('Erreur lors du chargement du rapport joueur:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Export PDF de toute l'équipe ---
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleExportAllPlayers = async () => {
    if (players.length === 0) return;
    if (!window.confirm(`Exporter le rapport PDF des ${players.length} joueurs ? Un fichier sera téléchargé pour chacun, l'un après l'autre.`)) {
      return;
    }
    setExportingAll(true);
    setExportAllProgress({ current: 0, total: players.length });

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      setExportAllProgress({ current: i + 1, total: players.length });
      setSelectedPlayer(player.id);
      // eslint-disable-next-line
      await fetchPlayerReport(player.id);
      // Laisse le temps à React de mettre à jour l'affichage avant la capture
      // eslint-disable-next-line
      await sleep(400);
      try {
        // eslint-disable-next-line
        await exportPlayerReport(`${player.first_name} ${player.last_name}`);
      } catch (error) {
        console.error(`Erreur export PDF pour ${player.first_name} ${player.last_name}:`, error);
      }
      // Petite pause entre chaque téléchargement pour éviter que le navigateur ne les bloque
      // eslint-disable-next-line
      await sleep(800);
    }

    setExportingAll(false);
  };


  const fetchComparePlayerData = async (playerId) => {
    try {
      const [reportRes, evalRes] = await Promise.allSettled([
        axios.get(`${API}/reports/player/${playerId}`),
        axios.get(`${API}/evaluations/player/${playerId}`)
      ]);

      const report = reportRes.status === 'fulfilled' ? reportRes.value.data : null;
      const evaluations = evalRes.status === 'fulfilled' ? evalRes.value.data : [];
      const latestEvaluation = evaluations.length > 0 ? evaluations[0] : null;

      return { report, latestEvaluation };
    } catch (error) {
      console.error('Erreur lors du chargement des données de comparaison:', error);
      return { report: null, latestEvaluation: null };
    }
  };

  useEffect(() => {
    if (!comparePlayerAId) {
      setCompareDataA(null);
      return;
    }
    setCompareLoading(true);
    fetchComparePlayerData(comparePlayerAId).then(data => {
      setCompareDataA(data);
      setCompareLoading(false);
    });
    // eslint-disable-next-line
  }, [comparePlayerAId]);

  useEffect(() => {
    if (!comparePlayerBId) {
      setCompareDataB(null);
      return;
    }
    setCompareLoading(true);
    fetchComparePlayerData(comparePlayerBId).then(data => {
      setCompareDataB(data);
      setCompareLoading(false);
    });
    // eslint-disable-next-line
  }, [comparePlayerBId]);

  const COMPARE_THEMES = ['ADRESSE', 'AISANCE', 'PASSE', 'DEFENSE', 'REBOND', 'ATHLETE', 'TACTIQUE', 'COACHABILITE'];

  const getCompareRadarData = () => {
    const buildScores = (evaluation) => {
      if (!evaluation || !evaluation.themes) return COMPARE_THEMES.map(() => 0);
      const themeScores = {};
      evaluation.themes.forEach(theme => {
        themeScores[theme.name] = theme.average_score || 0;
      });
      return COMPARE_THEMES.map(name => themeScores[name] || 0);
    };

    const datasets = [];
    if (compareDataA?.latestEvaluation) {
      datasets.push({
        label: `${compareDataA.report?.player?.first_name || 'Joueur A'}`,
        data: buildScores(compareDataA.latestEvaluation),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 2
      });
    }
    if (compareDataB?.latestEvaluation) {
      datasets.push({
        label: `${compareDataB.report?.player?.first_name || 'Joueur B'}`,
        data: buildScores(compareDataB.latestEvaluation),
        borderColor: 'rgb(245, 101, 11)',
        backgroundColor: 'rgba(245, 101, 11, 0.3)',
        borderWidth: 2
      });
    }

    if (datasets.length === 0) return null;
    return { labels: COMPARE_THEMES, datasets };
  };

  const fetchCoachReport = async (coachName) => {
    setLoading(true);
    try {
      let url = `${API}/reports/coach/${encodeURIComponent(coachName)}`;
      if (dateFilter.start_date && dateFilter.end_date) {
        url += `?start_date=${dateFilter.start_date}&end_date=${dateFilter.end_date}`;
      }
      const response = await axios.get(url);
      setCoachReport(response.data);
      setPlayerReport(null);
      setPlayerEvaluation(null);
    } catch (error) {
      console.error('Erreur lors du chargement du rapport coach:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayer(playerId);
    setSelectedCoach('');
    if (playerId) {
      setPlayerReport(null);
      setPlayerEvaluation(null);
      fetchPlayerReport(playerId);
    } else {
      setPlayerReport(null);
      setPlayerEvaluation(null);
    }
  };

  const handleCoachSelect = (coachName) => {
    setSelectedCoach(coachName);
    setSelectedPlayer('');
    if (coachName) {
      setCoachReport(null);
      fetchCoachReport(coachName);
    } else {
      setCoachReport(null);
    }
  };

  const handleDateFilterChange = () => {
    if (activeTab === 'players' && selectedPlayer) {
      fetchPlayerReport(selectedPlayer);
    } else if (activeTab === 'coaches' && selectedCoach) {
      fetchCoachReport(selectedCoach);
    }
  };

  const loadComparisonData = async (type, position = null) => {
    try {
      if (type === 'all') {
        // Charger la moyenne de tous les joueurs (CDF)
        const response = await axios.get(`${API}/evaluations/averages/all`);
        setRadarFilters(prev => ({ 
          ...prev, 
          allPlayersData: response.data 
        }));
      } else if (type === 'position' && position) {
        // Charger la moyenne par poste
        const response = await axios.get(`${API}/evaluations/averages/position/${position}`);
        setRadarFilters(prev => ({ 
          ...prev, 
          positionData: response.data 
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de comparaison:', error);
    }
  };

  useEffect(() => {
    if (radarFilters.showCDFAverage && selectedPlayer) {
      loadComparisonData('all');
    }
    if (radarFilters.showPositionAverage && selectedPlayer && playerReport?.player?.position) {
      loadComparisonData('position', playerReport.player.position);
    }
  }, [radarFilters.showCDFAverage, radarFilters.showPositionAverage, selectedPlayer, playerReport?.player?.position]);

  // Theme Distribution Chart Data
  const getThemeDistributionData = () => {
    if (!playerReport?.content_breakdown) return null;

    // Trier les entrées par ordre décroissant
    const sortedEntries = Object.entries(playerReport.content_breakdown)
      .sort(([,a], [,b]) => b - a);

    const data = {
      labels: sortedEntries.map(([theme, ]) => theme),
      datasets: [
        {
          data: sortedEntries.map(([, count]) => count),
          backgroundColor: [
            '#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
            '#EF4444', '#EC4899', '#84CC16', '#F97316', '#6B7280',
            '#14B8A6', '#F43F5E'
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        }
      ]
    };
    return data;
  };

  const getCoachThemeDistributionData = () => {
    if (!coachReport || !coachReport.theme_breakdown) return null;
    
    // Trier les entrées par ordre décroissant
    const sortedEntries = Object.entries(coachReport.theme_breakdown)
      .sort(([,a], [,b]) => b - a);
    
    const themes = sortedEntries.map(([theme, ]) => theme);
    const data = sortedEntries.map(([, count]) => count);
    
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
      '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ];
    
    return {
      labels: themes,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, themes.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  // Theme Distribution Chart Options
  const themeDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '45%', // Anneau plutôt que camembert plein : plus lisible, moins chargé au centre
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 12,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} séances (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: true,
        color: '#fff',
        font: {
          weight: 'bold',
          size: 11
        },
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = (value / total) * 100;
          // Masque le pourcentage sur les toutes petites parts pour éviter que les chiffres se chevauchent
          if (percentage < 6) return '';
          return percentage.toFixed(1) + '%';
        }
      }
    }
  };

  const reportRadarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.r.toFixed(1)}/5`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        min: 0,
        ticks: {
          stepSize: 1,
          showLabelBackdrop: false,
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 11,
            weight: 'bold'
          },
          padding: 10
        }
      }
    }
  };

  const getReportRadarData = () => {
    if (!allPlayerEvaluations.length) return null;

    const datasets = [];
    
    // Utiliser les vrais thèmes d'évaluation 
    const REAL_EVALUATION_THEMES = ['ADRESSE', 'AISANCE', 'PASSE', 'DEFENSE', 'REBOND', 'ATHLETE', 'TACTIQUE', 'COACHABILITE'];
    
    // Define colors for different types of data - avec plus de contraste
    const colors = {
      initial: { 
        border: 'rgb(34, 197, 94)', 
        background: 'rgba(34, 197, 94, 0.4)' 
      }, // Vert plus opaque
      final: { 
        border: 'rgb(245, 101, 11)', 
        background: 'rgba(245, 101, 11, 0.4)' 
      }, // Orange plus saturé et opaque
      cdf: { 
        border: 'rgb(107, 114, 128)', 
        background: 'rgba(107, 114, 128, 0.2)' 
      }, // Gris plus foncé
      position: { 
        border: 'rgb(59, 130, 246)', 
        background: 'rgba(59, 130, 246, 0.3)' 
      } // Bleu plus contrasté
    };

    // Ajouter l'évaluation initiale si demandée
    if (radarFilters.showInitial) {
      const initialEval = allPlayerEvaluations.find(e => e.evaluation_type === 'initial');
      if (initialEval && initialEval.themes) {
        const themeScores = {};
        initialEval.themes.forEach(theme => {
          themeScores[theme.name] = theme.average_score || 0;
        });

        const evaluationData = REAL_EVALUATION_THEMES.map(themeName => {
          return themeScores[themeName] || 0;
        });

        datasets.push({
          label: 'Évaluation Initiale',
          data: evaluationData,
          borderColor: colors.initial.border,
          backgroundColor: colors.initial.background,
          borderWidth: 3,
          pointBackgroundColor: colors.initial.border,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: colors.initial.border,
          pointRadius: 5,
          pointHoverRadius: 7
        });
      }
    }

    // Ajouter l'évaluation finale si demandée
    if (radarFilters.showFinal) {
      const finalEval = allPlayerEvaluations.find(e => e.evaluation_type === 'final');
      if (finalEval && finalEval.themes) {
        const themeScores = {};
        finalEval.themes.forEach(theme => {
          themeScores[theme.name] = theme.average_score || 0;
        });

        const evaluationData = REAL_EVALUATION_THEMES.map(themeName => {
          return themeScores[themeName] || 0;
        });

        datasets.push({
          label: 'Évaluation Finale',
          data: evaluationData,
          borderColor: colors.final.border,
          backgroundColor: colors.final.background,
          borderWidth: 3,
          pointBackgroundColor: colors.final.border,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: colors.final.border,
          pointRadius: 5,
          pointHoverRadius: 7
        });
      }
    }

    // Ajouter la moyenne CDF (tous joueurs) si demandée
    if (radarFilters.showCDFAverage && radarFilters.allPlayersData) {
      const cdfData = REAL_EVALUATION_THEMES.map(themeName => {
        return radarFilters.allPlayersData.theme_averages[themeName] || 0;
      });

      datasets.push({
        label: 'Moyenne CDF (tous joueurs)',
        data: cdfData,
        borderColor: colors.cdf.border,
        backgroundColor: colors.cdf.background,
        borderWidth: 3,
        borderDash: [8, 4],
        pointBackgroundColor: colors.cdf.border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colors.cdf.border,
        pointRadius: 4,
        pointBorderWidth: 2
      });
    }

    // Ajouter la moyenne par poste si demandée
    if (radarFilters.showPositionAverage && radarFilters.positionData) {
      const positionData = REAL_EVALUATION_THEMES.map(themeName => {
        return radarFilters.positionData.theme_averages[themeName] || 0;
      });

      datasets.push({
        label: `Moyenne ${playerReport?.player?.position || 'position'}`,
        data: positionData,
        borderColor: colors.position.border,
        backgroundColor: colors.position.background,
        borderWidth: 3,
        borderDash: [12, 6],
        pointBackgroundColor: colors.position.border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colors.position.border,
        pointRadius: 4,
        pointBorderWidth: 2
      });
    }

    return {
      labels: REAL_EVALUATION_THEMES,
      datasets: datasets
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 report-content"
         style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      {/* Tabs */}
      <div className="flex space-x-1 mb-8">
        <button
          onClick={() => setActiveTab('players')}
          className={`sub-nav-button ${
            activeTab === 'players' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          Rapports Joueurs
        </button>
        <button
          onClick={() => setActiveTab('coaches')}
          className={`sub-nav-button ${
            activeTab === 'coaches' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          Rapports Coachs
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`sub-nav-button ${
            activeTab === 'compare' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          Comparer 2 joueurs
        </button>
      </div>

      {/* Date Filter */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filtres de date</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
            <input
              type="date"
              value={dateFilter.start_date}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
            <input
              type="date"
              value={dateFilter.end_date}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleDateFilterChange}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>

      {/* Player Reports Tab */}
      {activeTab === 'players' && (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Rapports des Joueurs</h1>
            <button
              onClick={handleExportAllPlayers}
              disabled={exportingAll || players.length === 0}
              className="no-print bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl transition-colors flex items-center space-x-2 font-semibold"
            >
              <span>📦</span>
              <span>
                {exportingAll
                  ? `Export en cours... (${exportAllProgress.current}/${exportAllProgress.total})`
                  : "Exporter tous les rapports"}
              </span>
            </button>
          </div>

          <div className="mb-6">
            <select
              value={selectedPlayer}
              onChange={(e) => handlePlayerSelect(e.target.value)}
              className="w-full md:w-64 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner un joueur</option>
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.first_name} {player.last_name} ({player.position})
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
              <span className="ml-3 text-gray-600">Chargement du rapport...</span>
            </div>
          )}

          {playerReport && (
            <div id="player-report-container" className="space-y-6 bg-gray-50 p-6 rounded-3xl">
              {/* Basic Report Stats */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {playerReport.player.first_name} {playerReport.player.last_name}
                    </h2>
                    <p className="text-gray-600">{playerReport.player.position}</p>
                    <p className="text-gray-500">
                      Né le: {new Date(playerReport.player.date_of_birth).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => exportPlayerReport(`${playerReport.player.first_name} ${playerReport.player.last_name}`)}
                    className="no-print bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span className="text-lg">📄</span>
                    <span className="font-semibold">Télécharger</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Séances</h3>
                    <p className="text-3xl font-bold text-blue-600">{playerReport.total_sessions}</p>
                    {(playerReport.mandatory_sessions !== undefined) && (
                      <p className="text-xs text-blue-500 mt-1">
                        {playerReport.mandatory_sessions} obligatoire{playerReport.mandatory_sessions > 1 ? 's' : ''} · {playerReport.optional_sessions} facultative{playerReport.optional_sessions > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="bg-teal-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-teal-800 mb-2">Durée de travail</h3>
                    <p className="text-3xl font-bold text-teal-600">{formatDuration(playerReport.total_duration_minutes)}</p>
                    {(playerReport.total_duration_minutes > 0) && (
                      <p className="text-xs text-teal-500 mt-1">
                        {formatDuration(playerReport.mandatory_duration_minutes)} obligatoire · {formatDuration(playerReport.optional_duration_minutes)} facultative
                      </p>
                    )}
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Thèmes Travaillés</h3>
                    <p className="text-3xl font-bold text-green-600">{Object.keys(playerReport.content_breakdown).length}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Entraîneurs Différents</h3>
                    <p className="text-3xl font-bold text-purple-600">{Object.keys(playerReport.trainer_breakdown).length}</p>
                  </div>
                  {attendanceReport && (
                    <div className="bg-orange-50 p-4 rounded-xl">
                      <h3 className="text-lg font-semibold text-orange-800 mb-2">Assiduité</h3>
                      <p className="text-3xl font-bold text-orange-600">{attendanceReport.statistics.presence_rate}%</p>
                      <p className="text-sm text-orange-600">Taux de présence</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fiche Joueur - Points forts, axes de travail, joueur référence, notes supplémentaires */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Fiche Joueur</h3>
                  {!ficheEditMode ? (
                    canEdit && (
                      <button
                        onClick={() => setFicheEditMode(true)}
                        className="no-print bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors text-sm font-semibold"
                      >
                        ✏️ Modifier la fiche
                      </button>
                    )
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={cancelFicheEdit}
                        disabled={savingFiche}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl transition-colors text-sm font-semibold"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveFiche}
                        disabled={savingFiche}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors text-sm font-semibold"
                      >
                        {savingFiche ? 'Enregistrement...' : '💾 Enregistrer'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Points forts */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">💪 Points forts</h4>
                    {ficheEditMode ? (
                      <textarea
                        value={ficheForm.strengths_to_keep}
                        onChange={(e) => handleFicheChange('strengths_to_keep', e.target.value)}
                        rows={4}
                        placeholder="Ex : Vitesse d'exécution, leadership sur le terrain..."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-xl whitespace-pre-line min-h-[3rem]">
                        {playerReport.player.strengths_to_keep || 'Aucun point fort renseigné.'}
                      </p>
                    )}
                  </div>

                  {/* Axes de travail */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">🛠️ Axes de travail</h4>
                    {ficheEditMode ? (
                      <textarea
                        value={ficheForm.work_axes}
                        onChange={(e) => handleFicheChange('work_axes', e.target.value)}
                        rows={4}
                        placeholder="Ex : Défense individuelle, prise de décision..."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-xl whitespace-pre-line min-h-[3rem]">
                        {playerReport.player.work_axes || 'Aucun axe de travail renseigné.'}
                      </p>
                    )}
                  </div>

                  {/* Joueur référence */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">⭐ Joueur(s) référence</h4>
                    {ficheEditMode ? (
                      <textarea
                        value={ficheForm.reference_player}
                        onChange={(e) => handleFicheChange('reference_player', e.target.value)}
                        rows={4}
                        placeholder={"Ex : Victor Wembanyama\nRudy Gobert"}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-xl whitespace-pre-line min-h-[3rem]">
                        {playerReport.player.reference_player || 'Aucun joueur référence renseigné.'}
                      </p>
                    )}
                  </div>

                  {/* Notes supplémentaires */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">📝 Notes supplémentaires</h4>
                    {ficheEditMode ? (
                      <textarea
                        value={ficheForm.additional_notes}
                        onChange={(e) => handleFicheChange('additional_notes', e.target.value)}
                        rows={4}
                        placeholder="Toute information complémentaire utile..."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-xl whitespace-pre-line min-h-[3rem]">
                        {playerReport.player.additional_notes || 'Aucune note supplémentaire.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Evaluation Section with Radar Chart and Filters */}
              {allPlayerEvaluations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Profil d'Évaluation</h3>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {allPlayerEvaluations.length} évaluation(s)
                    </div>
                  </div>

                  {/* Nouveaux contrôles radar simplifiés */}
                  <div className="mb-6 no-print">
                    <h4 className="text-md font-semibold text-gray-700 mb-4">Données à afficher sur le radar :</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={radarFilters.showInitial}
                          onChange={(e) => setRadarFilters(prev => ({ ...prev, showInitial: e.target.checked }))}
                          className="rounded text-green-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Évaluation Initiale</span>
                      </label>
                      
                      <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={radarFilters.showFinal}
                          onChange={(e) => setRadarFilters(prev => ({ ...prev, showFinal: e.target.checked }))}
                          className="rounded text-orange-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Évaluation Finale</span>
                      </label>
                      
                      <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={radarFilters.showCDFAverage}
                          onChange={(e) => {
                            setRadarFilters(prev => ({ ...prev, showCDFAverage: e.target.checked }));
                            if (e.target.checked) {
                              loadComparisonData('all');
                            }
                          }}
                          className="rounded text-gray-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Moyenne CDF</span>
                      </label>
                      
                      <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={radarFilters.showPositionAverage}
                          onChange={(e) => {
                            setRadarFilters(prev => ({ ...prev, showPositionAverage: e.target.checked }));
                            if (e.target.checked && playerReport?.player?.position) {
                              loadComparisonData('position', playerReport.player.position);
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Moyenne {playerReport?.player?.position || 'par poste'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Radar Chart */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Profil Radar</h4>
                      <div style={{ height: '300px' }}>
                        {getReportRadarData() && (
                          <Radar 
                            key={`radar-${radarFilters.showInitial}-${radarFilters.showFinal}-${radarFilters.showCDFAverage}-${radarFilters.showPositionAverage}`}
                            data={getReportRadarData()} 
                            options={reportRadarOptions} 
                          />
                        )}
                      </div>
                    </div>

                    {/* Détails des évaluations */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Détails des Évaluations</h4>
                      
                      <div className="space-y-4">
                        {/* Évaluation Initiale */}
                        {allPlayerEvaluations.find(e => e.evaluation_type === 'initial') ? (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-semibold text-green-700">Évaluation Initiale</span>
                              <span className="text-sm text-gray-500">
                                {new Date(allPlayerEvaluations.find(e => e.evaluation_type === 'initial').evaluation_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-lg font-bold text-green-600">
                                {allPlayerEvaluations.find(e => e.evaluation_type === 'initial').overall_average}/5
                              </span>
                              <p className="text-xs text-gray-600">Score global</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-gray-300">
                            <span className="text-sm text-gray-500">Évaluation Initiale non effectuée</span>
                          </div>
                        )}

                        {/* Évaluation Finale */}
                        {allPlayerEvaluations.find(e => e.evaluation_type === 'final') ? (
                          <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-semibold text-orange-700">Évaluation Finale</span>
                              <span className="text-sm text-gray-500">
                                {new Date(allPlayerEvaluations.find(e => e.evaluation_type === 'final').evaluation_date).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-lg font-bold text-orange-600">
                                {allPlayerEvaluations.find(e => e.evaluation_type === 'final').overall_average}/5
                              </span>
                              <p className="text-xs text-gray-600">Score global</p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-gray-300">
                            <span className="text-sm text-gray-500">Évaluation Finale non effectuée</span>
                          </div>
                        )}

                        {/* Progression si les deux évaluations existent */}
                        {allPlayerEvaluations.find(e => e.evaluation_type === 'initial') && 
                         allPlayerEvaluations.find(e => e.evaluation_type === 'final') && (
                          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                            <h5 className="text-sm font-semibold text-blue-700 mb-2">Progression</h5>
                            <div className="text-center">
                              {(() => {
                                const initial = allPlayerEvaluations.find(e => e.evaluation_type === 'initial').overall_average;
                                const final = allPlayerEvaluations.find(e => e.evaluation_type === 'final').overall_average;
                                const progression = (final - initial).toFixed(2);
                                return (
                                  <span className={`text-lg font-bold ${progression >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {progression >= 0 ? '+' : ''}{progression} pts
                                  </span>
                                );
                              })()}
                              <p className="text-xs text-gray-600">Évolution globale</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                      Pour modifier les évaluations, utilisez l'onglet "Évaluations"
                    </p>
                  </div>
                </div>
              )}

              {/* Theme Distribution Chart + Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Theme Distribution Pie Chart */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition des Thèmes</h3>
                  <div style={{ height: '340px' }}>
                    {getThemeDistributionData() && <Pie data={getThemeDistributionData()} options={themeDistributionOptions} />}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Détail par Thème</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {Object.entries(playerReport.content_breakdown)
                      .sort(([,a], [,b]) => b - a) // Tri décroissant
                      .map(([theme, count]) => {
                      const total = Object.values(playerReport.content_breakdown).reduce((a, b) => a + b, 0);
                      const percentage = ((count / total) * 100).toFixed(1);
                      return (
                        <div key={theme} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                          <span className="font-medium text-gray-700">{theme}</span>
                          <div className="text-right">
                            <span className="font-bold text-blue-600">{count} séances</span>
                            {playerReport.duration_by_theme?.[theme] ? (
                              <p className="text-sm text-teal-600">{formatDuration(playerReport.duration_by_theme[theme])}</p>
                            ) : null}
                            <p className="text-sm text-gray-500">{percentage}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition par Entraîneur</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {Object.entries(playerReport.trainer_breakdown)
                      .sort(([,a], [,b]) => b - a) // Tri décroissant
                      .map(([trainer, count]) => {
                      const total = Object.values(playerReport.trainer_breakdown).reduce((a, b) => a + b, 0);
                      const percentage = ((count / total) * 100).toFixed(1);
                      return (
                        <div key={trainer} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                          <span className="font-medium text-gray-700">{trainer}</span>
                          <div className="text-right">
                            <span className="font-bold text-green-600">{count} séances</span>
                            <p className="text-sm text-gray-500">{percentage}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Match Statistics */}
              {playerReport.match_stats && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Suivi des matchs</h3>
                  
                  {/* Match Statistics Summary - s'adapte automatiquement aux équipes existantes */}
                  <div className="p-4 bg-gray-100 rounded-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {Object.entries(playerReport.match_stats.team_breakdown || {}).map(([teamName, breakdown]) => (
                        <div key={teamName} className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {breakdown.played || 0}
                          </div>
                          <div className="text-gray-600">Matchs {teamName} joués</div>
                        </div>
                      ))}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{playerReport.match_stats.matches_started}</div>
                        <div className="text-gray-600">5 de départ</div>
                      </div>
                      {Object.entries(playerReport.match_stats.average_play_time_by_team || {}).map(([teamName, avg]) => (
                        <div key={teamName} className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{avg || 0}</div>
                          <div className="text-gray-600">Moy. min {teamName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Suivi des Séances Collectives (présence/absence/blessure) */}
              {attendanceReport && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Suivi des Séances Collectives</h3>

                  {/* Résumé */}
                  <div className="p-4 bg-gray-100 rounded-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{attendanceReport.statistics.presence_rate}%</div>
                        <div className="text-gray-600">Taux présence</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{attendanceReport.statistics.absent}</div>
                        <div className="text-gray-600">Séances ratées</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{attendanceReport.statistics.injured}</div>
                        <div className="text-gray-600">Séances blessé</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {attendanceReport.statistics.by_type.Musculation?.absent || 0}
                        </div>
                        <div className="text-gray-600">Muscu ratées</div>
                      </div>
                    </div>

                    {/* Détail par type de séance */}
                    {Object.keys(attendanceReport.statistics.by_type).length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <h5 className="font-medium text-gray-700 mb-2">Détail par type de séance :</h5>
                        <div className="space-y-2">
                          {Object.entries(attendanceReport.statistics.by_type).map(([sessionType, stats]) => (
                            <div key={sessionType} className="flex justify-between items-center text-sm">
                              <span className="font-medium">{sessionType} :</span>
                              <span>
                                <span className="text-red-600 font-medium">{stats.absent} ratées</span>
                                {stats.injured > 0 && (
                                  <span className="text-yellow-600 font-medium ml-2">{stats.injured} blessé</span>
                                )}
                                <span className="text-gray-500 ml-2">/ {stats.total} total</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Séances Récentes</h3>
                <div className="space-y-3">
                  {playerReport.recent_sessions.map((session) => (
                    <div key={session.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{session.themes?.join(', ') || 'Séance'}</p>
                          <span className={`inline-block mt-1 mb-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            session.is_mandatory === false
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {session.is_mandatory === false ? 'Facultative' : 'Obligatoire'}
                          </span>
                          <p className="text-gray-600 text-sm">{session.content_details}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600">{new Date(session.session_date).toLocaleDateString('fr-FR')}</p>
                          {session.duration_minutes ? (
                            <p className="text-teal-600 text-sm font-medium">{formatDuration(session.duration_minutes)}</p>
                          ) : null}
                          <p className="text-gray-500 text-sm">Entraîneurs: {session.trainers?.join(', ') || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Coach Reports Tab */}
      {activeTab === 'coaches' && (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Rapports des Coachs</h1>
          </div>

          <div className="mb-6">
            <select
              value={selectedCoach}
              onChange={(e) => handleCoachSelect(e.target.value)}
              className="w-full md:w-64 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner un coach</option>
              {coaches.map(coach => (
                <option key={coach.id} value={`${coach.first_name} ${coach.last_name}`.trim()}>
                  {coach.first_name} {coach.last_name}
                </option>
              ))}
            </select>
          </div>

          {coachReport && (
            <div id="coach-report-container" className="space-y-6 bg-gray-50 p-6 rounded-3xl">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {coachReport.coach.first_name} {coachReport.coach.last_name}
                    </h2>
                  </div>
                  <button
                    onClick={() => exportCoachReport(`${coachReport.coach.first_name} ${coachReport.coach.last_name}`)}
                    className="no-print bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span className="text-lg">📄</span>
                    <span className="font-semibold">Télécharger</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Séances</h3>
                    <p className="text-3xl font-bold text-blue-600">{coachReport.total_sessions}</p>
                    {(coachReport.mandatory_sessions !== undefined) && (
                      <p className="text-xs text-blue-500 mt-1">
                        {coachReport.mandatory_sessions} obligatoire{coachReport.mandatory_sessions > 1 ? 's' : ''} · {coachReport.optional_sessions} facultative{coachReport.optional_sessions > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="bg-teal-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-teal-800 mb-2">Durée de travail</h3>
                    <p className="text-3xl font-bold text-teal-600">{formatDuration(coachReport.total_duration_minutes)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Thèmes Enseignés</h3>
                    <p className="text-3xl font-bold text-green-600">{Object.keys(coachReport.theme_breakdown).length}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Joueurs Coachés</h3>
                    <p className="text-3xl font-bold text-purple-600">{Object.keys(coachReport.player_breakdown).length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition par Thème</h3>
                    <div style={{ height: '300px' }}>
                      {getCoachThemeDistributionData() && <Pie data={getCoachThemeDistributionData()} options={themeDistributionOptions} />}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Détail par Thème</h3>
                    <div className="space-y-3">
                      {Object.entries(coachReport.theme_breakdown)
                        .sort(([,a], [,b]) => b - a) // Tri décroissant
                        .map(([theme, count]) => {
                        const total = Object.values(coachReport.theme_breakdown).reduce((a, b) => a + b, 0);
                        const percentage = ((count / total) * 100).toFixed(1);
                        return (
                          <div key={theme} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                            <span className="font-medium text-gray-700">{theme}</span>
                            <div className="text-right">
                              <span className="font-bold text-blue-600">{count} séances</span>
                              {coachReport.duration_by_theme?.[theme] ? (
                                <p className="text-sm text-teal-600">{formatDuration(coachReport.duration_by_theme[theme])}</p>
                              ) : null}
                              <p className="text-sm text-gray-500">{percentage}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition par Joueur</h3>
                  <div className="space-y-3">
                    {Object.entries(coachReport.player_breakdown)
                      .sort(([,a], [,b]) => b - a) // Tri décroissant
                      .map(([player, count]) => (
                      <div key={player} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span className="font-medium text-gray-700">{player}</span>
                        <span className="font-bold text-green-600">{count} séances</span>
                      </div>
                    ))}
                  </div>
                </div>

                {coachReport.recent_sessions && coachReport.recent_sessions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Séances Récentes</h3>
                    <div className="space-y-3">
                      {coachReport.recent_sessions.map((session, index) => (
                        <div key={index} className="flex justify-between items-start p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-semibold text-gray-800">{session.themes?.join(', ') || 'Séance'}</p>
                            <span className={`inline-block mt-1 mb-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              session.is_mandatory === false
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {session.is_mandatory === false ? 'Facultative' : 'Obligatoire'}
                            </span>
                            <p className="text-gray-600 text-sm">{session.content_details}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600">{new Date(session.session_date).toLocaleDateString('fr-FR')}</p>
                            {session.duration_minutes ? (
                              <p className="text-teal-600 text-sm font-medium">{formatDuration(session.duration_minutes)}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Comparer 2 joueurs</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joueur A</label>
              <select
                value={comparePlayerAId}
                onChange={(e) => setComparePlayerAId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un joueur</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joueur B</label>
              <select
                value={comparePlayerBId}
                onChange={(e) => setComparePlayerBId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un joueur</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.first_name} {player.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {compareLoading && (
            <div className="text-center py-12 text-gray-500">Chargement...</div>
          )}

          {!compareLoading && (compareDataA?.report || compareDataB?.report) && (
            <>
              {/* Cartes côte à côte */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[compareDataA, compareDataB].map((data, idx) => (
                  <div key={idx} className="bg-white rounded-2xl shadow-lg p-6">
                    {data?.report ? (
                      <>
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">
                          {data.report.player.first_name} {data.report.player.last_name}
                        </h2>
                        <p className="text-gray-500 mb-4">
                          {data.report.player.position}
                          {data.report.player.team ? ` · ${data.report.player.team}` : ''}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded-xl">
                            <p className="text-xs text-blue-700 font-medium">Séances</p>
                            <p className="text-2xl font-bold text-blue-600">{data.report.total_sessions}</p>
                          </div>
                          <div className="bg-teal-50 p-3 rounded-xl">
                            <p className="text-xs text-teal-700 font-medium">Durée de travail</p>
                            <p className="text-2xl font-bold text-teal-600">{formatDuration(data.report.total_duration_minutes)}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-xl">
                            <p className="text-xs text-green-700 font-medium">Thèmes travaillés</p>
                            <p className="text-2xl font-bold text-green-600">{Object.keys(data.report.content_breakdown || {}).length}</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-xl">
                            <p className="text-xs text-purple-700 font-medium">Matchs joués</p>
                            <p className="text-2xl font-bold text-purple-600">{data.report.match_stats?.matches_played ?? 0}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400 text-center py-12">Choisis un joueur ci-dessus</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Radar comparatif */}
              {getCompareRadarData() && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Comparaison des évaluations (dernière évaluation de chacun)</h3>
                  <div style={{ height: '400px' }}>
                    <Radar
                      data={getCompareRadarData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            min: 0,
                            max: 5,
                            ticks: { stepSize: 1 }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsWithEvaluation;
