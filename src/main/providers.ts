// 模型平台预设：全部走 OpenAI 兼容协议，另保留自定义入口。
export interface Provider {
  id: string;
  name: string;
  baseURL: string; // 到 /v1 为止；custom 由用户填写
  defaultModel: string;
  keyURL: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: 'bailian',
    name: '阿里云百炼',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    keyURL: 'https://bailian.console.aliyun.com/'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyURL: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyURL: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'kimi',
    name: 'Kimi（Moonshot）',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-latest',
    keyURL: 'https://platform.moonshot.cn/console/api-keys'
  },
  {
    id: 'custom',
    name: '自定义（OpenAI 兼容）',
    baseURL: '',
    defaultModel: '',
    keyURL: ''
  }
];

export function findProvider(id: string): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}