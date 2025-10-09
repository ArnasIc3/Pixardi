// It expects a state module that exposes getCanvasSize() and setCanvasSize().
import { getCanvasSize, setCanvasSize } from './state.js';

/**
 * Return the grid element
 */
export function getGridElement() {
    return document.getElementById('pixelGrid');
}

/**
 * Query a pixel element by coordinates
 */
export function queryPixel(x, y) {
    const grid = getGridElement();
    if (!grid) return null;
    return grid.querySelector(`[data-x="${x}"][data-y="${y}"]`);
}

/**
 * Create the DOM grid based on current canvas size from state.
 * Removes existing children and rebuilds .pixel elements with data-x/data-y.
 */
export function createGrid() {
    const grid = getGridElement();
    if (!grid) return null;

    const { width, height } = getCanvasSize();
    grid.innerHTML = '';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${width}, var(--pixel-size, 12px))`;
    grid.style.width = 'auto';
    grid.style.height = 'auto';

    const frag = document.createDocumentFragment();
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const el = document.createElement('div');
            el.className = 'pixel';
            el.dataset.x = x;
            el.dataset.y = y;
            // inline sizing will be applied by updateCanvasSize; leaving unstyled here
            frag.appendChild(el);
        }
    }
    grid.appendChild(frag);

    // ensure pixels have correct inline sizing after build
    const pixelSize = getPixelSize();
    grid.style.setProperty('--pixel-size', `${pixelSize}px`);
    grid.style.gridTemplateColumns = `repeat(${width}, ${pixelSize}px)`;
    grid.style.width = `${width * pixelSize}px`;
    grid.style.height = `${height * pixelSize}px`;

    // apply explicit size to individual pixels (helps layout/measure)
    grid.querySelectorAll('.pixel').forEach(p => {
        p.style.width = `${pixelSize}px`;
        p.style.height = `${pixelSize}px`;
        p.style.background = ''; // default empty
    });

    return grid;
}

/**
 * Compute an appropriate pixel size so the whole grid fits the .grid-container.
 * Recreates grid cells if needed and applies inline sizing / CSS var --pixel-size.
 *
 * Usage: updateCanvasSize(56, 32)
 */
export function updateCanvasSize(newWidth, newHeight) {
    newWidth = Math.max(1, Math.floor(newWidth));
    newHeight = Math.max(1, Math.floor(newHeight));

    const grid = getGridElement();
    const container = document.querySelector('.grid-container') || document.body;

    // update state first so createGrid / other modules can read it
    setCanvasSize(newWidth, newHeight);

    if (!grid) return;

    // If count mismatches, rebuild grid DOM
    const expected = newWidth * newHeight;
    if (grid.children.length !== expected) {
        createGrid();
    }

    // compute available space inside container (leave small padding)
    const containerRect = container.getBoundingClientRect();
    const availableWidth = Math.max(120, containerRect.width - 16);
    const availableHeight = Math.max(120, window.innerHeight - containerRect.top - 24);

    // choose pixel size so grid fits both horizontally and vertically
    let pixelSize = Math.floor(Math.min(availableWidth / newWidth, availableHeight / newHeight));

    // clamp to reasonable bounds (adjust the max to taste)
    pixelSize = Math.max(6, Math.min(pixelSize, 80));

    // apply sizing to grid and pixels
    grid.style.setProperty('--pixel-size', `${pixelSize}px`);
    grid.style.gridTemplateColumns = `repeat(${newWidth}, ${pixelSize}px)`;
    grid.style.width = `${newWidth * pixelSize}px`;
    grid.style.height = `${newHeight * pixelSize}px`;
    grid.style.maxWidth = 'none';

    grid.querySelectorAll('.pixel').forEach(p => {
        p.style.width = `${pixelSize}px`;
        p.style.height = `${pixelSize}px`;
    });
}

/**
 * Read pixel size used by the grid (from CSS var or measured first .pixel).
 */
export function getPixelSize() {
    const grid = getGridElement();
    if (!grid) return 12;
    const cssVal = getComputedStyle(grid).getPropertyValue('--pixel-size').trim();
    if (cssVal) {
        const n = parseInt(cssVal, 10);
        if (!Number.isNaN(n) && n > 0) return n;
    }
    const first = grid.querySelector('.pixel');
    if (first) return Math.max(4, Math.round(first.getBoundingClientRect().width));
    // fallback to root var or default
    const rootVal = getComputedStyle(document.documentElement).getPropertyValue('--pixel-size').trim();
    if (rootVal) {
        const rn = parseInt(rootVal, 10);
        if (!Number.isNaN(rn) && rn > 0) return rn;
    }
    return 12;
}