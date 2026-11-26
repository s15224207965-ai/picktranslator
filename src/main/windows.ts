import { BrowserWindow, clipboard, screen, shell } from 'electron';
import path from 'node:path';
import { captureSelectedText } from './capture';
import { getConfig, getMode, getModes, resolveProvider, isConfigured, saveConfig } from './store';
import { streamTranslation } from './stream';

let panel: BrowserWindow | null = null;
let settings: BrowserWindow | null = null;
let lastText = '';
let currentAbort: AbortController | null = null;

const rendererDir = path.join(__dirname, '..', 'renderer');
const preload = path.join(__dirname, '..', 'preload', 'index.js');

export function getPanel(): BrowserWindow | null {
  return panel;
}

export function ensurePanel(): BrowserWindow {
  if (panel && !panel.isDestroyed()) return panel;
  panel = new BrowserWindow({
    width: 480,
    height: 420,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  panel.loadFile(path.join(rendererDir, 'panel.html'));
  panel.on('blur', () => hidePanel());
  panel.on('closed', () => {
    panel = null;
  });
  return panel;
}

export function hidePanel() {
  if (panel && !panel.isDestroyed()) panel.hide();
}

export async function triggerTranslate(useClipboard = false) {
  const text = useClipboard ? clipboard.readText() : await captureSelectedText();
  lastText = text;
  const win = ensurePanel();
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const area = display.workArea;
  const [w, h] = win.getSize();
  let x = cursor.x + 14;
  let y = cursor.y + 14;
  x = Math.min(Math.max(x, area.x + 8), area.x + area.width - w - 8);
  y = Math.min(Math.max(y, area.y + 8), area.y + area.height - h - 8);
  win.setPosition(x, y);
  win.showInactive();
  startStream(text, currentModeId());
}

/// 用当前原文换场景重译。
export function rerun(modeId: string) {
  if (lastText) startStream(lastText, modeId);
}

function startStream(text: string, modeId: string) {
  currentAbort?.abort();
  currentAbort = new AbortController();
  saveConfig({ lastMode: modeId });
  const mode = getMode(modeId);
  const r = resolveProvider();
  const win = ensurePanel();
  win.webContents.send('stream-start', {
    text,
    modeId,
    modeName: mode.name,
    providerLabel: `${r.name} · ${r.model}`
  });
  void streamTranslation(
    { baseURL: r.baseURL, model: r.model, apiKey: r.apiKey, system: mode.systemPrompt, text },
    win,
    currentAbort.signal
  );
}

export function currentModeId(): string {
  return getConfig().lastMode;
}

export function openSettings() {
  if (settings && !settings.isDestroyed()) {
    settings.show();
    settings.focus();
    return;
  }
  settings = new BrowserWindow({
    width: 680,
    height: 600,
    title: 'PickTranslator 设置',
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settings.loadFile(path.join(rendererDir, 'settings.html'));
  settings.once('ready-to-show', () => settings?.show());
  settings.on('closed', () => {
    settings = null;
  });
}

export function settingsWebContents() {
  return settings && !settings.isDestroyed() ? settings.webContents : null;
}

export function panelWebContents() {
  return panel && !panel.isDestroyed() ? panel.webContents : null;
}

export { isConfigured, resolveProvider, getModes };
export function openExternal(url: string) {
  shell.openExternal(url);
}