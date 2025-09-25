let isDrawing = false;
let currentColor = '#007acc';

function createGrid() {
    const grid = document.getElementById('pixelGrid');
    
    // Create 1024 pixels (32 x 32)
    for (let row = 0; row < 32; row++) {
        for (let col = 0; col < 32; col++) {
            // Create a pixel element
            const pixel = document.createElement('div');
            pixel.className = 'pixel';
            
            // Store coordinates as data attributes
            pixel.dataset.x = col;
            pixel.dataset.y = row;
            
            // Add mouse events for drawing
            pixel.addEventListener('mousedown', startDrawing);
            pixel.addEventListener('mouseenter', draw);
            pixel.addEventListener('mouseup', stopDrawing);
            
            // Add the pixel to the grid
            grid.appendChild(pixel);
        }
    }
    
    // Add global mouse events to handle dragging outside pixels
    document.addEventListener('mouseup', stopDrawing);
    
    // Prevent default drag behavior on the grid
    grid.addEventListener('dragstart', (e) => e.preventDefault());
    grid.addEventListener('selectstart', (e) => e.preventDefault());
}

function startDrawing(e) {
    isDrawing = true;
    paintPixel(e.target);
    console.log(`Started drawing at (${e.target.dataset.x}, ${e.target.dataset.y})`);
}

function draw(e) {
    if (isDrawing) {
        paintPixel(e.target);
        console.log(`Drawing at (${e.target.dataset.x}, ${e.target.dataset.y})`);
    }
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        console.log('Stopped drawing');
    }
}

function paintPixel(pixel) {
    if (pixel && pixel.classList.contains('pixel')) {
        pixel.style.backgroundColor = currentColor;
    }
}

// Create the grid when page loads
window.addEventListener('load', createGrid);