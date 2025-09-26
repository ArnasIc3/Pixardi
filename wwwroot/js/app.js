let isDrawing = false;
let isErasing = false;
let currentTool = 'brush';
let currentColor = '#000000';
let lastX = null;
let lastY = null;

// Define canvas dimensions
const CANVAS_WIDTH = 48;
const CANVAS_HEIGHT = 48;

function createGrid() {
    const grid = document.getElementById('pixelGrid');
    
    // Create pixels with new dimensions
    for (let row = 0; row < CANVAS_HEIGHT; row++) {
        for (let col = 0; col < CANVAS_WIDTH; col++) {
            const pixel = document.createElement('div');
            pixel.className = 'pixel';
            
            pixel.dataset.x = col;
            pixel.dataset.y = row;

            pixel.addEventListener('mousedown', handleMouseDown);
            pixel.addEventListener('mouseup', stopDrawingOrErasing);
            pixel.addEventListener('contextmenu', (e) => e.preventDefault());

            grid.appendChild(pixel);
        }
    }
    
    document.addEventListener('mouseup', stopDrawingOrErasing);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    grid.addEventListener('dragstart', (e) => e.preventDefault());
    grid.addEventListener('selectstart', (e) => e.preventDefault());
    
    initializeToolbar();
    initializeFileOperations();
}

function initializeToolbar() {
    // Tool selection
    document.querySelectorAll('.tool-item').forEach(tool => {
        tool.addEventListener('click', () => {
            document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            currentTool = tool.dataset.tool;
            console.log('Tool changed to:', currentTool);
        });
    });
    
    // Color picker
    const colorInput = document.getElementById('colorInput');
    const currentColorDisplay = document.getElementById('currentColor');
    
    if (colorInput && currentColorDisplay) {
        colorInput.addEventListener('change', (e) => {
            currentColor = e.target.value;
            currentColorDisplay.style.backgroundColor = currentColor;
            updateColorPaletteSelection();
        });
        
        // Initialize current color display
        currentColorDisplay.style.backgroundColor = currentColor;
    }
    
    // Color palette selection
    document.querySelectorAll('.color-option').forEach(colorOption => {
        colorOption.addEventListener('click', () => {
            // Remove active class from all colors
            document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
            // Add active class to clicked color
            colorOption.classList.add('active');
            
            // Update current color
            currentColor = colorOption.dataset.color;
            if (currentColorDisplay) {
                currentColorDisplay.style.backgroundColor = currentColor;
            }
            if (colorInput) {
                colorInput.value = currentColor;
            }
            
            console.log('Color changed to:', currentColor);
        });
    });
}

function updateColorPaletteSelection() {
    // Remove active from all palette colors
    document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
    
    // Find matching color in palette and make it active
    const matchingColor = document.querySelector(`.color-option[data-color="${currentColor}"]`);
    if (matchingColor) {
        matchingColor.classList.add('active');
    }
}

// File operations
function initializeFileOperations() {
    console.log('Initializing file operations...');
    
    // Clear canvas
    const clearBtn = document.getElementById('clearCanvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCanvas);
        console.log('Clear button initialized');
    }
    
    // Import functions
    const importBtn = document.getElementById('importFile');
    const fileInput = document.getElementById('fileInput');
    
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            console.log('Import button clicked');
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleFileImport);
        console.log('Import functionality initialized');
    }
    
    // Export functions
    const exportPNGBtn = document.getElementById('exportPNG');
    const exportJSONBtn = document.getElementById('exportJSON');
    
    if (exportPNGBtn) {
        exportPNGBtn.addEventListener('click', exportAsPNG);
        console.log('Export PNG button initialized');
    }
    
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', exportAsJSON);
        console.log('Export JSON button initialized');
    }
}

function clearCanvas() {
    console.log('Clear canvas called');
    if (confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
        const pixels = document.querySelectorAll('.pixel');
        pixels.forEach(pixel => {
            pixel.style.backgroundColor = 'transparent';
        });
        console.log('Canvas cleared');
    }
}

