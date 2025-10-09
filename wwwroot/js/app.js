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

let historyStack = [];
let currentAction = null;
const MAX_HISTORY = 100;

function startAction(type) {
    currentAction = { type, pixels: new Map() }; // Map keyed by "x,y"
}

function recordPixelChange(x, y, prevColor) {
    if (!currentAction) return;
    const key = `${x},${y}`;
    if (!currentAction.pixels.has(key)) {
        currentAction.pixels.set(key, { x, y, prevColor });
    }
}

function endAction() {
    if (!currentAction) return;
    const pixelsArray = Array.from(currentAction.pixels.values());
    if (pixelsArray.length > 0){
        historyStack.push({ type: currentAction.type, pixels: pixelsArray}); // use historyStack
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
    }
    currentAction = null;
}

function undo() {
    if (historyStack.length === 0) {
        console.log('Nothing to undo.');
        return;
    }
    const action = historyStack.pop();
    action.pixels.forEach(p => {
        const pixel = document.querySelector(`[data-x="${p.x}"][data-y="${p.y}"]`);
        if (pixel) {
            pixel.style.backgroundColor = p.prevColor || '';
        }
    });
    console.log(`Undid action: ${action.type} (${action.pixels.length} pixels)`);
}

function clearCanvas() {
    // start a named action so user can undo the clear
    startAction('clear');

    const pixels = Array.from(document.querySelectorAll('.pixel'));
    pixels.forEach(pixel => {
        const x = parseInt(pixel.dataset.x);
        const y = parseInt(pixel.dataset.y);
        const prev = pixel.style.backgroundColor || '';
        // record the previous color
        recordPixelChange(x, y, prev);
        // clear the pixel (remove inline color)
        pixel.style.backgroundColor = '';
    });

    endAction();
    console.log(`Canvas cleared (${pixels.length} pixels).`);
}


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
    width = Math.max(1, Math.floor(width));
    height = Math.max(1, Math.floor(height));

    const grid = document.getElementById('pixelGrid');
    const container = document.querySelector('.grid-container') || document.body;
    if (!grid) {
        CANVAS_WIDTH = width;
        CANVAS_HEIGHT = height;
        return;
    }

    // recreate DOM cells if dimensions changed
    if (CANVAS_WIDTH !== width || CANVAS_HEIGHT !== height || grid.children.length !== width * height) {
        CANVAS_WIDTH = width;
        CANVAS_HEIGHT = height;
        grid.innerHTML = '';
        createGrid(); // assumes createGrid uses CANVAS_WIDTH / CANVAS_HEIGHT
    }

    // compute available space inside container (use most of it)
    const containerRect = container.getBoundingClientRect();
    const availableWidth = Math.max(200, containerRect.width - 16); // small margin
    const availableHeight = Math.max(200, window.innerHeight - containerRect.top - 24);

    // compute pixel size so grid fits; allow much larger max so bigger grids render larger
    let pixelSize = Math.floor(Math.min(availableWidth / width, availableHeight / height));

    // clamp to sensible bounds but allow a large max so 56x32 can be big
    pixelSize = Math.max(6, Math.min(pixelSize, 80)); // increased max from 40 -> 80

    // ensure minimum visually-usable size on large screens
    if (window.innerWidth > 1400) {
        pixelSize = Math.max(pixelSize, 10);
    }

    // apply CSS var and explicit grid sizing
    grid.style.setProperty('--pixel-size', `${pixelSize}px`);
    grid.style.gridTemplateColumns = `repeat(${width}, ${pixelSize}px)`;
    grid.style.width = `${width * pixelSize}px`;
    grid.style.height = `${height * pixelSize}px`;
    grid.style.maxWidth = 'none';

    // update each pixel element size (in case createGrid created them without var)
    document.querySelectorAll('#pixelGrid .pixel').forEach(p => {
        p.style.width = `${pixelSize}px`;
        p.style.height = `${pixelSize}px`;
    });

    CANVAS_WIDTH = width;
    CANVAS_HEIGHT = height;
}

// recompute on resize so pixel size increases when the window is larger
window.addEventListener('resize', () => {
    updateCanvasSize(CANVAS_WIDTH, CANVAS_HEIGHT);
});

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
    if (!pixel) return;
    const prev = pixel.style.backgroundColor || '';
    recordPixelChange(x, y, prev);
    pixel.style.backgroundColor = currentColor;
}

