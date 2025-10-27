import { getCanvasSize, setCanvasSize, getCurrentTool, getCurrentColor } from './state.js';
import { createGrid, updateCanvasSize } from './grid.js';
import { initToolbar } from './tools.js';
import { attachCursorPreviewHandlers } from './cursor.js';
import { bindHistoryKeys } from './history.js';
import { attachDrawingHandlers } from './drawing.js';
import { loadingScreen } from './loading.js';

document.addEventListener('DOMContentLoaded', async() => {
    // Make loading screen globally available first
    window.loadingScreen = loadingScreen;
    
    // Update loading text (screen is already visible from HTML)
    if (loadingScreen.textElement) {
        loadingScreen.textElement.textContent = 'Initializing Pixardi...';
    }

    // Wait minimum duration for loading screen
    const startTime = Date.now();
    
    // 1) Build grid DOM for current canvas size
    createGrid();

    // 2) Compute / apply pixel sizing so the grid fills the available area
    const { width, height } = getCanvasSize();
    updateCanvasSize(width, height);

    // 3) Initialize toolbar UI and action buttons
    initToolbar();

    // 4) Attach cursor preview handlers (use state getters)
    attachCursorPreviewHandlers({
        getCurrentTool: getCurrentTool,
        getCurrentColor: getCurrentColor,
        getCanvasSize: getCanvasSize
    });

    // 5) Bind global undo shortcut (Ctrl+Z / Cmd+Z)
    bindHistoryKeys();

    // 6) Attach drawing event handlers to enable mouse drawing
    attachDrawingHandlers();

    // Expose helper to change canvas size from console or other UI code
    window.changeCanvasSize = (w, h) => {
        setCanvasSize(w, h);
        createGrid();
        updateCanvasSize(w, h);
        // Re-attach handlers after recreating the grid
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