function exportAsPNG() {
    console.log('Exporting as PNG...');
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size (scale up for better quality)
        const scale = 10;
        canvas.width = CANVAS_WIDTH * scale;
        canvas.height = CANVAS_HEIGHT * scale;
        
        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw each pixel to canvas
        for (let y = 0; y < CANVAS_HEIGHT; y++) {
            for (let x = 0; x < CANVAS_WIDTH; x++) {
                const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (pixel) {
                    const color = pixel.style.backgroundColor;
                    
                    if (color && color !== 'transparent' && color !== '') {
                        ctx.fillStyle = color;
                        ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
        }
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pixardi-art-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('PNG export successful');
            } else {
                console.error('Failed to create blob');
            }
        }, 'image/png');
        
    } catch (error) {
        console.error('PNG export error:', error);
        alert('Failed to export PNG. Please try again.');
    }
}

function exportAsJSON() {
    console.log('Exporting as JSON...');
    
    try {
        const artworkData = {
            version: '1.0',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            created: new Date().toISOString(),
            pixels: []
        };
        
        // Collect all non-transparent pixels
        for (let y = 0; y < CANVAS_HEIGHT; y++) {
            for (let x = 0; x < CANVAS_WIDTH; x++) {
                const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (pixel) {
                    const color = pixel.style.backgroundColor;
                    
                    if (color && color !== 'transparent' && color !== '') {
                        artworkData.pixels.push({
                            x: x,
                            y: y,
                            color: color
                        });
                    }
                }
            }
        }
        
        // Create and download JSON file
        const jsonString = JSON.stringify(artworkData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixardi-project-${Date.now()}.pixardi`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('JSON export successful', artworkData);
        
    } catch (error) {
        console.error('JSON export error:', error);
        alert('Failed to export project. Please try again.');
    }
}

function handleFileImport(event) {
    console.log('File import started');
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    console.log('Selected file:', file.name, file.type);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            console.log('File content loaded');
            
            const artworkData = JSON.parse(content);
            importFromJSON(artworkData);
        } catch (error) {
            console.error('Import error:', error);
            alert('Invalid file format. Please select a valid Pixardi project file.');
        }
    };
    
    reader.onerror = (error) => {
        console.error('File read error:', error);
        alert('Failed to read file. Please try again.');
    };
    
    reader.readAsText(file);
    
    // Clear the input value so the same file can be selected again
    event.target.value = '';
}

function importFromJSON(artworkData) {
    console.log('Importing artwork:', artworkData);
    
    if (!artworkData || !artworkData.pixels || !Array.isArray(artworkData.pixels)) {
        alert('Invalid project file format.');
        return;
    }
    
    // Clear canvas first
    const pixels = document.querySelectorAll('.pixel');
    pixels.forEach(pixel => {
        pixel.style.backgroundColor = 'transparent';
    });
    
    // Apply each pixel
    let importedCount = 0;
    artworkData.pixels.forEach(pixelData => {
        const { x, y, color } = pixelData;
        
        // Validate coordinates
        if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
            const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            if (pixel) {
                pixel.style.backgroundColor = color;
                importedCount++;
            }
        }
    });
    
    console.log(`Imported ${importedCount} pixels`);
    alert(`Successfully imported artwork with ${importedCount} pixels!`);
}

// Keep all existing drawing functions
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
            if (isDrawing) {
                paintPixelAt(x, y);
            } else if (isErasing) {
                erasePixelAt(x, y);
            }
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
        if (isDrawing) {
            paintPixelAt(x, y);
        } else if (isErasing) {
            erasePixelAt(x, y);
        }

        if (x === x1 && y === y1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

function paintPixelAt(x, y) {
    const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (pixel) {
        pixel.style.backgroundColor = currentColor;
    }
}

function erasePixelAt(x, y) {
    const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (pixel) {
        pixel.style.backgroundColor = 'transparent'; 
    }
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
        
        const currentPixelColor = pixel.style.backgroundColor || 'transparent';
        
        if (currentPixelColor !== targetColor) continue;
        
        pixel.style.backgroundColor = fillColor;
        
        // Add neighboring pixels to stack
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
}

function handleMouseDown(e) {
    e.preventDefault();
    
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);
    
    if (currentTool === 'fill') {
        const pixel = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        const targetColor = pixel.style.backgroundColor || 'transparent';
        floodFill(x, y, targetColor, currentColor);
        return;
    }
    
    lastX = x;
    lastY = y;
    
    if (e.button === 0) { // Left click
        if (currentTool === 'brush') {
            isDrawing = true;
            paintPixelAt(x, y);
        } else if (currentTool === 'eraser') {
            isErasing = true;
            erasePixelAt(x, y);
        }
    } else if (e.button === 2) { // Right click - always erase
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

window.addEventListener('load', createGrid);