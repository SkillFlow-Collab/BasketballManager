import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SESSION_TYPES = ['U18', 'U21', 'CDF', 'Musculation'];

const ATTENDANCE_STATUS = {
  present: { icon: '✅', label: 'Présent', color: 'bg-green-100 text-green-800 border-green-300' },
  absent: { icon: '❌', label: 'Absent', color: 'bg-red-100 text-red-800 border-red-300' },
  injured: { icon: '⚠️', label: 'Blessé', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  off: { icon: '🏖️', label: 'OFF', color: 'bg-blue-100 text-blue-800 border-blue-300' }
};

const AttendanceManager = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [collectiveSessions, setCollectiveSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionAttendances, setSessionAttendances] = useState([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingSessionDetails, setEditingSessionDetails] = useState(false);
  const [newSessionAttendances, setNewSessionAttendances] = useState({});
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const [sessionFormData, setSessionFormData] = useState({
    session_type: 'U18',
    session_date: '',
    session_time: '19:00',
    location: 'Gymnase Gaston Neveur',
    coach: '',
    notes: ''
  });

  useEffect(() => {
    fetchPlayers();
    fetchCollectiveSessions();
  }, [selectedMonth, selectedYear]);

  // Initialize default attendances when players are loaded and we're creating a new session
  useEffect(() => {
    if (!editingSession && showSessionForm && players.length > 0) {
      const defaultAttendances = {};
      players.forEach(player => {
        defaultAttendances[player.id] = 'present';
      });
      setNewSessionAttendances(defaultAttendances);
    }
  }, [players, showSessionForm, editingSession]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs:', error);
    }
  };

  const fetchCollectiveSessions = async () => {
    try {
      const params = new URLSearchParams();
      params.append('month', selectedMonth + 1); // Month is 0-indexed
      params.append('year', selectedYear);

      const response = await axios.get(`${API}/collective-sessions?${params}`);
      setCollectiveSessions(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des séances:', error);
    }
  };

  const fetchSessionAttendances = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/attendances/session/${sessionId}`);
      setSessionAttendances(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des présences:', error);
    }
  };

  const handleUpdateSessionDetails = async (updatedData) => {
    try {
      const response = await axios.put(`${API}/collective-sessions/${selectedSession.id}`, updatedData);
      const updatedSession = response.data;
      
      setSelectedSession(updatedSession);
      setEditingSessionDetails(false);
      showMessage('✅ Détails de la séance mis à jour !');
      fetchCollectiveSessions();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      showMessage('❌ Erreur lors de la mise à jour de la séance');
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      let sessionResponse;
      
      if (editingSession) {
        // Update existing session
        sessionResponse = await axios.put(`${API}/collective-sessions/${editingSession.id}`, sessionFormData);
      } else {
        // Create new session
        sessionResponse = await axios.post(`${API}/collective-sessions`, sessionFormData);
      }
      
      const session = sessionResponse.data;
      
      // Then create/update attendances for all players with their status
      const attendancePromises = Object.entries(newSessionAttendances).map(([playerId, status]) => {
        return axios.post(`${API}/attendances`, {
          collective_session_id: session.id,
          player_id: playerId,
          status: status
        });
      });
      
      await Promise.all(attendancePromises);
      
      setShowSessionForm(false);
      setEditingSession(null);
      setSessionFormData({
        session_type: 'U18',
        session_date: '',
        session_time: '19:00',
        location: 'Gymnase Gaston Neveur',
        coach: '',
        notes: ''
      });
      setNewSessionAttendances({});
      
      const message = editingSession ? '✅ Séance modifiée avec succès !' : '✅ Séance créée avec les présences !';
      showMessage(message);
      fetchCollectiveSessions();
      
      // If we were editing a session, refresh its attendances
      if (editingSession) {
        setSelectedSession(session);
        fetchSessionAttendances(session.id);
      }
    } catch (error) {
      console.error('Erreur lors de la création/modification:', error);
      const message = editingSession ? '❌ Erreur lors de la modification de la séance' : '❌ Erreur lors de la création de la séance';
      showMessage(message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Supprimer cette séance et toutes les présences associées ?')) {
      try {
        await axios.delete(`${API}/collective-sessions/${sessionId}`);
        showMessage('🗑️ Séance supprimée');
        fetchCollectiveSessions();
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
          setSessionAttendances([]);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleAttendanceChange = async (playerId, status) => {
    try {
      await axios.post(`${API}/attendances`, {
        collective_session_id: selectedSession.id,
        player_id: playerId,
        status: status
      });
      
      fetchSessionAttendances(selectedSession.id);
      showMessage(`✅ Présence mise à jour pour ${getPlayerName(playerId)}`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const showMessage = (message) => {
    setConfirmationMessage(message);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.first_name} ${player.last_name}` : '';
  };

  const getPlayerAttendanceStatus = (playerId) => {
    const attendance = sessionAttendances.find(att => att.player_id === playerId);
    return attendance ? attendance.status : null;
  };

  const handleNewSessionAttendanceChange = (playerId, status) => {
    setNewSessionAttendances(prev => ({
      ...prev,
      [playerId]: status
    }));
  };

  const getNewSessionAttendanceStatus = (playerId) => {
    return newSessionAttendances[playerId] || 'present'; // Default to present
  };

  const getSessionTypeColor = (type) => {
    const colors = {
      'U18': 'bg-blue-500 border-blue-600',
      'U21': 'bg-green-500 border-green-600', 
      'CDF': 'bg-purple-500 border-purple-600',
      'Musculation': 'bg-orange-500 border-orange-600'
    };
    return colors[type] || 'bg-gray-500 border-gray-600';
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Calendar helper functions
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const getSessionsForDate = (date) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return collectiveSessions.filter(session => session.session_date === dateStr);
  };

  const selectDate = (date) => {
    setSelectedDate(date);
    
    // Always auto-open modal for new session creation when clicking on calendar cell
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    setSessionFormData(prev => ({ ...prev, session_date: dateStr }));
    setEditingSession(null);
    setShowSessionForm(true);
    setSelectedSession(null);
    setSessionAttendances([]);
    // Reset attendance to all present for new session
    const defaultAttendances = {};
    players.forEach(player => {
      defaultAttendances[player.id] = 'present';
    });
    setNewSessionAttendances(defaultAttendances);
  };

  const selectSession = (session, event) => {
    // Stop propagation to prevent triggering selectDate
    event.stopPropagation();
    setSelectedDate(new Date(session.session_date).getDate());
    setSelectedSession(session);
    fetchSessionAttendances(session.id);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }

    // Days of the current month
    for (let date = 1; date <= daysInMonth; date++) {
      const sessions = getSessionsForDate(date);
      const isSelected = selectedDate === date;
      const isToday = new Date().getDate() === date && 
                     new Date().getMonth() === selectedMonth && 
                     new Date().getFullYear() === selectedYear;

      days.push(
        <div
          key={date}
          onClick={() => selectDate(date)}
          className={`h-24 border border-gray-200 cursor-pointer transition-all hover:bg-blue-50 p-1 ${
            isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          } ${isToday ? 'bg-yellow-50' : ''}`}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {date}
          </div>
          <div className="mt-1 space-y-1">
            {sessions.map((session, index) => (
              <div
                key={session.id}
                className={`text-xs px-1 py-0.5 rounded text-white ${getSessionTypeColor(session.session_type)} truncate cursor-pointer hover:opacity-80`}
                title={`${session.session_type} - ${session.session_time}`}
                onClick={(e) => selectSession(session, e)}
              >
                {session.session_type}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const getAttendanceStats = () => {
    if (!sessionAttendances.length) return null;
    
    const stats = {
      present: sessionAttendances.filter(a => a.status === 'present').length,
      absent: sessionAttendances.filter(a => a.status === 'absent').length,
      injured: sessionAttendances.filter(a => a.status === 'injured').length,
      off: sessionAttendances.filter(a => a.status === 'off').length,
      total: sessionAttendances.length
    };
    
    return stats;
  };

  // Component for editing session details inline
  const SessionDetailsEditor = ({ session, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      session_type: session.session_type,
      session_date: session.session_date,
      session_time: session.session_time,
      location: session.location || '',
      coach: session.coach || '',
      notes: session.notes || ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="p-4 bg-blue-50 rounded-xl mb-6">
        <h4 className="text-lg font-semibold text-blue-800 mb-4">Modifier les détails de la séance</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">Type de séance</label>
            <select
              value={formData.session_type}
              onChange={(e) => setFormData({...formData, session_type: e.target.value})}
              className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {SESSION_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">Date</label>
            <input
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({...formData, session_date: e.target.value})}
              className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">Heure</label>
            <input
              type="time"
              value={formData.session_time}
              onChange={(e) => setFormData({...formData, session_time: e.target.value})}
              className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">Coach responsable</label>
            <input
              type="text"
              value={formData.coach}
              onChange={(e) => setFormData({...formData, coach: e.target.value})}
              className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom du coach"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-blue-700 mb-2">Lieu</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Gymnase Gaston Neveur..."
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-blue-700 mb-2">Notes (optionnel)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full p-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="2"
            placeholder="Informations complémentaires..."
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors font-medium"
          >
            💾 Sauvegarder les modifications
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-xl transition-colors font-medium"
          >
            Annuler
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="fixed top-4 right-4 bg-white border-l-4 border-green-500 px-6 py-4 rounded-lg shadow-lg z-50 fade-in">
          <p className="text-gray-800">{confirmationMessage}</p>
        </div>
      )}

      {/* Single Tab - Only Calendar */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-2 rounded-2xl">
          <div className="bg-white text-blue-600 shadow-md px-8 py-4 rounded-xl">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">📅</span>
              <span className="font-medium text-lg">Calendrier des Séances Collectives</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content - Always Visible */}
      <>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Calendrier des Séances Collectives</h1>
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

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Légende des types de séances</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SESSION_TYPES.map(type => (
              <div key={type} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded ${getSessionTypeColor(type)}`}></div>
                <span className="text-sm text-gray-700">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Session Details and Attendance when a session is selected */}
        {selectedSession && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                Détails de la séance - {new Date(selectedSession.session_date).toLocaleDateString('fr-FR')}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingSessionDetails(!editingSessionDetails)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  {editingSessionDetails ? '❌ Annuler' : '✏️ Modifier'}
                </button>
                <button
                  onClick={() => handleDeleteSession(selectedSession.id)}
                  className="text-red-500 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
            
            {/* Session Info - Editable */}
            {editingSessionDetails ? (
              <SessionDetailsEditor 
                session={selectedSession}
                onSave={handleUpdateSessionDetails}
                onCancel={() => setEditingSessionDetails(false)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <span className={`${getSessionTypeColor(selectedSession.session_type)} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                    {selectedSession.session_type}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Heure:</span>
                  <p className="font-medium">{selectedSession.session_time}</p>
                </div>
                {selectedSession.location && (
                  <div>
                    <span className="text-sm text-gray-600">Lieu:</span>
                    <p className="font-medium">{selectedSession.location}</p>
                  </div>
                )}
                {selectedSession.coach && (
                  <div>
                    <span className="text-sm text-gray-600">Coach:</span>
                    <p className="font-medium">{selectedSession.coach}</p>
                  </div>
                )}
              </div>
            )}

            {selectedSession.notes && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                <span className="text-sm text-blue-600 font-medium">Notes:</span>
                <p className="text-blue-800">{selectedSession.notes}</p>
              </div>
            )}

            {/* Quick Stats */}
            {(() => {
              const stats = getAttendanceStats();
              return stats && (
                <div className="mb-6 grid grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl">✅</div>
                    <div className="text-lg font-bold text-green-800">{stats.present}</div>
                    <div className="text-sm text-green-700">Présents</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl">❌</div>
                    <div className="text-lg font-bold text-red-800">{stats.absent}</div>
                    <div className="text-sm text-red-700">Absents</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl">⚠️</div>
                    <div className="text-lg font-bold text-yellow-800">{stats.injured}</div>
                    <div className="text-sm text-yellow-700">Blessés</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl">🏖️</div>
                    <div className="text-lg font-bold text-blue-800">{stats.off}</div>
                    <div className="text-sm text-blue-700">OFF</div>
                  </div>
                </div>
              );
            })()}

            {/* Players List with Attendance */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">État des joueurs</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map((player) => {
                  const currentStatus = getPlayerAttendanceStatus(player.id);
                  return (
                    <div key={player.id} className={`p-4 border-2 rounded-xl transition-all ${
                      currentStatus ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {player.first_name[0]}{player.last_name[0]}
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">
                              {player.first_name} {player.last_name}
                            </span>
                            <p className="text-sm text-gray-500">{player.position}</p>
                          </div>
                        </div>
                        {currentStatus && (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${ATTENDANCE_STATUS[currentStatus].color} border-2`}>
                            {ATTENDANCE_STATUS[currentStatus].icon} {ATTENDANCE_STATUS[currentStatus].label}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(ATTENDANCE_STATUS).map(([status, config]) => (
                          <button
                            key={status}
                            onClick={() => handleAttendanceChange(player.id, status)}
                            className={`attendance-button p-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
                              currentStatus === status ? 'selected' : ''
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-xl mb-1">{config.icon}</div>
                              <div className="text-xs">{config.label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Date selection no longer shows a separate section - form opens directly */}
      </>

      {/* Session Form Modal with Attendance */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingSession ? 'Modifier la séance' : 'Programmer une nouvelle séance'}
            </h2>
            
            <form onSubmit={handleCreateSession} className="space-y-6">
              {/* Session Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type de séance</label>
                  <select
                    value={sessionFormData.session_type}
                    onChange={(e) => setSessionFormData({...sessionFormData, session_type: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {SESSION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={sessionFormData.session_date}
                    onChange={(e) => setSessionFormData({...sessionFormData, session_date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                  <input
                    type="time"
                    value={sessionFormData.session_time}
                    onChange={(e) => setSessionFormData({...sessionFormData, session_time: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coach responsable</label>
                  <input
                    type="text"
                    value={sessionFormData.coach}
                    onChange={(e) => setSessionFormData({...sessionFormData, coach: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom du coach"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lieu</label>
                <input
                  type="text"
                  value={sessionFormData.location}
                  onChange={(e) => setSessionFormData({...sessionFormData, location: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Gymnase Gaston Neveur..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                <textarea
                  value={sessionFormData.notes}
                  onChange={(e) => setSessionFormData({...sessionFormData, notes: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Informations complémentaires..."
                />
              </div>

              {/* Attendance Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Marquer les présences directement</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tous les joueurs sont marqués présents par défaut. Modifiez le statut si nécessaire :
                </p>
                
                {/* Quick Legend */}
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    {Object.entries(ATTENDANCE_STATUS).map(([status, config]) => (
                      <div key={status} className="flex items-center space-x-1">
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Players Attendance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {players.map((player) => {
                    const currentStatus = getNewSessionAttendanceStatus(player.id);
                    return (
                      <div key={player.id} className="border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {player.first_name[0]}{player.last_name[0]}
                            </div>
                            <div>
                              <span className="font-medium text-sm">{player.first_name} {player.last_name}</span>
                              <p className="text-xs text-gray-500">{player.position}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ATTENDANCE_STATUS[currentStatus].color}`}>
                            {ATTENDANCE_STATUS[currentStatus].icon}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-1">
                          {Object.entries(ATTENDANCE_STATUS).map(([status, config]) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleNewSessionAttendanceChange(player.id, status)}
                              className={`attendance-button p-2 rounded-lg text-xs transition-all ${
                                currentStatus === status ? 'selected scale-105' : ''
                              }`}
                            >
                              <div className="text-center">
                                <div className="text-sm mb-0.5">{config.icon}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl transition-colors font-medium"
                >
                  {editingSession ? 'Modifier la séance et sauvegarder les présences' : 'Créer la séance et enregistrer les présences'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionForm(false);
                    setEditingSession(null);
                    setSessionFormData({
                      session_type: 'U18',
                      session_date: '',
                      session_time: '19:00',
                      location: 'Gymnase Gaston Neveur',
                      coach: '',
                      notes: ''
                    });
                    setNewSessionAttendances({});
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-xl transition-colors font-medium"
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

export default AttendanceManager;
