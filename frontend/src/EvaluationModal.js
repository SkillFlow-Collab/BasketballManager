import React, { useState, useEffect } from 'react';
import { Radar } from 'react-chartjs-2';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Standardized themes for radar chart (same as in ReportsWithEvaluation)
const STANDARD_THEMES = [
  'Technique',
  'Physique', 
  'Tactique',
  'Mental',
  'Défense',
  'Attaque',
  'Jeu collectif',
  'Condition physique'
];

// Function to normalize theme names to standard themes
const normalizeTheme = (themeName) => {
  const theme = themeName.toLowerCase();
  
  if (theme.includes('technique') || theme.includes('dribble') || theme.includes('shoot') || theme.includes('passes')) {
    return 'Technique';
  }
  if (theme.includes('physique') || theme.includes('vitesse') || theme.includes('endurance') || theme.includes('force') || theme.includes('explosivité')) {
    return 'Physique';
  }
  if (theme.includes('tactique') || theme.includes('lecture') || theme.includes('positionnement') || theme.includes('décision')) {
    return 'Tactique';
  }
  if (theme.includes('mental') || theme.includes('concentration') || theme.includes('confiance') || theme.includes('stress')) {
    return 'Mental';
  }
  if (theme.includes('défense') || theme.includes('défensif')) {
    return 'Défense';
  }
  if (theme.includes('attaque') || theme.includes('offensif') || theme.includes('finition') || theme.includes('pénétration')) {
    return 'Attaque';
  }
  if (theme.includes('collectif') || theme.includes('équipe') || theme.includes('communication')) {
    return 'Jeu collectif';
  }
  if (theme.includes('condition') || theme.includes('cardio') || theme.includes('musculation')) {
    return 'Condition physique';
  }
  
  return 'Technique'; // Default fallback
};

