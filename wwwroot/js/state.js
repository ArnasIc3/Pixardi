// Central app state used by modularized code (grid.js, cursor.js, history.js, tools.js, main.js)

let canvasWidth = 48;
let canvasHeight = 48;

let currentTool = 'brush';
let currentColor = '#000000';

// Simple pub/sub for state change notifications
const listeners = {
  canvasSize: new Set(),   // callbacks: (size) => {}
  tool: new Set(),         // callbacks: (tool) => {}
  color: new Set(),        // callbacks: (color) => {}
};

/* --- Canvas size --- */
export function getCanvasSize() {
  return { width: canvasWidth, height: canvasHeight };
}

export function setCanvasSize(width, height) {
  const w = Math.max(1, Math.floor(Number(width) || 0));
  const h = Math.max(1, Math.floor(Number(height) || 0));
  if (w === canvasWidth && h === canvasHeight) return;

  canvasWidth = w;
  canvasHeight = h;

  // Backwards compatibility for code still reading globals
  try {
    window.CANVAS_WIDTH = canvasWidth;
    window.CANVAS_HEIGHT = canvasHeight;
  } catch (e) { /* ignore */ }

  listeners.canvasSize.forEach(cb => {
    try { cb({ width: canvasWidth, height: canvasHeight }); } catch (e) { console.error(e); }
  });
}

/* --- Tool --- */
export function getCurrentTool() {
  return currentTool;
}

export function setCurrentTool(toolName) {
  if (toolName === currentTool) return;
  currentTool = String(toolName);
  try { window.currentTool = currentTool; } catch (e) {}
  listeners.tool.forEach(cb => {
    try { cb(currentTool); } catch (e) { console.error(e); }
  });
}

/* --- Color --- */
export function getCurrentColor() {
  return currentColor;
}

export function setCurrentColor(color) {
  const c = String(color || '#000000');
  if (c === currentColor) return;
  currentColor = c;
  try { window.currentColor = currentColor; } catch (e) {}
  listeners.color.forEach(cb => {
    try { cb(currentColor); } catch (e) { console.error(e); }
  });
}

/* --- Subscriptions --- */
export function on(event, callback) {
  if (!listeners[event]) throw new Error(`Unknown state event "${event}"`);
  listeners[event].add(callback);
  return () => listeners[event].delete(callback);
}

export function off(event, callback) {
  if (!listeners[event]) return;
  listeners[event].delete(callback);
}

/* initialize window globals for compatibility */
try {
  window.CANVAS_WIDTH = canvasWidth;
  window.CANVAS_HEIGHT = canvasHeight;
  window.currentTool = currentTool;
  window.currentColor = currentColor;
} catch (e) { /* ignore in non-browser contexts */ }

export default {
  getCanvasSize,
  setCanvasSize,
  getCurrentTool,
  setCurrentTool,
  getCurrentColor,
  setCurrentColor,
  on,
  off
};

console.log('LOADING state.js (last modified)', new Date().toISOString());