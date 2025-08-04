// Script pour remplacer automatiquement les logos par le logo SKILLFLOW
(function() {
    'use strict';
    
    function replaceLogos() {
        // Remplacer toutes les images de logo
        const images = document.querySelectorAll('img[alt*="Stade"], img[src*="staderochelais"], img[src*="logo"]');
        
        images.forEach(img => {
            if (!img.src.includes('skillflow')) {
                img.src = '/skillflow-official-logo.svg';
                img.alt = 'SKILLFLOW - Stade Rochelais Basketball';
                img.style.height = 'auto';
                img.style.maxHeight = '60px';
                img.style.filter = 'brightness(1.1)';
            }
        });
        
        // Ajouter le logo SKILLFLOW dans la navigation si pas présent
        const nav = document.querySelector('nav');
        if (nav && !nav.querySelector('img[src*="skillflow"]')) {
            const logoContainer = nav.querySelector('.flex.items-center.space-x-4');
            if (logoContainer) {
                const existingLogo = logoContainer.querySelector('img');
                if (existingLogo) {
                    existingLogo.src = '/skillflow-official-logo.svg';
                    existingLogo.alt = 'SKILLFLOW - Stade Rochelais Basketball';
                    existingLogo.style.height = '48px';
                    existingLogo.style.width = 'auto';
                    existingLogo.style.filter = 'brightness(1.1)';
                } else {
                    // Créer un nouveau logo
                    const logo = document.createElement('img');
                    logo.src = '/skillflow-official-logo.svg';
                    logo.alt = 'SKILLFLOW - Stade Rochelais Basketball';
                    logo.style.height = '48px';
                    logo.style.width = 'auto';
                    logo.style.filter = 'brightness(1.1)';
                    logoContainer.insertBefore(logo, logoContainer.firstChild);
                }
            }
        }
        
        // Remplacer le logo de connexion
        const loginLogos = document.querySelectorAll('.skillflow-logo, .bg-gray-900.rounded-xl');
        loginLogos.forEach(logoDiv => {
            if (logoDiv.parentElement) {
                const img = document.createElement('img');
                img.src = '/skillflow-official-logo.svg';
                img.alt = 'SKILLFLOW - Stade Rochelais Basketball';
                img.style.height = '120px';
                img.style.width = 'auto';
                img.style.maxWidth = '100%';
                img.style.filter = 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
                logoDiv.parentElement.replaceChild(img, logoDiv);
            }
        });
    }
    
    // Exécuter quand le DOM est chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', replaceLogos);
    } else {
        replaceLogos();
    }
    
    // Observer les changements du DOM pour les nouvelles pages
    const observer = new MutationObserver(replaceLogos);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Remplacer toutes les 2 secondes pour être sûr
    setInterval(replaceLogos, 2000);
})();