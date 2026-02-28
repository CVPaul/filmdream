/**
 * Qwen Provider (通义千问)
 * 
 * 使用阿里云通义千问 API
 * API 文档: https://help.aliyun.com/zh/dashscope/developer-reference/api-details
 */

import { BaseProvider } from './base.js'

const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

// Qwen 模型列表
const QWEN_MODELS = {
  'qwen-max': {
    id: 'qwen-max',
    name: 'Qwen Max',
    contextWindow: 32768,
    maxOutput: 8192,
    description: '通义千问超大规模模型，效果最优'
  },
  'qwen-max-longcontext': {
    id: 'qwen-max-longcontext',
    name: 'Qwen Max 长上下文',
    contextWindow: 30720,
    maxOutput: 8192,
    description: '支持长上下文的超大规模模型'
  },
  'qwen-plus': {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    contextWindow: 131072,
    maxOutput: 8192,
    description: '效果、速度、成本均衡的模型'
  },
  'qwen-turbo': {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    contextWindow: 131072,
    maxOutput: 8192,
    description: '速度快、成本低的模型'
  },
  'qwen-long': {
    id: 'qwen-long',
    name: 'Qwen Long',
    contextWindow: 10000000,
    maxOutput: 6000,
    description: '超长上下文模型，支持1000万tokens'
  },
  'qwen2.5-72b-instruct': {
    id: 'qwen2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    contextWindow: 131072,
    maxOutput: 8192,
    description: 'Qwen 2.5 开源旗舰模型'
  },
  'qwen2.5-32b-instruct': {
    id: 'qwen2.5-32b-instruct',
    name: 'Qwen 2.5 32B',
    contextWindow: 131072,
    maxOutput: 8192,
    description: 'Qwen 2.5 中等规模模型'
  },
  'qwen2.5-14b-instruct': {
    id: 'qwen2.5-14b-instruct',
    name: 'Qwen 2.5 14B',
    contextWindow: 131072,
    maxOutput: 8192,
    description: 'Qwen 2.5 轻量级模型'
  },
  'qwen2.5-7b-instruct': {
    id: 'qwen2.5-7b-instruct',
    name: 'Qwen 2.5 7B',
    contextWindow: 131072,
    maxOutput: 8192,
    description: 'Qwen 2.5 小规模模型'
  },
  'qwen-vl-max': {
    id: 'qwen-vl-max',
    name: 'Qwen VL Max',
    contextWindow: 32768,
    maxOutput: 2048,
    description: '多模态模型，支持图片理解'
  },
  'qwen-vl-plus': {
    id: 'qwen-vl-plus',
    name: 'Qwen VL Plus',
    contextWindow: 8192,
    maxOutput: 2048,
    description: '多模态模型，性价比高'
  },
  'qwen-coder-plus': {
    id: 'qwen-coder-plus',
    name: 'Qwen Coder Plus',
    contextWindow: 131072,
    maxOutput: 8192,
    description: '代码生成专用模型'
  }
}

export class QwenProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'qwen',
      name: '通义千问',
      ...config
    })
    this.models = QWEN_MODELS
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
    const { model = 'qwen-turbo', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('通义千问 API Key 未配置')
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

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`通义千问 API 错误: ${response.status} - ${error}`)
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
    const { model = 'qwen-turbo', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('通义千问 API Key 未配置')
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

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`通义千问 API 错误: ${response.status} - ${error}`)
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
      const response = await fetch(QWEN_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
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
      description: '阿里云通义千问 - 国内领先的大语言模型',
      apiKeyUrl: 'https://dashscope.console.aliyun.com/apiKey'
    }
  }
}

export default QwenProvider
