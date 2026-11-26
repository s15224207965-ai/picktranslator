interface Mode { id: string; name: string; systemPrompt: string; builtIn: boolean }
interface State {
  platform: string;
  providers: { id: string; name: string; baseURL: string; defaultModel: string; keyURL: string }[];
  modes: Mode[];
  config: { provider: string; models: Record<string, string>; customBaseURL: string; lastMode: string };
  configured: boolean;
  key: string;
}

let state: State;
let selectedModeId: string | null = null;
let dirty = false;

const pageGeneral = document.getElementById('page-general') as HTMLDivElement;
const pageModes = document.getElementById('page-modes') as HTMLDivElement;
const tabGeneral = document.getElementById('tab-general') as HTMLButtonElement;
const tabModes = document.getElementById('tab-modes') as HTMLButtonElement;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

tabGeneral.addEventListener('click', () => switchTab(true));
tabModes.addEventListener('click', () => switchTab(false));
function switchTab(general: boolean) {
  tabGeneral.classList.toggle('active', general);
  tabModes.classList.toggle('active', !general);
  pageGeneral.style.display = general ? '' : 'none';
  pageModes.style.display = general ? 'none' : '';
  if (!general) renderModes();
}

// MARK: - 通用

function renderGeneral() {
  pageGeneral.innerHTML = '';
  const provider = state.providers.find((p) => p.id === state.config.provider) ?? state.providers[0];

  if (!state.configured) {
    const banner = el('div', 'card banner', '首次使用：选择平台 → 填写 API Key → 测试连接 → 保存；macOS 还需授权辅助功能（见下方）。完成后在任意应用选中文字按 ⌥D / Alt+D 即可翻译。');
    pageGeneral.appendChild(banner);
  }

  // 平台卡片
  const card = el('div', 'card');
  card.appendChild(el('h3', undefined, '模型平台'));
  const pSelect = document.createElement('select');
  for (const p of state.providers) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    pSelect.appendChild(opt);
  }
  pSelect.value = provider.id;
  card.appendChild(pSelect);

  card.appendChild(el('label', undefined, 'API Key'));
  const keyInput = document.createElement('input');
  keyInput.type = 'password';
  keyInput.placeholder = '填写平台 API Key';
  keyInput.value = state.key;
  card.appendChild(keyInput);
  if (provider.id === 'bailian') {
    card.appendChild(el('div', 'hint', '留空时若本机存在 bl CLI 配置（~/.bailian/config.json），将自动复用其 Key。'));
  }

  card.appendChild(el('label', undefined, `模型（默认 ${provider.defaultModel || '自行填写'}）`));
  const modelInput = document.createElement('input');
  modelInput.placeholder = provider.defaultModel;
  modelInput.value = state.config.models[provider.id] ?? '';
  card.appendChild(modelInput);

  let baseInput: HTMLInputElement | null = null;
  if (provider.id === 'custom') {
    card.appendChild(el('label', undefined, '接口地址（OpenAI 兼容，填到 /v1 为止）'));
    baseInput = document.createElement('input');
    baseInput.placeholder = 'https://example.com/v1';
    baseInput.value = state.config.customBaseURL;
    card.appendChild(baseInput);
  }

  const btnRow = el('div', 'row');
  btnRow.style.marginTop = '12px';
  const saveBtn = el('button', 'primary', '保存') as HTMLButtonElement;
  const testBtn = el('button', undefined, '测试连接') as HTMLButtonElement;
  btnRow.appendChild(saveBtn);
  btnRow.appendChild(testBtn);
  if (provider.keyURL) {
    const link = el('a', undefined, '获取 Key ↗') as HTMLAnchorElement;
    link.href = '#';
    link.addEventListener('click', (e) => { e.preventDefault(); pt.openExternal(provider.keyURL); });
    btnRow.appendChild(link);
  }
  const savedTip = el('span', 'test-ok', '');
  btnRow.appendChild(savedTip);
  card.appendChild(btnRow);
  const testResult = el('div', '', '');
  card.appendChild(testResult);
  card.appendChild(el('div', 'hint', 'Key 经系统级加密存储（macOS 钥匙串 / Windows DPAPI），不写入明文配置。'));
  pageGeneral.appendChild(card);

  const collect = () => ({
    provider: pSelect.value,
    model: modelInput.value.trim(),
    customBaseURL: baseInput ? baseInput.value.trim() : state.config.customBaseURL,
    key: keyInput.value.trim()
  });

  saveBtn.addEventListener('click', async () => {
    state = await pt.saveConfig(collect());
    savedTip.textContent = '已保存 ✓';
    setTimeout(() => { savedTip.textContent = ''; }, 1500);
    renderGeneral();
  });

  testBtn.addEventListener('click', async () => {
    const c = collect();
    const p = state.providers.find((x) => x.id === c.provider)!;
    testBtn.disabled = true;
    testBtn.textContent = '测试中…';
    testResult.className = '';
    testResult.textContent = '';
    const res = await pt.testConnection({
      baseURL: c.provider === 'custom' ? c.customBaseURL : p.baseURL,
      model: c.model || p.defaultModel,
      apiKey: c.key || state.key
    });
    testResult.className = res.ok ? 'test-ok' : 'test-fail';
    testResult.textContent = res.ok ? '连接成功 ✓' : res.msg;
    testBtn.disabled = false;
    testBtn.textContent = '测试连接';
  });

  pSelect.addEventListener('change', async () => {
    const id = pSelect.value;
    const key = await pt.getKey(id);
    state = { ...state, config: { ...state.config, provider: id }, key };
    renderGeneral();
  });

  // 快捷键卡片
  const hk = el('div', 'card');
  hk.appendChild(el('h3', undefined, '快捷键'));
  hk.appendChild(el('div', undefined, '取词翻译：⌥D（macOS）/ Alt+D（Windows）'));
  hk.appendChild(el('div', 'hint', '在任意应用中选中文字后按下快捷键，浮窗将显示翻译结果。'));
  pageGeneral.appendChild(hk);

  // 权限卡片
  const perm = el('div', 'card');
  perm.appendChild(el('h3', undefined, '权限'));
  if (state.platform === 'darwin') {
    const row = el('div', 'row');
    const openBtn = el('button', undefined, '打开系统设置') as HTMLButtonElement;
    openBtn.addEventListener('click', () => pt.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'));
    row.appendChild(openBtn);
    perm.appendChild(row);
    perm.appendChild(el('div', 'hint', 'macOS 取词经系统 System Events 实现：首次使用时会弹出授权弹窗（辅助功能 / 自动化），请点允许。若曾拒绝，到 系统设置 → 隐私与安全性 → 辅助功能 与 自动化 中勾选本应用（开发运行时为 Electron），然后重启应用。'));
  } else {
    perm.appendChild(el('div', 'hint', 'Windows 取词通过系统 UI Automation / 模拟 Ctrl+C 实现，无需额外授权。部分以管理员身份运行的应用窗口可能无法取词，属系统限制。'));
  }
  pageGeneral.appendChild(perm);
}

