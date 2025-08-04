#!/bin/bash

# 🚀 Script de Déploiement Automatique
# Basketball Manager - Stade Rochelais

echo "🏀 Basketball Manager - Préparation pour le déploiement..."

# Vérifications préliminaires
echo "📋 Vérification des prérequis..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier Yarn
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn n'est pas installé"
    exit 1
fi

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé"
    exit 1
fi

echo "✅ Tous les prérequis sont satisfaits"

# Préparation du Frontend
echo "🎨 Préparation du Frontend..."
cd frontend

# Installation des dépendances
echo "📦 Installation des dépendances frontend..."
yarn install

# Test du build
echo "🔨 Test du build de production..."
yarn build

if [ $? -eq 0 ]; then
    echo "✅ Build frontend réussi"
else
    echo "❌ Échec du build frontend"
    exit 1
fi

cd ..

# Préparation du Backend
echo "🛠️ Préparation du Backend..."
cd backend

# Vérification des dépendances Python
echo "📦 Vérification des dépendances backend..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dépendances backend installées"
else
    echo "❌ Échec de l'installation des dépendances backend"
    exit 1
fi

cd ..

# Création des fichiers d'environnement d'exemple
echo "📝 Création des fichiers d'environnement d'exemple..."

# Backend .env.example
cat > backend/.env.example << EOF
# Configuration Backend
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/basketball?retryWrites=true&w=majority
JWT_SECRET_KEY=une-clé-secrète-de-32-caractères-minimum-changez-moi
ENVIRONMENT=production
EOF

# Frontend .env.example
cat > frontend/.env.example << EOF
# Configuration Frontend
REACT_APP_BACKEND_URL=https://votre-backend-url.com
EOF

# Création du fichier .gitignore si nécessaire
if [ ! -f ".gitignore" ]; then
    echo "📄 Création du .gitignore..."
    cat > .gitignore << EOF
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node_modules
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build output
.nuxt

# Vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Django
*.log
local_settings.py
db.sqlite3

# Flask
instance/
.webassets-cache

# Scrapy
.scrapy

# Sphinx documentation
docs/_build/

# PyBuilder
target/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# pyenv
.python-version

# celery beat schedule file
celerybeat-schedule

# SageMath parsed files
*.sage.py

# Environments
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Spyder project settings
.spyderproject
.spyproject

# Rope project settings
.ropeproject

# mkdocs documentation
/site

# mypy
.mypy_cache/
.dmypy.json
dmypy.json

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
EOF
fi

echo "✅ Préparation terminée!"
echo ""
echo "📋 Prochaines étapes pour le déploiement:"
echo ""
echo "1. 🗃️ Configurer MongoDB Atlas:"
echo "   - Créer un compte sur https://cloud.mongodb.com"
echo "   - Créer un cluster gratuit"
echo "   - Créer un utilisateur de base de données"
echo "   - Autoriser les connexions (0.0.0.0/0)"
echo ""
echo "2. 🚀 Déployer le Backend (choisir une option):"
echo "   - Railway: https://railway.app"
echo "   - Render: https://render.com"
echo "   - Heroku: https://heroku.com"
echo ""
echo "3. 🌐 Déployer le Frontend sur Vercel:"
echo "   - Pousser le code sur GitHub"
echo "   - Connecter le repo sur https://vercel.com"
echo "   - Configurer Root Directory: 'frontend'"
echo "   - Ajouter REACT_APP_BACKEND_URL en variable d'environnement"
echo ""
echo "4. 🔐 Configurer les variables d'environnement:"
echo "   - Copier .env.example vers .env"
echo "   - Remplacer les valeurs par les vraies"
echo ""
echo "📖 Consultez DEPLOYMENT_GUIDE.md pour les instructions détaillées"
echo ""
echo "🎉 Votre application Basketball Manager est prête pour le déploiement!"