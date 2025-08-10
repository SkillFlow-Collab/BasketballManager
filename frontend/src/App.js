import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import axios from "axios";
import EvaluationModal from "./EvaluationModal";
import ReportsWithEvaluation from "./ReportsWithEvaluation";
import AttendanceManager from "./AttendanceManager";
import CollectifManager from "./CollectifManager";
import EvaluationManager from "./EvaluationManager";
import { exportDashboard } from "./PdfExportUtils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Radar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';




ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Constantes pour les thèmes et entraîneurs
const THEMES = [
  'Physique',
  'Défense porteur',
  'Défense non-porteur',
  'Rebond',
  'Près du cercle',
  'Adresse',
  'Passe',
  'Vidéo',
  'Tir extérieur',
  'Finitions',
  'Écran et lecture',
  '1v1'
];

const ENTRAINEURS = [
  'Loan',
  'J-E',
  'David',
  'Léo',
  'Mike',
  'Autre'
];

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

// API base: in production we go through a Vercel rewrite to avoid CORS ("/api"),
// in local dev we use the explicit backend URL (from .env) or fallback to localhost:8000.
// Prod = domaine du back ; Dev = .env local ou localhost:8000
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const LOCAL_BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// 👉 En prod on pointe vers le BACK (variable d'env Vercel FRONT)
const PROD_BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://basketball-manager-msoh.vercel.app';

