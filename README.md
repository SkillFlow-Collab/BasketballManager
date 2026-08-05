# 🏀 Basketball Manager 

Application de gestion d'entraînements de basketball avec système de suivi des joueurs, séances et évaluations.

## 📋 Fonctionnalités

- ✅ **Dashboard moderne** avec analytics en temps réel
- ✅ **Gestion des joueurs** et des coachs
- ✅ **Séances individuelles** et collectives
- ✅ **Système d'évaluations** complet
- ✅ **Rapports PDF** exportables
- ✅ **Calendrier** des séances collectives
- ✅ **Suivi de présence** avec statistiques

## 🚀 Technologies

**Frontend:**
- React 19
- Tailwind CSS
- Chart.js pour les graphiques
- React Router pour la navigation
- Axios pour les API calls

**Backend:**
- FastAPI (Python)
- MongoDB pour la base de données
- JWT pour l'authentification
- Bcrypt pour le hachage des mots de passe

## 🛠️ Installation Locale

### Prérequis
- Node.js 18+ et Yarn
- Python 3.8+
- MongoDB

### 1. Cloner le projet
```bash
git clone <votre-repo-url>
cd basketball-manager
```

### 2. Configuration Backend
```bash
cd backend
pip install -r requirements.txt

# Créer le fichier .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017/basketball_db
JWT_SECRET_KEY=votre-clé-secrète-très-sécurisée
ENVIRONMENT=development
EOF
```

### 3. Configuration Frontend
```bash
cd frontend
yarn install

# Créer le fichier .env
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
```

### 4. Lancement
```bash
# Terminal 1 - Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
yarn start
```

L'application sera accessible sur `http://localhost:3000`

## 🌐 Déploiement

### Option 1: Vercel (Recommandé pour le Frontend)

#### 1. Préparer le projet
```bash
# Ajouter vercel.json à la racine
```

#### 2. Variables d'environnement Vercel
Dans le dashboard Vercel, ajouter :
- `REACT_APP_BACKEND_URL`: URL de votre backend déployé

#### 3. Déployer
```bash
npm i -g vercel
vercel --prod
```

### Option 2: Netlify

#### 1. Build settings
- Build command: `cd frontend && yarn build`
- Publish directory: `frontend/build`

#### 2. Variables d'environnement
- `REACT_APP_BACKEND_URL`: URL de votre backend

### Option 3: Heroku (Full Stack)

#### 1. Backend sur Heroku
```bash
# Créer l'app backend
heroku create votre-app-backend

# Variables d'environnement
heroku config:set MONGO_URL="mongodb+srv://..." --app votre-app-backend
heroku config:set JWT_SECRET_KEY="votre-clé-secrète" --app votre-app-backend
heroku config:set ENVIRONMENT="production" --app votre-app-backend

# Déployer
git subtree push --prefix=backend heroku-backend main
```

#### 2. Frontend sur Heroku
```bash
# Créer l'app frontend
heroku create votre-app-frontend

# Variables d'environnement
heroku config:set REACT_APP_BACKEND_URL="https://votre-app-backend.herokuapp.com" --app votre-app-frontend

# Déployer
git subtree push --prefix=frontend heroku-frontend main
```

### Option 4: Railway

#### 1. Backend
- Connecter le repo GitHub
- Sélectionner le dossier `backend`
- Ajouter les variables d'environnement

#### 2. Frontend
- Créer un nouveau service
- Sélectionner le dossier `frontend`
- Build command: `yarn build`
- Start command: `yarn start`

### Option 5: DigitalOcean App Platform

Utilisez le fichier `.do/app.yaml` fourni :
- Connectez votre repo GitHub
- DigitalOcean détectera automatiquement la configuration

## 🗃️ Base de Données

### MongoDB Atlas (Cloud - Recommandé)

1. Créer un compte sur [MongoDB Atlas](https://cloud.mongodb.com)
2. Créer un cluster gratuit
3. Créer un utilisateur de base de données
4. Autoriser les connexions (0.0.0.0/0 pour la production)
5. Récupérer l'URL de connexion
6. Utiliser l'URL dans `MONGO_URL`

### MongoDB Local
```bash
# Installation sur Ubuntu/Debian
sudo apt install mongodb

# Démarrer le service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# URL de connexion
MONGO_URL=mongodb://localhost:27017/basketball_db
```

## 🔐 Variables d'Environnement

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/basketball_db
JWT_SECRET_KEY=une-clé-très-sécurisée-de-32-caractères-minimum
ENVIRONMENT=production
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://votre-backend-url.com
```

## 👤 Comptes par Défaut

### Administrateur
- Email: `admin@staderochelais.com`
- Mot de passe: `admin123`

### Coach
- Email: `coach@exemple.com`
- Mot de passe: `coach123`

## 📊 Fonctionnalités Principales

### Dashboard
- KPI cards avec animations
- Graphiques interactifs (Chart.js)
- Alertes et recommandations automatiques
- Export PDF du dashboard complet

### Gestion des Séances
- Séances individuelles avec thèmes multiples
- Séances collectives avec calendrier
- Système d'évaluations par thèmes
- Suivi de présence avec statistiques

### Rapports
- Rapports joueurs avec graphiques radar
- Rapports coachs avec statistiques
- Export PDF haute qualité
- Tri automatique par performance

### Administration
- Gestion des utilisateurs
- Rôles et permissions
- Monitoring des activités

## 🔧 Scripts Utiles

```bash
# Frontend
yarn build          # Build de production
yarn test           # Tests
yarn eject          # Ejecter CRA (non recommandé)

# Backend
python -m pytest   # Tests
uvicorn server:app --reload  # Mode développement
uvicorn server:app --host 0.0.0.0 --port 8001  # Production
```

## 🚨 Sécurité

### Production Checklist
- [ ] Changer le `JWT_SECRET_KEY` par défaut
- [ ] Utiliser HTTPS en production
- [ ] Configurer CORS correctement
- [ ] Utiliser MongoDB Atlas avec authentification
- [ ] Activer les logs de sécurité
- [ ] Limiter les tentatives de connexion

### Variables Sensibles
```env
# Générer une clé JWT sécurisée
JWT_SECRET_KEY=$(openssl rand -hex 32)

# URL MongoDB avec authentification
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

## 📱 Support Navigateurs

- ✅ Chrome 90+
- ✅ Firefox 90+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile (iOS Safari, Chrome Mobile)

## 🆘 Dépannage

### Erreur de connexion MongoDB
```bash
# Vérifier la connexion
python -c "from pymongo import MongoClient; print(MongoClient('votre-url').admin.command('ping'))"
```

### Erreur CORS
Vérifier que `REACT_APP_BACKEND_URL` est correctement configuré dans le frontend.

### Build Frontend échoue
```bash
# Nettoyer le cache
rm -rf node_modules package-lock.json
yarn install
yarn build
```

## 📞 Support

Pour toute question ou problème, créer une issue sur GitHub avec :
- Version de Node.js et Python
- Messages d'erreur complets
- Étapes pour reproduire le problème
- Configuration d'environnement

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**🏀 Développé pour le Stade Rochelais Basketball**
