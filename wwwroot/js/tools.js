import { setCurrentTool, setCurrentColor, getCurrentTool, getCurrentColor, getCanvasSize, on as onState } from './state.js';
import { undo, startAction, recordPixelChange, endAction } from './history.js';
import { attachCursorPreviewHandlers } from './cursor.js';
import { queryPixel, getGridElement } from './grid.js';
import { paintPixelAtWithColor, normalizeColor, getNeighbors } from './drawing.js';

/**
 * Initialize toolbar with event listeners
 */
export function initToolbar() {
    const toolItems = Array.from(document.querySelectorAll('.tool-item[data-tool]'));
    const colorOptions = Array.from(document.querySelectorAll('.color-option[data-color]'));

    toolItems.forEach(t => {
        t.addEventListener('click', (ev) => {
            const tool = t.dataset.tool;
            if (!tool) return;
            selectTool(tool);
        });
    });

    colorOptions.forEach(c => {
        c.addEventListener('click', (ev) => {
            const color = c.dataset.color;
            if (!color) return;
            selectColor(color);
        });
    });

    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', (e) => { e.preventDefault(); undo(); });

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', (e) => { e.preventDefault(); clearCanvas(); });

    refreshToolUI();
    refreshColorUI();

    onState('tool', () => {
        refreshToolUI();
        updateVirusControlsVisibility();
    });
    onState('color', () => refreshColorUI());

    initVirusControls();
    try { attachCursorPreviewHandlers(); } catch (e) { }
}

export function selectTool(toolName) {
    if (!toolName) return;
    setCurrentTool(toolName);
    refreshToolUI();
}

export function selectColor(color) {
    if (!color) return;
    setCurrentColor(color);
    refreshColorUI();
}
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

/**
 * Flood fill starting at (startX,startY). Records a single action so it can be undone.
 * targetColor should be the color (string) to replace; fillColor is the new color.
 */
export function floodFill(startX, startY, targetColor, fillColor) {
    const grid = getGridElement();
    if (!grid) return;
    targetColor = normalizeColor(targetColor || '');
    fillColor = fillColor || getCurrentColor() || '#000000';
    const fillNorm = normalizeColor(fillColor);

    if (targetColor === fillNorm) return;

    startAction('fill');
    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const el = queryPixel(x, y);
        if (!el) continue;
        const currentNorm = normalizeColor(el.style.backgroundColor || '');
        if (currentNorm !== targetColor) continue;

        recordPixelChange(x, y, el.style.backgroundColor || '');
        el.style.backgroundColor = fillColor;

        const neigh = getNeighbors(x, y);
        for (let i = 0; i < neigh.length; i++) {
            stack.push(neigh[i]);
        }
    }

    endAction();
}

/**
 * Pixel virus: spreads from start pixel outward probabilistically.
 * Records a single action so the entire run is undoable.
 */
export function pixelVirus(startX, startY, opts = {}) {
    const grid = getGridElement();
    if (!grid) return;
    
    const sliderSettings = getVirusSettings();
    const infectionRate = typeof opts.infectionRate === 'number' ? opts.infectionRate : sliderSettings.infectionRate;
    const spreadDelay = typeof opts.spreadDelay === 'number' ? opts.spreadDelay : sliderSettings.spreadDelay;
    const maxGenerations = typeof opts.maxGenerations === 'number' ? opts.maxGenerations : sliderSettings.maxGenerations;

    const infectionColor = normalizeColor(opts.color || getCurrentColor() || '#000000');

    const startEl = queryPixel(startX, startY);
    const startColor = normalizeColor(startEl?.style.backgroundColor || '');
    if (startColor === '#000000') return;

    startAction('virus');
    paintPixelAtWithColor(startX, startY, infectionColor);
    const visited = new Set([`${startX},${startY}`]);
    let frontier = [[startX, startY]];
    let generation = 0;

    function step() {
        if (frontier.length === 0 || generation >= maxGenerations) {
            endAction();
            return;
        }

        const next = [];
        frontier.forEach(([x, y]) => {
            const neigh = getNeighbors(x, y);
            neigh.forEach(([nx, ny]) => {
                const key = `${nx},${ny}`;
                if (visited.has(key)) return;

                const el = queryPixel(nx, ny);
                if (!el) {
                    visited.add(key);
                    return;
                }

                const nColor = normalizeColor(el.style.backgroundColor || '');
                if (nColor === '#000000') {
                    visited.add(key);
                    return;
                }
                if (nColor === infectionColor) {
                    visited.add(key);
                    return;
                }

                if (Math.random() < infectionRate) {
                    visited.add(key);
                    paintPixelAtWithColor(nx, ny, infectionColor);
                    next.push([nx, ny]);
                }
            });
        });

        generation++;
        frontier = next;
        if (frontier.length > 0) setTimeout(step, spreadDelay);
        else endAction();
    }

    setTimeout(step, spreadDelay);
}

/**
 * Clear the entire canvas
 */
export function clearCanvas() {
    startAction('clear');
    const grid = getGridElement();
    if (!grid) { endAction(); return; }
    const pixels = Array.from(grid.querySelectorAll('.pixel'));
    pixels.forEach(px => {
        const x = parseInt(px.dataset.x, 10);
        const y = parseInt(px.dataset.y, 10);
        const prev = px.style.backgroundColor || '';
        recordPixelChange(x, y, prev);
        px.style.backgroundColor = '';
    });
    endAction();
}

/**
 * Initialize virus controls sliders
 */
function initVirusControls() {
    const infectionRateSlider = document.getElementById('infectionRate');
    const spreadDelaySlider = document.getElementById('spreadDelay');
    const maxGenerationsSlider = document.getElementById('maxGenerations');
    
    const infectionRateValue = document.getElementById('infectionRateValue');
    const spreadDelayValue = document.getElementById('spreadDelayValue');
    const maxGenerationsValue = document.getElementById('maxGenerationsValue');

    if (infectionRateSlider && infectionRateValue) {
        infectionRateSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            infectionRateValue.textContent = Math.round(value * 100) + '%';
        });
    }

    if (spreadDelaySlider && spreadDelayValue) {
        spreadDelaySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            spreadDelayValue.textContent = value + 'ms';
        });
    }

    if (maxGenerationsSlider && maxGenerationsValue) {
        maxGenerationsSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            maxGenerationsValue.textContent = value.toString();
        });
    }
}

/**
 * Toggle virus controls visibility
 */
function updateVirusControlsVisibility() {
    const virusControls = document.getElementById('virusControls');
    const currentTool = getCurrentTool();
    
    if (!virusControls) return;
    
    if (currentTool === 'virus') {
        virusControls.style.display = 'block';
        virusControls.classList.add('show');
        virusControls.classList.remove('hide');
    } else {
        virusControls.classList.add('hide');
        virusControls.classList.remove('show');
        setTimeout(() => {
            if (!virusControls.classList.contains('show')) {
                virusControls.style.display = 'none';
            }
        }, 300);
    }
}

/**
 * Get virus settings from sliders
 */
export function getVirusSettings() {
    const infectionRate = parseFloat(document.getElementById('infectionRate')?.value || '0.5');
    const spreadDelay = parseInt(document.getElementById('spreadDelay')?.value || '40');
    const maxGenerations = parseInt(document.getElementById('maxGenerations')?.value || '30');
    
    return {
        infectionRate,
        spreadDelay,
        maxGenerations
    };
}


export const tools = {
    initToolbar,
    selectTool,
    selectColor,
    floodFill,
    pixelVirus,
    clearCanvas,
    getVirusSettings,
};