import { getCanvasSize } from './state.js';
import { getGridElement } from './grid.js';
import { modalManager, showSaveModal, showLoadModal, showDownloadModal } from './modals.js';
import { loadingScreen } from './loading.js';

// Initialize project controls (with duplicate prevention)
let initialized = false;

export function initProjectControls() {
    if (initialized) {
        console.warn('Project controls already initialized');
        return;
    }
    
    const saveBtn = document.getElementById('saveProjectBtn');
    const loadBtn = document.getElementById('loadProjectBtn');
    const downloadBtn = document.getElementById('downloadPngBtn');

    if (saveBtn) saveBtn.addEventListener('click', handleSaveProject);
    if (loadBtn) loadBtn.addEventListener('click', handleLoadProject);
    if (downloadBtn) downloadBtn.addEventListener('click', handleDownloadPng);
    
    initialized = true;
    console.log('Project controls initialized');
}

// Save project to server
async function handleSaveProject() {
    try {
        const projectName = await showSaveModal();
        if (!projectName) return;

        const loadingPromise = loadingScreen.showSaving(`Saving "${projectName}"...`);

        const canvasData = getCanvasData();
        const { width, height } = getCanvasSize();

        const response = await fetch('/Project/Save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
            },
            body: JSON.stringify({
                name: projectName,
                width,
                height,
                canvasData
            })
        });

        const result = await response.json();
        
        await loadingPromise;
        loadingScreen.hide();

        if (result.success) {
            modalManager.showMessage('saveModal', 'Project saved successfully!', 'success');
            setTimeout(() => modalManager.closeAll(), 1500);
        } else {
            modalManager.showMessage('saveModal', `Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        modalManager.showMessage('saveModal', 'Failed to save project', 'error');
    }
}

// Load project from server
async function handleLoadProject() {
    try {
        // First get list of projects
        const listResponse = await fetch('/Project/List');
        const listResult = await listResponse.json();
    
        if (!listResult.success || listResult.projects.length === 0) {
            modalManager.show('loadModal');
            modalManager.showMessage('loadModal', 'No saved projects found', 'error');
            return;
        }

        const selectedProject = await showLoadModal(listResult.projects);
        if (!selectedProject) return;

        const loadingPromise = loadingScreen.showLoading(`Loading "${selectedProject.name}"...`);

        // Load the selected project
        const loadResponse = await fetch(`/Project/Load?name=${encodeURIComponent(selectedProject.name)}`);
        const loadResult = await loadResponse.json();

        await loadingPromise;
        loadingScreen.hide();

        if (loadResult.success) {
            applyCanvasData(loadResult.project);
            // Show success message briefly
            modalManager.show('loadModal');
            modalManager.showMessage('loadModal', 'Project loaded successfully!', 'success');
            setTimeout(() => modalManager.closeAll(), 1500);
        } else {
            modalManager.showMessage('loadModal', `Error: ${loadResult.message}`, 'error');
        }
    } catch (error) {
        console.error('Load error:', error);
        modalManager.showMessage('loadModal', 'Failed to load project', 'error');
    }
}

// Download canvas as PNG (client-side generation with high quality)
async function handleDownloadPng() {
    try {
        const canvasSize = getCanvasSize();
        const downloadOptions = await showDownloadModal(canvasSize);
        if (!downloadOptions) return;

        const { fileName, scale } = downloadOptions;
        
        // Create an off-screen canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size scaled up for high quality
        canvas.width = canvasSize.width * scale;
        canvas.height = canvasSize.height * scale;
        
        // Disable image smoothing to keep sharp pixel edges
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw each pixel scaled up
        const grid = getGridElement();
        if (grid) {
            const pixels = grid.querySelectorAll('.pixel[style*="background-color"]');
            pixels.forEach(pixel => {
                const x = parseInt(pixel.dataset.x || '0');
                const y = parseInt(pixel.dataset.y || '0');
                const color = pixel.style.backgroundColor;
                
                if (color && color !== 'transparent') {
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        x * scale, 
                        y * scale, 
                        scale, 
                        scale
                    );
                }
            });
        }
        
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fileName}.png`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                // Show success message
                modalManager.show('downloadModal');
                modalManager.showMessage('downloadModal', `Downloaded ${fileName}.png (${canvas.width}×${canvas.height}px)`, 'success');
                setTimeout(() => modalManager.closeAll(), 2000);
            } else {
                modalManager.showMessage('downloadModal', 'Failed to generate PNG file', 'error');
            }
        }, 'image/png');
        
    } catch (error) {
        console.error('Download error:', error);
        modalManager.showMessage('downloadModal', 'Failed to download PNG file', 'error');
    }
}

// Get canvas data for saving
function getCanvasData() {
    const grid = getGridElement();
    if (!grid) return {};

    const data = {};
    const pixels = grid.querySelectorAll('.pixel[style*="background-color"]');
    
    pixels.forEach(pixel => {
        const x = parseInt(pixel.dataset.x || '0');
        const y = parseInt(pixel.dataset.y || '0');
        const color = pixel.style.backgroundColor;
        if (color && color !== 'transparent') {
            data[`${x},${y}`] = color;
        }
    });

    return data;
}

// Apply loaded canvas data
function applyCanvasData(project) {
    const currentSize = getCanvasSize();
    const projectSize = { width: project.width, height: project.height };
    
    // Only ask to resize if the project has different dimensions
    if (projectSize.width && projectSize.height && 
        (projectSize.width !== currentSize.width || projectSize.height !== currentSize.height)) {
        
        const shouldResize = confirm(
            `This project was created with size ${projectSize.width}x${projectSize.height}, ` +
            `but your current canvas is ${currentSize.width}x${currentSize.height}. ` +
            `Do you want to resize the canvas to match the project?`
        );
        
        if (shouldResize && window.changeCanvasSize) {
            window.changeCanvasSize(projectSize.width, projectSize.height);
        }
    }

    // Apply pixel data
    const grid = getGridElement();
    if (!grid || !project.canvasData) return;

    // Clear existing pixels
    const pixels = grid.querySelectorAll('.pixel');
    pixels.forEach(pixel => {
        pixel.style.backgroundColor = '';
    });

    // Apply saved pixels
    Object.entries(project.canvasData).forEach(([coords, color]) => {
        const [x, y] = coords.split(',').map(Number);
        const pixel = grid.querySelector(`.pixel[data-x="${x}"][data-y="${y}"]`);
        if (pixel) {
            pixel.style.backgroundColor = color;
        }
    });
}

// Get pixel data for SVG download
function getPixelDataForDownload() {
    const grid = getGridElement();
    if (!grid) return [];

    const pixelData = [];
    const pixels = grid.querySelectorAll('.pixel[style*="background-color"]');
    
    pixels.forEach(pixel => {
        const x = parseInt(pixel.dataset.x || '0');
        const y = parseInt(pixel.dataset.y || '0');
        const style = pixel.style.backgroundColor;
        
        if (style && style !== 'transparent') {
            // Convert RGB to hex
            const color = rgbToHex(style);
            pixelData.push({ x, y, color });
        }
    });

    return pixelData;
}

// Convert RGB color to hex
function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#000000';
    
    const [, r, g, b] = match;
    return '#' + [r, g, b].map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Note: Initialization is handled by main.js dynamic import