// Toutes les routes front appellent /api sur le domaine du BACK
const API = isLocalhost ? `${LOCAL_BACKEND}/api` : `${PROD_BACKEND}/api`;

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get(`${API}/auth/me`)
        .then(response => setUser(response.data))
        .catch((err) => {
          console.error('Auth/me error:', {
            url: `${API}/auth/me`,
            method: 'GET',
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            headers: err.response?.headers
          });
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('userEmail', email);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', {
        url: `${API}/auth/login`,
        method: 'POST',
        payload: { email, password: '[REDACTED]' },
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      return {
        success: false,
        message:
          error.response?.data?.detail ||
          (typeof error.response?.data === 'string' ? error.response.data : 'Erreur de connexion')
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAdmin: user?.role === 'admin',
    isCoach: user?.role === 'coach'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Change Password Component
const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      });

      alert('Mot de passe changé avec succès ! Veuillez vous reconnecter.');
      logout();
      window.location.href = '/login';
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Changement de mot de passe requis</h1>
          <p className="text-gray-600">Vous devez changer votre mot de passe avant de continuer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Changement en cours...' : 'Changer le mot de passe'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, user } = useAuth();

  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  // Pré-remplir l'email si "Se souvenir de moi" était activé
  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const rememberMePreference = localStorage.getItem('rememberMe');
    if (savedEmail && rememberMePreference === 'true') {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password, rememberMe);
    
    if (!result.success) {
      setError(result.message);
    } else {
      // Login réussi, redirection vers le dashboard
      window.location.href = '/';
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-6">
            <img 
              src="https://i.imgur.com/nFY2q2Y.png" 
              alt="Logo" 
              className="h-40 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden w-40 h-40 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-4xl">L</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Basketball Manager</h1>
          <p className="text-gray-600 mt-2">Accédez à votre espace d'entraînement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="admin@exemple.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Se souvenir de moi (30 jours)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded-xl transition-colors font-medium"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Application de suivi des entraînements</p>
          <p>Basketball Manager</p>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component (same access for admin and coach)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to change password if required
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
};



// Protected Route Component

// Admin Route Component

// Navigation Component
const Navigation = () => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
    }
  };

  return (
    <nav className="bg-gray-900 shadow-lg border-b-2 border-yellow-400">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3 -ml-2">
            <div className="flex items-center">
              <img 
                src="https://i.imgur.com/nFY2q2Y.png" 
                alt="Logo" 
                className="h-10 w-32 object-contain transition-transform duration-200 hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center justify-center w-32 h-10 bg-blue-600 rounded-lg">
                <span className="text-white font-bold text-sm">LOGO</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link 
              to="/" 
              className={`nav-item-compact ${isActive('/') ? 'nav-item-active-compact' : 'nav-item-inactive-compact'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/joueurs" 
              className={`nav-item-compact ${isActive('/joueurs') ? 'nav-item-active-compact' : 'nav-item-inactive-compact'}`}
            >
              Joueurs
            </Link>
            <Link 
              to="/evaluations" 
              className={`nav-item-compact ${isActive('/evaluations') ? 'nav-item-active-compact' : 'nav-item-inactive-compact'}`}
            >
              Évaluations
            </Link>
            <Link 
              to="/entrainements" 
              className={`nav-item-compact ${isActive('/entrainements') ? 'nav-item-active-compact' : 'nav-item-inactive-compact'}`}
            >
              Séances Individuelles
            </Link>
            <Link 
              to="/assiduite" 
              className={`nav-item-compact ${isActive('/assiduite') ? 'nav-item-active-compact' : 'nav-item-inactive-compact'}`}
            >
              Collectif
            </Link>
            <Link 
              to="/rapports" 
              className={`nav-item-compact ${isActive('/rapports') ? 'nav-item-active-compact' : 'nav-item-inactive-compact'}`}
            >
              Rapports
            </Link>
            {isAdmin && (
              <Link 
                to="/admin" 
                className={`nav-item-compact ${isActive('/admin') ? 'nav-item-active-compact' : 'nav-item-inactive-compact'}`}
              >
                Admin
              </Link>
            )}
            
            <div className="flex items-center space-x-3 border-l border-gray-600 pl-3 ml-2">
              <span className="text-xs text-gray-300">
                {user?.first_name} {user?.last_name} 
                <span className="text-xs text-blue-400 ml-1">({user?.role})</span>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Dashboard Performance Component (Enhanced)
const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const periodOptions = [
    { label: '7 jours', value: 7 },
    { label: '14 jours', value: 14 },
    { label: '30 jours', value: 30 },
    { label: '3 mois', value: 90 },
    { label: '1 année', value: 365 }
  ];

  useEffect(() => {
    fetchAnalytics();
    
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timeInterval);
  }, [selectedPeriod]); // Re-fetch when period changes

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard?days=${selectedPeriod}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const formatDateTime = () => {
    return {
      date: currentTime.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: currentTime.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit'
      })
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="p-8">Erreur lors du chargement des données</div>;
  }

  const { date, time } = formatDateTime();

  // Données pour le graphique des thèmes avec couleurs améliorées et labels
  const themeChartData = (() => {
    // Trier les thèmes par ordre décroissant
    const sortedEntries = Object.entries(analytics.theme_progression)
      .sort(([,a], [,b]) => b - a);
    
    return {
      labels: sortedEntries.map(([theme, ]) => theme),
      datasets: [{
        label: 'Nombre de séances',
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: [
          '#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
          '#EF4444', '#EC4899', '#84CC16', '#F97316', '#6B7280',
          '#14B8A6', '#F43F5E'
        ],
        borderRadius: 8,
        borderSkipped: false,
      }]
    };
  })();

  // Données pour le graphique des coachs avec style amélioré
  const coachChartData = (() => {
    // Trier les coachs par ordre décroissant
    const sortedEntries = Object.entries(analytics.coach_comparison)
      .sort(([,a], [,b]) => b - a);
    
    return {
      labels: sortedEntries.map(([coach, ]) => coach),
      datasets: [{
        label: 'Séances dirigées',
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: '#4F46E5',
        borderRadius: 8,
        borderSkipped: false,
      }]
    };
  })();

  // Options pour le camembert avec pourcentages visibles
  const pieChartOptions = {
    responsive: true,
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
      datalabels: {
        display: true,
        color: 'white',
        font: {
          weight: 'bold',
          size: 14
        },
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return percentage + '%';
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 3,
        borderColor: '#ffffff'
      }
    }
  };

  // Options pour le graphique en barres des coachs
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Supprime la légende
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Nombre de séances',
          font: {
            family: "'Inter', sans-serif",
            weight: 600
          }
        },
        grid: {
          color: '#F3F4F6'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Entraîneurs',
          font: {
            family: "'Inter', sans-serif",
            weight: 600
          }
        },
        grid: {
          display: false
        }
      }
    },
  };

  // Top 5 joueurs les plus actifs
  const topPlayers = Object.entries(analytics.player_activity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const getMedal = (index) => {
    switch(index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Arrière-plan décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
      </div>
      
      <div id="dashboard-container" className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header moderne et compact */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl p-6 text-white relative overflow-hidden">
            {/* Effet de fond animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
              {/* Logo et message d'accueil */}
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
                  <img 
                    src="https://www.staderochelais.com/sites/stade-rochelais/themes/theme_base/images/logo.png" 
                    alt="Stade Rochelais" 
                    className="h-12 w-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden items-center justify-center w-12 h-12 bg-white/30 rounded-xl">
                    <span className="text-white font-bold text-xl">SR</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-1">
                    {getGreeting()}, Coach ! 👋
                  </h1>
                  <p className="text-white/80 text-sm md:text-base">
                    Tableau de bord • Basketball Manager
                  </p>
                </div>
              </div>
              
              {/* Date et heure modernisées */}
              <div className="flex items-center space-x-4">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">📅</span>
                    <span className="text-xs text-white/70 uppercase tracking-wide">Aujourd'hui</span>
                  </div>
                  <p className="font-semibold capitalize">{date}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">🕐</span>
                    <span className="text-xs text-white/70 uppercase tracking-wide">Heure</span>
                  </div>
                  <p className="font-mono font-semibold text-lg">{time}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sélecteur de Période modernisé */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-2">
                  <span className="text-white text-xl">🔍</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Période d'analyse</h2>
                  <p className="text-sm text-gray-600">Ajustez la période pour filtrer les données</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={exportDashboard}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <span className="text-sm">📄</span>
                  <span className="font-medium text-sm">Export PDF</span>
                </button>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium focus:ring-4 focus:ring-purple-300 focus:outline-none shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {periodOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-white text-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards Premium avec animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Joueurs */}
          <div className="group bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg hover:shadow-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wide">Total Joueurs</h3>
                <p className="text-4xl font-bold mb-1">{analytics.total_players}</p>
                <div className="flex items-center text-white/80">
                  <span className="text-xs">👥 Actifs</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-2xl p-4">
                <div className="text-4xl">🏀</div>
              </div>
            </div>
          </div>
          
          {/* Total Séances */}
          <div className="group bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg hover:shadow-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wide">Total Séances</h3>
                <p className="text-4xl font-bold mb-1">{analytics.total_sessions}</p>
                <div className="flex items-center text-white/80">
                  <span className="text-xs">📈 En progression</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-2xl p-4">
                <div className="text-4xl">🎯</div>
              </div>
            </div>
          </div>
          
          {/* Moyenne par Joueur */}
          <div className="group bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-lg hover:shadow-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wide">Moyenne/Joueur</h3>
                <p className="text-4xl font-bold mb-1">{analytics.average_sessions_per_player}</p>
                <div className="flex items-center text-white/80">
                  <span className="text-xs">📊 Par mois</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-2xl p-4">
                <div className="text-4xl">📊</div>
              </div>
            </div>
          </div>
          
          {/* Entraîneurs Actifs */}
          <div className="group bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-lg hover:shadow-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-2 uppercase tracking-wide">Entraîneurs</h3>
                <p className="text-4xl font-bold mb-1">{analytics.active_coaches || Object.keys(analytics.coach_comparison || {}).length}</p>
                <div className="flex items-center text-white/80">
                  <span className="text-xs">👨‍🏫 Actifs</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-2xl p-4">
                <div className="text-4xl">🎓</div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques modernisés */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Graphique des thèmes */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-full p-3">
                  <span className="text-white text-xl">📈</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Progression par Thème</h2>
                  <p className="text-sm text-gray-600">Répartition des séances par thématique</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-pink-100 to-rose-100 rounded-full px-4 py-2">
                <span className="text-pink-700 font-semibold text-sm">Tendances</span>
              </div>
            </div>
            <div className="relative">
              <Pie data={themeChartData} options={pieChartOptions} />
            </div>
          </div>

          {/* Graphique des coachs */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full p-3">
                  <span className="text-white text-xl">👨‍🏫</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Activité des Coachs</h2>
                  <p className="text-sm text-gray-600">Performance de l'équipe technique</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-cyan-100 to-blue-100 rounded-full px-4 py-2">
                <span className="text-cyan-700 font-semibold text-sm">Analyse</span>
              </div>
            </div>
            <div className="relative">
              <Bar data={coachChartData} options={barChartOptions} />
            </div>
          </div>
        </div>

        {/* Alertes et Notifications modernisées */}
        {analytics && (analytics.inactive_players?.length > 0 || analytics.theme_imbalances?.length > 0) && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200/60 rounded-3xl shadow-xl p-8 backdrop-blur-sm">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-3">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-800">Alertes & Recommandations</h2>
                  <p className="text-amber-700">Points d'attention pour optimiser l'entraînement</p>
                </div>
              </div>
              
              {analytics.inactive_players?.length > 0 && (
                <div className="mb-6 bg-white/50 rounded-2xl p-6 border border-orange-200/40">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-orange-500 rounded-full p-2">
                      <span className="text-white text-sm">👤</span>
                    </div>
                    <h3 className="font-bold text-orange-800 text-lg">
                      Joueurs inactifs ({analytics.inactive_players.length})
                    </h3>
                  </div>
                  <p className="text-orange-700 mb-4 text-sm">Plus de 5 jours sans séance d'entraînement</p>
                  <div className="flex flex-wrap gap-3">
                    {analytics.inactive_players.map((player, index) => (
                      <span key={index} className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold border border-orange-200 hover:shadow-md transition-all duration-200">
                        {player}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {analytics.theme_imbalances?.length > 0 && (
                <div className="bg-white/50 rounded-2xl p-6 border border-orange-200/40">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-amber-500 rounded-full p-2">
                      <span className="text-white text-sm">🎯</span>
                    </div>
                    <h3 className="font-bold text-amber-800 text-lg">
                      Thèmes sous-travaillés ({analytics.theme_imbalances.length})
                    </h3>
                  </div>
                  <p className="text-amber-700 mb-4 text-sm">Moins de 5% des séances totales</p>
                  <div className="flex flex-wrap gap-3">
                    {analytics.theme_imbalances.map((theme, index) => (
                      <span key={index} className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold border border-amber-200 hover:shadow-md transition-all duration-200">
                        {theme.theme} ({theme.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top joueurs et alertes avec design modernisé */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top 5 Joueurs */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-3">
                <span className="text-white text-xl">🏆</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Top 5 Joueurs Actifs</h2>
                <p className="text-sm text-gray-600">Classement par nombre de séances</p>
              </div>
            </div>
            <div className="space-y-4">
              {topPlayers.map(([player, sessions], index) => (
                <div key={player} className="flex items-center justify-between p-5 bg-gradient-to-r from-white/60 to-gray-50/60 rounded-2xl border border-gray-200/50 hover:shadow-lg hover:scale-105 transition-all duration-300 backdrop-blur-sm">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl transform hover:rotate-12 transition-transform duration-300">{getMedal(index)}</div>
                    <div>
                      <span className="font-bold text-gray-800 text-lg">{player}</span>
                      <p className="text-sm text-gray-600">Joueur #{index + 1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-4 py-2">
                      <span className="font-bold text-lg">{sessions}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">séances</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Joueurs Moins Actifs */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-gradient-to-r from-red-400 to-pink-500 rounded-full p-3">
                <span className="text-white text-xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Joueurs Moins Actifs</h2>
                <p className="text-sm text-gray-600">Attention particulière requise</p>
              </div>
            </div>
            <div className="space-y-4">
              {analytics.least_active_players.map(([player, sessions]) => (
                <div key={player} className="flex items-center justify-between p-5 bg-gradient-to-r from-red-50/80 to-pink-50/80 rounded-2xl border border-red-200/50 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                  <div className="flex items-center space-x-4">
                    <div className="bg-red-100 rounded-full p-2">
                      <span className="text-red-600 text-sm">👤</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-800">{player}</span>
                      <p className="text-sm text-red-600">Nécessite un suivi</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full px-4 py-2">
                      <span className="font-bold">{sessions}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">séances</p>
                  </div>
                </div>
              ))}
              {analytics.least_active_players.length === 0 && (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">🎉</span>
                  <p className="text-gray-500">Tous les joueurs sont actifs !</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Players Component with Coaches Section
const Players = React.memo(() => {
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeTab, setActiveTab] = useState('players');
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showCoachForm, setShowCoachForm] = useState(false);
  const [showPlayerEvaluationModal, setShowPlayerEvaluationModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [selectedPlayerForEvaluation, setSelectedPlayerForEvaluation] = useState(null);
  const [playerEvaluations, setPlayerEvaluations] = useState([]);
  const [evaluationFilter, setEvaluationFilter] = useState('latest'); // 'initial', 'final', 'latest', 'position'
  const [appRadarFilters, setAppRadarFilters] = useState({
    showInitial: true,
    showFinal: false,
    showCDFAverage: false,
    showPositionAverage: false,
    allPlayersData: null,
    positionData: null
  });
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingCoach, setEditingCoach] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataCache, setDataCache] = useState({ players: null, coaches: null, timestamp: null });
  const [playerFormData, setPlayerFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    position: '',
    coach_referent: '',
    photo: ''
  });
  const [coachFormData, setCoachFormData] = useState({
    first_name: '',
    last_name: '',
    photo: ''
  });

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  useEffect(() => {
    const loadData = async () => {
      const now = Date.now();
      
      // Check if we have valid cached data
      if (dataCache.timestamp && 
          dataCache.players && 
          dataCache.coaches && 
          (now - dataCache.timestamp) < CACHE_DURATION) {
        setPlayers(dataCache.players);
        setCoaches(dataCache.coaches);
        return;
      }

      setLoading(true);
      try {
        // Use Promise.allSettled for better error handling
        const [playersResult, coachesResult] = await Promise.allSettled([
          axios.get(`${API}/players`),
          axios.get(`${API}/coaches`)
        ]);

        const playersData = playersResult.status === 'fulfilled' ? playersResult.value.data : [];
        const coachesData = coachesResult.status === 'fulfilled' ? coachesResult.value.data : [];

        setPlayers(playersData);
        setCoaches(coachesData);
        
        // Update cache
        setDataCache({
          players: playersData,
          coaches: coachesData,
          timestamp: now
        });
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataCache.timestamp]);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      const newPlayers = response.data;
      setPlayers(newPlayers);
      
      // Update cache
      setDataCache(prev => ({
        ...prev,
        players: newPlayers,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des joueurs:', error);
    }
  };

  const fetchCoaches = async () => {
    try {
      const response = await axios.get(`${API}/coaches`);
      const newCoaches = response.data;
      setCoaches(newCoaches);
      
      // Update cache
      setDataCache(prev => ({
        ...prev,
        coaches: newCoaches,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des coachs:', error);
    }
  };

  const handlePlayerSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await axios.put(`${API}/players/${editingPlayer.id}`, playerFormData);
      } else {
        await axios.post(`${API}/players`, playerFormData);
      }
      setShowPlayerForm(false);
      setEditingPlayer(null);
      setPlayerFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        position: '',
        photo: ''
      });
      fetchPlayers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du joueur:', error);
    }
  };

  const handleCoachSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCoach) {
        await axios.put(`${API}/coaches/${editingCoach.id}`, coachFormData);
      } else {
        await axios.post(`${API}/coaches`, coachFormData);
      }
      setShowCoachForm(false);
      setEditingCoach(null);
      setCoachFormData({
        first_name: '',
        last_name: '',
        photo: ''
      });
      fetchCoaches();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du coach:', error);
    }
  };

  const handlePlayerEdit = (player) => {
    setEditingPlayer(player);
    setPlayerFormData({
      first_name: player.first_name,
      last_name: player.last_name,
      date_of_birth: player.date_of_birth,
      position: player.position,
      coach_referent: player.coach_referent || '',
      photo: player.photo || ''
    });
    setShowPlayerForm(true);
  };

  const handleCoachEdit = (coach) => {
    setEditingCoach(coach);
    setCoachFormData({
      first_name: coach.first_name,
      last_name: coach.last_name,
      photo: coach.photo || ''
    });
    setShowCoachForm(true);
  };

  const handlePlayerDelete = async (playerId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) {
      try {
        await axios.delete(`${API}/players/${playerId}`);
        fetchPlayers();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleCoachDelete = async (coachId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce coach ?')) {
      try {
        await axios.delete(`${API}/coaches/${coachId}`);
        fetchCoaches();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'player') {
          setPlayerFormData({ ...playerFormData, photo: reader.result });
        } else {
          setCoachFormData({ ...coachFormData, photo: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Player evaluation functions
  const openPlayerEvaluationModal = async (player) => {
    setSelectedPlayerForEvaluation(player);
    setShowPlayerEvaluationModal(true);
    
    try {
      const response = await axios.get(`${API}/evaluations/player/${player.id}`);
      setPlayerEvaluations(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des évaluations:', error);
      setPlayerEvaluations([]);
    }
  };

  // Functions for new radar chart with checkboxes  
  const loadAppComparisonData = async (type, position = null) => {
    try {
      if (type === 'all') {
        const response = await axios.get(`${API}/evaluations/averages/all`);
        setAppRadarFilters(prev => ({ 
          ...prev, 
          allPlayersData: response.data 
        }));
      } else if (type === 'position' && position) {
        const response = await axios.get(`${API}/evaluations/averages/position/${position}`);
        setAppRadarFilters(prev => ({ 
          ...prev, 
          positionData: response.data 
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de comparaison:', error);
    }
  };

  const getNewRadarData = () => {
    if (!selectedPlayerForEvaluation || !playerEvaluations.length) return null;

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
        label: `Moyenne ${selectedPlayerForEvaluation?.position || 'position'}`,
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

  // Functions for radar chart in modal
  const getRadarData = () => {
    if (!selectedPlayerForEvaluation || !playerEvaluations.length) return null;

    // Les 8 thèmes d'évaluation
    const THEME_NAMES = ['ADRESSE', 'AISANCE', 'PASSE', 'DEFENSE', 'REBOND', 'ATHLETE', 'TACTIQUE', 'COACHABILITE'];

    // Récupérer l'évaluation selon le filtre
    let selectedEvaluation = null;
    
    if (evaluationFilter === 'initial') {
      selectedEvaluation = playerEvaluations.find(e => e.evaluation_type === 'initial');
    } else if (evaluationFilter === 'final') {
      selectedEvaluation = playerEvaluations.find(e => e.evaluation_type === 'final');
    } else {
      // Latest - prendre la finale si elle existe, sinon l'initiale
      selectedEvaluation = playerEvaluations.find(e => e.evaluation_type === 'final') || 
                           playerEvaluations.find(e => e.evaluation_type === 'initial');
    }

    if (!selectedEvaluation || !selectedEvaluation.themes) return null;

    const data = THEME_NAMES.map(themeName => {
      const theme = selectedEvaluation.themes.find(t => t.name === themeName);
      return theme ? theme.average_score : 0;
    });

    const isInitial = selectedEvaluation.evaluation_type === 'initial';

    return {
      labels: THEME_NAMES,
      datasets: [{
        label: `${selectedPlayerForEvaluation.first_name} ${selectedPlayerForEvaluation.last_name} - ${isInitial ? 'Initiale' : 'Finale'}`,
        data,
        backgroundColor: isInitial ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
        borderColor: isInitial ? 'rgba(34, 197, 94, 1)' : 'rgba(245, 158, 11, 1)',
        borderWidth: 2,
        pointBackgroundColor: isInitial ? 'rgba(34, 197, 94, 1)' : 'rgba(245, 158, 11, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: isInitial ? 'rgba(34, 197, 94, 1)' : 'rgba(245, 158, 11, 1)'
      }]
    };
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 5,
        ticks: {
          stepSize: 1
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.r}/5`;
          }
        }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
          Joueurs ({players.length})
        </button>
        <button
          onClick={() => setActiveTab('coaches')}
          className={`sub-nav-button ${
            activeTab === 'coaches' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          Staff Technique ({coaches.length})
        </button>
      </div>

      {/* Players Tab */}
      {activeTab === 'players' && (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Gestion des Joueurs</h1>
            <button
              onClick={() => setShowPlayerForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors"
            >
              Ajouter un joueur
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
              <span className="ml-3 text-gray-600">Chargement des joueurs...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => (
                <div key={player.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  {player.photo && (
                    <img 
                      src={player.photo} 
                      alt={`${player.first_name} ${player.last_name}`}
                      className="w-20 h-20 object-cover rounded-full mx-auto mb-4"
                    />
                  )}
                  <h3 className="text-lg font-semibold text-center text-gray-800">
                    {player.first_name} {player.last_name}
                  </h3>
                  <p className="text-gray-600 text-center">{player.position}</p>
                  {player.coach_referent && (
                    <p className="text-blue-600 text-center text-sm font-medium">
                      Coach: {player.coach_referent}
                    </p>
                  )}
                  <p className="text-gray-500 text-center text-sm">
                    Né le: {new Date(player.date_of_birth).toLocaleDateString('fr-FR')}
                  </p>
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => openPlayerEvaluationModal(player)}
                      className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded-xl transition-colors text-sm"
                    >
                      📊 Évaluations
                    </button>
                    <button
                      onClick={() => handlePlayerEdit(player)}
                      className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-xl transition-colors text-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handlePlayerDelete(player.id)}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-xl transition-colors text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Coaches Tab */}
      {activeTab === 'coaches' && (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Staff Technique</h1>
            <button
              onClick={() => setShowCoachForm(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl transition-colors"
            >
              Ajouter un coach
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coaches.map((coach) => (
              <div key={coach.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                {coach.photo && (
                  <img 
                    src={coach.photo} 
                    alt={`${coach.first_name} ${coach.last_name}`}
                    className="w-20 h-20 object-cover rounded-full mx-auto mb-4"
                  />
                )}
                <h3 className="text-lg font-semibold text-center text-gray-800">
                  {coach.first_name} {coach.last_name}
                </h3>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleCoachEdit(coach)}
                    className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded-xl transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleCoachDelete(coach.id)}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-xl transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Player Form Modal */}
      {showPlayerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingPlayer ? 'Modifier le joueur' : 'Nouveau joueur'}
            </h2>
            <form onSubmit={handlePlayerSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Prénom"
                value={playerFormData.first_name}
                onChange={(e) => setPlayerFormData({ ...playerFormData, first_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Nom"
                value={playerFormData.last_name}
                onChange={(e) => setPlayerFormData({ ...playerFormData, last_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="date"
                value={playerFormData.date_of_birth}
                onChange={(e) => setPlayerFormData({ ...playerFormData, date_of_birth: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <select
                value={playerFormData.position}
                onChange={(e) => setPlayerFormData({ ...playerFormData, position: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Sélectionner un poste</option>
                <option value="Meneur">Meneur</option>
                <option value="Arrière">Arrière</option>
                <option value="Ailier">Ailier</option>
                <option value="Ailier Fort">Ailier Fort</option>
                <option value="Pivot">Pivot</option>
              </select>
              <select
                value={playerFormData.coach_referent}
                onChange={(e) => setPlayerFormData({ ...playerFormData, coach_referent: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner un coach référent</option>
                <option value="Mike">Mike</option>
                <option value="David">David</option>
                <option value="Léo">Léo</option>
                <option value="J-E">J-E</option>
              </select>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e, 'player')}
                className="w-full p-3 border border-gray-300 rounded-xl"
              />
              {playerFormData.photo && (
                <img src={playerFormData.photo} alt="Aperçu" className="w-20 h-20 object-cover rounded-full mx-auto" />
              )}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl transition-colors"
                >
                  {editingPlayer ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlayerForm(false);
                    setEditingPlayer(null);
                    setPlayerFormData({
                      first_name: '',
                      last_name: '',
                      date_of_birth: '',
                      position: '',
                      coach_referent: '',
                      photo: ''
                    });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-xl transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coach Form Modal */}
      {showCoachForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingCoach ? 'Modifier le coach' : 'Nouveau coach'}
            </h2>
            <form onSubmit={handleCoachSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Prénom"
                value={coachFormData.first_name}
                onChange={(e) => setCoachFormData({ ...coachFormData, first_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Nom"
                value={coachFormData.last_name}
                onChange={(e) => setCoachFormData({ ...coachFormData, last_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e, 'coach')}
                className="w-full p-3 border border-gray-300 rounded-xl"
              />
              {coachFormData.photo && (
                <img src={coachFormData.photo} alt="Aperçu" className="w-20 h-20 object-cover rounded-full mx-auto" />
              )}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl transition-colors"
                >
                  {editingCoach ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCoachForm(false);
                    setEditingCoach(null);
                    setCoachFormData({
                      first_name: '',
                      last_name: '',
                      photo: ''
                    });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-xl transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Player Evaluation Modal - Read Only */}
      {showPlayerEvaluationModal && selectedPlayerForEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                Évaluations - {selectedPlayerForEvaluation.first_name} {selectedPlayerForEvaluation.last_name}
              </h2>
              <button
                onClick={() => {
                  setShowPlayerEvaluationModal(false);
                  setSelectedPlayerForEvaluation(null);
                  setPlayerEvaluations([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Detailed Evaluation Comparison */}
            {playerEvaluations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  Aucune évaluation disponible pour ce joueur
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playerEvaluations.find(e => e.evaluation_type === 'initial') && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <div className="text-center">
                        <h4 className="text-lg font-semibold text-green-800 mb-2">Évaluation Initiale</h4>
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {playerEvaluations.find(e => e.evaluation_type === 'initial').overall_average}/5
                        </div>
                        <p className="text-sm text-green-600">Score global</p>
                        <p className="text-xs text-green-500 mt-2">
                          {new Date(playerEvaluations.find(e => e.evaluation_type === 'initial').evaluation_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {playerEvaluations.find(e => e.evaluation_type === 'final') && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                      <div className="text-center">
                        <h4 className="text-lg font-semibold text-orange-800 mb-2">Évaluation Finale</h4>
                        <div className="text-3xl font-bold text-orange-600 mb-1">
                          {playerEvaluations.find(e => e.evaluation_type === 'final').overall_average}/5
                        </div>
                        <p className="text-sm text-orange-600">Score global</p>
                        <p className="text-xs text-orange-500 mt-2">
                          {new Date(playerEvaluations.find(e => e.evaluation_type === 'final').evaluation_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progression Indicator */}
                {playerEvaluations.find(e => e.evaluation_type === 'initial') && 
                 playerEvaluations.find(e => e.evaluation_type === 'final') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="text-center font-semibold text-blue-800 mb-2">Progression Globale</h4>
                    <div className="text-center">
                      {(() => {
                        const initial = playerEvaluations.find(e => e.evaluation_type === 'initial').overall_average;
                        const final = playerEvaluations.find(e => e.evaluation_type === 'final').overall_average;
                        const progression = (final - initial).toFixed(2);
                        return (
                          <span className={`text-2xl font-bold ${progression >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {progression >= 0 ? '+' : ''}{progression} pts
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Detailed Comparison Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800">Comparaison Détaillée des Évaluations</h4>
                    <p className="text-sm text-gray-600">Valeurs exactes des sous-thèmes et moyennes des thèmes</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Thème / Sous-thème
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-green-600 uppercase tracking-wider">
                            Évaluation Initiale
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-orange-600 uppercase tracking-wider">
                            Évaluation Finale
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider">
                            Évolution
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {EVALUATION_THEMES.map((themeData) => {
                          const initialEval = playerEvaluations.find(e => e.evaluation_type === 'initial');
                          const finalEval = playerEvaluations.find(e => e.evaluation_type === 'final');
                          
                          const initialTheme = initialEval?.themes?.find(t => t.name === themeData.name);
                          const finalTheme = finalEval?.themes?.find(t => t.name === themeData.name);
                          
                          const initialAvg = initialTheme?.average_score || 0;
                          const finalAvg = finalTheme?.average_score || 0;
                          const evolution = finalAvg - initialAvg;

                          return (
                            <React.Fragment key={themeData.name}>
                              {/* Theme Header Row */}
                              <tr className="bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-bold text-gray-900">{themeData.name}</div>
                                  <div className="text-xs text-gray-500">Moyenne du thème</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className="text-sm font-bold text-green-600">
                                    {initialAvg > 0 ? `${initialAvg}/5` : '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className="text-sm font-bold text-orange-600">
                                    {finalAvg > 0 ? `${finalAvg}/5` : '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {initialAvg > 0 && finalAvg > 0 ? (
                                    <span className={`text-sm font-bold ${evolution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {evolution >= 0 ? '+' : ''}{evolution.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                              
                              {/* Sub-aspects Rows */}
                              {themeData.aspects.map((aspect) => {
                                const initialAspectData = initialTheme?.aspects?.find(a => a.name === aspect);
                                const finalAspectData = finalTheme?.aspects?.find(a => a.name === aspect);
                                
                                const initialAspectScore = initialAspectData?.score || 0;
                                const finalAspectScore = finalAspectData?.score || 0;
                                const aspectEvolution = finalAspectScore - initialAspectScore;

                                return (
                                  <tr key={aspect} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <div className="text-sm text-gray-700 pl-4">• {aspect}</div>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center">
                                      <span className="text-sm text-green-600">
                                        {initialAspectScore > 0 ? `${initialAspectScore}/5` : '—'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center">
                                      <span className="text-sm text-orange-600">
                                        {finalAspectScore > 0 ? `${finalAspectScore}/5` : '—'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center">
                                      {initialAspectScore > 0 && finalAspectScore > 0 ? (
                                        <span className={`text-sm ${aspectEvolution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {aspectEvolution >= 0 ? '+' : ''}{aspectEvolution.toFixed(1)}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-gray-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes section */}
                {(playerEvaluations.find(e => e.evaluation_type === 'initial')?.notes || 
                  playerEvaluations.find(e => e.evaluation_type === 'final')?.notes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {playerEvaluations.find(e => e.evaluation_type === 'initial')?.notes && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <h5 className="font-semibold text-green-800 mb-2">Notes - Évaluation Initiale</h5>
                        <p className="text-sm text-green-700">
                          {playerEvaluations.find(e => e.evaluation_type === 'initial').notes}
                        </p>
                      </div>
                    )}
                    
                    {playerEvaluations.find(e => e.evaluation_type === 'final')?.notes && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <h5 className="font-semibold text-orange-800 mb-2">Notes - Évaluation Finale</h5>
                        <p className="text-sm text-orange-700">
                          {playerEvaluations.find(e => e.evaluation_type === 'final').notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Pour modifier les évaluations, utilisez l'onglet "Évaluations"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Sessions and Calendar Combined Component 
const SessionsAndCalendar = () => {
  const [activeSubTab, setActiveSubTab] = useState('liste');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Sub-tabs Navigation */}
      <div className="flex space-x-1 mb-8">
        <button
          onClick={() => setActiveSubTab('liste')}
          className={`sub-nav-button ${
            activeSubTab === 'liste' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          📋 Liste des séances
        </button>
        <button
          onClick={() => setActiveSubTab('calendrier')}
          className={`sub-nav-button ${
            activeSubTab === 'calendrier' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          📅 Vue calendrier
        </button>
      </div>

      {/* Content based on active sub-tab */}
      {activeSubTab === 'liste' && <SessionsList />}
      {activeSubTab === 'calendrier' && <CalendarView />}
    </div>
  );
};

// Sessions Component (renamed to SessionsList for the sub-tab)
const SessionsList = () => {
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    player_ids: [],
    session_date: '',
    themes: [],
    trainers: [],
    content_details: '',
    notes: ''
  });

  useEffect(() => {
    fetchSessions();
    fetchPlayers();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API}/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des séances:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSession) {
        await axios.put(`${API}/sessions/${editingSession.id}`, formData);
        setShowConfirmation(false);
      } else {
        await axios.post(`${API}/sessions`, formData);
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000); // Hide after 3 seconds
      }
      setShowForm(false);
      setEditingSession(null);
      setFormData({
        player_ids: [],
        session_date: '',
        themes: [],
        trainers: [],
        content_details: '',
        notes: ''
      });
      fetchSessions();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setFormData({
      player_ids: session.player_ids || [],
      session_date: session.session_date,
      themes: session.themes || [],
      trainers: session.trainers || [],
      content_details: session.content_details || '',
      notes: session.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (sessionId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
      try {
        await axios.delete(`${API}/sessions/${sessionId}`);
        fetchSessions();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleThemeChange = (theme) => {
    setFormData(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme]
    }));
  };

  const handleTrainerChange = (trainer) => {
    setFormData(prev => ({
      ...prev,
      trainers: prev.trainers.includes(trainer)
        ? prev.trainers.filter(t => t !== trainer)
        : [...prev.trainers, trainer]
    }));
  };

  const handlePlayerChange = (playerId) => {
    setFormData(prev => ({
      ...prev,
      player_ids: prev.player_ids.includes(playerId)
        ? prev.player_ids.filter(id => id !== playerId)
        : [...prev.player_ids, playerId]
    }));
  };

  const getPlayerNames = (playerIds) => {
    return playerIds.map(id => {
      const player = players.find(p => p.id === id);
      return player ? `${player.first_name} ${player.last_name}` : 'Joueur inconnu';
    }).join(', ');
  };

  const filteredSessions = selectedPlayer 
    ? sessions.filter(session => session.player_ids?.includes(selectedPlayer))
    : sessions;

  return (
    <div className="px-4 py-4">
      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 fade-in">
          ✅ Séance ajoutée avec succès !
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Séances d'entraînement</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors"
        >
          Nouvelle séance
        </button>
      </div>

      {/* Filtre par joueur */}
      <div className="mb-6">
        <select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="w-full md:w-64 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Tous les joueurs</option>
          {players.map(player => (
            <option key={player.id} value={player.id}>
              {player.first_name} {player.last_name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingSession ? 'Modifier la séance' : 'Nouvelle séance'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sélection des joueurs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Joueurs</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border rounded-xl p-3">
                  {players.map(player => (
                    <label key={player.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.player_ids.includes(player.id)}
                        onChange={() => handlePlayerChange(player.id)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{player.first_name} {player.last_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <input
                type="date"
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              {/* Sélection des thèmes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thèmes (sélection multiple)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-xl p-3">
                  {THEMES.map(theme => (
                    <label key={theme} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.themes.includes(theme)}
                        onChange={() => handleThemeChange(theme)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{theme}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sélection des entraîneurs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entraîneurs</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-xl p-3">
                  {ENTRAINEURS.map(trainer => (
                    <label key={trainer} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.trainers.includes(trainer)}
                        onChange={() => handleTrainerChange(trainer)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{trainer}</span>
                    </label>
                  ))}
                </div>
              </div>

              <textarea
                placeholder="Contenu et détails de la séance"
                value={formData.content_details}
                onChange={(e) => setFormData({ ...formData, content_details: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
                required
              />

              <textarea
                placeholder="Notes supplémentaires (optionnel)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl transition-colors"
                >
                  {editingSession ? 'Modifier' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSession(null);
                    setFormData({
                      player_ids: [],
                      session_date: '',
                      themes: [],
                      trainers: [],
                      content_details: '',
                      notes: ''
                    });
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-xl transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredSessions.map((session) => (
          <div key={session.id} className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {getPlayerNames(session.player_ids || [])}
                </h3>
                <p className="text-blue-600 font-medium">{session.themes?.join(', ') || 'Séance'}</p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="text-right">
                  <p className="text-gray-600">{new Date(session.session_date).toLocaleDateString('fr-FR')}</p>
                  <p className="text-gray-500 text-sm">Entraîneurs: {session.trainers?.join(', ') || 'N/A'}</p>
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => handleEdit(session)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-xl text-sm transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-xl text-sm transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-2">Contenu:</h4>
              <p className="text-gray-600">{session.content_details}</p>
              {session.notes && (
                <>
                  <h4 className="font-medium text-gray-700 mb-2 mt-3">Notes:</h4>
                  <p className="text-gray-600">{session.notes}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Reports Component with PDF Export and Coach Reports
const Reports = () => {
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [activeTab, setActiveTab] = useState('players');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('');
  const [playerReport, setPlayerReport] = useState(null);
  const [coachReport, setCoachReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchPlayers();
    fetchCoaches();
  }, []);

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
      let url = `${API}/reports/player/${playerId}`;
      if (dateFilter.start_date && dateFilter.end_date) {
        url += `?start_date=${dateFilter.start_date}&end_date=${dateFilter.end_date}`;
      }
      console.log('Fetching player report from:', url);
      const response = await axios.get(url);
      console.log('Player report response:', response.data);
      setPlayerReport(response.data);
      setCoachReport(null); // Clear coach report when viewing player
    } catch (error) {
      console.error('Erreur lors du chargement du rapport joueur:', error);
    } finally {
      setLoading(false);
    }
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
      setPlayerReport(null); // Clear player report when viewing coach
    } catch (error) {
      console.error('Erreur lors du chargement du rapport coach:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayer(playerId);
    setSelectedCoach(''); // Clear coach selection
    if (playerId) {
      setPlayerReport(null); // Clear current report immediately
      fetchPlayerReport(playerId);
    } else {
      setPlayerReport(null);
    }
  };

  const handleCoachSelect = (coachName) => {
    setSelectedCoach(coachName);
    setSelectedPlayer(''); // Clear player selection
    if (coachName) {
      setCoachReport(null); // Clear current report immediately
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

  // Données pour les graphiques joueurs avec pourcentages
  const playerThemeChartData = playerReport ? {
    labels: Object.keys(playerReport.content_breakdown),
    datasets: [{
      data: Object.values(playerReport.content_breakdown),
      backgroundColor: [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280',
        '#14B8A6', '#F43F5E'
      ],
      borderWidth: 3,
      borderColor: '#ffffff',
      hoverBorderWidth: 4,
      hoverOffset: 15
    }]
  } : null;

  const playerTrainerChartData = playerReport ? {
    labels: Object.keys(playerReport.trainer_breakdown),
    datasets: [{
      data: Object.values(playerReport.trainer_breakdown),
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
      borderWidth: 3,
      borderColor: '#ffffff',
      hoverBorderWidth: 4,
      hoverOffset: 15
    }]
  } : null;

  // Données pour les graphiques coachs avec pourcentages
  const coachThemeChartData = coachReport ? {
    labels: Object.keys(coachReport.theme_breakdown),
    datasets: [{
      data: Object.values(coachReport.theme_breakdown),
      backgroundColor: [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280',
        '#14B8A6', '#F43F5E'
      ],
      borderWidth: 3,
      borderColor: '#ffffff',
      hoverBorderWidth: 4,
      hoverOffset: 15
    }]
  } : null;

  const coachPlayerChartData = coachReport ? {
    labels: Object.keys(coachReport.player_breakdown),
    datasets: [{
      data: Object.values(coachReport.player_breakdown),
      backgroundColor: [
        '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280',
        '#14B8A6', '#F43F5E'
      ],
      borderWidth: 3,
      borderColor: '#ffffff',
      hoverBorderWidth: 4,
      hoverOffset: 15
    }]
  } : null;

  // Options communes pour les graphiques avec effet 3D et pourcentages
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        },
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      },
      datalabels: {
        display: true,
        color: 'white',
        font: {
          weight: 'bold',
          size: 14
        },
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return percentage + '%';
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 4
      }
    },
    interaction: {
      intersect: false
    },
    animation: {
      animateRotate: true,
      animateScale: true
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Rapports</h1>
      
      {/* Tabs */}
      <div className="flex space-x-1 mb-8">
        <button
          onClick={() => {
            setActiveTab('players');
            setSelectedCoach('');
            setCoachReport(null);
          }}
          className={`sub-nav-button ${
            activeTab === 'players' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          Rapports Joueurs
        </button>
        <button
          onClick={() => {
            setActiveTab('coaches');
            setSelectedPlayer('');
            setPlayerReport(null);
          }}
          className={`sub-nav-button ${
            activeTab === 'coaches' 
              ? 'sub-nav-button-active' 
              : 'sub-nav-button-inactive'
          }`}
        >
          Rapports Coachs
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {activeTab === 'players' ? (
          <select
            value={selectedPlayer}
            onChange={(e) => handlePlayerSelect(e.target.value)}
            className="flex-1 md:flex-none md:w-64 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sélectionner un joueur</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.first_name} {player.last_name}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={selectedCoach}
            onChange={(e) => handleCoachSelect(e.target.value)}
            className="flex-1 md:flex-none md:w-64 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Sélectionner un coach</option>
            {coaches.map(coach => (
              <option key={coach.id} value={coach.first_name}>
                {coach.first_name} {coach.last_name}
              </option>
            ))}
          </select>
        )}
        
        <input
          type="date"
          placeholder="Date début"
          value={dateFilter.start_date}
          onChange={(e) => setDateFilter({...dateFilter, start_date: e.target.value})}
          className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <input
          type="date"
          placeholder="Date fin"
          value={dateFilter.end_date}
          onChange={(e) => setDateFilter({...dateFilter, end_date: e.target.value})}
          className="p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <button
          onClick={handleDateFilterChange}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl transition-colors"
        >
          Filtrer
        </button>

        <button
          onClick={() => {
            setDateFilter({ start_date: '', end_date: '' });
            if (activeTab === 'players' && selectedPlayer) {
              fetchPlayerReport(selectedPlayer);
            } else if (activeTab === 'coaches' && selectedCoach) {
              fetchCoachReport(selectedCoach);
            }
          }}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-xl transition-colors"
        >
          🔄 Réinitialiser
        </button>


      </div>

      {/* Player Report */}
      {activeTab === 'players' && loading && (
        <div className="flex justify-center items-center py-12">
          <div className="loading-spinner"></div>
          <span className="ml-3 text-gray-600">Chargement du rapport...</span>
        </div>
      )}

      {activeTab === 'players' && playerReport && !loading && (
        <div id="report-content" className="space-y-6 bg-white p-6 rounded-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-6">
              {playerReport.player.photo && (
                <img 
                  src={playerReport.player.photo} 
                  alt={`${playerReport.player.first_name} ${playerReport.player.last_name}`}
                  className="w-16 h-16 object-cover rounded-full"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {playerReport.player.first_name} {playerReport.player.last_name}
                </h2>
                <p className="text-gray-600">{playerReport.player.position}</p>
                {(dateFilter.start_date || dateFilter.end_date) && (
                  <p className="text-sm text-gray-500">
                    Période: {dateFilter.start_date || 'début'} - {dateFilter.end_date || 'fin'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="stats-card stats-card-total">
                <h3 className="text-lg font-semibold text-white mb-2">Total Séances</h3>
                <p className="text-3xl font-bold text-white">{playerReport.total_sessions}</p>
              </div>
              <div className="stats-card stats-card-completed">
                <h3 className="text-lg font-semibold text-white mb-2">Thèmes</h3>
                <p className="text-3xl font-bold text-white">{Object.keys(playerReport.content_breakdown).length}</p>
              </div>
              <div className="stats-card stats-card-pending">
                <h3 className="text-lg font-semibold text-white mb-2">Entraîneurs</h3>
                <p className="text-3xl font-bold text-white">{Object.keys(playerReport.trainer_breakdown).length}</p>
              </div>
            </div>

            {/* Layout à 2 colonnes : Camembert à gauche, Entraîneurs à droite */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Répartition par thème</h3>
                {playerThemeChartData && (
                  <Pie data={playerThemeChartData} options={chartOptions} />
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">👨‍🏫 Entraîneurs</h3>
                <div className="space-y-3">
                  {Object.entries(playerReport.trainer_breakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([trainer, count]) => {
                      const total = Object.values(playerReport.trainer_breakdown).reduce((sum, val) => sum + val, 0);
                      const percentage = ((count / total) * 100).toFixed(1);
                      
                      return (
                        <div key={trainer} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-l-4 border-green-500 hover:shadow-md transition-shadow">
                          <div>
                            <span className="text-gray-800 font-semibold text-lg">{trainer}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-green-600 text-xl">{count}</span>
                            <p className="text-sm text-gray-500">{percentage}% des séances</p>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Séances récentes</h3>
            <div className="space-y-3">
              {playerReport.recent_sessions.map((session) => (
                <div key={session.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{session.themes?.join(', ') || 'Séance'}</p>
                      <p className="text-gray-600 text-sm">{session.content_details}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">{new Date(session.session_date).toLocaleDateString('fr-FR')}</p>
                      <p className="text-gray-500 text-sm">Entraîneurs: {session.trainers?.join(', ') || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal - Commented out temporarily due to scope issue */}
      {/*
      <EvaluationModal
        showModal={showPlayerEvaluationModal}
        selectedPlayer={selectedPlayerForEvaluation}
        evaluationData={evaluationData}
        setEvaluationData={setEvaluationData}
        onClose={() => setShowPlayerEvaluationModal(false)}
        onSave={saveEvaluation}
        EVALUATION_THEMES={EVALUATION_THEMES}
      />
      */}

      {/* Coach Report */}
      {activeTab === 'coaches' && loading && (
        <div className="flex justify-center items-center py-12">
          <div className="loading-spinner"></div>
          <span className="ml-3 text-gray-600">Chargement du rapport...</span>
        </div>
      )}

      {activeTab === 'coaches' && coachReport && !loading && (
        <div id="report-content" className="space-y-6 bg-white p-6 rounded-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-6">
              {coachReport.coach.photo && (
                <img 
                  src={coachReport.coach.photo} 
                  alt={`${coachReport.coach.first_name} ${coachReport.coach.last_name}`}
                  className="w-16 h-16 object-cover rounded-full"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Coach {coachReport.coach.first_name} {coachReport.coach.last_name}
                </h2>
                {(dateFilter.start_date || dateFilter.end_date) && (
                  <p className="text-sm text-gray-500">
                    Période: {dateFilter.start_date || 'début'} - {dateFilter.end_date || 'fin'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="stats-card stats-card-completed">
                <h3 className="text-lg font-semibold text-white mb-2">Total Séances</h3>
                <p className="text-3xl font-bold text-white">{coachReport.total_sessions}</p>
              </div>
              <div className="stats-card stats-card-pending">
                <h3 className="text-lg font-semibold text-white mb-2">Thèmes Abordés</h3>
                <p className="text-3xl font-bold text-white">{Object.keys(coachReport.theme_breakdown).length}</p>
              </div>
              <div className="stats-card stats-card-total">
                <h3 className="text-lg font-semibold text-white mb-2">Joueurs Entraînés</h3>
                <p className="text-3xl font-bold text-white">{Object.keys(coachReport.player_breakdown).length}</p>
              </div>
            </div>

            {/* Layout à 2 colonnes : Camembert à gauche, Joueurs à droite */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Répartition par thème</h3>
                {coachThemeChartData && (
                  <Pie data={coachThemeChartData} options={chartOptions} />
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 Tous les joueurs entraînés</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(coachReport.player_breakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([player, count]) => {
                      const total = Object.values(coachReport.player_breakdown).reduce((sum, val) => sum + val, 0);
                      const percentage = ((count / total) * 100).toFixed(1);
                      
                      return (
                        <div key={player} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                          <div>
                            <span className="text-gray-800 font-semibold text-lg">{player}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-orange-600 text-xl">{count}</span>
                            <p className="text-sm text-gray-500">{percentage}% des séances</p>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Séances récentes</h3>
            <div className="space-y-3">
              {coachReport.recent_sessions.map((session) => (
                <div key={session.id} className="border-l-4 border-green-500 pl-4 py-3 bg-gray-50 rounded-r-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{session.themes?.join(', ') || 'Séance'}</p>
                      <p className="text-gray-600 text-sm">{session.content_details}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600">{new Date(session.session_date).toLocaleDateString('fr-FR')}</p>
                      <p className="text-gray-500 text-sm">Autres entraîneurs: {session.trainers?.filter(t => t !== coachReport.coach.first_name).join(', ') || 'Aucun'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Calendar Component (renamed to CalendarView for the sub-tab)
const CalendarView = () => {
  const [calendarData, setCalendarData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [players, setPlayers] = useState([]);
  const [hoveredSession, setHoveredSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchCalendarData();
    fetchPlayers();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const response = await axios.get(`${API}/calendar`);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du calendrier:', error);
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

  const fetchSessionDetails = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/sessions/${sessionId}`);
      setSelectedSession(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des détails de la séance:', error);
    }
  };

  // Group sessions by date
  const sessionsByDate = calendarData.reduce((acc, session) => {
    const date = session.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {});

  // Get days for calendar view
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add days from previous month to fill the first week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // Add 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isCurrentMonth = (day) => {
    return day.getMonth() === currentMonth.getMonth();
  };

  const getSessionsForDay = (day) => {
    const dateStr = day.toISOString().split('T')[0];
    return sessionsByDate[dateStr] || [];
  };

  // Calcul des statistiques du mois
  const getMonthStats = () => {
    const monthSessions = calendarData.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.getMonth() === currentMonth.getMonth() && 
             sessionDate.getFullYear() === currentMonth.getFullYear();
    });
    return monthSessions.length;
  };

  const getPlayerNames = (playerIds) => {
    return playerIds?.map(id => {
      const player = players.find(p => p.id === id);
      return player ? `${player.first_name} ${player.last_name}` : 'Joueur inconnu';
    }).join(', ') || '';
  };

  return (
    <div className="px-4 py-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Calendrier des entraînements</h2>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 px-4 py-2 rounded-full">
            <span className="font-medium text-blue-800">📅 {getMonthStats()} séances ce mois</span>
          </div>
          <button
            onClick={previousMonth}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors"
          >
            ←
          </button>
          <h3 className="text-xl font-semibold text-gray-800 min-w-[200px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={nextMonth}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative">
        {/* Header with day names */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-4 text-center font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const daySessions = getSessionsForDay(day);
            const isOtherMonth = !isCurrentMonth(day);
            
            return (
              <div
                key={index}
                className={`min-h-[120px] border-b border-r border-gray-200 p-2 ${
                  isOtherMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                }`}
              >
                <div className="font-semibold mb-1">
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {daySessions.slice(0, 3).map((session, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded truncate cursor-pointer hover:bg-blue-200 transition-colors"
                      onMouseEnter={() => setHoveredSession(session)}
                      onMouseLeave={() => setHoveredSession(null)}
                      onClick={() => fetchSessionDetails(session.id)}
                    >
                      {session.player_names?.slice(0, 2).join(', ')}
                    </div>
                  ))}
                  {daySessions.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{daySessions.length - 3} de plus
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover tooltip */}
        {hoveredSession && (
          <div className="absolute top-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-10 max-w-xs">
            <h4 className="font-semibold text-sm">{hoveredSession.player_names?.join(', ')}</h4>
            <p className="text-xs mt-1">Thèmes: {hoveredSession.themes?.join(', ')}</p>
            <p className="text-xs">Entraîneurs: {hoveredSession.trainers?.join(', ')}</p>
            <p className="text-xs mt-1 italic">Cliquez pour voir les détails</p>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Détails de la séance</h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">Joueurs:</h3>
                <p className="text-gray-600">{getPlayerNames(selectedSession.player_ids)}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700">Date:</h3>
                <p className="text-gray-600">{new Date(selectedSession.session_date).toLocaleDateString('fr-FR')}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700">Thèmes:</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedSession.themes?.map(theme => (
                    <span key={theme} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700">Entraîneurs:</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedSession.trainers?.map(trainer => (
                    <span key={trainer} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                      {trainer}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700">Contenu et détails:</h3>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-xl mt-1">
                  {selectedSession.content_details}
                </p>
              </div>
              
              {selectedSession.notes && (
                <div>
                  <h3 className="font-semibold text-gray-700">Notes:</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-xl mt-1">
                    {selectedSession.notes}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedSession(null)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Admin Component for User Management
const Admin = () => {
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    role: 'coach',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const { user: currentUser } = useAuth(); // Get current user for comparison

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/auth/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/create-user`, userFormData);
      setShowUserForm(false);
      setUserFormData({
        email: '',
        password: '',
        role: 'coach',
        first_name: '',
        last_name: ''
      });
      fetchUsers();
      setConfirmationMessage('✅ Utilisateur créé avec succès !');
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (error) {
      setConfirmationMessage('❌ Erreur lors de la création : ' + (error.response?.data?.detail || 'Erreur inconnue'));
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${userName} ?`)) {
      try {
        await axios.delete(`${API}/auth/users/${userId}`);
        fetchUsers();
        setConfirmationMessage('✅ Utilisateur supprimé avec succès !');
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000);
      } catch (error) {
        setConfirmationMessage('❌ Erreur lors de la suppression : ' + (error.response?.data?.detail || 'Erreur inconnue'));
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="fixed top-4 right-4 bg-white border-l-4 border-green-500 px-6 py-4 rounded-lg shadow-lg z-50 fade-in">
          <p className="text-gray-800">{confirmationMessage}</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Gestion des Utilisateurs</h1>
        <button
          onClick={() => setShowUserForm(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl transition-colors"
        >
          Nouvel Utilisateur
        </button>
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Créer un Utilisateur</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <input
                type="password"
                placeholder="Mot de passe (min. 6 caractères)"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                minLength={6}
              />
              <input
                type="text"
                placeholder="Prénom"
                value={userFormData.first_name}
                onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Nom"
                value={userFormData.last_name}
                onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl transition-colors"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-xl transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Utilisateurs ({users.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <h4 className="text-lg font-medium text-gray-800">
                  {user.first_name} {user.last_name}
                </h4>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrateur' : 'Coach'}
                  </span>
                  {user.last_login && (
                    <span className="text-xs text-gray-500">
                      Dernière connexion: {new Date(user.last_login).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-xl text-sm transition-colors"
                disabled={user.id === currentUser.id}
              >
                {user.id === currentUser.id ? 'Votre compte' : 'Supprimer'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Admin Component for User Management

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App min-h-screen bg-gray-50">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Navigation />
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/joueurs" element={<Players />} />
                  <Route path="/evaluations" element={<EvaluationManager />} />
                  <Route path="/entrainements" element={<SessionsAndCalendar />} />
                  <Route path="/assiduite" element={<CollectifManager />} />
                  <Route path="/rapports" element={<ReportsWithEvaluation />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
