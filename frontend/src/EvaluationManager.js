import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Constantes pour les évaluations
const EVALUATION_THEMES = [
  {
    name: 'ADRESSE',
    aspects: [
      'Gestuelle et arc',
      'Équilibre',
      'Lâcher',
      'Proche du cercle',
      '2 points',
      '3 points',
      'Catch & shoot',
      'Tir après dribble'
    ]
  },
  {
    name: 'AISANCE',
    aspects: [
      'Contrôle',
      'Mobilité du regard',
      'Main forte',
      'Main faible',
      'Sous pression',
      'Rythme',
      'Dribble utile'
    ]
  },
  {
    name: 'PASSE',
    aspects: [
      'Timing',
      'Force',
      'Précision',
      '2 mains',
      '1 main',
      'Diversité'
    ]
  },
  {
    name: 'DEFENSE',
    aspects: [
      'Position',
      'Transition',
      'Duel',
      'NPB Placement',
      'NPB Aide',
      'Close out',
      'Dureté'
    ]
  },
  {
    name: 'REBOND',
    aspects: [
      'Anticipation',
      'Placement',
      'Contact',
      'Agressivité',
      'Box out',
      'Protège la balle'
    ]
  },
  {
    name: 'ATHLETE',
    aspects: [
      'Vitesse',
      'Latéralité',
      'Endurance',
      'Coordination',
      'Détente',
      'Réactivité',
      'Puissance'
    ]
  },
  {
    name: 'TACTIQUE',
    aspects: [
      'QI basket',
      'Jeu d\'équipe',
      'Vision',
      'Anticipation'
    ]
  },
  {
    name: 'COACHABILITE',
    aspects: [
      'Attitude',
      'Accepte la critique',
      'Concentration',
      'Leadership',
      'Travailleur'
    ]
  }
];

