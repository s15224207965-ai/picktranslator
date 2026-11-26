import { BrowserWindow } from 'electron';

export interface StreamRequest {
  baseURL: string;
  model: string;
  apiKey: string;
  system: string;
  text: string;
}

function endpoint(baseURL: string): string {
  let base = baseURL.trim().replace(/\/+$/, '');
  if (!base.endsWith('/chat/completions')) base += '/chat/completions';
  return base;
}

/// 流式翻译：SSE 增量通过 IPC 推给浮窗。
export async function streamTranslation(
  req: StreamRequest,
  target: BrowserWindow,
  signal: AbortSignal
): Promise<void> {
  const send = (channel: string, payload: unknown) => {
    if (channel === 'stream-error') console.log(`[PickTranslator] stream-error: ${payload}`);
    if (channel === 'stream-done') console.log('[PickTranslator] stream-done');
    if (!target.isDestroyed()) target.webContents.send(channel, payload);
  };
  if (!req.apiKey) {
    send('stream-error', '未配置 API Key。请在设置中选择平台并填写 Key。');
    return;
  }
  if (!req.baseURL) {
    send('stream-error', '接口地址为空。请在设置中填写（自定义平台需填到 /v1 为止）。');
    return;
  }

  let response: Response;
  try {
    response = await fetch(endpoint(req.baseURL), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: req.model,
        stream: true,
        temperature: 0.3,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.text }
        ]
      }),
      signal
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    send('stream-error', `网络请求失败：${(e as Error).message}`);
    return;
  }

  if (!response.ok || !response.body) {
    const bodyText = await response.text().catch(() => '');
    send('stream-error', `HTTP ${response.status}：${extractError(bodyText) ?? bodyText.slice(0, 300)}`);
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let receivedAny = false;
  try {
    // @ts-ignore Node 的 ReadableStream 支持异步迭代
    for await (const chunk of response.body) {
      if (signal.aborted) return;
      buffer += decoder.decode(chunk as Uint8Array, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          send('stream-done', null);
          return;
        }
        try {
          const obj = JSON.parse(payload);
          if (obj.error?.message) {
            send('stream-error', String(obj.error.message));
            return;
          }
          const content = obj.choices?.[0]?.delta?.content;
          if (typeof content === 'string' && content) {
            receivedAny = true;
            send('stream-delta', content);
          }
        } catch {
          /* 忽略非 JSON 行 */
        }
      }
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    send('stream-error', `流读取失败：${(e as Error).message}`);
    return;
  }
  if (!receivedAny) {
    send('stream-error', '接口未返回内容，请检查模型名与接口地址。');
    return;
  }
  send('stream-done', null);
}

/// 测试连接：最小非流式请求。
export async function testConnection(baseURL: string, model: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('请先填写 API Key');
  if (!baseURL) throw new Error('请先填写接口地址');
  const response = await fetch(endpoint(baseURL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Reply with OK only.' }]
    })
  });
  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}：${extractError(bodyText) ?? bodyText.slice(0, 300)}`);
  }
  const obj = JSON.parse(bodyText);
  if (!obj.choices?.length) throw new Error(`接口返回格式异常：${bodyText.slice(0, 200)}`);
  return '连接成功';
}

function extractError(body: string): string | null {
  try {
    const obj = JSON.parse(body);
    return obj.error?.message ?? obj.message ?? null;
  } catch {
    return null;
  }
}