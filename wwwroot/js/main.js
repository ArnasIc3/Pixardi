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
    if (isAuthenticated) {
        import('./projects.js').then(module => {
            module.initProjectControls();
        });
    }

    // Ensure minimum loading time, then hide
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 1500 - elapsed); // 1.5 seconds minimum
    
    setTimeout(() => {
        loadingScreen.hide();
    }, remainingTime);

    // small debug helpers
    window.appState = {
        getCanvasSize,
        setCanvasSize,
        getCurrentTool,
        getCurrentColor
    };
});