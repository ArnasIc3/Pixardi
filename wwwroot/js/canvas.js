const canvasApp = document.getElementById('canvasApp');
const canvas = document.getElementById('drawingCanvas');

if (!canvasApp || !canvas) {
    console.warn('Canvas app not initialized: missing container or canvas element.');
} else {
    const ctx = canvas.getContext('2d');
    const isAdmin = canvasApp.dataset.isAdmin === 'true';
    const pixelSize = 5;
    let currentColor = '#000000';
    let currentMode = 'add';
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;
    let hoverX = null;
    let hoverY = null;
    let pixelCache = [];

    const deleteModeBtn = document.getElementById('deleteModeBtn');
    const addModeBtn = document.getElementById('addModeBtn');
    const clearCanvasBtn = document.getElementById('clearCanvasBtn');
    const currentModeSpan = document.getElementById('currentMode');
    const currentColorDisplay = document.getElementById('currentColor');
    const cooldownStatus = document.getElementById('cooldownStatus');
    const colorHexLabel = document.getElementById('colorHex');
    const wheelCanvas = document.getElementById('colorWheelCanvas');
    const wheelCtx = wheelCanvas ? wheelCanvas.getContext('2d') : null;
    const canvasContainer = document.querySelector('.canvas-container');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    let wheelConfig = null;

    updateColorIndicators(currentColor);

    if (wheelCanvas && wheelCtx) {
        initColorWheel();
    }

    const connection = new signalR.HubConnectionBuilder()
        .withUrl('/drawingHub')
        .build();

    connection.start()
        .then(() => {
            connection.invoke('JoinCanvas', 'main');
            loadCanvas();
            if (!isAdmin) {
                fetchCooldownStatus();
            }
        })
        .catch(err => console.error('SignalR connection failed: ', err));

    connection.on('PixelDrawn', (x, y, color) => {
        const existingIndex = pixelCache.findIndex(p => p.x === x && p.y === y);
        if (existingIndex >= 0) {
            pixelCache[existingIndex] = { x, y, color };
        } else {
            pixelCache.push({ x, y, color });
        }
        drawPixel(x, y, color);
    });

    if (deleteModeBtn && addModeBtn && isAdmin) {
        deleteModeBtn.addEventListener('click', () => setMode('delete'));
        addModeBtn.addEventListener('click', () => setMode('add'));
    }

    if (clearCanvasBtn && isAdmin) {
        clearCanvasBtn.addEventListener('click', () => {
            if (confirm('Clear the entire canvas? This cannot be undone.')) {
                clearCanvas();
            }
        });
    }

    canvas.addEventListener('mousemove', e => {
        if (isPanning) return;
        
        const rect = canvas.getBoundingClientRect();
        // Since getBoundingClientRect gives scaled dimensions, we need to account for that
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        const canvasX = (e.clientX - rect.left) / scaleX;
        const canvasY = (e.clientY - rect.top) / scaleY;
        const x = Math.floor(canvasX / pixelSize) * pixelSize;
        const y = Math.floor(canvasY / pixelSize) * pixelSize;
        
        if (hoverX !== x || hoverY !== y) {
            hoverX = x;
            hoverY = y;
            redrawCanvas();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        hoverX = null;
        hoverY = null;
        redrawCanvas();
    });

    canvas.addEventListener('click', e => {
        if (isPanning) return;
        
        const rect = canvas.getBoundingClientRect();
        // Since getBoundingClientRect gives scaled dimensions, we need to account for that
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        const canvasX = (e.clientX - rect.left) / scaleX;
        const canvasY = (e.clientY - rect.top) / scaleY;
        const x = Math.floor(canvasX / pixelSize) * pixelSize;
        const y = Math.floor(canvasY / pixelSize) * pixelSize;

        if (currentMode === 'delete' && isAdmin) {
            deletePixel(x, y);
        } else {
            addPixel(x, y, currentColor);
        }
    });

    if (canvasContainer) {
        canvasContainer.addEventListener('mousedown', e => {
            if (e.target === canvas && e.button === 1) {
                e.preventDefault();
                isPanning = true;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
            }
        });

        canvasContainer.addEventListener('auxclick', e => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });

        canvasContainer.addEventListener('mousemove', e => {
            if (isPanning) {
                const deltaX = e.clientX - lastPanX;
                const deltaY = e.clientY - lastPanY;
                canvasContainer.scrollLeft -= deltaX;
                canvasContainer.scrollTop -= deltaY;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
            }
        });

        canvasContainer.addEventListener('mouseup', () => {
            isPanning = false;
        });

        canvasContainer.addEventListener('mouseleave', () => {
            isPanning = false;
        });

        canvasContainer.addEventListener('wheel', e => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            
            // Get mouse position relative to container before zoom
            const rect = canvasContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate point on canvas that mouse is over before zoom
            const scrollX = canvasContainer.scrollLeft;
            const scrollY = canvasContainer.scrollTop;
            const canvasPointX = (scrollX + mouseX) / zoomLevel;
            const canvasPointY = (scrollY + mouseY) / zoomLevel;
            
            const oldZoom = zoomLevel;
            setZoom(zoomLevel + delta);
            
            // Adjust scroll to keep the same canvas point under mouse
            const newScrollX = canvasPointX * zoomLevel - mouseX;
            const newScrollY = canvasPointY * zoomLevel - mouseY;
            canvasContainer.scrollLeft = newScrollX;
            canvasContainer.scrollTop = newScrollY;
        }, { passive: false });
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + 0.2));
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - 0.2));
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => setZoom(1));
    }

    function setZoom(newZoom) {
        const minZoomX = canvasContainer.clientWidth / canvas.width;
        const minZoomY = canvasContainer.clientHeight / canvas.height;
        const minZoom = Math.min(minZoomX, minZoomY, 1);
        
        zoomLevel = Math.max(minZoom, Math.min(4, newZoom));
        canvas.style.transform = `scale(${zoomLevel})`;
        canvas.style.transformOrigin = 'top left';
    }

    function setMode(mode) {
        if (mode === 'delete' && !isAdmin) {
            return;
        }

        currentMode = mode;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

        if (mode === 'delete') {
            if (deleteModeBtn) {
                deleteModeBtn.classList.add('active');
            }
            if (currentModeSpan) {
                currentModeSpan.textContent = 'Delete';
            }
        } else {
            if (addModeBtn) {
                addModeBtn.classList.add('active');
            }
            if (currentModeSpan) {
                currentModeSpan.textContent = 'Add';
            }
        }
    }

    function updateColorIndicators(color) {
        if (!color) {
            return;
        }

        currentColor = color;
        if (currentColorDisplay) {
            currentColorDisplay.style.backgroundColor = color;
        }
        if (colorHexLabel) {
            colorHexLabel.textContent = color.toUpperCase();
        }
    }

    function initColorWheel() {
        wheelConfig = createWheelConfig();
        drawColorWheel();

        let selectedX = wheelConfig.middleX;
        let selectedY = wheelConfig.middleY;
        let wheelImageData = null;

        const initialColor = getColorForPoint(wheelConfig.middleX, wheelConfig.middleY);
        if (initialColor?.inside) {
            const rgb = hslToRgb(initialColor);
            const hex = rgbToHex(Math.floor(rgb.r), Math.floor(rgb.g), Math.floor(rgb.b));
            updateColorIndicators(hex);
        }
        drawSelectionDot(selectedX, selectedY);
        wheelImageData = wheelCtx.getImageData(0, 0, wheelCanvas.width, wheelCanvas.height);

        const handleClick = event => {
            const coords = translatePointerToCanvasSpace(event);
            const color = getColorForPoint(coords.x, coords.y);
            if (!color?.inside) {
                return;
            }
            const rgb = hslToRgb(color);
            const hex = rgbToHex(Math.floor(rgb.r), Math.floor(rgb.g), Math.floor(rgb.b));
            updateColorIndicators(hex);
            
            selectedX = coords.x;
            selectedY = coords.y;
            
            wheelCtx.putImageData(wheelImageData, 0, 0);
            drawSelectionDot(selectedX, selectedY);
        };

        wheelCanvas.addEventListener('pointerdown', handleClick);
    }

    function createWheelConfig() {
        const width = wheelCanvas.width;
        const height = wheelCanvas.height;
        const usableDiameter = Math.min(width, height);
        return {
            width,
            height,
            middleX: width / 2,
            middleY: height / 2,
            scale: usableDiameter / 220,
            lightness: 0.5
        };
    }

    function drawColorWheel() {
        if (!wheelCtx || !wheelConfig) {
            return;
        }

        wheelCtx.clearRect(0, 0, wheelConfig.width, wheelConfig.height);
        for (let h = 0; h <= 360; h += 1) {
            for (let s = 0; s <= 100; s += 1) {
                wheelCtx.beginPath();
                wheelCtx.fillStyle = `hsl(${h}, ${s}%, ${wheelConfig.lightness * 100}%)`;
                const posX = wheelConfig.middleX + Math.cos(degreeToRadian(h)) * s * wheelConfig.scale;
                const posY = wheelConfig.middleY - Math.sin(degreeToRadian(h)) * s * wheelConfig.scale;
                const radius = Math.max(0.8, (s / 100) * wheelConfig.scale * 2);
                wheelCtx.arc(posX, posY, radius, 0, Math.PI * 2);
                wheelCtx.fill();
            }
        }

        drawColorWheelBorder();
    }

    function drawColorWheelBorder() {
        if (!wheelCtx || !wheelConfig) {
            return;
        }
        wheelCtx.beginPath();
        wheelCtx.strokeStyle = '#1c1c1c';
        wheelCtx.lineWidth = 2;
        wheelCtx.arc(wheelConfig.middleX, wheelConfig.middleY, 100 * wheelConfig.scale + 5, 0, Math.PI * 2);
        wheelCtx.stroke();
    }

    function drawSelectionDot(x, y) {
        if (!wheelCtx || !wheelConfig) {
            return;
        }
        wheelCtx.beginPath();
        wheelCtx.arc(x, y, 6, 0, Math.PI * 2);
        wheelCtx.fillStyle = '#ffffff';
        wheelCtx.fill();
        wheelCtx.strokeStyle = '#000000';
        wheelCtx.lineWidth = 2;
        wheelCtx.stroke();
    }

    function drawInstructions() {
        if (!wheelCtx || !wheelConfig) {
            return;
        }
        wheelCtx.fillStyle = '#1c1c1c';
        wheelCtx.font = '18px "Segoe UI", sans-serif';
        wheelCtx.textAlign = 'center';
        wheelCtx.fillText('Hover or tap anywhere on the wheel', wheelConfig.middleX, wheelConfig.height - 30);
    }

    function drawMousePosition(x, y) {
        if (!wheelCtx || !wheelConfig) {
            return;
        }
        wheelCtx.clearRect(wheelConfig.width - 150, 10, 140, 30);
        wheelCtx.fillStyle = '#1c1c1c';
        wheelCtx.font = '14px "Segoe UI", sans-serif';
        wheelCtx.textAlign = 'left';
        wheelCtx.fillText(`X: ${formatCoord(x)}  Y: ${formatCoord(y)}`, wheelConfig.width - 140, 30);
    }

    function drawPickedColor(x, y) {
        if (!wheelCtx || !wheelConfig) {
            return null;
        }

        wheelCtx.clearRect(15, 15, 210, 200);
        const color = getColorForPoint(x, y);

        const previewColor = color?.inside
            ? `hsl(${Math.floor(color.h)}, ${Math.floor(color.s * 100)}%, ${color.l * 100}%)`
            : '#fefefe';
        wheelCtx.fillStyle = previewColor;
        wheelCtx.fillRect(20, 20, 180, 140);

        if (!color?.inside) {
            drawColorDetails(null);
            return null;
        }

        const rgb = hslToRgb(color);
        drawColorDetails(color, rgb);
        return { hex: rgbToHex(Math.floor(rgb.r), Math.floor(rgb.g), Math.floor(rgb.b)) };
    }

    function getColorForPoint(x, y) {
        if (!wheelConfig) {
            return null;
        }

        const dist = getDistanceFromCenter(x, y);
        const wheelRadius = 100 * wheelConfig.scale;
        if (dist > wheelRadius) {
            return { inside: false };
        }

        const saturation = dist / wheelConfig.scale;
        let hue = 0;
        if (saturation > 0) {
            hue = radianToDegree(Math.acos((x - wheelConfig.middleX) / (saturation * wheelConfig.scale)));
            if (Number.isNaN(hue)) {
                hue = 0;
            }
            if (y > wheelConfig.middleY) {
                hue = 360 - hue;
            }
        }

        return {
            inside: true,
            h: hue,
            s: (saturation / 100),
            l: wheelConfig.lightness
        };
    }

    function drawColorDetails(color, rgbColor) {
        if (!wheelCtx) {
            return;
        }
        wheelCtx.fillStyle = '#1c1c1c';
        wheelCtx.font = '13px "Segoe UI", sans-serif';
        wheelCtx.textAlign = 'left';

        if (!color?.inside) {
            wheelCtx.fillText('Select a color on the wheel.', 24, 180);
            return;
        }

        const rgb = rgbColor ?? hslToRgb(color);
        const hex = rgbToHex(Math.floor(rgb.r), Math.floor(rgb.g), Math.floor(rgb.b));
        wheelCtx.fillText(`H: ${Math.floor(color.h)}°  S: ${Math.floor(color.s * 100)}%  L: ${color.l * 100}%`, 24, 180);
        wheelCtx.fillText(`R: ${Math.floor(rgb.r)}  G: ${Math.floor(rgb.g)}  B: ${Math.floor(rgb.b)}`, 24, 196);
        wheelCtx.fillText(hex, 24, 212);
    }

    function translatePointerToCanvasSpace(event) {
        const rect = wheelCanvas.getBoundingClientRect();
        const scaleX = wheelCanvas.width / rect.width;
        const scaleY = wheelCanvas.height / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    function getDistanceFromCenter(x, y) {
        if (!wheelConfig) {
            return 0;
        }
        const offsetX = Math.abs(wheelConfig.middleX - x);
        const offsetY = Math.abs(wheelConfig.middleY - y);
        return Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    }

    function formatCoord(value) {
        if (value === '--') {
            return value;
        }
        return Math.max(0, Math.floor(value)).toString().padStart(3, '0');
    }

    function hexToRgb(hex) {
        if (!hex) {
            return null;
        }
        const normalized = hex.replace('#', '');
        if (normalized.length !== 6) {
            return null;
        }
        const bigint = parseInt(normalized, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }

    function rgbToHex(r, g, b) {
        const toHex = value => value.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    function degreeToRadian(value) {
        return (value * Math.PI) / 180;
    }

    function radianToDegree(value) {
        return (value * 180) / Math.PI;
    }

    function hslToRgb(color) {
        const h = color.h;
        const s = color.s;
        const l = color.l;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let rPrime = 0;
        let gPrime = 0;
        let bPrime = 0;

        if (h < 60) {
            rPrime = c;
            gPrime = x;
        } else if (h < 120) {
            rPrime = x;
            gPrime = c;
        } else if (h < 180) {
            gPrime = c;
            bPrime = x;
        } else if (h < 240) {
            gPrime = x;
            bPrime = c;
        } else if (h < 300) {
            rPrime = x;
            bPrime = c;
        } else {
            rPrime = c;
            bPrime = x;
        }

        return {
            r: (rPrime + m) * 255,
            g: (gPrime + m) * 255,
            b: (bPrime + m) * 255
        };
    }

    function hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let r = 0;
        let g = 0;
        let b = 0;

        if (h >= 0 && h < 60) {
            r = c;
            g = x;
        } else if (h >= 60 && h < 120) {
            r = x;
            g = c;
        } else if (h >= 120 && h < 180) {
            g = c;
            b = x;
        } else if (h >= 180 && h < 240) {
            g = x;
            b = c;
        } else if (h >= 240 && h < 300) {
            r = x;
            b = c;
        } else {
            r = c;
            b = x;
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function rgbToHsv(r, g, b) {
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        const delta = max - min;
        let h = 0;
        let s = max === 0 ? 0 : delta / max;
        const v = max;

        if (delta !== 0) {
            switch (max) {
                case rNorm:
                    h = 60 * (((gNorm - bNorm) / delta) % 6);
                    break;
                case gNorm:
                    h = 60 * (((bNorm - rNorm) / delta) + 2);
                    break;
                case bNorm:
                    h = 60 * (((rNorm - gNorm) / delta) + 4);
                    break;
                default:
                    h = 0;
            }
        }
        if (h < 0) {
            h += 360;
        }

        return { h, s, v };
    }

    function getCsrfToken() {
        const tokenField = document.querySelector('input[name="__RequestVerificationToken"]');
        return tokenField ? tokenField.value : '';
    }

    function drawPixel(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, pixelSize, pixelSize);
    }

    function clearPixel(x, y) {
        ctx.clearRect(x, y, pixelSize, pixelSize);
    }

    function drawHoverIndicator() {
        if (hoverX === null || hoverY === null) return;
        
        // Check if there's already a pixel at this location
        const existingPixel = pixelCache.find(p => p.x === hoverX && p.y === hoverY);
        
        ctx.save();
        
        if (currentMode === 'delete' && existingPixel) {
            // Red overlay for delete mode on existing pixel
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(hoverX, hoverY, pixelSize, pixelSize);
        } else if (currentMode !== 'delete' && !existingPixel) {
            // Show preview only if no pixel exists
            ctx.fillStyle = currentColor;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(hoverX, hoverY, pixelSize, pixelSize);
        }
        
        // Draw border outline
        ctx.strokeStyle = currentMode === 'delete' ? 'rgba(255, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(hoverX + 0.5, hoverY + 0.5, pixelSize - 1, pixelSize - 1);
        
        ctx.restore();
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pixelCache.forEach(pixel => drawPixel(pixel.x, pixel.y, pixel.color));
        drawHoverIndicator();
    }

    function loadCanvas() {
        fetch('/Canvas/GetCanvas')
            .then(response => response.json())
            .then(pixels => {
                pixelCache = pixels;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                pixels.forEach(pixel => drawPixel(pixel.x, pixel.y, pixel.color));
                drawHoverIndicator();
            })
            .catch(error => console.error('Load canvas failed: ', error));
    }

    function addPixel(x, y, color) {
        const token = getCsrfToken();
        if (!token) {
            console.error('Missing anti-forgery token.');
            return;
        }

        const endpoint = isAdmin ? '/Admin/AddPixel' : '/Canvas/SavePixel';

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify({ x, y, color })
        }).then(async response => {
            if (!response.ok) {
                if (!isAdmin && response.status === 400) {
                    const payload = await response.json().catch(() => null);
                    handleCooldown(payload);
                    return;
                }
                throw new Error('Add pixel failed');
            }

            drawPixel(x, y, color);
            connection.invoke('DrawPixel', 'main', x, y, color);

            if (!isAdmin) {
                fetchCooldownStatus();
            }
        }).catch(error => console.error('Add pixel failed: ', error));
    }

    function deletePixel(x, y) {
        if (!isAdmin) {
            return;
        }

        const token = getCsrfToken();
        fetch('/Admin/DeletePixel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify({ x, y })
        }).then(response => {
            if (response.ok) {
                clearPixel(x, y);
                connection.invoke('DrawPixel', 'main', x, y, '#FFFFFF');
            }
        }).catch(error => console.error('Delete pixel failed: ', error));
    }

    function clearCanvas() {
        const token = getCsrfToken();
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
        }).catch(error => console.error('Clear canvas failed: ', error));
    }

    function fetchCooldownStatus() {
        if (isAdmin || !cooldownStatus) {
            return;
        }

        fetch('/Canvas/GetCooldownStatus')
            .then(response => response.json())
            .then(data => handleCooldown(data))
            .catch(error => console.error('Cooldown status failed: ', error));
    }

    let cooldownInterval = null;
    let cooldownEndTime = null;

    function handleCooldown(data) {
        if (!cooldownStatus || !data) {
            return;
        }

        if (cooldownInterval) {
            clearInterval(cooldownInterval);
            cooldownInterval = null;
        }

        if (data.canPlace || data.remainingSeconds <= 0) {
            cooldownStatus.style.display = 'none';
            cooldownStatus.textContent = '';
            cooldownEndTime = null;
        } else {
            cooldownEndTime = Date.now() + (data.remainingSeconds * 1000);
            cooldownStatus.style.display = 'block';
            updateCooldownDisplay();
            
            cooldownInterval = setInterval(() => {
                updateCooldownDisplay();
            }, 1000);
        }
    }

    function updateCooldownDisplay() {
        if (!cooldownStatus || !cooldownEndTime) {
            return;
        }

        const remainingMs = cooldownEndTime - Date.now();
        
        if (remainingMs <= 0) {
            cooldownStatus.style.display = 'none';
            cooldownStatus.textContent = '';
            if (cooldownInterval) {
                clearInterval(cooldownInterval);
                cooldownInterval = null;
            }
            cooldownEndTime = null;
            return;
        }

        const remainingSeconds = Math.ceil(remainingMs / 1000);
        cooldownStatus.textContent = `Cooldown active: wait ${remainingSeconds}s`;
    }

    setMode('add');
}