const EvaluationModal = ({ 
  showModal, 
  selectedPlayer, 
  evaluationData,
  setEvaluationData,
  onClose,
  onSave,
  EVALUATION_THEMES 
}) => {
  const [playerEvaluation, setPlayerEvaluation] = useState(null);
  const [allPlayerEvaluations, setAllPlayerEvaluations] = useState([]);
  const [selectedEvaluationsForRadar, setSelectedEvaluationsForRadar] = useState([]);
  const [evaluationComparison, setEvaluationComparison] = useState({
    showAll: false,
    showPosition: false,
    allPlayersData: null,
    positionData: null
  });
  const [activeTab, setActiveTab] = useState('form');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);

  // Load player's existing evaluations
  useEffect(() => {
    if (selectedPlayer && showModal) {
      loadPlayerEvaluations();
    }
  }, [selectedPlayer, showModal]);

  const loadPlayerEvaluations = async () => {
    try {
      const response = await axios.get(`${API}/evaluations/player/${selectedPlayer.id}`);
      const evaluations = response.data;
      setAllPlayerEvaluations(evaluations);
      
      // Auto-select the latest evaluation for radar display
      if (evaluations.length > 0) {
        const latest = evaluations[0]; // Assuming they're sorted by date desc
        setSelectedEvaluationsForRadar([latest.id]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des évaluations:', error);
      setAllPlayerEvaluations([]);
    }
  };

  const handleEvaluationChange = (themeIndex, aspectIndex, score) => {
    setEvaluationData(prev => ({
      ...prev,
      themes: prev.themes.map((theme, tIndex) => 
        tIndex === themeIndex ? {
          ...theme,
          aspects: theme.aspects.map((aspect, aIndex) =>
            aIndex === aspectIndex ? { ...aspect, score: parseInt(score) } : aspect
          )
        } : theme
      )
    }));
  };

  const getThemeAverage = (theme) => {
    if (theme.aspects && theme.aspects.length > 0) {
      const total = theme.aspects.reduce((sum, aspect) => sum + aspect.score, 0);
      return (total / theme.aspects.length).toFixed(1);
    }
    return '0.0';
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API}/evaluations`, {
        player_id: selectedPlayer.id,
        themes: evaluationData.themes,
        notes: evaluationData.notes,
        evaluation_date: evaluationDate + 'T12:00:00.000Z' // Add time component
      });
      
      setShowSaveConfirmation(true);
      setTimeout(() => {
        setShowSaveConfirmation(false);
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'évaluation:', error);
    }
  };

  const loadComparisonData = async () => {
    if (!selectedPlayer) return;
    
    try {
      const promises = [];
      
      if (evaluationComparison.showAll) {
        promises.push(axios.get(`${API}/evaluations/averages/all`));
      }
      
      if (evaluationComparison.showPosition) {
        promises.push(axios.get(`${API}/evaluations/averages/position/${selectedPlayer.position}`));
      }
      
      const results = await Promise.all(promises);
      
      setEvaluationComparison(prev => ({
        ...prev,
        allPlayersData: evaluationComparison.showAll ? results[0]?.data : null,
        positionData: evaluationComparison.showPosition ? results[evaluationComparison.showAll ? 1 : 0]?.data : null
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des données de comparaison:', error);
    }
  };

  useEffect(() => {
    if (evaluationComparison.showAll || evaluationComparison.showPosition) {
      loadComparisonData();
    }
  }, [evaluationComparison.showAll, evaluationComparison.showPosition, selectedPlayer]);

  const getRadarData = () => {
    const datasets = [];
    
    // Define colors for different evaluations
    const evaluationColors = [
      { border: 'rgb(99, 102, 241)', background: 'rgba(99, 102, 241, 0.2)' },
      { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.2)' },
      { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.2)' },
      { border: 'rgb(34, 197, 94)', background: 'rgba(34, 197, 94, 0.2)' },
      { border: 'rgb(168, 85, 247)', background: 'rgba(168, 85, 247, 0.2)' },
      { border: 'rgb(6, 182, 212)', background: 'rgba(6, 182, 212, 0.2)' }
    ];

    // Add current evaluation being created/edited
    if (evaluationData.themes && evaluationData.themes.length > 0) {
      // Map current evaluation to standard themes
      const currentEvalScores = {};
      STANDARD_THEMES.forEach(theme => {
        currentEvalScores[theme] = [];
      });

      evaluationData.themes.forEach(theme => {
        const standardTheme = normalizeTheme(theme.name);
        const average = parseFloat(getThemeAverage(theme));
        if (average > 0) {
          currentEvalScores[standardTheme].push(average);
        }
      });

      const currentData = STANDARD_THEMES.map(standardTheme => {
        if (currentEvalScores[standardTheme].length > 0) {
          return currentEvalScores[standardTheme].reduce((a, b) => a + b, 0) / currentEvalScores[standardTheme].length;
        }
        return 0;
      });

      datasets.push({
        label: `Évaluation en cours (${evaluationDate})`,
        data: currentData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        pointRadius: 5,
        pointHoverRadius: 7
      });
    }

    // Add selected existing evaluations
    selectedEvaluationsForRadar.forEach((evalId, index) => {
      const evaluation = allPlayerEvaluations.find(e => e.id === evalId);
      if (!evaluation) return;

      // Map evaluation themes to standard themes
      const evalScores = {};
      STANDARD_THEMES.forEach(theme => {
        evalScores[theme] = [];
      });

      evaluation.themes.forEach(theme => {
        const standardTheme = normalizeTheme(theme.name);
        if (theme.average_score) {
          evalScores[standardTheme].push(theme.average_score);
        }
      });

      const evaluationData = STANDARD_THEMES.map(standardTheme => {
        if (evalScores[standardTheme].length > 0) {
          return evalScores[standardTheme].reduce((a, b) => a + b, 0) / evalScores[standardTheme].length;
        }
        return 0;
      });

      const evalDate = new Date(evaluation.evaluation_date).toLocaleDateString('fr-FR');
      const colorIndex = (index + 1) % evaluationColors.length; // +1 to skip the current eval color
      
      datasets.push({
        label: `Évaluation du ${evalDate}`,
        data: evaluationData,
        borderColor: evaluationColors[colorIndex].border,
        backgroundColor: evaluationColors[colorIndex].background,
        borderWidth: 2,
        pointBackgroundColor: evaluationColors[colorIndex].border,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: evaluationColors[colorIndex].border,
        pointRadius: 4,
        pointHoverRadius: 6
      });
    });

    // Add comparison data if enabled (with different style for distinction)
    if (evaluationComparison.showAll && evaluationComparison.allPlayersData) {
      const allPlayersStandardized = STANDARD_THEMES.map(standardTheme => {
        const matchingThemes = Object.keys(evaluationComparison.allPlayersData.theme_averages)
          .filter(theme => normalizeTheme(theme) === standardTheme);
        
        if (matchingThemes.length > 0) {
          const totalScore = matchingThemes.reduce((sum, theme) => 
            sum + evaluationComparison.allPlayersData.theme_averages[theme], 0);
          return totalScore / matchingThemes.length;
        }
        return 0;
      });

      datasets.push({
        label: 'Moyenne tous joueurs',
        data: allPlayersStandardized,
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: 'rgb(156, 163, 175)',
        pointBorderColor: '#fff',
        pointRadius: 3
      });
    }

    if (evaluationComparison.showPosition && evaluationComparison.positionData) {
      const positionStandardized = STANDARD_THEMES.map(standardTheme => {
        const matchingThemes = Object.keys(evaluationComparison.positionData.theme_averages)
          .filter(theme => normalizeTheme(theme) === standardTheme);
        
        if (matchingThemes.length > 0) {
          const totalScore = matchingThemes.reduce((sum, theme) => 
            sum + evaluationComparison.positionData.theme_averages[theme], 0);
          return totalScore / matchingThemes.length;
        }
        return 0;
      });

      datasets.push({
        label: `Moyenne ${selectedPlayer?.position}`,
        data: positionStandardized,
        borderColor: 'rgb(107, 114, 128)',
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        borderWidth: 2,
        borderDash: [10, 5],
        pointBackgroundColor: 'rgb(107, 114, 128)',
        pointBorderColor: '#fff',
        pointRadius: 3
      });
    }

    return {
      labels: STANDARD_THEMES,
      datasets: datasets
    };
  };

  const radarOptions = {
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

  if (!showModal || !selectedPlayer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Confirmation Message */}
      {showSaveConfirmation && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 fade-in">
          ✅ Évaluation sauvegardée avec succès !
        </div>
      )}
      
      <div className="bg-white rounded-2xl p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Évaluation de {selectedPlayer.first_name} {selectedPlayer.last_name}
            </h2>
            <p className="text-gray-600">{selectedPlayer.position}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'form' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Formulaire d'évaluation
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'radar' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Graphique radar
          </button>
        </div>

        {activeTab === 'form' && (
          <>
            {/* Date d'évaluation */}
            <div className="mb-6 bg-blue-50 p-4 rounded-xl">
              <label className="block text-sm font-medium text-blue-800 mb-2">Date d'évaluation</label>
              <input
                type="date"
                value={evaluationDate}
                onChange={(e) => setEvaluationDate(e.target.value)}
                className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-blue-600 mt-1">
                Cette date permettra de comparer les évaluations dans le temps
              </p>
            </div>

            {/* Evaluation Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {evaluationData.themes.map((theme, themeIndex) => (
                <div key={theme.name} className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center justify-between">
                    {theme.name}
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Moy: {getThemeAverage(theme)}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {theme.aspects.map((aspect, aspectIndex) => (
                      <div key={aspect.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 flex-1">{aspect.name}</span>
                        <div className="flex space-x-1 ml-4">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => handleEvaluationChange(themeIndex, aspectIndex, score)}
                              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                                aspect.score === score
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes Section */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes additionnelles</label>
              <textarea
                value={evaluationData.notes}
                onChange={(e) => setEvaluationData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Commentaires et observations sur l'évaluation..."
              />
            </div>
          </>
        )}

        {activeTab === 'radar' && (
          <>
            {/* Evaluation Selection for Radar */}
            {allPlayerEvaluations.length > 0 && (
              <div className="mb-6 bg-blue-50 p-4 rounded-xl">
                <h3 className="font-semibold text-blue-800 mb-3">📊 Sélectionner les évaluations à comparer :</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                  {allPlayerEvaluations.map((evaluation) => (
                    <label key={evaluation.id} className="flex items-center space-x-2 bg-white p-3 rounded-lg border hover:bg-blue-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvaluationsForRadar.includes(evaluation.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvaluationsForRadar(prev => [...prev, evaluation.id]);
                          } else {
                            setSelectedEvaluationsForRadar(prev => prev.filter(id => id !== evaluation.id));
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-blue-800">
                          {new Date(evaluation.evaluation_date).toLocaleDateString('fr-FR')}
                        </span>
                        <p className="text-xs text-blue-600">
                          Score global: {evaluation.overall_average}/5
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Sélectionnez plusieurs évaluations pour voir l'évolution dans le temps
                </p>
              </div>
            )}

            {/* Comparison Controls */}
            <div className="mb-6 bg-gray-50 p-4 rounded-xl">
              <h3 className="font-semibold text-gray-700 mb-3">🔍 Options de comparaison avec les moyennes</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={evaluationComparison.showAll}
                    onChange={(e) => setEvaluationComparison(prev => ({ ...prev, showAll: e.target.checked }))}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">Moyenne générale</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={evaluationComparison.showPosition}
                    onChange={(e) => setEvaluationComparison(prev => ({ ...prev, showPosition: e.target.checked }))}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">Moyenne par poste ({selectedPlayer.position})</span>
                </label>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Profil d'évaluation - {selectedPlayer.first_name} {selectedPlayer.last_name}
              </h3>
              <div style={{ height: '500px' }}>
                <Radar data={getRadarData()} options={radarOptions} />
              </div>
            </div>

            {/* Legend and Statistics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <h4 className="font-semibold text-blue-800 mb-2">Score du joueur</h4>
                <p className="text-lg font-bold text-blue-600">
                  {(evaluationData.themes.reduce((sum, theme) => sum + parseFloat(getThemeAverage(theme)), 0) / evaluationData.themes.length).toFixed(1)}/5
                </p>
                <p className="text-sm text-blue-600">Moyenne générale</p>
              </div>
              
              {evaluationComparison.showAll && evaluationComparison.allPlayersData && (
                <div className="bg-green-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-green-800 mb-2">Moyenne tous joueurs</h4>
                  <p className="text-lg font-bold text-green-600">
                    {evaluationComparison.allPlayersData.overall_average}/5
                  </p>
                  <p className="text-sm text-green-600">
                    Sur {evaluationComparison.allPlayersData.total_evaluations} évaluations
                  </p>
                </div>
              )}
              
              {evaluationComparison.showPosition && evaluationComparison.positionData && (
                <div className="bg-purple-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-purple-800 mb-2">Moyenne {selectedPlayer.position}</h4>
                  <p className="text-lg font-bold text-purple-600">
                    {evaluationComparison.positionData.overall_average}/5
                  </p>
                  <p className="text-sm text-purple-600">
                    Sur {evaluationComparison.positionData.players_count} joueurs
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors"
          >
            💾 Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;
