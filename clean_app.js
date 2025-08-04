#!/usr/bin/env node

const fs = require('fs');

// Lire le fichier
const content = fs.readFileSync('/app/frontend/src/App.js', 'utf8');
const lines = content.split('\n');

// Fonction pour trouver la fin d'un composant React
function findComponentEnd(lines, startIndex) {
  let braceCount = 0;
  let started = false;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Compter les accolades
    for (let char of line) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        started = true;
      }
    }
    
    // Si on a trouvé la fermeture finale
    if (started && braceCount === 0 && line.includes('};')) {
      return i;
    }
  }
  return -1;
}

// Composants à garder (première occurrence seulement)
const componentsToKeep = {
  'const Login = () => {': null,
  'const ProtectedRoute = ({ children }) => {': null,
  'const AdminRoute = ({ children }) => {': null,
  'const Navigation = () => {': null,
  'const Admin = () => {': null
};

const cleanLines = [];
let skipUntil = -1;

for (let i = 0; i < lines.length; i++) {
  // Si on est en train de skipper des lignes
  if (i <= skipUntil) continue;
  
  const line = lines[i];
  let shouldSkip = false;
  
  // Vérifier si cette ligne commence un composant en double
  for (const [componentStart, savedIndex] of Object.entries(componentsToKeep)) {
    if (line.includes(componentStart)) {
      if (savedIndex === null) {
        // Première occurrence, on la garde
        componentsToKeep[componentStart] = i;
        break;
      } else {
        // Occurrence en double, on la supprime
        const endIndex = findComponentEnd(lines, i);
        if (endIndex !== -1) {
          skipUntil = endIndex;
          shouldSkip = true;
          console.log(`Suppression du doublon: ${componentStart} de la ligne ${i + 1} à ${endIndex + 1}`);
        }
        break;
      }
    }
  }
  
  if (!shouldSkip) {
    cleanLines.push(line);
  }
}

// Écrire le fichier nettoyé
fs.writeFileSync('/app/frontend/src/App.js', cleanLines.join('\n'));
console.log('Nettoyage terminé!');
