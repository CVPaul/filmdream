/**
 * DeepSeek Provider
 * 
 * 使用 DeepSeek API
 * API 文档: https://platform.deepseek.com/api-docs
 */

import { BaseProvider } from './base.js'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

// DeepSeek 模型列表
const DEEPSEEK_MODELS = {
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    contextWindow: 64000,
    maxOutput: 8192,
    description: 'DeepSeek V3 通用对话模型'
  },
  'deepseek-reasoner': {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    contextWindow: 64000,
    maxOutput: 8192,
    description: 'DeepSeek R1 推理增强模型'
  }
}

export class DeepSeekProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'deepseek',
      name: 'DeepSeek',
      ...config
    })
    this.models = DEEPSEEK_MODELS
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
    const { model = 'deepseek-chat', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('DeepSeek API Key 未配置')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 8192 }

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

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API 错误: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    return {
      content: choice?.message?.content,
      tool_calls: choice?.message?.tool_calls,
      reasoning_content: choice?.message?.reasoning_content, // DeepSeek R1 特有
      usage: data.usage
    }
  }

  /**
   * 流式聊天
   */
  async *chatStream(options) {
    const { model = 'deepseek-chat', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('DeepSeek API Key 未配置')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 8192 }

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

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API 错误: ${response.status} - ${error}`)
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
                reasoning_content: delta.reasoning_content || '', // DeepSeek R1 特有
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
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
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
      models: Object.keys(this.models),
      description: 'DeepSeek - 高性价比国产大模型',
      apiKeyUrl: 'https://platform.deepseek.com/api_keys'
    }
  }
}

export default DeepSeekProvider
