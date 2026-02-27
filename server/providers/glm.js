/**
 * GLM Provider (智谱 AI)
 * 
 * 使用智谱 AI 的 GLM 系列模型
 * API 文档: https://open.bigmodel.cn/dev/api
 */

import { BaseProvider } from './base.js'
import fetch from 'node-fetch'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// GLM 模型列表
const GLM_MODELS = {
  'glm-4-plus': {
    id: 'glm-4-plus',
    name: 'GLM-4 Plus',
    contextWindow: 128000,
    maxOutput: 4096,
    description: '智谱最强旗舰模型，效果最优'
  },
  'glm-4-0520': {
    id: 'glm-4-0520',
    name: 'GLM-4',
    contextWindow: 128000,
    maxOutput: 4096,
    description: '高智能旗舰模型，综合能力强'
  },
  'glm-4-air': {
    id: 'glm-4-air',
    name: 'GLM-4 Air',
    contextWindow: 128000,
    maxOutput: 4096,
    description: '性价比最高的版本'
  },
  'glm-4-airx': {
    id: 'glm-4-airx',
    name: 'GLM-4 AirX',
    contextWindow: 8192,
    maxOutput: 4096,
    description: '极速推理版本'
  },
  'glm-4-flash': {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    contextWindow: 128000,
    maxOutput: 4096,
    description: '免费调用，适合简单任务'
  },
  'glm-4-long': {
    id: 'glm-4-long',
    name: 'GLM-4 Long',
    contextWindow: 1000000,
    maxOutput: 4096,
    description: '超长上下文，支持100万tokens'
  },
  'glm-4v-plus': {
    id: 'glm-4v-plus',
    name: 'GLM-4V Plus',
    contextWindow: 8192,
    maxOutput: 1024,
    description: '多模态模型，支持图片理解'
  }
}

export class GLMProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'glm',
      name: '智谱 GLM',
      ...config
    })
    this.models = GLM_MODELS
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
    const { model = 'glm-4-flash', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('智谱 API Key 未配置')
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

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`智谱 API 错误: ${response.status} - ${error}`)
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
    const { model = 'glm-4-flash', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('智谱 API Key 未配置')
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

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`智谱 API 错误: ${response.status} - ${error}`)
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
      // 使用免费模型测试
      const response = await fetch(GLM_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
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
      description: '智谱 AI - 国产大模型领先者',
      apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys'
    }
  }
}

export default GLMProvider
