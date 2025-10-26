// App bootstrap (module entry). Initializes grid, tools, cursor and history.

import { getCanvasSize, setCanvasSize, getCurrentTool, getCurrentColor } from './state.js';
import { createGrid, updateCanvasSize } from './grid.js';
import { initToolbar } from './tools.js';
import { attachCursorPreviewHandlers } from './cursor.js';
import { bindHistoryKeys } from './history.js';
import { attachDrawingHandlers } from './drawing.js';

document.addEventListener('DOMContentLoaded', () => {
    // Ensure DOM areas exist (Index.cshtml should include required markup)
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

    // small debug helpers
    window.appState = {
        getCanvasSize,
        setCanvasSize,
        getCurrentTool,
        getCurrentColor
    };
});