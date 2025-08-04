# 🚀 Guide de Déploiement Vercel

## Frontend sur Vercel

### 1. Préparer le projet

Assurez-vous que votre dossier `frontend` contient tous les fichiers nécessaires et que `yarn build` fonctionne localement.

### 2. Déployer sur Vercel

#### Option A : Via Vercel CLI
```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter à Vercel
vercel login

# Déployer depuis le dossier frontend
cd frontend
vercel --prod
```

#### Option B : Via GitHub (Recommandé)
1. Poussez votre code sur GitHub
2. Allez sur [vercel.com](https://vercel.com)
3. Connectez votre compte GitHub
4. Importez votre repository
5. Configurez le projet :
   - **Root Directory:** `frontend`
   - **Framework:** Create React App
   - **Build Command:** `yarn build`
   - **Output Directory:** `build`

### 3. Variables d'environnement

Dans le dashboard Vercel, section **Environment Variables**, ajoutez :

```
REACT_APP_BACKEND_URL = https://votre-backend-url.com
```

⚠️ **Important :** Remplacez `https://votre-backend-url.com` par l'URL réelle de votre backend déployé.

### 4. Redéployer

Après avoir ajouté les variables d'environnement, redéployez :
- Via GitHub : Faites un nouveau commit
- Via CLI : `vercel --prod`

## Backend 

### Option 1 : Railway (Recommandé)

1. Allez sur [railway.app](https://railway.app)
2. Connectez GitHub
3. Sélectionnez votre repo
4. Choisissez le dossier `backend`
5. Variables d'environnement :
   ```
   MONGO_URL = mongodb+srv://username:password@cluster.mongodb.net/basketball?retryWrites=true&w=majority
   JWT_SECRET_KEY = votre-clé-secrète-de-32-caractères
   ENVIRONMENT = production
   ```

### Option 2 : Render

1. Allez sur [render.com](https://render.com)
2. Connectez GitHub
3. **New Web Service**
4. Configuration :
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Option 3 : Heroku

```bash
# Créer l'app
heroku create votre-app-backend

# Variables d'environnement
heroku config:set MONGO_URL="mongodb+srv://..." --app votre-app-backend
heroku config:set JWT_SECRET_KEY="votre-clé-secrète" --app votre-app-backend
heroku config:set ENVIRONMENT="production" --app votre-app-backend

# Créer un Procfile dans le dossier backend
echo "web: uvicorn server:app --host 0.0.0.0 --port \$PORT" > backend/Procfile

# Déployer
git subtree push --prefix=backend heroku main
```

## Base de Données MongoDB

### MongoDB Atlas (Gratuit)

1. Créez un compte sur [MongoDB Atlas](https://cloud.mongodb.com)
2. Créez un cluster gratuit (M0)
3. Créez un utilisateur de base de données
4. Ajoutez `0.0.0.0/0` dans Network Access (pour autoriser toutes les connexions)
5. Récupérez l'URL de connexion :
   ```
   mongodb+srv://username:password@cluster.mongodb.net/basketball?retryWrites=true&w=majority
   ```

## Variables d'Environnement Complètes

### Frontend (Vercel)
```
REACT_APP_BACKEND_URL = https://votre-backend-url.herokuapp.com
```

### Backend (Railway/Render/Heroku)
```
MONGO_URL = mongodb+srv://username:password@cluster.mongodb.net/basketball?retryWrites=true&w=majority
JWT_SECRET_KEY = une-clé-secrète-de-32-caractères-minimum
ENVIRONMENT = production
```

## 🔧 Dépannage

### Erreur de build sur Vercel
- Vérifiez que `yarn build` fonctionne localement
- Assurez-vous que le dossier `frontend` est bien configuré comme Root Directory

### CORS Error
- Vérifiez que `REACT_APP_BACKEND_URL` pointe vers la bonne URL backend
- Assurez-vous que le backend autorise votre domaine Vercel

### Backend ne démarre pas
- Vérifiez les logs de votre service backend
- Assurez-vous que `MONGO_URL` est correctement configuré
- Vérifiez que toutes les dépendances sont installées

## ✅ Checklist Final

- [ ] Code poussé sur GitHub
- [ ] Backend déployé avec variables d'environnement
- [ ] MongoDB Atlas configuré
- [ ] Frontend déployé sur Vercel
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Test de l'application en production
- [ ] Connexion admin fonctionne : `admin@staderochelais.com` / `admin123`