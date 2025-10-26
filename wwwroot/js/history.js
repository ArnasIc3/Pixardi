// History / undo support used by drawing modules and UI

import { queryPixel, getGridElement } from './grid.js';

export let historyStack = [];
let currentAction = null;
export const MAX_HISTORY = 100;

export function startAction(type) {
    currentAction = { type, pixels: new Map() }; // key "x,y" -> {x,y,prevColor}
}

export function recordPixelChange(x, y, prevColor) {
    if (!currentAction) return;
    const key = `${x},${y}`;
    if (!currentAction.pixels.has(key)) {
        currentAction.pixels.set(key, { x, y, prevColor });
    }
}

export function endAction() {
    if (!currentAction) return;
    const pixelsArray = Array.from(currentAction.pixels.values());
    if (pixelsArray.length > 0) {
        historyStack.push({ type: currentAction.type, pixels: pixelsArray });
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
    }
    currentAction = null;
}

export function undo() {
    if (historyStack.length === 0) return;
    const action = historyStack.pop();
    action.pixels.forEach(p => {
        const el = queryPixel(p.x, p.y);
        if (el) el.style.backgroundColor = p.prevColor || '';
    });
}



/**
 * Bind Ctrl+Z / Cmd+Z to undo().
 * Call once during app initialization (main.js).
 */
export function bindHistoryKeys() {
    function onKey(ev) {
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
            ev.preventDefault();
            undo();
        }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
}

export default {
    startAction,
    recordPixelChange,
    endAction,
    undo,
    bindHistoryKeys
};