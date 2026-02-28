/**
 * OpenRouter Provider
 * 
 * 通过 OpenRouter 访问多家模型 (Claude, GPT, Gemini, Llama 等)
 * https://openrouter.ai/docs
 */

import { BaseProvider } from './base.js'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// OpenRouter 精选模型
const OPENROUTER_MODELS = {
  // Anthropic
  'anthropic/claude-sonnet-4': {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 64000,
    description: 'Anthropic 最新 Claude Sonnet 4'
  },
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 8192,
    description: 'Claude 3.5 Sonnet'
  },
  // OpenAI
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 16384,
    description: 'OpenAI 旗舰模型'
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 16384,
    description: '轻量级 GPT-4o'
  },
  // Google
  'google/gemini-2.0-flash-exp': {
    id: 'google/gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    maxOutput: 8192,
    description: 'Google Gemini 2.0 Flash'
  },
  'google/gemini-pro-1.5': {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'google',
    contextWindow: 2000000,
    maxOutput: 8192,
    description: 'Google Gemini Pro 1.5'
  },
  // Meta
  'meta-llama/llama-3.3-70b-instruct': {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    contextWindow: 131072,
    maxOutput: 4096,
    description: 'Meta Llama 3.3 70B'
  },
  // DeepSeek
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutput: 8192,
    description: 'DeepSeek 对话模型'
  },
  'deepseek/deepseek-reasoner': {
    id: 'deepseek/deepseek-reasoner',
    name: 'DeepSeek Reasoner (R1)',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutput: 8192,
    description: 'DeepSeek R1 推理模型'
  },
  // Qwen
  'qwen/qwen-2.5-72b-instruct': {
    id: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    provider: 'qwen',
    contextWindow: 131072,
    maxOutput: 8192,
    description: '阿里通义千问 2.5 72B'
  }
}

export class OpenRouterProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'openrouter',
      name: 'OpenRouter',
      ...config
    })
    this.models = OPENROUTER_MODELS
  }

  /**
   * 获取可用模型列表
   */
  async getModels() {
    // 如果有 API Key，可以获取实时模型列表
    if (this.credentials?.apiKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${this.credentials.apiKey}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          // 返回精选模型 + 热门模型
          const popularIds = Object.keys(this.models)
          return data.data
            .filter(m => popularIds.includes(m.id) || m.top_provider)
            .slice(0, 30)
            .map(m => ({
              id: m.id,
              name: m.name || m.id,
              contextWindow: m.context_length,
              maxOutput: m.top_provider?.max_completion_tokens || 4096,
              description: m.description || '',
              pricing: m.pricing,
              available: true
            }))
        }
      } catch (e) {
        console.error('Failed to fetch OpenRouter models:', e)
      }
    }

    // 返回预设模型
    return Object.values(this.models).map(model => ({
      ...model,
      available: true
    }))
  }

  /**
   * 发送聊天请求
   */
  async chat(options) {
    const { model = 'anthropic/claude-3.5-sonnet', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('OpenRouter API Key not configured')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 4096 }

    const requestBody = {
      model: model,
      messages,
      temperature,
      max_tokens: modelInfo.maxOutput
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools
      requestBody.tool_choice = 'auto'
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://filmdream.studio',
        'X-Title': 'FilmDream Studio'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    return {
      content: choice?.message?.content,
      tool_calls: choice?.message?.tool_calls,
      usage: data.usage
    }
  }

  /**
   * 流式聊天
   */
  async *chatStream(options) {
    const { model = 'anthropic/claude-3.5-sonnet', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('OpenRouter API Key not configured')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 4096 }

    const requestBody = {
      model: model,
      messages,
      temperature,
      max_tokens: modelInfo.maxOutput,
      stream: true
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools
      requestBody.tool_choice = 'auto'
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://filmdream.studio',
        'X-Title': 'FilmDream Studio'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (delta) {
              yield {
                content: delta.content || '',
                tool_calls: delta.tool_calls
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 验证凭证
   */
  async validateCredentials() {
    if (!this.credentials?.apiKey) return false

    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 获取 Provider 信息
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      supportsOAuth: false,
      supportsStreaming: true,
      supportsTools: true,
      authType: 'api_key',
      models: Object.keys(this.models)
    }
  }
}

export default OpenRouterProvider
