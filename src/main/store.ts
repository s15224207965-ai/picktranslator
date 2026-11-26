import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEFAULT_MODES, TranslateMode } from './modes-defaults';
import { findProvider } from './providers';

export interface AppConfig {
  provider: string;
  models: Record<string, string>;
  customBaseURL: string;
  keysEnc: Record<string, string>; // safeStorage 加密后的 base64
  lastMode: string;
}

const DEFAULT_CONFIG: AppConfig = {
  provider: 'bailian',
  models: {},
  customBaseURL: '',
  keysEnc: {},
  lastMode: 'en2zh'
};

let config: AppConfig = { ...DEFAULT_CONFIG };
let modes: TranslateMode[] = [...DEFAULT_MODES];
let configPath = '';
let modesPath = '';

function log(msg: string) {
  console.log(`[PickTranslator] ${msg}`);
}

export function initStore() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  configPath = path.join(dir, 'config.json');
  modesPath = path.join(dir, 'modes.json');

  if (fs.existsSync(configPath)) {
    try {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    } catch (e) {
      log(`config parse failed: ${e}`);
    }
  }

  if (fs.existsSync(modesPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(modesPath, 'utf8')) as TranslateMode[];
      if (Array.isArray(saved) && saved.length) {
        modes = saved;
        for (const def of DEFAULT_MODES) {
          if (!modes.some((m) => m.id === def.id)) modes.push(def);
        }
      }
    } catch (e) {
      log(`modes parse failed: ${e}`);
    }
  } else {
    migrateSwiftModes();
  }
  log(`store ready: provider=${config.provider} modes=${modes.length}`);
}

/// 从 Swift 版（legacy）迁移场景配置，保留用户自定义场景。
function migrateSwiftModes() {
  const legacy = path.join(os.homedir(), 'Library', 'Application Support', 'PickTranslator', 'modes.json');
  if (process.platform === 'darwin' && fs.existsSync(legacy)) {
    try {
      const saved = JSON.parse(fs.readFileSync(legacy, 'utf8')) as TranslateMode[];
      if (Array.isArray(saved) && saved.length) {
        modes = saved;
        for (const def of DEFAULT_MODES) {
          if (!modes.some((m) => m.id === def.id)) modes.push(def);
        }
        saveModes(modes);
        log(`migrated ${saved.length} modes from Swift version`);
        return;
      }
    } catch (e) {
      log(`swift modes migration failed: ${e}`);
    }
  }
  saveModes(modes);
}

export function getConfig(): AppConfig {
  return config;
}

export function saveConfig(patch: Partial<AppConfig>) {
  config = { ...config, ...patch };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getModes(): TranslateMode[] {
  return modes;
}

export function saveModes(next: TranslateMode[]) {
  modes = next;
  fs.writeFileSync(modesPath, JSON.stringify(modes, null, 2));
}

export function getMode(id: string): TranslateMode {
  return modes.find((m) => m.id === id) ?? modes[0] ?? DEFAULT_MODES[0];
}

/// 内置场景恢复默认提示词。
export function resetMode(id: string): TranslateMode[] {
  const def = DEFAULT_MODES.find((m) => m.id === id);
  if (def) {
    modes = modes.map((m) => (m.id === id ? { ...def } : m));
    saveModes(modes);
  }
  return modes;
}

// MARK: - API Key（safeStorage：mac 走钥匙串，Windows 走 DPAPI）

export function setKey(provider: string, key: string) {
  const keysEnc = { ...config.keysEnc };
  if (!key) {
    delete keysEnc[provider];
  } else if (safeStorage.isEncryptionAvailable()) {
    keysEnc[provider] = safeStorage.encryptString(key).toString('base64');
  } else {
    keysEnc[provider] = 'plain:' + Buffer.from(key, 'utf8').toString('base64');
  }
  saveConfig({ keysEnc });
}

export function getKey(provider: string): string {
  const enc = config.keysEnc[provider];
  if (enc) {
    try {
      if (enc.startsWith('plain:')) {
        return Buffer.from(enc.slice(6), 'base64').toString('utf8');
      }
      return safeStorage.decryptString(Buffer.from(enc, 'base64'));
    } catch (e) {
      log(`key decrypt failed for ${provider}: ${e}`);
    }
  }
  // 百炼兜底：复用本机 bl CLI 配置
  if (provider === 'bailian') {
    try {
      const bl = JSON.parse(
        fs.readFileSync(path.join(os.homedir(), '.bailian', 'config.json'), 'utf8')
      );
      if (typeof bl.api_key === 'string' && bl.api_key) return bl.api_key;
    } catch {
      /* 无 bl 配置则忽略 */
    }
  }
  return '';
}

export interface ResolvedProvider {
  id: string;
  name: string;
  baseURL: string;
  model: string;
  apiKey: string;
}

export function resolveProvider(): ResolvedProvider {
  const p = findProvider(config.provider);
  const modelOverride = (config.models[p.id] ?? '').trim();
  return {
    id: p.id,
    name: p.name,
    baseURL: p.id === 'custom' ? config.customBaseURL.trim() : p.baseURL,
    model: modelOverride || p.defaultModel,
    apiKey: getKey(p.id)
  };
}

export function isConfigured(): boolean {
  const r = resolveProvider();
  return !!r.apiKey && !!r.baseURL;
}