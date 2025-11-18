const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let currentColor = '#000000';
let currentMode = 'add'; // 'add' or 'delete'
const pixelSize = 5;

// DOM elements
const deleteModeBtn = document.getElementById('deleteModeBtn');
const addModeBtn = document.getElementById('addModeBtn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');
const currentModeSpan = document.getElementById('currentMode');

// SignalR connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/drawingHub")
    .build();

connection.start().then(function () {
    console.log('SignalR Connected');
    connection.invoke("JoinCanvas", "main");
    loadCanvas();
}).catch(function (err) {
    console.error('SignalR connection failed: ', err);
});

// Listen for pixel updates from other users
connection.on("PixelDrawn", function (x, y, color, username) {
    drawPixel(x, y, color);
});

// Mode switching
deleteModeBtn.addEventListener('click', function() {
    setMode('delete');
});

addModeBtn.addEventListener('click', function() {
    setMode('add');
});

function setMode(mode) {
    currentMode = mode;
    
    // Update UI
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'delete') {
        deleteModeBtn.classList.add('active');
        currentModeSpan.textContent = 'Delete';
        canvas.style.cursor = 'crosshair';
    } else {
        addModeBtn.classList.add('active');
        currentModeSpan.textContent = 'Add';
        canvas.style.cursor = 'crosshair';
    }
}

// Color selection
document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', function () {
        currentColor = this.dataset.color;
        document.getElementById('currentColor').style.backgroundColor = currentColor;
    });
});

// Canvas click handler
canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize) * pixelSize;
    const y = Math.floor((e.clientY - rect.top) / pixelSize) * pixelSize;

    if (currentMode === 'delete') {
        deletePixel(x, y);
    } else {
        addPixel(x, y, currentColor);
    }
});

// Clear canvas button
clearCanvasBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
        clearCanvas();
    }
});

function drawPixel(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, pixelSize, pixelSize);
}

function clearPixel(x, y) {
    ctx.clearRect(x, y, pixelSize, pixelSize);
}

function loadCanvas() {
    fetch('/Canvas/GetCanvas')
        .then(response => response.json())
        .then(pixels => {
            pixels.forEach(pixel => {
                drawPixel(pixel.x, pixel.y, pixel.color);
            });
        }).catch(function (error) {
            console.error('Load canvas failed: ', error);
        });
}

function addPixel(x, y, color) {
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
    
    fetch('/Admin/AddPixel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify({ x: x, y: y, color: color })
    }).then(response => {
        if (response.ok) {
            drawPixel(x, y, color);
            connection.invoke("DrawPixel", "main", x, y, color);
        }
    }).catch(function (error) {
        console.error('Add pixel failed: ', error);
    });
}

function deletePixel(x, y) {
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
    
    fetch('/Admin/DeletePixel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        },
        body: JSON.stringify({ x: x, y: y })
    }).then(response => {
        if (response.ok) {
            clearPixel(x, y);
            // Notify other users about pixel deletion
            connection.invoke("DrawPixel", "main", x, y, "#FFFFFF"); // Send white to "delete"
        }
    }).catch(function (error) {
        console.error('Delete pixel failed: ', error);
    });
}

function clearCanvas() {
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
    
    fetch('/Admin/ClearCanvas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': token
        }
    }).then(response => {
        if (response.ok) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            alert('Canvas cleared successfully!');
        }
    }).catch(function (error) {
        console.error('Clear canvas failed: ', error);
    });
}

// Initialize
setMode('add');
document.getElementById('currentColor').style.backgroundColor = currentColor;