function erasePixelAt(x, y) {
    const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`); 
    if (!pixel) return;
    const prev = pixel.style.backgroundColor || '';
    recordPixelChange(x, y, prev);
    pixel.style.backgroundColor = '#ffffffff';
}

function floodFill(startX, startY, targetColor, fillColor) {
    if (targetColor === fillColor) return;
    const stack = [[startX, startY]];
    const visited = new Set();
    const changed = [];

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

        // record previous color and change
        changed.push({ x, y, prevColor: currentPixelColor });
        pixel.style.backgroundColor = fillColor;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    if (changed.length > 0) {
        historyStack.push({ type: 'fill', pixels: changed });
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
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
        endAction(); // ensure action is closed when aborted
        return;
    }

    // infect start pixel
    paintPixelAtWithColor(startX, startY, infectionColor);
    visited.add(`${startX},${startY}`);

    function step() {
        if (frontier.length === 0) {
            console.log('Virus finished - no more frontier.');
            endAction();
            return;
        }
        if (generation >= maxGenerations) {
            console.log('Virus stopped - reached maxGenerations.');
            endAction();
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
        else {
            console.log('Virus finished (no new infections).');
            endAction();
        }
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
    if (!pixel) return;
    const prev = pixel.style.backgroundColor || '';
    recordPixelChange(x, y, prev);
    pixel.style.backgroundColor = color || currentColor;
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
        startAction('fill');
        const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        const targetColor = pixel.style.backgroundColor || '#334155';
        floodFill(x, y, targetColor, currentColor);
        endAction();
        return;
    }

    if (currentTool === 'virus') {
        startAction('virus');
        pixelVirus(x, y);
        return;
    }

    lastX = x;
    lastY = y;

    if (e.button === 0) {
        if (currentTool === 'brush') { startAction('stroke'); isDrawing = true; paintPixelAt(x, y); }
        else if (currentTool === 'eraser') { startAction('erase'); isErasing = true; erasePixelAt(x, y); }
    } else if (e.button === 2) {
        startAction('erase');
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
        endAction();
    }
}

// Initialize only once when DOM is loaded
let gridInitialized = false;

function createCursorPreview() {
    if (document.getElementById('cursorPreview')) return document.getElementById('cursorPreview');
    const preview = document.createElement('div');
    preview.id = 'cursorPreview';
    // ensure borders are included in size calculations
    preview.style.boxSizing = 'border-box';
    document.body.appendChild(preview);
    return preview;
}

function getPixelSizeFromGrid() {
    const grid = document.getElementById('pixelGrid');
    if (!grid) return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')) || 12;
    const cssVal = getComputedStyle(grid).getPropertyValue('--pixel-size').trim();
    if (cssVal) return parseInt(cssVal);
    // fallback: measure first pixel
    const first = grid.querySelector('.pixel');
    return first ? Math.max(4, Math.round(first.getBoundingClientRect().width)) : 12;
}

function attachCursorPreviewHandlers() {
    const grid = document.getElementById('pixelGrid');
    if (!grid) return;
    const preview = createCursorPreview();

    function onMove(ev) {
        const rect = grid.getBoundingClientRect();
        const pixelSize = getPixelSizeFromGrid();

        // account for grid border/padding: clientLeft/clientTop offset inside rect
        const offsetLeft = rect.left + grid.clientLeft;
        const offsetTop = rect.top + grid.clientTop;

        const cx = ev.clientX;
        const cy = ev.clientY;
        if (cx < offsetLeft || cx >= offsetLeft + CANVAS_WIDTH * pixelSize ||
            cy < offsetTop || cy >= offsetTop + CANVAS_HEIGHT * pixelSize) {
            preview.style.display = 'none';
            return;
        }

        preview.style.display = 'block';

        const x = Math.floor((cx - offsetLeft) / pixelSize);
        const y = Math.floor((cy - offsetTop) / pixelSize);

        const centerX = offsetLeft + x * pixelSize + pixelSize / 2;
        const centerY = offsetTop + y * pixelSize + pixelSize / 2;

        preview.style.left = `${centerX}px`;
        preview.style.top = `${centerY}px`;
        preview.style.width = `${pixelSize}px`;
        preview.style.height = `${pixelSize}px`;

        // update styling per tool
        if (currentTool === 'eraser') {
            preview.classList.remove('brush');
            preview.classList.add('eraser');
            preview.style.background = 'transparent';
            preview.style.border = '2px dashed rgba(255,255,255,0.9)';
        } else {
            preview.classList.remove('eraser');
            preview.classList.add('brush');
            preview.style.background = currentColor || '#000';
            preview.style.border = '2px solid rgba(255,255,255,0.85)';
        }
    }

    grid.addEventListener('mousemove', onMove);
    grid.addEventListener('mouseenter', () => preview.style.display = 'block');
    grid.addEventListener('mouseleave', () => preview.style.display = 'none');
    grid.addEventListener('mousedown', () => preview.classList.add('active'));
    document.addEventListener('mouseup', () => preview.classList.remove('active'));
    window.addEventListener('resize', () => {
        const pixelSize = getPixelSizeFromGrid();
        preview.style.width = `${pixelSize}px`;
        preview.style.height = `${pixelSize}px`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!gridInitialized) {
        console.log('DOM loaded, creating grid...');
        createGrid();
        gridInitialized = true;
    }

    // Ctrl+Z / Cmd+Z undo
    document.addEventListener('keydown', (ev) => {
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
            ev.preventDefault();
            undo();
        }
    });

    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            undo();
        });
    }

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            clearCanvas();
        });
    }

    attachCursorPreviewHandlers();
});





// Global function to change canvas size (for testing)
window.changeCanvasSize = updateCanvasSize;
