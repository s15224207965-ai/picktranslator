const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
const content = document.getElementById('content') as HTMLDivElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;

let modes: { id: string; name: string }[] = [];
let currentModeId = '';
let resultEl: HTMLElement | null = null;
let copyBtn: HTMLButtonElement | null = null;
let lastResult = '';

function fillModeSelect() {
  modeSelect.innerHTML = '';
  for (const m of modes) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    modeSelect.appendChild(opt);
  }
  modeSelect.value = currentModeId;
}

function renderEmpty() {
  resultEl = null;
  copyBtn = null;
  content.innerHTML = `
    <div class="empty-state">
      <div class="big">✂️</div>
      <h3>未取到选中文本</h3>
      <div>请先在任意应用中选中文字，再按 ⌥D / Alt+D；<br/>或直接翻译当前剪贴板内容。</div>
      <button id="clip-btn">翻译剪贴板</button>
    </div>`;
  document.getElementById('clip-btn')?.addEventListener('click', () => pt.translateClipboard());
}

function renderStream(text: string, providerLabel: string) {
  lastResult = '';
  content.innerHTML = `
    <div class="source" id="source"></div>
    <div class="divider"></div>
    <div class="result-wrap"><div class="status-line" id="status"><div class="spinner"></div>翻译中…</div><div class="result" id="result"></div></div>
    <div class="panel-foot"><span id="provider"></span><div class="spacer"></div><button id="copy-btn" disabled>复制译文</button></div>`;
  (document.getElementById('source') as HTMLElement).textContent = text;
  (document.getElementById('provider') as HTMLElement).textContent = providerLabel;
  resultEl = document.getElementById('result');
  copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  copyBtn.addEventListener('click', () => {
    pt.copyText(lastResult);
    copyBtn!.textContent = '已复制 ✓';
    setTimeout(() => { if (copyBtn) copyBtn.textContent = '复制译文'; }, 1200);
  });
}

function renderError(msg: string) {
  const wrap = content.querySelector('.result-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="error"></div><div style="margin-top:8px"><button id="retry-btn">重试</button></div>`;
  (wrap.querySelector('.error') as HTMLElement).textContent = msg;
  document.getElementById('retry-btn')?.addEventListener('click', () => pt.rerun(currentModeId));
}

pt.on('stream-start', (p: { text: string; modeId: string; providerLabel: string }) => {
  currentModeId = p.modeId;
  modeSelect.value = p.modeId;
  if (!p.text || !p.text.trim()) renderEmpty();
  else renderStream(p.text, p.providerLabel);
});

pt.on('stream-delta', (delta: string) => {
  if (!resultEl) return;
  const status = document.getElementById('status');
  if (status) status.remove();
  lastResult += delta;
  resultEl.textContent = lastResult;
  if (copyBtn) copyBtn.disabled = false;
  const wrap = content.querySelector('.result-wrap');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
});

pt.on('stream-done', () => {
  const status = document.getElementById('status');
  if (status) status.remove();
});

pt.on('stream-error', (msg: string) => renderError(msg));

pt.on('modes-updated', (next: { id: string; name: string }[]) => {
  modes = next;
  fillModeSelect();
});

modeSelect.addEventListener('change', () => {
  currentModeId = modeSelect.value;
  pt.rerun(currentModeId);
});

closeBtn.addEventListener('click', () => pt.hidePanel());
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') pt.hidePanel();
});

pt.getState().then((s: any) => {
  modes = s.modes;
  currentModeId = s.config.lastMode;
  fillModeSelect();
  renderEmpty();
});