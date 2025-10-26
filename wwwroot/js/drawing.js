// Basic drawing primitives and mouse event coordination - pixel-level operations

import { queryPixel, getGridElement } from './grid.js';
import { getCanvasSize, getCurrentColor, getCurrentTool } from './state.js';
import { startAction, recordPixelChange, endAction } from './history.js';

/**
 * Normalize a CSS color string for simple equality checks.
 * This is a lightweight normalizer: prefers hex when possible,
 * but falls back to trimmed lower-case input.
 */
export function normalizeColor(color) {
    if (!color) return '';
    const s = String(color).trim();
    // handle rgb(a)
    if (/^rgba?\(/i.test(s)) {
        // extract numbers and convert to hex (ignore alpha for normalization)
        const nums = s.replace(/^rgba?\(|\s+|\)$/gi, '').split(',').map(n => parseInt(n, 10) || 0);
        const r = (nums[0] || 0), g = (nums[1] || 0), b = (nums[2] || 0);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`.toLowerCase();
    }
    // already hex? normalize length and lowercase
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) {
        return s.toLowerCase();
    }
    return s.toLowerCase();
}

/**
 * Return orthogonal neighbors inside canvas bounds.
 */
export function getNeighbors(x, y) {
    const { width, height } = getCanvasSize();
    const neighbors = [];
    if (x > 0) neighbors.push([x - 1, y]);
    if (x + 1 < width) neighbors.push([x + 1, y]);
    if (y > 0) neighbors.push([x, y - 1]);
    if (y + 1 < height) neighbors.push([x, y + 1]);
    return neighbors;
}

/**
 * Paint pixel at x,y with current color (records history).
 */
export function paintPixelAt(x, y) {
    const el = queryPixel(x, y);
    if (!el) return;
    const prev = el.style.backgroundColor || '';
    recordPixelChange(x, y, prev);
    el.style.backgroundColor = getCurrentColor() || '#000000';
}

/**
 * Erase pixel at x,y (records history).
 */
export function erasePixelAt(x, y) {
    const el = queryPixel(x, y);
    if (!el) return;
    const prev = el.style.backgroundColor || '';
    recordPixelChange(x, y, prev);
    // clear inline color -> treated as transparent/empty
    el.style.backgroundColor = '';
}

/**
 * Paint pixel at x,y with a specific color (records history).
 * color may be a CSS string (hex / rgb...)
 */
export function paintPixelAtWithColor(x, y, color) {
    const el = queryPixel(x, y);
    if (!el) return;
    const prev = el.style.backgroundColor || '';
    recordPixelChange(x, y, prev);
    el.style.backgroundColor = color || getCurrentColor() || '#000000';
}

/**
 * Bresenham line drawing between integer coordinates (inclusive).
 * drawLine will record changes via paintPixelAtWithColor.
 * color optional -> if omitted current color is used.
 */
export function drawLine(x0, y0, x1, y1, color) {
    // integerize
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        paintPixelAtWithColor(x0, y0, color);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}



/**
 * Attach drawing event handlers to the grid for mouse interactions.
 * This enables drawing, erasing, filling, and virus tools.
 */
export function attachDrawingHandlers() {
    let isDrawing = false;
    let lastX = null, lastY = null;

    function isInBounds(x, y) {
        const { width, height } = getCanvasSize();
        return x >= 0 && x < width && y >= 0 && y < height;
    }

    const grid = getGridElement();
    if (!grid) {
        console.warn('Grid element not found, cannot attach drawing handlers');
        return;
    }

    // Prevent default drag behavior that causes the "no drop" cursor
    grid.addEventListener('dragstart', (e) => e.preventDefault());
    grid.addEventListener('dragover', (e) => e.preventDefault());
    grid.addEventListener('drop', (e) => e.preventDefault());

    grid.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent text selection and drag
        if (e.button !== 0) return; // only left mouse button
        
        const x = parseInt(e.target.dataset.x, 10);
        const y = parseInt(e.target.dataset.y, 10);
        if (!isInBounds(x, y)) return;

        lastX = x;
        lastY = y;
        isDrawing = true;

        const tool = getCurrentTool();
        if (tool === 'brush') {
            startAction('stroke');
            paintPixelAt(x, y);
        } else if (tool === 'eraser') {
            startAction('erase');
            erasePixelAt(x, y);
        } else if (tool === 'fill') {
            // Use dynamic import for tool functions to avoid circular dependencies
            import('./tools.js').then(toolsModule => {
                const pixel = e.target;
                const targetColor = pixel.style.backgroundColor || '';
                toolsModule.floodFill(x, y, targetColor, getCurrentColor());
            }).catch(err => console.error('Error loading tools module:', err));
        } else if (tool === 'virus') {
            // Use dynamic import for tool functions to avoid circular dependencies
            import('./tools.js').then(toolsModule => {
                toolsModule.pixelVirus(x, y, { color: getCurrentColor() });
            }).catch(err => console.error('Error loading tools module:', err));
        }
    });

    grid.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        
        const x = parseInt(e.target.dataset.x, 10);
        const y = parseInt(e.target.dataset.y, 10);
        if (!isInBounds(x, y)) return;

        const tool = getCurrentTool();
        if ((tool === 'brush' || tool === 'eraser') && lastX !== null && lastY !== null) {
            if (tool === 'brush') {
                drawLine(lastX, lastY, x, y, getCurrentColor());
            } else {
                // For eraser, we need to erase each pixel in the line
                drawEraseLine(lastX, lastY, x, y);
            }
            lastX = x;
            lastY = y;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDrawing) {
            isDrawing = false;
            lastX = null;
            lastY = null;
            endAction();
        }
    });

    console.log('Drawing handlers attached successfully');
}

/**
 * Draw an erase line between two points
 */
function drawEraseLine(x0, y0, x1, y1) {
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        erasePixelAt(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}

export default {
    drawLine,
    paintPixelAt,
    erasePixelAt,
    paintPixelAtWithColor,
    normalizeColor,
    getNeighbors,
    attachDrawingHandlers
};