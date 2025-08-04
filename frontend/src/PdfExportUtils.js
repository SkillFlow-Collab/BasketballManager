import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Fonction utilitaire pour exporter un élément en PDF
export const exportToPDF = async (elementId, filename = 'export', options = {}) => {
  try {
    // Afficher un message de chargement
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    loadingDiv.textContent = '📄 Génération du PDF...';
    document.body.appendChild(loadingDiv);

    // Obtenir l'élément à capturer
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Élément avec l'ID "${elementId}" introuvable`);
    }

    // Options par défaut pour html2canvas
    const defaultOptions = {
      scale: 2, // Meilleure qualité
      useCORS: true, // Pour les images externes
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      ...options
    };

    // Capturer l'élément
    const canvas = await html2canvas(element, defaultOptions);
    
    // Créer le PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculer les dimensions pour s'adapter à la page
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = Math.min(pdfWidth / (canvasWidth * 0.264583), pdfHeight / (canvasHeight * 0.264583));
    
    const imgWidth = canvasWidth * 0.264583 * ratio;
    const imgHeight = canvasHeight * 0.264583 * ratio;
    
    // Centrer l'image dans la page
    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;
    
    // Ajouter l'image au PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    
    // Télécharger le PDF
    pdf.save(`${filename}.pdf`);
    
    // Supprimer le message de chargement
    document.body.removeChild(loadingDiv);
    
    // Message de succès
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    successDiv.textContent = '✅ PDF exporté avec succès !';
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      if (successDiv.parentNode) {
        document.body.removeChild(successDiv);
      }
    }, 3000);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'export en PDF:', error);
    
    // Supprimer le message de chargement s'il existe
    const loadingDiv = document.querySelector('.fixed.top-4.right-4');
    if (loadingDiv) {
      document.body.removeChild(loadingDiv);
    }
    
    // Message d'erreur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    errorDiv.textContent = '❌ Erreur lors de l\'export : ' + error.message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
    
    return false;
  }
};

// Fonction pour exporter le dashboard complet
export const exportDashboard = async () => {
  return await exportToPDF('dashboard-container', 'dashboard-stade-rochelais', {
    height: window.innerHeight * 3 // Capture plus de contenu si nécessaire
  });
};

// Fonction pour exporter un rapport joueur
export const exportPlayerReport = async (playerName) => {
  const filename = `rapport-joueur-${playerName.replace(/\s+/g, '-').toLowerCase()}`;
  return await exportToPDF('player-report-container', filename);
};

// Fonction pour exporter un rapport coach
export const exportCoachReport = async (coachName) => {
  const filename = `rapport-coach-${coachName.replace(/\s+/g, '-').toLowerCase()}`;
  return await exportToPDF('coach-report-container', filename);
};

// Fonction pour exporter un graphique spécifique
export const exportChart = async (chartId, chartName) => {
  const filename = `graphique-${chartName.replace(/\s+/g, '-').toLowerCase()}`;
  return await exportToPDF(chartId, filename);
};

// Fonction pour préparer un élément avant l'export (optionnel)
export const prepareElementForExport = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    // Ajouter une classe pour l'export si nécessaire
    element.classList.add('exporting');
    
    // Forcer le rendu des éléments cachés
    const hiddenElements = element.querySelectorAll('.hidden');
    hiddenElements.forEach(el => {
      el.style.display = 'block';
      el.style.visibility = 'visible';
    });
  }
  return element;
};

// Fonction pour nettoyer après l'export
export const cleanupAfterExport = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove('exporting');
    
    // Restaurer les éléments cachés
    const hiddenElements = element.querySelectorAll('.hidden');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.style.visibility = '';
    });
  }
};