const EvaluationManager = () => {
  const [players, setPlayers] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [evaluationData, setEvaluationData] = useState({});
  const [isInitialEvaluation, setIsInitialEvaluation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs:', error);
    }
  };

  const loadExistingEvaluations = async (theme) => {
    setLoading(true);
    try {
      const evaluations = {};
      
      // Charger les évaluations existantes pour tous les joueurs pour ce thème
      for (const player of players) {
        try {
          const response = await axios.get(`${API}/evaluations/player/${player.id}/latest`);
          const playerEvaluation = response.data;
          
          // Trouver le thème dans l'évaluation
          const themeData = playerEvaluation.themes?.find(t => t.name === theme.name);
          if (themeData) {
            evaluations[player.id] = themeData.aspects.reduce((acc, aspect) => {
              acc[aspect.name] = aspect.score;
              return acc;
            }, {});
          } else {
            // Initialiser avec des valeurs par défaut si pas d'évaluation
            evaluations[player.id] = theme.aspects.reduce((acc, aspect) => {
              acc[aspect] = 3;
              return acc;
            }, {});
          }
        } catch (error) {
          // Pas d'évaluation existante, initialiser avec des valeurs par défaut
          evaluations[player.id] = theme.aspects.reduce((acc, aspect) => {
            acc[aspect] = 3;
            return acc;
          }, {});
        }
      }
      
      setEvaluationData(evaluations);
    } catch (error) {
      console.error('Erreur lors du chargement des évaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = (theme) => {
    setSelectedTheme(theme);
    loadExistingEvaluations(theme);
  };

  const handleScoreChange = (playerId, aspect, score) => {
    setEvaluationData(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [aspect]: parseInt(score)
      }
    }));
  };

  const calculateThemeAverage = (playerId) => {
    if (!evaluationData[playerId] || !selectedTheme) return 0;
    
    const scores = selectedTheme.aspects.map(aspect => evaluationData[playerId][aspect] || 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    return (sum / scores.length).toFixed(1);
  };

  const saveEvaluations = async () => {
    if (!selectedTheme || Object.keys(evaluationData).length === 0) return;
    
    setLoading(true);
    try {
      // Au lieu de créer une évaluation par joueur avec un seul thème,
      // on va mettre à jour ou créer une évaluation complète avec ce thème
      
      const savePromises = players.map(async (player) => {
        if (!evaluationData[player.id]) return;
        
        try {
          // D'abord, récupérer l'évaluation existante de ce type pour ce joueur
          let existingEvaluation = null;
          try {
            const response = await axios.get(`${API}/evaluations/player/${player.id}`);
            const playerEvaluations = response.data;
            existingEvaluation = playerEvaluations.find(e => e.evaluation_type === (isInitialEvaluation ? 'initial' : 'final'));
          } catch (error) {
            // Pas d'évaluation existante, on va en créer une nouvelle
          }
          
          let allThemes = [];
          
          if (existingEvaluation && existingEvaluation.themes) {
            // Commencer avec les thèmes existants
            allThemes = [...existingEvaluation.themes];
            
            // Remplacer ou ajouter le thème actuel
            const themeIndex = allThemes.findIndex(t => t.name === selectedTheme.name);
            
            const newThemeData = {
              name: selectedTheme.name,
              aspects: selectedTheme.aspects.map(aspect => ({
                name: aspect,
                score: evaluationData[player.id][aspect] || 3
              }))
            };
            
            if (themeIndex >= 0) {
              // Remplacer le thème existant
              allThemes[themeIndex] = newThemeData;
            } else {
              // Ajouter le nouveau thème
              allThemes.push(newThemeData);
            }
          } else {
            // Nouvelle évaluation, commencer avec juste ce thème
            allThemes = [{
              name: selectedTheme.name,
              aspects: selectedTheme.aspects.map(aspect => ({
                name: aspect,
                score: evaluationData[player.id][aspect] || 3
              }))
            }];
          }
          
          // Créer l'évaluation complète avec tous les thèmes
          const evaluationPayload = {
            player_id: player.id,
            themes: allThemes,
            notes: `Évaluation ${isInitialEvaluation ? 'initiale' : 'finale'} - Mise à jour du thème ${selectedTheme.name}`,
            evaluation_type: isInitialEvaluation ? 'initial' : 'final'
          };
          
          return axios.post(`${API}/evaluations`, evaluationPayload);
          
        } catch (error) {
          console.error(`Erreur pour le joueur ${player.first_name} ${player.last_name}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(savePromises);
      const successCount = results.filter(r => r && r.status === 200).length;
      
      setConfirmationMessage(`✅ Évaluations sauvegardées pour le thème ${selectedTheme.name} (${successCount}/${players.length} joueurs)`);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setConfirmationMessage('❌ Erreur lors de la sauvegarde');
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score <= 2) return 'bg-red-100 border-red-300 text-red-800';
    if (score === 3) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (score === 4) return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const showMessage = (message) => {
    setConfirmationMessage(message);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="fixed top-4 right-4 bg-white border-l-4 border-green-500 px-6 py-4 rounded-lg shadow-lg z-50 fade-in">
          <p className="text-gray-800">{confirmationMessage}</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Évaluations par Thème</h1>
        
        {/* Type d'évaluation */}
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setIsInitialEvaluation(true)}
              className={`sub-nav-button ${
                isInitialEvaluation 
                  ? 'sub-nav-button-active' 
                  : 'sub-nav-button-inactive'
              }`}
            >
              Évaluation Initiale
            </button>
            <button
              onClick={() => setIsInitialEvaluation(false)}
              className={`sub-nav-button ${
                !isInitialEvaluation 
                  ? 'sub-nav-button-active' 
                  : 'sub-nav-button-inactive'
              }`}
            >
              Évaluation Finale
            </button>
          </div>
        </div>
      </div>

      {/* Sélection du thème */}
      {!selectedTheme ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {EVALUATION_THEMES.map((theme) => (
            <div
              key={theme.name}
              onClick={() => handleThemeSelect(theme)}
              className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                {theme.name}
              </h3>
              <div className="space-y-2">
                {theme.aspects.map((aspect, index) => (
                  <div key={index} className="text-sm text-gray-600 text-center">
                    • {aspect}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <div className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
                  {theme.aspects.length} critères
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* Header avec retour */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setSelectedTheme(null);
                  setEvaluationData({});
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl transition-colors"
              >
                ← Retour aux thèmes
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                Évaluation: {selectedTheme.name}
              </h2>
            </div>
            
            <button
              onClick={saveEvaluations}
              disabled={loading || Object.keys(evaluationData).length === 0}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-xl transition-colors font-medium"
            >
              {loading ? 'Sauvegarde...' : 'Sauvegarder toutes les évaluations'}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Instructions:</strong> Évaluez chaque aspect du thème "{selectedTheme.name}" pour tous les joueurs. 
              Note de 1 (très faible) à 5 (excellent). La moyenne du thème sera calculée automatiquement.
            </p>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
              <span className="ml-3 text-gray-600">Chargement des évaluations...</span>
            </div>
          )}

          {/* Tableau d'évaluation */}
          {!loading && Object.keys(evaluationData).length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-800 min-w-[150px]">
                        Joueur
                      </th>
                      {selectedTheme.aspects.map((aspect) => (
                        <th key={aspect} className="text-center p-4 font-semibold text-gray-800 min-w-[120px]">
                          {aspect}
                        </th>
                      ))}
                      <th className="text-center p-4 font-semibold text-gray-800 min-w-[100px]">
                        Moyenne
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            {player.photo && (
                              <img 
                                src={player.photo} 
                                alt={player.first_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium text-gray-800">
                                {player.first_name} {player.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {player.position}
                              </div>
                            </div>
                          </div>
                        </td>
                        {selectedTheme.aspects.map((aspect) => (
                          <td key={aspect} className="p-4 text-center">
                            <select
                              value={evaluationData[player.id]?.[aspect] || 3}
                              onChange={(e) => handleScoreChange(player.id, aspect, e.target.value)}
                              className={`w-16 p-2 border-2 rounded-lg text-center font-medium ${
                                getScoreColor(evaluationData[player.id]?.[aspect] || 3)
                              }`}
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={5}>5</option>
                            </select>
                          </td>
                        ))}
                        <td className="p-4 text-center">
                          <div className={`inline-block px-3 py-1 rounded-full font-bold ${
                            getScoreColor(Math.round(calculateThemeAverage(player.id)))
                          }`}>
                            {calculateThemeAverage(player.id)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Légende des scores */}
          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Légende des scores</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded"></div>
                <span className="text-sm">1-2: À améliorer</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
                <span className="text-sm">3: Correct</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 border-2 border-blue-300 rounded"></div>
                <span className="text-sm">4: Bien</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded"></div>
                <span className="text-sm">5: Excellent</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationManager;