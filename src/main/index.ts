import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';
import {
  initStore, getConfig, saveConfig, getModes, saveModes, getMode, resetMode,
  getKey, setKey, resolveProvider, isConfigured
} from './store';
import { PROVIDERS } from './providers';
import {
  triggerTranslate, rerun, openSettings, hidePanel, getPanel, openExternal
} from './windows';
import { testConnection } from './stream';

let tray: Tray | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => openSettings());
  void main();
}

async function main() {
  await app.whenReady();
  if (process.platform === 'darwin') app.dock?.hide();
  initStore();

  setupTray();
  setupIPC();

  const ok = globalShortcut.register('Alt+D', () => void triggerTranslate());
  console.log(`[PickTranslator] globalShortcut Alt+D registered=${ok}`);

  if (!isConfigured()) openSettings();

  // 自检钩子：PT_SELFTEST=1 时启动后自动翻译剪贴板内容，验证全链路
  if (process.env.PT_SELFTEST === '1') {
    setTimeout(() => void triggerTranslate(true), 1500);
  }

  app.on('activate', () => openSettings());
}

app.on('window-all-closed', () => {
  // 托盘常驻，不随窗口关闭退出
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
});

// MARK: - 托盘

function iconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '..', '..', 'resources', 'icon.png');
}

function setupTray() {
  const image = nativeImage.createFromPath(iconPath()).resize({ width: 18, height: 18 });
  tray = new Tray(image);
  tray.setToolTip('PickTranslator 划词翻译（⌥D / Alt+D）');
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray) return;
  const currentID = getConfig().lastMode;
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: '取词翻译  ⌥D / Alt+D', click: () => void triggerTranslate() },
    { label: '翻译剪贴板', click: () => void triggerTranslate(true) },
    { type: 'separator' },
    ...getModes().map((m) => ({
      label: m.name,
      type: 'radio' as const,
      checked: m.id === currentID,
      click: () => {
        saveConfig({ lastMode: m.id });
        rebuildTrayMenu();
        const panel = getPanel();
        if (panel && panel.isVisible()) rerun(m.id);
      }
    })),
    { type: 'separator' },
    { label: '设置…', click: () => openSettings() }
  ];
  if (process.platform === 'darwin') {
    template.push({
      label: '辅助功能权限…',
      click: () => openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    });
  }
  template.push({ type: 'separator' }, { label: '退出 PickTranslator', click: () => app.quit() });
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

// MARK: - IPC

function state() {
  const config = getConfig();
  return {
    platform: process.platform,
    providers: PROVIDERS,
    modes: getModes(),
    config: {
      provider: config.provider,
      models: config.models,
      customBaseURL: config.customBaseURL,
      lastMode: config.lastMode
    },
    resolved: resolveProvider(),
    configured: isConfigured(),
    key: getKey(config.provider)
  };
}

function setupIPC() {
  ipcMain.handle('get-state', () => state());
  ipcMain.handle('get-key', (_e, provider: string) => getKey(provider));

  ipcMain.handle('save-config', (_e, payload: { provider: string; model: string; customBaseURL: string; key?: string }) => {
    const config = getConfig();
    saveConfig({
      provider: payload.provider,
      models: { ...config.models, [payload.provider]: payload.model },
      customBaseURL: payload.customBaseURL
    });
    if (payload.key !== undefined) setKey(payload.provider, payload.key);
    rebuildTrayMenu();
    return state();
  });

  ipcMain.handle('save-modes', (_e, modes: ReturnType<typeof getModes>) => {
    saveModes(modes);
    rebuildTrayMenu();
    const panel = getPanel();
    if (panel && !panel.isDestroyed()) panel.webContents.send('modes-updated', modes);
    return state();
  });

  ipcMain.handle('reset-mode', (_e, id: string) => {
    const modes = resetMode(id);
    rebuildTrayMenu();
    const panel = getPanel();
    if (panel && !panel.isDestroyed()) panel.webContents.send('modes-updated', modes);
    return state();
  });

  ipcMain.handle('set-mode', (_e, id: string) => {
    saveConfig({ lastMode: id });
    rebuildTrayMenu();
    const panel = getPanel();
    if (panel && panel.isVisible()) rerun(id);
    return state();
  });

  ipcMain.handle('rerun', (_e, id: string) => {
    rerun(id);
  });

  ipcMain.handle('hide-panel', () => hidePanel());
  ipcMain.handle('open-settings', () => openSettings());
  ipcMain.handle('open-external', (_e, url: string) => openExternal(url));
  ipcMain.handle('translate-clipboard', () => void triggerTranslate(true));
  ipcMain.handle('copy-text', (_e, text: string) => {
    clipboard.writeText(String(text ?? ''));
  });

  ipcMain.handle('test-connection', async (_e, p: { baseURL: string; model: string; apiKey: string }) => {
    try {
      const msg = await testConnection(p.baseURL, p.model, p.apiKey);
      return { ok: true, msg };
    } catch (e) {
      return { ok: false, msg: (e as Error).message };
    }
  });
}