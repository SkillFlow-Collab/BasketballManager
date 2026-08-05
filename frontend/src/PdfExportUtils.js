import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Fonction utilitaire pour exporter un élément en PDF
export const exportToPDF = async (elementId, filename = 'export', options = {}) => {
  const element = document.getElementById(elementId);
  const loadingDiv = document.createElement('div');
  try {
    // Afficher un message de chargement
    loadingDiv.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    loadingDiv.textContent = '📄 Génération du PDF...';
    document.body.appendChild(loadingDiv);

    if (!element) {
      throw new Error(`Élément avec l'ID "${elementId}" introuvable`);
    }

    // Masque temporairement les boutons/contrôles (ex: "Télécharger", "Modifier")
    // pour qu'ils n'apparaissent pas dans le PDF
    element.classList.add('pdf-exporting');

    // Options par défaut pour html2canvas (résolution plus élevée = rendu plus net)
    const defaultOptions = {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      scrollX: 0,
      scrollY: 0,
      ...options
    };

    // Capturer l'élément (une seule grande image de tout le contenu)
    const canvas = await html2canvas(element, defaultOptions);

    // Créer le PDF et répartir le contenu sur les pages A4,
    // en visant un maximum de 2 pages plutôt que de tout écraser sur une seule (illisible).
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8; // mm, marge autour du contenu sur chaque page
    const usableWidth = pdfWidth - margin * 2;
    const usableHeight = pdfHeight - margin * 2;
    const TARGET_PAGES = 2;

    // Échelle "pleine largeur" (la meilleure qualité possible)
    const widthFitPxToMm = usableWidth / canvas.width;
    // Échelle nécessaire pour que TOUT le contenu tienne sur TARGET_PAGES pages
    const heightFitPxToMm = (usableHeight * TARGET_PAGES) / canvas.height;
    // On prend la plus petite des deux : la qualité maximale si ça tient déjà,
    // sinon on réduit juste assez pour ne jamais dépasser le nombre de pages visé.
    const pxToMm = Math.min(widthFitPxToMm, heightFitPxToMm);

    const imgRenderWidthMm = canvas.width * pxToMm;
    const xOffset = margin + (usableWidth - imgRenderWidthMm) / 2; // centré si plus étroit que la page
    const pageHeightPx = usableHeight / pxToMm;

    const MAX_PAGES = TARGET_PAGES + 1; // petite marge de sécurité pour les arrondis
    let renderedHeightPx = 0;
    let pageIndex = 0;

    while (renderedHeightPx < canvas.height && pageIndex < MAX_PAGES) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);

      // Découpe la tranche correspondant à cette page dans un canvas temporaire
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, renderedHeightPx, canvas.width, sliceHeightPx,
        0, 0, canvas.width, sliceHeightPx
      );

      const imgData = pageCanvas.toDataURL('image/png');
      const imgHeightMm = sliceHeightPx * pxToMm;

      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'PNG', xOffset, margin, imgRenderWidthMm, imgHeightMm);

      renderedHeightPx += sliceHeightPx;
      pageIndex += 1;
    }

    // Télécharger le PDF
    pdf.save(`${filename}.pdf`);

    // Retirer les classes/éléments temporaires
    element.classList.remove('pdf-exporting');
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

    if (element) {
      element.classList.remove('pdf-exporting');
    }

    // Supprimer le message de chargement s'il existe
    if (loadingDiv.parentNode) {
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
