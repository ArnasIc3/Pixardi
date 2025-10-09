// Drawing primitives moved from app.js — exports drawing helpers used by main.js

import { queryPixel, getGridElement } from './grid.js';
import { getCanvasSize, getCurrentColor } from './state.js';
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

        // record previous and apply fill
        recordPixelChange(x, y, el.style.backgroundColor || '');
        el.style.backgroundColor = fillColor;

        // push neighbors
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
    const infectionRate = typeof opts.infectionRate === 'number' ? opts.infectionRate : 0.4;
    const spreadDelay = typeof opts.spreadDelay === 'number' ? opts.spreadDelay : 60;
    const maxGenerations = typeof opts.maxGenerations === 'number' ? opts.maxGenerations : 12;

    const infectionColor = normalizeColor(opts.color || getCurrentColor() || '#000000');

    // guard: don't run on walls (black) if black is considered barrier
    const startEl = queryPixel(startX, startY);
    const startColor = normalizeColor(startEl?.style.backgroundColor || '');
    if (startColor === '#000000') return;

    startAction('virus');

    // infect start
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

export default {
    drawLine,
    paintPixelAt,
    erasePixelAt,
    paintPixelAtWithColor,
    floodFill,
    pixelVirus,
    normalizeColor,
    getNeighbors
};