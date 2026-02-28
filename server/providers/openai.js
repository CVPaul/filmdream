/**
 * OpenAI Provider
 * 
 * 直接使用 OpenAI API
 */

import { BaseProvider } from './base.js'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// OpenAI 模型列表
const OPENAI_MODELS = {
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    maxOutput: 16384,
    description: 'OpenAI 旗舰多模态模型'
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutput: 16384,
    description: '轻量级 GPT-4o，性价比高'
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    contextWindow: 128000,
    maxOutput: 4096,
    description: 'GPT-4 增强版'
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    maxOutput: 4096,
    description: '快速响应的轻量级模型'
  },
  'o1-preview': {
    id: 'o1-preview',
    name: 'o1 Preview',
    contextWindow: 128000,
    maxOutput: 32768,
    description: 'OpenAI 推理模型预览版'
  },
  'o1-mini': {
    id: 'o1-mini',
    name: 'o1 Mini',
    contextWindow: 128000,
    maxOutput: 65536,
    description: '轻量级推理模型'
  }
}

export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'openai',
      name: 'OpenAI',
      ...config
    })
    this.models = OPENAI_MODELS
  }

  /**
   * 获取可用模型列表
   */
  async getModels() {
    return Object.values(this.models).map(model => ({
      ...model,
      available: true
    }))
  }

  /**
   * 发送聊天请求
   */
  async chat(options) {
    const { model = 'gpt-4o', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('OpenAI API Key not configured')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 4096 }

    const requestBody = {
      model: modelInfo.id,
      messages,
      temperature,
      max_tokens: modelInfo.maxOutput
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools
      requestBody.tool_choice = 'auto'
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
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
    const { model = 'gpt-4o', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('OpenAI API Key not configured')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 4096 }

    const requestBody = {
      model: modelInfo.id,
      messages,
      temperature,
      max_tokens: modelInfo.maxOutput,
      stream: true
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools
      requestBody.tool_choice = 'auto'
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
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
      const response = await fetch('https://api.openai.com/v1/models', {
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

export default OpenAIProvider
