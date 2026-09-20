export type ProviderId = 'openai' | 'gemini' | 'groq' | 'openrouter' | 'anthropic' | 'deepseek' | 'mistral' | 'xai' | 'ollama';

export const PROVIDERS: { id: ProviderId; label: string; short: string; placeholder: string; needsKey: boolean }[] = [
  { id: 'openai', label: 'OpenAI (GPT)', short: 'GPT', placeholder: 'sk-…', needsKey: true },
  { id: 'gemini', label: 'Google Gemini', short: 'Gemini', placeholder: 'AIza…', needsKey: true },
  { id: 'groq', label: 'Groq', short: 'Groq', placeholder: 'gsk_…', needsKey: true },
  { id: 'openrouter', label: 'OpenRouter', short: 'OpenRouter', placeholder: 'sk-or-…', needsKey: true },
  { id: 'anthropic', label: 'Anthropic (Claude)', short: 'Claude', placeholder: 'sk-ant-…', needsKey: true },
  { id: 'deepseek', label: 'DeepSeek', short: 'DeepSeek', placeholder: 'sk-…', needsKey: true },
  { id: 'mistral', label: 'Mistral AI', short: 'Mistral', placeholder: '…', needsKey: true },
  { id: 'xai', label: 'xAI (Grok)', short: 'Grok', placeholder: 'xai-…', needsKey: true },
  { id: 'ollama', label: 'Ollama (local)', short: 'Ollama', placeholder: 'no key — local daemon', needsKey: false },
];

// Preset fallback — live lists come from GET /api/provider-keys/models.
// Must stay in sync with backend app/schemas/domain.py PROVIDER_DEFAULT_MODELS
export const PROVIDER_MODELS: Record<ProviderId, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'],
  groq: ['openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
  openrouter: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-sonnet-4-0'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  mistral: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
  xai: ['grok-3-mini', 'grok-3', 'grok-4'],
  ollama: ['llama3.1', 'qwen3', 'mistral'],
};

export type SavedProviderKey = {
  id: number;
  provider: string;
  label: string;
  model: string;
  has_key: boolean;
};

export const API_BASE = 'http://127.0.0.1:8000';
