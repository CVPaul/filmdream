/**
 * Anthropic Provider
 * 
 * 直接使用 Anthropic API (Claude)
 */

import { BaseProvider } from './base.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// Claude 模型列表
const ANTHROPIC_MODELS = {
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    contextWindow: 200000,
    maxOutput: 64000,
    description: '平衡速度与能力的 Claude 模型'
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutput: 8192,
    description: 'Claude 3.5 Sonnet 最新版'
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    maxOutput: 8192,
    description: '快速响应的轻量级 Claude 模型'
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutput: 4096,
    description: '最强大的 Claude 3 模型'
  }
}

export class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'anthropic',
      name: 'Anthropic',
      ...config
    })
    this.models = ANTHROPIC_MODELS
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
   * 转换消息格式 (OpenAI -> Anthropic)
   */
  convertMessages(messages) {
    let systemPrompt = ''
    const convertedMessages = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        convertedMessages.push({
          role: msg.role,
          content: msg.content
        })
      } else if (msg.role === 'tool') {
        // Anthropic 使用 tool_result
        convertedMessages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.tool_call_id,
            content: msg.content
          }]
        })
      }
    }

    return { systemPrompt, messages: convertedMessages }
  }

  /**
   * 转换工具格式 (OpenAI -> Anthropic)
   */
  convertTools(tools) {
    if (!tools) return undefined

    return tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters
    }))
  }

  /**
   * 发送聊天请求
   */
  async chat(options) {
    const { model = 'claude-sonnet-4-20250514', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('Anthropic API Key not configured')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 4096 }
    const { systemPrompt, messages: convertedMessages } = this.convertMessages(messages)

    const requestBody = {
      model: modelInfo.id,
      messages: convertedMessages,
      max_tokens: modelInfo.maxOutput,
      temperature
    }

    if (systemPrompt) {
      requestBody.system = systemPrompt
    }

    const convertedTools = this.convertTools(tools)
    if (convertedTools && convertedTools.length > 0) {
      requestBody.tools = convertedTools
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.credentials.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    // 转换响应格式
    let content = ''
    const toolCalls = []

    for (const block of data.content || []) {
      if (block.type === 'text') {
        content += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input)
          }
        })
      }
    }

    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      } : undefined
    }
  }

  /**
   * 流式聊天
   */
  async *chatStream(options) {
    const { model = 'claude-sonnet-4-20250514', messages, tools, temperature = 0.7 } = options

    if (!this.credentials?.apiKey) {
      throw new Error('Anthropic API Key not configured')
    }

    const modelInfo = this.models[model] || { id: model, maxOutput: 4096 }
    const { systemPrompt, messages: convertedMessages } = this.convertMessages(messages)

    const requestBody = {
      model: modelInfo.id,
      messages: convertedMessages,
      max_tokens: modelInfo.maxOutput,
      temperature,
      stream: true
    }

    if (systemPrompt) {
      requestBody.system = systemPrompt
    }

    const convertedTools = this.convertTools(tools)
    if (convertedTools && convertedTools.length > 0) {
      requestBody.tools = convertedTools
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.credentials.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentToolCall = null

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
            
            if (parsed.type === 'content_block_delta') {
              if (parsed.delta?.type === 'text_delta') {
                yield { content: parsed.delta.text }
              } else if (parsed.delta?.type === 'input_json_delta') {
                // 工具调用参数
                if (currentToolCall) {
                  currentToolCall.function.arguments += parsed.delta.partial_json
                }
              }
            } else if (parsed.type === 'content_block_start') {
              if (parsed.content_block?.type === 'tool_use') {
                currentToolCall = {
                  index: parsed.index,
                  id: parsed.content_block.id,
                  type: 'function',
                  function: {
                    name: parsed.content_block.name,
                    arguments: ''
                  }
                }
              }
            } else if (parsed.type === 'content_block_stop') {
              if (currentToolCall) {
                yield { tool_calls: [currentToolCall] }
                currentToolCall = null
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
      // 尝试一个简单的请求
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': this.credentials.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
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
      models: Object.keys(this.models)
    }
  }
}

export default AnthropicProvider
