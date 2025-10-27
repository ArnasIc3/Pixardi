import { getCanvasSize, setCanvasSize, getCurrentTool, getCurrentColor } from './state.js';
import { createGrid, updateCanvasSize } from './grid.js';
import { initToolbar } from './tools.js';
import { attachCursorPreviewHandlers } from './cursor.js';
import { bindHistoryKeys } from './history.js';
import { attachDrawingHandlers } from './drawing.js';
import { loadingScreen } from './loading.js';

document.addEventListener('DOMContentLoaded', async() => {
    window.loadingScreen = loadingScreen;
    
    if (loadingScreen.textElement) {
        loadingScreen.textElement.textContent = 'Initializing Pixardi...';
    }

    const startTime = Date.now();
    
    createGrid();

    const { width, height } = getCanvasSize();
    updateCanvasSize(width, height);

    initToolbar();

    attachCursorPreviewHandlers({
        getCurrentTool: getCurrentTool,
        getCurrentColor: getCurrentColor,
        getCanvasSize: getCanvasSize
    });

    bindHistoryKeys();
    attachDrawingHandlers();
    window.changeCanvasSize = (w, h) => {
        setCanvasSize(w, h);
        createGrid();
        updateCanvasSize(w, h);
        attachDrawingHandlers();
        attachCursorPreviewHandlers({
            getCurrentTool: getCurrentTool,
            getCurrentColor: getCurrentColor,
            getCanvasSize: getCanvasSize
        });
    };
    
    // Project controls if user is authenticated
    const isAuthenticated = document.getElementById('saveProjectBtn') !== null;
    console.log('User authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
        console.log('Loading projects.js module...');
        import('./projects.js').then(module => {
            console.log('Projects module loaded, initializing controls...');
            module.initProjectControls();
        }).catch(error => {
            console.error('Failed to load projects.js:', error);
        });
    }

    // Ensure minimum loading time, then hide
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 1500 - elapsed); // 1.5 seconds minimum
    
    setTimeout(() => {
        console.log('Hiding loading screen...');
        loadingScreen.hide();
        
        // Additional failsafe - force clear after a short delay
        setTimeout(() => {
            const loadingElement = document.getElementById('loadingScreen');
            if (loadingElement && (loadingElement.classList.contains('active') || loadingElement.style.display !== 'none')) {
                console.log('Failsafe: Force clearing stuck loading screen');
                window.clearStuckOverlays();
            }
        }, 500);
    }, remainingTime);

    // small debug helpers
    window.appState = {
        getCanvasSize,
        setCanvasSize,
        getCurrentTool,
        getCurrentColor
    };
    
    // Failsafe function to clear any stuck overlays
    window.clearStuckOverlays = function() {
        const loadingElement = document.getElementById('loadingScreen');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (loadingElement) {
            loadingElement.classList.remove('active', 'fade-background', 'fade-content', 'auth');
            loadingElement.style.display = 'none';
        }
        
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            modalOverlay.style.display = 'none';
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
        
        // Re-enable body scroll if it was disabled
        document.body.style.overflow = '';
        
        console.log('Cleared all stuck overlays');
    };
});