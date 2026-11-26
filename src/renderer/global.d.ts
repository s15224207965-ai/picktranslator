// 渲染层全局 API（由 preload contextBridge 注入）
declare const pt: {
  getState(): Promise<any>;
  getKey(provider: string): Promise<string>;
  saveConfig(payload: { provider: string; model: string; customBaseURL: string; key?: string }): Promise<any>;
  saveModes(modes: unknown[]): Promise<any>;
  resetMode(id: string): Promise<any>;
  setMode(id: string): Promise<any>;
  rerun(id: string): Promise<void>;
  hidePanel(): Promise<void>;
  openSettings(): Promise<void>;
  openExternal(url: string): Promise<void>;
  translateClipboard(): Promise<void>;
  copyText(text: string): Promise<void>;
  testConnection(p: { baseURL: string; model: string; apiKey: string }): Promise<{ ok: boolean; msg: string }>;
  on(channel: string, cb: (payload: any) => void): void;
};