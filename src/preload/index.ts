import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getState: () => ipcRenderer.invoke('get-state'),
  getKey: (provider: string) => ipcRenderer.invoke('get-key', provider),
  saveConfig: (payload: { provider: string; model: string; customBaseURL: string; key?: string }) =>
    ipcRenderer.invoke('save-config', payload),
  saveModes: (modes: unknown[]) => ipcRenderer.invoke('save-modes', modes),
  resetMode: (id: string) => ipcRenderer.invoke('reset-mode', id),
  setMode: (id: string) => ipcRenderer.invoke('set-mode', id),
  rerun: (id: string) => ipcRenderer.invoke('rerun', id),
  hidePanel: () => ipcRenderer.invoke('hide-panel'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  translateClipboard: () => ipcRenderer.invoke('translate-clipboard'),
  copyText: (text: string) => ipcRenderer.invoke('copy-text', text),
  testConnection: (p: { baseURL: string; model: string; apiKey: string }) =>
    ipcRenderer.invoke('test-connection', p),
  on: (channel: string, cb: (payload: any) => void) => {
    const allowed = ['stream-start', 'stream-delta', 'stream-done', 'stream-error', 'modes-updated'];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_e, payload) => cb(payload));
    }
  }
};

contextBridge.exposeInMainWorld('pt', api);
export type PTApi = typeof api;