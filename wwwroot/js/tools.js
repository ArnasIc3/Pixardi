// Tools UI bindings and simple API for selecting tools/colors and wiring undo/clear buttons.

import { setCurrentTool, setCurrentColor, getCurrentTool, on as onState } from './state.js';
import { undo, clearCanvas } from './history.js';
import { attachCursorPreviewHandlers } from './cursor.js';

/**
 * Initialize toolbar: wire tool items, color options and action buttons.
 * Call once after DOM is ready (main.js should call this).
 */
export function initToolbar() {
    const toolItems = Array.from(document.querySelectorAll('.tool-item[data-tool]'));
    const colorOptions = Array.from(document.querySelectorAll('.color-option[data-color]'));

    // Tool clicks
    toolItems.forEach(t => {
        t.addEventListener('click', (ev) => {
            const tool = t.dataset.tool;
            if (!tool) return;
            selectTool(tool);
        });
    });

    // Color clicks
    colorOptions.forEach(c => {
        c.addEventListener('click', (ev) => {
            const color = c.dataset.color;
            if (!color) return;
            selectColor(color);
        });
    });

    // Action buttons
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', (e) => { e.preventDefault(); undo(); });

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', (e) => { e.preventDefault(); clearCanvas(); });

    // reflect initial state in UI
    refreshToolUI();
    refreshColorUI();

    // keep UI in sync if state changes elsewhere
    onState('tool', () => refreshToolUI());
    onState('color', () => refreshColorUI());

    // ensure cursor preview handlers are attached (idempotent)
    try { attachCursorPreviewHandlers(); } catch (e) { /* ignore if not available yet */ }
}

/**
 * Select a tool programmatically.
 */
export function selectTool(toolName) {
    if (!toolName) return;
    setCurrentTool(toolName);
    refreshToolUI();
}

/**
 * Select a color programmatically.
 */
export function selectColor(color) {
    if (!color) return;
    setCurrentColor(color);
    refreshColorUI();
}

/* --- internal UI helpers --- */
function refreshToolUI() {
    const active = getCurrentTool();
    const toolItems = Array.from(document.querySelectorAll('.tool-item[data-tool]'));
    toolItems.forEach(t => {
        if (t.dataset.tool === active) t.classList.add('active');
        else t.classList.remove('active');
    });
}

function refreshColorUI() {
    const activeColor = (typeof getCurrentColor === 'function') ? getCurrentColor() : (window.currentColor || '');
    const colorOptions = Array.from(document.querySelectorAll('.color-option[data-color]'));
    colorOptions.forEach(c => {
        const opt = (c.dataset.color || '').toLowerCase();
        if (opt === (activeColor || '').toLowerCase()) c.classList.add('active');
        else c.classList.remove('active');
    });
}

/* Exported helper list (optional for other modules) */
export const tools = {
    initToolbar,
    selectTool,
    selectColor,
};