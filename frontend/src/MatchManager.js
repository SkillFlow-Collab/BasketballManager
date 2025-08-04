import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TEAM_TYPES = ['U18', 'U21'];

const MatchManager = () => {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchParticipations, setMatchParticipations] = useState([]);
  const [playTimeInputs, setPlayTimeInputs] = useState({}); // Local state for play time inputs
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const [matchFormData, setMatchFormData] = useState({
    team: 'U18',
    opponent: '',
    match_date: '',
    match_time: '15:00',
    location: '',
    is_home: true,
    competition: '',
    coach: '',
    notes: '',
    final_score_us: '',
    final_score_opponent: ''
  });

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  useEffect(() => {
    fetchPlayers();
    fetchMatches();
  }, [selectedMonth, selectedYear]);

  // Debounce play time updates
  useEffect(() => {
    const timeouts = {};
    
    Object.keys(playTimeInputs).forEach(playerId => {
      timeouts[playerId] = setTimeout(() => {
        if (selectedMatch && playTimeInputs[playerId] !== undefined) {
          handleParticipationChange(playerId, 'play_time', playTimeInputs[playerId]);
        }
      }, 1000); // 1 second debounce
    });

    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [playTimeInputs, selectedMatch]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const params = new URLSearchParams();
      params.append('month', selectedMonth + 1);
      params.append('year', selectedYear);

      const response = await axios.get(`${API}/matches?${params}`);
      setMatches(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des matchs:', error);
    }
  };

  const fetchMatchParticipations = async (matchId) => {
    try {
      const response = await axios.get(`${API}/match-participations/match/${matchId}`);
      setMatchParticipations(response.data);
      
      // Initialize play time inputs
      const initialPlayTimeInputs = {};
      response.data.forEach(mp => {
        if (mp.participation.play_time !== null) {
          initialPlayTimeInputs[mp.player.id] = mp.participation.play_time;
        }
      });
      setPlayTimeInputs(initialPlayTimeInputs);
    } catch (error) {
      console.error('Erreur lors du chargement des participations:', error);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const matchData = { ...matchFormData };
      
      // Convert empty strings to null for optional numeric fields
      if (matchData.final_score_us === '') matchData.final_score_us = null;
      if (matchData.final_score_opponent === '') matchData.final_score_opponent = null;
      else {
        matchData.final_score_us = parseInt(matchData.final_score_us);
        matchData.final_score_opponent = parseInt(matchData.final_score_opponent);
      }

      let response;
      if (editingMatch) {
        response = await axios.put(`${API}/matches/${editingMatch.id}`, matchData);
        showMessage('✅ Match modifié avec succès !');
      } else {
        response = await axios.post(`${API}/matches`, matchData);
        showMessage('✅ Match créé avec succès !');
      }

      setShowMatchForm(false);
      setEditingMatch(null);
      fetchMatches();
      
      // Reset form
      setMatchFormData({
        team: 'U18',
        opponent: '',
        match_date: '',
        match_time: '15:00',
        location: '',
        is_home: true,
        competition: '',
        coach: '',
        notes: '',
        final_score_us: '',
        final_score_opponent: ''
      });

    } catch (error) {
      console.error('Erreur lors de la sauvegarde du match:', error);
      showMessage('❌ Erreur lors de la sauvegarde du match');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMatch = (match) => {
    setEditingMatch(match);
    setMatchFormData({
      team: match.team,
      opponent: match.opponent,
      match_date: match.match_date,
      match_time: match.match_time,
      location: match.location,
      is_home: match.is_home,
      competition: match.competition || '',
      coach: match.coach || '',
      notes: match.notes || '',
      final_score_us: match.final_score_us || '',
      final_score_opponent: match.final_score_opponent || ''
    });
    setShowMatchForm(true);
  };

  const handleDeleteMatch = async (matchId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
      try {
        await axios.delete(`${API}/matches/${matchId}`);
        showMessage('✅ Match supprimé avec succès !');
        fetchMatches();
        setSelectedMatch(null);
      } catch (error) {
        console.error('Erreur lors de la suppression du match:', error);
        showMessage('❌ Erreur lors de la suppression du match');
      }
    }
  };

  const handleParticipationChange = async (playerId, field, value) => {
    try {
      // Find existing participation or create new one
      const existingParticipation = matchParticipations.find(
        mp => mp.player.id === playerId
      );

      const participationData = {
        match_id: selectedMatch.id,
        player_id: playerId,
        is_present: field === 'is_present' ? value : (existingParticipation?.participation.is_present || false),
        is_starter: field === 'is_starter' ? value : (existingParticipation?.participation.is_starter || false),
        play_time: field === 'play_time' ? (value || null) : (existingParticipation?.participation.play_time || null)
      };

      if (existingParticipation) {
        // Update existing participation
        await axios.put(`${API}/match-participations/${existingParticipation.participation.id}`, {
          [field]: value
        });
      } else {
        // Create new participation
        await axios.post(`${API}/match-participations`, participationData);
      }

      // Refresh participations
      fetchMatchParticipations(selectedMatch.id);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la participation:', error);
    }
  };

  const showMessage = (message) => {
    setConfirmationMessage(message);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  const getTeamColor = (team) => {
    switch (team) {
      case 'U18': return 'bg-blue-500';
      case 'U21': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="fixed top-4 right-4 bg-white border-l-4 border-green-500 px-6 py-4 rounded-lg shadow-lg z-50 fade-in">
          <p className="text-gray-800">{confirmationMessage}</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestion des Matchs</h1>
        <button
          onClick={() => setShowMatchForm(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors"
        >
          ➕ Nouveau Match
        </button>
      </div>

      {/* Month/Year Navigation */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear(selectedYear - 1);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors"
          >
            ← Mois précédent
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800">
            {monthNames[selectedMonth]} {selectedYear}
          </h2>
          
          <button
            onClick={() => {
              if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(selectedYear + 1);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors"
          >
            Mois suivant →
          </button>
        </div>
      </div>

      {/* Matches List */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Matchs de {monthNames[selectedMonth]} {selectedYear}
        </h3>
        
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🏀</div>
            <p className="text-gray-600 mb-4">Aucun match programmé ce mois</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(match => (
              <div 
                key={match.id} 
                className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setSelectedMatch(match);
                  setPlayTimeInputs({}); // Reset play time inputs
                  fetchMatchParticipations(match.id);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className={`${getTeamColor(match.team)} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                      {match.team}
                    </span>
                    <span className="font-medium text-gray-800">
                      vs {match.opponent}
                    </span>
                    {match.is_home ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Domicile</span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Extérieur</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditMatch(match);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors text-sm font-medium"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMatch(match.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors text-sm font-medium"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Date:</strong> {new Date(match.match_date).toLocaleDateString('fr-FR')} à {match.match_time}</p>
                  <p><strong>Lieu:</strong> {match.location}</p>
                  {match.competition && <p><strong>Compétition:</strong> {match.competition}</p>}
                  {match.coach && <p><strong>Coach:</strong> {match.coach}</p>}
                  {(match.final_score_us !== null && match.final_score_opponent !== null) && (
                    <p><strong>Score:</strong> {match.final_score_us} - {match.final_score_opponent}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Details and Participations */}
      {selectedMatch && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              Participations - {selectedMatch.team} vs {selectedMatch.opponent}
            </h3>
            <button
              onClick={() => {
                setSelectedMatch(null);
                setPlayTimeInputs({}); // Reset play time inputs
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Fermer
            </button>
          </div>

          <div className="space-y-4">
            {players
              .filter(player => {
                // Filter players based on match team (you might want to add a team field to players)
                return true; // For now, show all players
              })
              .map(player => {
                const participation = matchParticipations.find(mp => mp.player.id === player.id);
                const isPresent = participation?.participation.is_present || false;
                const isStarter = participation?.participation.is_starter || false;
                const playTime = playTimeInputs[player.id] !== undefined ? playTimeInputs[player.id] : (participation?.participation.play_time || '');

                return (
                  <div key={player.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="font-medium text-gray-800">
                          {player.first_name} {player.last_name}
                        </div>
                        <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {player.position}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        {/* Présent - Simple Toggle Button */}
                        <div className="flex flex-col items-center space-y-1">
                          <button
                            onClick={() => handleParticipationChange(player.id, 'is_present', !isPresent)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              isPresent 
                                ? 'bg-green-500 text-white shadow-md' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {isPresent ? '✓ Présent' : '✗ Absent'}
                          </button>
                        </div>

                        {/* 5 de départ - Simple Toggle Button */}
                        <div className="flex flex-col items-center space-y-1">
                          <button
                            disabled={!isPresent}
                            onClick={() => {
                              if (isPresent) {
                                handleParticipationChange(player.id, 'is_starter', !isStarter);
                              }
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              !isPresent 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : isStarter 
                                  ? 'bg-purple-500 text-white shadow-md' 
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {isStarter ? '★ Titulaire' : '○ Remplaçant'}
                          </button>
                        </div>

                        {/* Temps de jeu */}
                        <div className="flex flex-col items-center space-y-1">
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              max="60"
                              placeholder="0"
                              value={playTime}
                              disabled={!isPresent}
                              onChange={(e) => {
                                const value = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                setPlayTimeInputs(prev => ({
                                  ...prev,
                                  [player.id]: value
                                }));
                              }}
                              className={`w-16 h-10 p-2 border rounded-lg text-center font-medium ${
                                !isPresent 
                                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                                  : 'bg-white border-gray-300 text-gray-800 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                              }`}
                            />
                            <span className="ml-2 text-sm text-gray-500">min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Match Form Modal */}
      {showMatchForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingMatch ? 'Modifier le match' : 'Nouveau match'}
              </h3>
              <button
                onClick={() => {
                  setShowMatchForm(false);
                  setEditingMatch(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Équipe</label>
                  <select
                    value={matchFormData.team}
                    onChange={(e) => setMatchFormData({...matchFormData, team: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {TEAM_TYPES.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adversaire</label>
                  <input
                    type="text"
                    value={matchFormData.opponent}
                    onChange={(e) => setMatchFormData({...matchFormData, opponent: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom de l'équipe adverse"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={matchFormData.match_date}
                    onChange={(e) => setMatchFormData({...matchFormData, match_date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                  <input
                    type="time"
                    value={matchFormData.match_time}
                    onChange={(e) => setMatchFormData({...matchFormData, match_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lieu</label>
                  <input
                    type="text"
                    value={matchFormData.location}
                    onChange={(e) => setMatchFormData({...matchFormData, location: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Gymnase ou salle"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domicile/Extérieur</label>
                  <select
                    value={matchFormData.is_home}
                    onChange={(e) => setMatchFormData({...matchFormData, is_home: e.target.value === 'true'})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={true}>Domicile</option>
                    <option value={false}>Extérieur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Compétition (optionnel)</label>
                  <input
                    type="text"
                    value={matchFormData.competition}
                    onChange={(e) => setMatchFormData({...matchFormData, competition: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Championnat, Coupe..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coach responsable</label>
                  <input
                    type="text"
                    value={matchFormData.coach}
                    onChange={(e) => setMatchFormData({...matchFormData, coach: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom du coach"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Score nous (optionnel)</label>
                  <input
                    type="number"
                    min="0"
                    value={matchFormData.final_score_us}
                    onChange={(e) => setMatchFormData({...matchFormData, final_score_us: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Points marqués"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Score adversaire (optionnel)</label>
                  <input
                    type="number"
                    min="0"
                    value={matchFormData.final_score_opponent}
                    onChange={(e) => setMatchFormData({...matchFormData, final_score_opponent: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Points encaissés"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                <textarea
                  value={matchFormData.notes}
                  onChange={(e) => setMatchFormData({...matchFormData, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Sauvegarde...' : (editingMatch ? 'Modifier le match' : 'Créer le match')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMatchForm(false);
                    setEditingMatch(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-3 rounded-xl transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManager;