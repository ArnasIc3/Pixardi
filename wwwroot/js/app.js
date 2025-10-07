console.log("🎯 JavaScript file loaded successfully!");

let isDrawing = false;
let isErasing = false;
let currentTool = 'brush';
let currentColor = '#000000';
let lastX = null;
let lastY = null;

// Dynamic canvas size - can be changed here
let CANVAS_WIDTH = 48;
let CANVAS_HEIGHT = 48;

// Calculate optimal pixel size based on canvas dimensions
function getOptimalPixelSize() {
    const maxCanvasSize = 600; // Maximum canvas size in pixels
    const maxDimension = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (maxDimension <= 16) return 20;      // 16x16 = 20px pixels
    if (maxDimension <= 32) return 15;      // 32x32 = 15px pixels  
    if (maxDimension <= 48) return 12;      // 48x48 = 12px pixels
    if (maxDimension <= 64) return 9;       // 64x64 = 9px pixels
    if (maxDimension <= 96) return 6;       // 96x96 = 6px pixels
    return Math.floor(maxCanvasSize / maxDimension); // Auto-calculate for larger sizes
}

function updateCanvasSize(width, height) {
    CANVAS_WIDTH = width;
    CANVAS_HEIGHT = height;
    console.log(`Canvas size updated to: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);
    createGrid();
}

function createGrid() {
    console.log(`Creating ${CANVAS_WIDTH}x${CANVAS_HEIGHT} grid...`);
    const grid = document.getElementById('pixelGrid');

    if (!grid) {
        console.error('pixelGrid element not found!');
        return;
    }

    // Clear existing pixels first
    grid.innerHTML = '';
    console.log('Cleared existing grid content');

    // Calculate pixel size
    const pixelSize = getOptimalPixelSize();
    console.log(`Using pixel size: ${pixelSize}px`);

    // Set dynamic CSS for the grid
    grid.style.gridTemplateColumns = `repeat(${CANVAS_WIDTH}, ${pixelSize}px)`;
    grid.style.gridTemplateRows = `repeat(${CANVAS_HEIGHT}, ${pixelSize}px)`;

    // Create pixels
    const totalPixels = CANVAS_WIDTH * CANVAS_HEIGHT;
    for (let row = 0; row < CANVAS_HEIGHT; row++) {
        for (let col = 0; col < CANVAS_WIDTH; col++) {
            const pixel = document.createElement('div');
            pixel.className = 'pixel';
            pixel.dataset.x = col;
            pixel.dataset.y = row;
            
            // Set pixel size dynamically
            pixel.style.width = `${pixelSize}px`;
            pixel.style.height = `${pixelSize}px`;
            
            pixel.addEventListener('mousedown', handleMouseDown);
            pixel.addEventListener('mouseup', stopDrawingOrErasing);
            pixel.addEventListener('contextmenu', (e) => e.preventDefault());
            grid.appendChild(pixel);
        }
    }

    // Add event listeners
    document.removeEventListener('mouseup', stopDrawingOrErasing);
    document.removeEventListener('mousemove', handleMouseMove);
    
    document.addEventListener('mouseup', stopDrawingOrErasing);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    grid.addEventListener('dragstart', (e) => e.preventDefault());
    grid.addEventListener('selectstart', (e) => e.preventDefault());

    initializeToolbar();
    console.log(`Grid created successfully with ${grid.children.length} pixels (expected: ${totalPixels})`);
    console.log(`Grid dimensions: ${CANVAS_WIDTH}x${CANVAS_HEIGHT} with ${pixelSize}px pixels`);
}

function initializeToolbar() {
    // Remove existing event listeners to prevent duplicates
    document.querySelectorAll('.tool-item').forEach(tool => {
        tool.replaceWith(tool.cloneNode(true));
    });
    
    document.querySelectorAll('.color-option').forEach(colorOption => {
        colorOption.replaceWith(colorOption.cloneNode(true));
    });

    // Add fresh event listeners
    document.querySelectorAll('.tool-item').forEach(tool => {
        tool.addEventListener('click', () => {
            document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            currentTool = tool.dataset.tool;
            console.log('Tool changed to:', currentTool);
        });
    });

    document.querySelectorAll('.color-option').forEach(colorOption => {
        colorOption.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
            colorOption.classList.add('active');
            currentColor = colorOption.dataset.color;
            console.log('Color changed to:', currentColor);
        });
    });
}

function handleMouseMove(e) {
    if (isDrawing || isErasing) {
        const grid = document.getElementById('pixelGrid');
        const rect = grid.getBoundingClientRect();
        const rawX = (e.clientX - rect.left) / (rect.width / CANVAS_WIDTH);
        const rawY = (e.clientY - rect.top) / (rect.height / CANVAS_HEIGHT);
        const x = Math.max(0, Math.min(CANVAS_WIDTH - 1, Math.floor(rawX)));
        const y = Math.max(0, Math.min(CANVAS_HEIGHT - 1, Math.floor(rawY)));

        if (lastX !== null && lastY !== null) {
            drawLine(lastX, lastY, x, y);
        } else {
            if (isDrawing) paintPixelAt(x, y);
            else if (isErasing) erasePixelAt(x, y);
        }
        lastX = x;
        lastY = y;
    }
}

function drawLine(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
        if (isDrawing) paintPixelAt(x, y);
        else if (isErasing) erasePixelAt(x, y);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

function paintPixelAt(x, y) {
    const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (pixel) pixel.style.backgroundColor = currentColor;
}

function erasePixelAt(x, y) {
    const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (pixel) pixel.style.backgroundColor = '#ffffffff';
}

function floodFill(startX, startY, targetColor, fillColor) {
    if (targetColor === fillColor) return;
    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) continue;
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (!pixel) continue;
        const currentPixelColor = pixel.style.backgroundColor || '#ffffffff';
        if (currentPixelColor !== targetColor) continue;

        pixel.style.backgroundColor = fillColor;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
}

function pixelVirus(startX, startY) {
    const infectionRate = 0.4;    // chance to infect each neighbor
    const spreadDelay = 60;      // ms between generations
    const maxGenerations = 12;    // safety cap

    const infectionColor = normalizeColor(currentColor); // capture now
    const visited = new Set();
    let frontier = [[startX, startY]];
    let generation = 0;

    console.log(`Virus started at (${startX},${startY}) color=${infectionColor}`);

    const startPixel = document.querySelector(`[data-x="${startX}"][data-y="${startY}"]`);
    const startColor = normalizeColor(startPixel?.style.backgroundColor || '');
    if (startColor === '#000000') {
        console.log('Start pixel is black — virus aborted.');
        return;
    }

    // infect start pixel
    paintPixelAtWithColor(startX, startY, infectionColor);
    visited.add(`${startX},${startY}`);

    function step() {
        if (frontier.length === 0) {
            console.log('Virus finished - no more frontier.');
            return;
        }
        if (generation >= maxGenerations) {
            console.log('Virus stopped - reached maxGenerations.');
            return;
        }

        const nextFrontier = [];
        frontier.forEach(([x, y]) => {
            const neighbors = getNeighbors(x, y);
            neighbors.forEach(([nx, ny]) => {
                const key = `${nx},${ny}`;
                if (visited.has(key)) return;

                const neighborPixel = document.querySelector(`[data-x="${nx}"][data-y="${ny}"]`);
                if (!neighborPixel) {
                    visited.add(key);
                    return;
                }

                const neighborColor = normalizeColor(neighborPixel.style.backgroundColor || '');

                // If neighbor is black => treat as wall: mark visited and do NOT infect or propagate through it
                if (neighborColor === '#000000') {
                    visited.add(key);
                    return;
                }

                // If neighbor already the infection color, mark visited and skip
                if (neighborColor === infectionColor) {
                    visited.add(key);
                    return;
                }

                if (Math.random() < infectionRate) {
                    visited.add(key);
                    paintPixelAtWithColor(nx, ny, infectionColor);
                    nextFrontier.push([nx, ny]);
                }
            });
        });

        console.log(`Generation ${generation} -> infected ${nextFrontier.length} new pixels`);
        generation++;
        frontier = nextFrontier;
        if (frontier.length > 0) setTimeout(step, spreadDelay);
        else console.log('Virus finished (no new infections).');
    }

    // start iterative spread
    setTimeout(step, spreadDelay);
}

// helper to normalize common color formats to hex-like lower-case string for equality checks
function normalizeColor(color) {
    if (!color) return '#ffffff';
    color = color.trim().toLowerCase();
    if (color === 'white') return '#ffffff';
    if (color.startsWith('rgb')) {
        const nums = color.match(/\d+/g);
        if (nums && nums.length >= 3) {
            return '#' + nums.slice(0,3).map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
        }
    }
    return color;
}

// Helper function to paint with specific color
function paintPixelAtWithColor(x, y, color) {
    const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (pixel) pixel.style.backgroundColor = color || currentColor;
}

function getNeighbors(x, y) {
    const neighbors = [];
    // Get all 8 surrounding pixels (including diagonals)
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue; // Skip the center pixel
            const nx = x + dx;
            const ny = y + dy;
            // Check if neighbor is within canvas bounds
            if (nx >= 0 && nx < CANVAS_WIDTH && ny >= 0 && ny < CANVAS_HEIGHT) {
                neighbors.push([nx, ny]);
            }
        }
    }
    return neighbors;
}

function handleMouseDown(e) {
    e.preventDefault();
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);

    if (currentTool === 'fill') {
        const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        const targetColor = pixel.style.backgroundColor || '#334155';
        floodFill(x, y, targetColor, currentColor);
        return;
    }

    if (currentTool === 'virus') {
        pixelVirus(x, y);
        return;
    }

    lastX = x;
    lastY = y;

    if (e.button === 0) {
        if (currentTool === 'brush') { isDrawing = true; paintPixelAt(x, y); }
        else if (currentTool === 'eraser') { isErasing = true; erasePixelAt(x, y); }
    } else if (e.button === 2) {
        isErasing = true;
        erasePixelAt(x, y);
    }
}

function stopDrawingOrErasing() {
    if (isDrawing || isErasing) {
        isDrawing = false;
        isErasing = false;
        lastX = null;
        lastY = null;
    }
}

// Initialize only once when DOM is loaded
let gridInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    if (!gridInitialized) {
        console.log('DOM loaded, creating grid...');
        createGrid();
        gridInitialized = true;
    }
});

// Global function to change canvas size (for testing)
window.changeCanvasSize = updateCanvasSize;
