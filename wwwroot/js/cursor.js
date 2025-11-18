import { getPixelSize as gridGetPixelSize, getGridElement } from './grid.js';

export function createCursorPreview() {
    let existing = document.getElementById('cursorPreview');
    if (existing) return existing;

    const preview = document.createElement('div');
    preview.id = 'cursorPreview';

    // Basic styles 
    preview.style.boxSizing = 'border-box';
    preview.style.position = 'fixed';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '2000';
    preview.style.transform = 'translate(-50%, -50%)';
    preview.style.display = 'none';
    preview.style.borderRadius = '4px';
    preview.style.boxShadow = '0 6px 18px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)';
    preview.style.transition = 'transform 80ms linear, opacity 120ms';
    preview.style.opacity = '0.98';
    preview.style.border = '2px solid rgba(255,255,255,0.85)';

    document.body.appendChild(preview);
    return preview;
}

/**
 * Get pixel size in px for the current grid.
 * Tries imported gridGetPixelSize() then falls back to measuring first .pixel element.
 */
export function getPixelSizeFromGrid() {
    try {
        if (typeof gridGetPixelSize === 'function') {
            const n = gridGetPixelSize();
            if (typeof n === 'number' && !Number.isNaN(n) && n > 0) return n;
        }
    } catch (e) {
        // ignore and fallback
    }

    const grid = getGridElement ? getGridElement() : document.getElementById('pixelGrid');
    if (!grid) return 12;
    const cssVal = getComputedStyle(grid).getPropertyValue('--pixel-size').trim();
    if (cssVal) {
        const parsed = parseInt(cssVal, 10);
        if (!Number.isNaN(parsed)) return parsed;
    }
    const first = grid.querySelector('.pixel');
    if (first) return Math.max(4, Math.round(first.getBoundingClientRect().width));
    return 12;
}

/**
 * Attach cursor preview handlers.
 * - options.getCurrentTool(): () => 'brush' | 'eraser' | ...
 * - options.getCurrentColor(): () => css color string like '#ff0000'
 * - options.getCanvasSize(): () => ({width, height}) optional; falls back to window.CANVAS_WIDTH/CANVAS_HEIGHT
 *
 * Returns an object { detach() } so caller can remove listeners when grid is recreated.
 */
export function attachCursorPreviewHandlers(options = {}) {
    const getCurrentTool = options.getCurrentTool || (() => window.currentTool);
    const getCurrentColor = options.getCurrentColor || (() => window.currentColor);
    const getCanvasSize = options.getCanvasSize || (() => ({ width: window.CANVAS_WIDTH || 0, height: window.CANVAS_HEIGHT || 0 }));

    const grid = (typeof getGridElement === 'function') ? getGridElement() : document.getElementById('pixelGrid');
    if (!grid) return { detach() {} };

    const preview = createCursorPreview();

    function updatePreviewVisibility(show) {
        preview.style.display = show ? 'block' : 'none';
    }

    function onMove(ev) {
        const rect = grid.getBoundingClientRect();
        const pixelSize = getPixelSizeFromGrid();

        const offsetLeft = rect.left + grid.clientLeft;
        const offsetTop = rect.top + grid.clientTop;

        const { width: canvasW, height: canvasH } = getCanvasSize();

        const cx = ev.clientX;
        const cy = ev.clientY;

        if (cx < offsetLeft || cx >= offsetLeft + canvasW * pixelSize ||
            cy < offsetTop || cy >= offsetTop + canvasH * pixelSize) {
            updatePreviewVisibility(false);
            return;
        }

        updatePreviewVisibility(true);

        const x = Math.floor((cx - offsetLeft) / pixelSize);
        const y = Math.floor((cy - offsetTop) / pixelSize);

        const centerX = offsetLeft + x * pixelSize + pixelSize / 2;
        const centerY = offsetTop + y * pixelSize + pixelSize / 2;

        preview.style.left = `${centerX}px`;
        preview.style.top = `${centerY}px`;
        preview.style.width = `${pixelSize}px`;
        preview.style.height = `${pixelSize}px`;

        const tool = getCurrentTool();
        const color = getCurrentColor();

        if (tool === 'eraser') {
            preview.classList.remove('brush');
            preview.classList.add('eraser');
            preview.style.background = 'transparent';
            preview.style.borderStyle = 'dashed';
            preview.style.borderWidth = '2px';
            preview.style.borderColor = 'rgba(255,255,255,0.9)';
        } else {
            preview.classList.remove('eraser');
            preview.classList.add('brush');
            preview.style.background = color || '#000';
            preview.style.borderStyle = 'solid';
            preview.style.borderWidth = '2px';
            preview.style.borderColor = 'rgba(255,255,255,0.85)';
        }
    }

    function onEnter() { updatePreviewVisibility(true); }
    function onLeave() { updatePreviewVisibility(false); }
    function onDown() { preview.classList.add('active'); }
    function onUp() { preview.classList.remove('active'); }
    function onResize() {
        const pixelSize = getPixelSizeFromGrid();
        preview.style.width = `${pixelSize}px`;
        preview.style.height = `${pixelSize}px`;
    }

    grid.addEventListener('mousemove', onMove);
    grid.addEventListener('mouseenter', onEnter);
    grid.addEventListener('mouseleave', onLeave);
    grid.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    window.addEventListener('resize', onResize);

    return {
        detach() {
            grid.removeEventListener('mousemove', onMove);
            grid.removeEventListener('mouseenter', onEnter);
            grid.removeEventListener('mouseleave', onLeave);
            grid.removeEventListener('mousedown', onDown);
            document.removeEventListener('mouseup', onUp);
            window.removeEventListener('resize', onResize);
            if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
        }
    };
}