import { clipboard } from 'electron';
import { execFile } from 'node:child_process';

function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout) => {
      resolve(err ? '' : stdout);
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// MARK: - macOS：经 System Events 读 AX 选中文本（系统自带 osascript，无自定义二进制）

const MAC_AX_SCRIPT = `
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set focusedElement to value of attribute "AXFocusedUIElement" of frontApp
  set selectedText to value of attribute "AXSelectedText" of focusedElement
  return selectedText
end tell
`;

function macAXSelectedText(): Promise<string> {
  return run('osascript', ['-e', MAC_AX_SCRIPT], 2000);
}

// MARK: - Windows：PowerShell UI Automation 读选中文本

const WIN_UIA_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
$el = [System.Windows.Automation.AutomationElement]::FocusedElement
if ($null -eq $el) { exit 0 }
$pat = $null
if ($el.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern, [ref]$pat)) {
  $ranges = $pat.GetSelection()
  foreach ($r in $ranges) { Write-Output $r.GetText(-1) }
}
`;

function winUIASelectedText(): Promise<string> {
  return run(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', WIN_UIA_SCRIPT],
    3000
  );
}

// MARK: - 剪贴板兜底：保存 → 模拟复制 → 读取 → 恢复

async function simulateCopy(): Promise<void> {
  if (process.platform === 'darwin') {
    await run(
      'osascript',
      ['-e', 'tell application "System Events" to keystroke "c" using command down'],
      2000
    );
  } else {
    await run(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^c")'
      ],
      3000
    );
  }
}

async function clipboardFallback(): Promise<string> {
  const saved = clipboard.readText();
  await simulateCopy();
  await sleep(250);
  const captured = clipboard.readText();
  // 恢复原剪贴板
  if (captured !== saved) {
    clipboard.writeText(saved);
  }
  return captured !== saved ? captured : '';
}

/// 取当前选中文本：原生 API 优先，模拟复制兜底。
export async function captureSelectedText(): Promise<string> {
  let text = '';
  if (process.platform === 'darwin') {
    text = (await macAXSelectedText()).trim();
  } else if (process.platform === 'win32') {
    text = (await winUIASelectedText()).trim();
  }
  if (text) {
    console.log(`[PickTranslator] capture via native API: ${text.length} chars`);
    return text;
  }
  text = (await clipboardFallback()).trim();
  console.log(`[PickTranslator] capture via clipboard: ${text.length} chars`);
  return text;
}