// MARK: - 场景与规则

function renderModes() {
  pageModes.innerHTML = '';
  const layout = el('div', 'modes-layout');
  const list = el('div', 'modes-list');
  const items = el('div', 'items');
  list.appendChild(items);
  const addBtn = el('button', undefined, '＋ 新增场景') as HTMLButtonElement;
  list.appendChild(addBtn);
  layout.appendChild(list);

  const editor = el('div', 'mode-editor');
  layout.appendChild(editor);
  pageModes.appendChild(layout);

  const drawList = () => {
    items.innerHTML = '';
    for (const m of state.modes) {
      const item = el('button', 'mode-item' + (m.id === selectedModeId ? ' active' : '')) as HTMLButtonElement;
      item.appendChild(el('span', undefined, m.name));
      if (m.builtIn) item.appendChild(el('span', 'tag', '内置'));
      item.addEventListener('click', () => { selectedModeId = m.id; dirty = false; drawList(); drawEditor(); });
      items.appendChild(item);
    }
  };

  const drawEditor = () => {
    editor.innerHTML = '';
    const mode = state.modes.find((m) => m.id === selectedModeId);
    if (!mode) {
      editor.appendChild(el('div', 'hint', '选择或新增一个场景'));
      return;
    }
    const nameInput = document.createElement('input');
    nameInput.value = mode.name;
    editor.appendChild(nameInput);
    editor.appendChild(el('div', 'hint', '提示词（System Prompt）：定义该场景的翻译规则；翻译时原文作为用户消息一并发给模型。'));
    const promptArea = document.createElement('textarea');
    promptArea.value = mode.systemPrompt;
    editor.appendChild(promptArea);

    const row = el('div', 'row');
    const saveBtn = el('button', 'primary', '保存修改') as HTMLButtonElement;
    saveBtn.disabled = true;
    row.appendChild(saveBtn);
    if (mode.builtIn) {
      const resetBtn = el('button', undefined, '恢复默认') as HTMLButtonElement;
      resetBtn.addEventListener('click', async () => {
        state = await pt.resetMode(mode.id);
        dirty = false;
        drawList(); drawEditor();
      });
      row.appendChild(resetBtn);
    } else {
      const delBtn = el('button', 'danger', '删除场景') as HTMLButtonElement;
      delBtn.addEventListener('click', async () => {
        if (!confirm(`删除「${mode.name}」？`)) return;
        state = await pt.saveModes(state.modes.filter((m) => m.id !== mode.id));
        selectedModeId = state.modes[0]?.id ?? null;
        dirty = false;
        drawList(); drawEditor();
      });
      row.appendChild(delBtn);
    }
    const dirtyTip = el('span', 'dirty', '');
    row.appendChild(dirtyTip);
    editor.appendChild(row);

    const markDirty = () => { dirty = true; saveBtn.disabled = false; dirtyTip.textContent = '未保存'; };
    nameInput.addEventListener('input', markDirty);
    promptArea.addEventListener('input', markDirty);
    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      mode.name = name;
      mode.systemPrompt = promptArea.value;
      state = await pt.saveModes(state.modes);
      dirty = false;
      drawList(); drawEditor();
    });
  };

  addBtn.addEventListener('click', async () => {
    const newMode: Mode = {
      id: 'custom-' + Math.random().toString(36).slice(2, 10),
      name: '新场景',
      systemPrompt: '你是专业的翻译引擎。请在这里写下你的场景规则，然后保存。',
      builtIn: false
    };
    state = await pt.saveModes([...state.modes, newMode]);
    selectedModeId = newMode.id;
    dirty = false;
    drawList(); drawEditor();
  });

  if (!selectedModeId) selectedModeId = state.config.lastMode || state.modes[0]?.id;
  drawList();
  drawEditor();
}

pt.getState().then((s: State) => {
  state = s;
  renderGeneral();
});

pt.on('modes-updated', (modes: Mode[]) => {
  state = { ...state, modes };
  if (pageModes.style.display !== 'none') renderModes();
});