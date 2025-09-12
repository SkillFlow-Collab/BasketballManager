import React, { useState } from 'react';
import { Radar } from 'react-chartjs-2';

const PlayerEvaluationModalContent = ({ 
  selectedPlayer, 
  playerEvaluations, 
  appRadarFilters, 
  setAppRadarFilters, 
  loadAppComparisonData 
}) => {

  const [activeTab, setActiveTab] = useState('details'); // 'details' ou 'graphique'

  // Nouveau système radar avec checkboxes
  const getRadarData = () => {
    if (!selectedPlayer || !playerEvaluations.length) return null;

    const datasets = [];
    
    // Utiliser les vrais thèmes d'évaluation 
    const REAL_EVALUATION_THEMES = ['DEXTÉRITÉ', 'AISANCE', 'PASSE', 'DEFENSE', 'REBOND', 'ATHLETE', 'TACTIQUE', 'COACHABILITE'];
    
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
    if (appRadarFilters.showInitial) {
      const initialEval = playerEvaluations.find(e => e.evaluation_type === 'initial');
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
    if (appRadarFilters.showFinal) {
      const finalEval = playerEvaluations.find(e => e.evaluation_type === 'final');
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
    if (appRadarFilters.showCDFAverage && appRadarFilters.allPlayersData) {
      const cdfData = REAL_EVALUATION_THEMES.map(themeName => {
        return appRadarFilters.allPlayersData.theme_averages[themeName] || 0;
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
    if (appRadarFilters.showPositionAverage && appRadarFilters.positionData) {
      const positionData = REAL_EVALUATION_THEMES.map(themeName => {
        return appRadarFilters.positionData.theme_averages[themeName] || 0;
      });

      datasets.push({
        label: `Moyenne ${selectedPlayer?.position || 'position'}`,
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

  // Function pour afficher les détails des sous-thèmes
  const renderThemeDetails = (evaluation, colorClass, title, borderColor) => {
    if (!evaluation || !evaluation.themes) return null;

    return (
      <div className={`bg-white p-6 rounded-xl border-l-4 ${borderColor} shadow-lg mb-6`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${title === 'Évaluation Initiale' ? 'text-green-700' : 'text-orange-700'}`}>
            {title}
          </h3>
          <div className="text-right">
            <span className="text-sm text-gray-500">
              {new Date(evaluation.evaluation_date).toLocaleDateString('fr-FR')}
            </span>
            <div className={`text-2xl font-bold ${title === 'Évaluation Initiale' ? 'text-green-600' : 'text-orange-600'}`}>
              {evaluation.overall_average}/5
            </div>
            <p className="text-xs text-gray-600">Score global</p>
          </div>
        </div>

        {/* Grille des thèmes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluation.themes.map((theme) => (
            <div key={theme.name} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-800 text-lg">{theme.name}</h4>
                <span className={`text-xl font-bold ${title === 'Évaluation Initiale' ? 'text-green-600' : 'text-orange-600'}`}>
                  {theme.average_score}/5
                </span>
              </div>
              
              {/* Détail des aspects avec barre de progression */}
              <div className="space-y-2">
                {theme.aspects.map((aspect) => (
                  <div key={aspect.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex-1">{aspect.name}</span>
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${title === 'Évaluation Initiale' ? 'bg-green-500' : 'bg-orange-500'}`}
                          style={{ width: `${(aspect.score / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-800 w-8">{aspect.score}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const initialEval = playerEvaluations.find(e => e.evaluation_type === 'initial');
  const finalEval = playerEvaluations.find(e => e.evaluation_type === 'final');

  return (
    <>
      {/* Tabs Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'details' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📋 Détails
        </button>
        <button
          onClick={() => setActiveTab('graphique')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'graphique' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📊 Graphique
        </button>
      </div>

      {/* Onglet Détails */}
      {activeTab === 'details' && (
        <div>
          {playerEvaluations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">Aucune évaluation disponible pour ce joueur</p>
              <p className="text-gray-400 text-sm mt-2">Utilisez l'onglet "Évaluations" pour créer une évaluation</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Résumé comparatif si les deux évaluations existent */}
              {initialEval && finalEval && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                  <h3 className="text-xl font-bold text-blue-800 mb-4">📈 Résumé de la progression</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{initialEval.overall_average}/5</div>
                      <p className="text-sm text-gray-600">Évaluation Initiale</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <div className={`text-2xl font-bold ${(finalEval.overall_average - initialEval.overall_average) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(finalEval.overall_average - initialEval.overall_average) >= 0 ? '+' : ''}{(finalEval.overall_average - initialEval.overall_average).toFixed(2)}
                      </div>
                      <p className="text-sm text-gray-600">Progression</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{finalEval.overall_average}/5</div>
                      <p className="text-sm text-gray-600">Évaluation Finale</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Évaluation Initiale détaillée */}
              {initialEval && renderThemeDetails(initialEval, 'border-green-500', 'Évaluation Initiale', 'border-green-500')}
              
              {/* Évaluation Finale détaillée */}
              {finalEval && renderThemeDetails(finalEval, 'border-orange-500', 'Évaluation Finale', 'border-orange-500')}

              {/* Messages si évaluations manquantes */}
              {!initialEval && (
                <div className="bg-gray-100 p-6 rounded-xl text-center">
                  <div className="text-4xl mb-2">⏳</div>
                  <h3 className="text-lg font-semibold text-gray-700">Évaluation Initiale non effectuée</h3>
                  <p className="text-gray-500 text-sm">Utilisez l'onglet "Évaluations" pour créer l'évaluation initiale</p>
                </div>
              )}
              
              {!finalEval && (
                <div className="bg-gray-100 p-6 rounded-xl text-center">
                  <div className="text-4xl mb-2">⏳</div>
                  <h3 className="text-lg font-semibold text-gray-700">Évaluation Finale non effectuée</h3>
                  <p className="text-gray-500 text-sm">Utilisez l'onglet "Évaluations" pour créer l'évaluation finale</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Onglet Graphique */}
      {activeTab === 'graphique' && (
        <div>
          {playerEvaluations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500 text-lg">Aucune évaluation disponible pour afficher le graphique</p>
              <p className="text-gray-400 text-sm mt-2">Créez au moins une évaluation pour voir le radar</p>
            </div>
          ) : (
            <>
              {/* Contrôles radar avec checkboxes */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">🎯 Données à afficher sur le radar :</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appRadarFilters.showInitial}
                      onChange={(e) => setAppRadarFilters(prev => ({ ...prev, showInitial: e.target.checked }))}
                      className="rounded text-green-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Évaluation Initiale</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appRadarFilters.showFinal}
                      onChange={(e) => setAppRadarFilters(prev => ({ ...prev, showFinal: e.target.checked }))}
                      className="rounded text-orange-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Évaluation Finale</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appRadarFilters.showCDFAverage}
                      onChange={(e) => {
                        setAppRadarFilters(prev => ({ ...prev, showCDFAverage: e.target.checked }));
                        if (e.target.checked) {
                          loadAppComparisonData('all');
                        }
                      }}
                      className="rounded text-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Moyenne CDF</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appRadarFilters.showPositionAverage}
                      onChange={(e) => {
                        setAppRadarFilters(prev => ({ ...prev, showPositionAverage: e.target.checked }));
                        if (e.target.checked && selectedPlayer?.position) {
                          loadAppComparisonData('position', selectedPlayer.position);
                        }
                      }}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Moyenne {selectedPlayer?.position || 'par poste'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                  📊 Profil Radar - {selectedPlayer?.first_name} {selectedPlayer?.last_name}
                </h3>
                <div style={{ height: '500px' }}>
                  {getRadarData() && getRadarData().datasets.length > 0 ? (
                    <Radar 
                      key={`radar-${appRadarFilters.showInitial}-${appRadarFilters.showFinal}-${appRadarFilters.showCDFAverage}-${appRadarFilters.showPositionAverage}`}
                      data={getRadarData()} 
                      options={radarOptions} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🎯</div>
                        <p className="text-gray-500">Sélectionnez au moins une donnée à afficher</p>
                        <p className="text-gray-400 text-sm mt-2">Cochez une des cases ci-dessus pour voir le radar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Pour modifier les évaluations, utilisez l'onglet "Évaluations"
        </p>
      </div>
    </>
  );
};

export default PlayerEvaluationModalContent;