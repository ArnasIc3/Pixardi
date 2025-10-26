import { getCanvasSize } from './state.js';
import { getGridElement } from './grid.js';

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
    const projectName = prompt('Enter project name:');
    if (!projectName) return;

    try {
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
        
        if (result.success) {
            alert('Project saved successfully!');
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save project');
    }
}

// Load project from server
async function handleLoadProject() {
    try {
        // First get list of projects
        const listResponse = await fetch('/Project/List');
        const listResult = await listResponse.json();

        if (!listResult.success || listResult.projects.length === 0) {
            alert('No saved projects found');
            return;
        }

        // Show project selection dialog
        const projectNames = listResult.projects.map(p => `${p.name} (${new Date(p.updatedAt).toLocaleDateString()})`);
        const selection = prompt('Select project to load:\n' + projectNames.map((name, i) => `${i + 1}. ${name}`).join('\n') + '\n\nEnter number:');
        
        const index = parseInt(selection) - 1;
        if (isNaN(index) || index < 0 || index >= listResult.projects.length) {
            alert('Invalid selection');
            return;
        }

        const selectedProject = listResult.projects[index];
        
        // Load the selected project
        const loadResponse = await fetch(`/Project/Load?name=${encodeURIComponent(selectedProject.name)}`);
        const loadResult = await loadResponse.json();

        if (loadResult.success) {
            applyCanvasData(loadResult.project);
            alert('Project loaded successfully!');
        } else {
            alert(`Error: ${loadResult.message}`);
        }
    } catch (error) {
        console.error('Load error:', error);
        alert('Failed to load project');
    }
}

// Download canvas as PNG (client-side generation with high quality)
async function handleDownloadPng() {
    try {
        const fileName = prompt('Enter file name (without extension):') || 'pixardi-art';
        const { width, height } = getCanvasSize();
        
        const scaleFactor = 20;
        
        // Create an off-screen canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size scaled up for high quality
        canvas.width = width * scaleFactor;
        canvas.height = height * scaleFactor;
        
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
                    // Draw a scaled rectangle instead of 1x1 pixel
                    ctx.fillRect(
                        x * scaleFactor, 
                        y * scaleFactor, 
                        scaleFactor, 
                        scaleFactor
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
                console.log(`Downloaded ${fileName}.png at ${canvas.width}x${canvas.height}px (${scaleFactor}x scale)`);
            } else {
                alert('Failed to generate PNG file');
            }
        }, 'image/png');
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download PNG file');
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