/**
 * GitHub Copilot Provider
 * 
 * 通过 GitHub Copilot 订阅访问多家模型（Claude、GPT 等）
 * 使用 GitHub Device Flow 进行 OAuth 认证
 */

import { BaseProvider } from './base.js'

// GitHub Copilot 支持的模型 (fallback when /models API unavailable)
const COPILOT_MODELS = {
  // Claude 模型
  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 16000,
    description: '平衡速度与能力的 Claude 模型'
  },
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 90000,
    maxOutput: 8192,
    description: 'Claude 3.5 Sonnet'
  },
  // OpenAI 模型
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 16384,
    description: 'OpenAI 的旗舰多模态模型'
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 4096,
    description: '轻量级 GPT-4o'
  },
  'o3-mini': {
    id: 'o3-mini',
    name: 'o3 Mini',
    provider: 'openai',
    contextWindow: 200000,
    maxOutput: 100000,
    description: '推理模型'
  },
  'o4-mini': {
    id: 'o4-mini',
    name: 'o4 Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 16384,
    description: '最新推理模型'
  },
  // Google 模型
  'gemini-2.0-flash-001': {
    id: 'gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1000000,
    maxOutput: 8192,
    description: 'Google 快速多模态模型'
  }
}

// GitHub OAuth 配置
const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98' // GitHub Copilot 的 Client ID
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const COPILOT_TOKEN_URL = 'https://api.github.com/copilot_internal/v2/token'
const COPILOT_CHAT_URL = 'https://api.githubcopilot.com/chat/completions'
const COPILOT_MODELS_URL = 'https://api.githubcopilot.com/models'

export class GitHubCopilotProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'github-copilot',
      name: 'GitHub Copilot',
      ...config
    })
    
    this.models = COPILOT_MODELS
    this.remoteModels = null  // cached remote models
    this.deviceCode = null
    this.copilotToken = null
    this.tokenExpiresAt = null
  }

  /**
   * 获取可用的模型列表
   * 先尝试从 GitHub Copilot API 获取，失败则用硬编码列表
   */
  async getModels() {
    // Try fetching from remote API if authenticated
    if (this.credentials?.accessToken) {
      try {
        const token = await this.getCopilotToken()
        const response = await fetch(COPILOT_MODELS_URL, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Copilot-Integration-Id': 'vscode-chat',
            'Editor-Version': 'vscode/1.85.0',
            'User-Agent': 'FilmDream-Studio/1.0'
          }
        })
        if (response.ok) {
          const data = await response.json()
          if (data.models && Array.isArray(data.models)) {
            this.remoteModels = data.models
              .filter(m => m.capabilities?.type === 'chat')
              .map(m => ({
                id: m.id,
                name: m.name || m.id,
                provider: m.vendor || 'unknown',
                contextWindow: m.capabilities?.limits?.max_prompt_tokens || 128000,
                maxOutput: m.capabilities?.limits?.max_output_tokens || 4096,
                description: m.name || m.id,
                available: true
              }))
            if (this.remoteModels.length > 0) {
              return this.remoteModels
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch remote models:', error.message)
      }
    }
    // Fallback to hardcoded models
    return Object.values(this.models).map(model => ({
      ...model,
      available: true
    }))
  }

  /**
   * 开始 Device Flow OAuth
   * 返回 { userCode, verificationUri, deviceCode, expiresIn, interval }
   */
  async startDeviceFlow() {
    const maxRetries = 3
    let lastError = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 秒超时

        const response = await fetch(GITHUB_DEVICE_CODE_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            scope: 'read:user'
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Failed to start device flow: ${response.status}`)
        }

        const data = await response.json()
        this.deviceCode = data.device_code

        return {
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          deviceCode: data.device_code,
          expiresIn: data.expires_in,
          interval: data.interval
        }
      } catch (error) {
        lastError = error
        console.error(`GitHub Device Flow attempt ${attempt}/${maxRetries} failed:`, error.message)
        
        if (attempt < maxRetries) {
          // 等待后重试 (指数退避)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // 所有重试都失败了
    const errorMessage = lastError?.message || 'Unknown error'
    if (errorMessage.includes('socket') || errorMessage.includes('TLS') || errorMessage.includes('ECONNRESET')) {
      throw new Error(`网络连接失败，无法连接到 GitHub。请检查网络连接或代理设置。\n原始错误: ${errorMessage}`)
    }
    throw new Error(`GitHub 认证失败: ${errorMessage}`)
  }

  /**
   * 轮询检查用户是否已授权（单次轮询）
   * 用于前端轮询调用
   */
  async pollDeviceFlow(deviceCode) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()


      if (data.access_token) {
        const credentials = {
          accessToken: data.access_token,
          tokenType: data.token_type,
          scope: data.scope
        }
        this.credentials = credentials
        return { status: 'success', credentials }
      }

      if (data.error === 'authorization_pending') {
        return { status: 'pending', message: 'Waiting for user authorization', interval: data.interval || 5 }
      }

      if (data.error === 'slow_down') {
        return { status: 'pending', message: 'Waiting for user authorization', interval: data.interval || 10 }

      }
      if (data.error === 'expired_token') {
        return { status: 'expired', message: 'Device code expired' }
      }

      if (data.error === 'access_denied') {
        return { status: 'denied', message: 'Authorization denied by user' }
      }

      return { status: 'error', message: data.error_description || data.error }
    } catch (error) {
      // 网络错误时返回 retry 状态，让前端继续轮询
      if (error.name === 'AbortError' || error.message.includes('socket') || error.message.includes('TLS')) {
        return { status: 'retry', message: '网络连接不稳定，正在重试...' }
      }
      return { status: 'error', message: error.message }
    }
  }

  /**
   * 轮询检查用户是否已授权（阻塞式，直到成功或失败）
   */
  async pollForToken(deviceCode, interval = 5) {
    const maxAttempts = 60 // 最多轮询 5 分钟
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, interval * 1000))

      const response = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      })

      const data = await response.json()

      if (data.access_token) {
        this.credentials = {
          accessToken: data.access_token,
          tokenType: data.token_type,
          scope: data.scope
        }
        return this.credentials
      }

      if (data.error === 'authorization_pending') {
        continue // 用户还没有完成授权
      }

      if (data.error === 'slow_down') {
        interval += 5 // 增加轮询间隔
        continue
      }

      if (data.error === 'expired_token') {
        throw new Error('Device code expired. Please restart the authorization process.')
      }

      if (data.error === 'access_denied') {
        throw new Error('Authorization was denied by the user.')
      }

      throw new Error(`OAuth error: ${data.error} - ${data.error_description}`)
    }

    throw new Error('Authorization timeout. Please try again.')
  }

  /**
   * 获取 Copilot API Token
   * GitHub OAuth token 需要换成 Copilot token 才能调用 API
   */
  async getCopilotToken() {
    if (!this.credentials?.accessToken) {
      throw new Error('No GitHub access token. Please authenticate first.')
    }

    // 检查是否有缓存的 token 且未过期
    if (this.copilotToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.copilotToken
    }

    const response = await fetch(COPILOT_TOKEN_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Accept': 'application/json',
        'Editor-Version': 'vscode/1.85.0',
        'Editor-Plugin-Version': 'copilot/1.0.0',
        'User-Agent': 'FilmDream-Studio/1.0'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get Copilot token: ${response.status} - ${error}`)
    }

    const data = await response.json()
    this.copilotToken = data.token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000 // 提前 1 分钟过期

    return this.copilotToken
  }

  /**
   * 发送聊天请求
   */
  async chat(options) {
    const { model = 'gpt-4o', messages, tools, temperature = 0.7 } = options

    const token = await this.getCopilotToken()
    const modelInfo = this.models[model] || { id: model }

    const requestBody = {
      model: modelInfo.id,
      messages,
      temperature,
      max_tokens: modelInfo.maxOutput || 4096
    }

    // 添加工具调用支持
    if (tools && tools.length > 0) {
      requestBody.tools = tools
      requestBody.tool_choice = 'auto'
    }

    const response = await fetch(COPILOT_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Editor-Version': 'vscode/1.85.0',
        'Copilot-Integration-Id': 'vscode-chat',
        'User-Agent': 'FilmDream-Studio/1.0'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Chat request failed: ${response.status} - ${error}`)
    }

    return await response.json()
  }

  /**
   * 流式聊天
   */
  async *chatStream(options) {
    const { model = 'gpt-4o', messages, tools, temperature = 0.7 } = options

    const token = await this.getCopilotToken()
    const modelInfo = this.models[model] || { id: model }

    const requestBody = {
      model: modelInfo.id,
      messages,
      temperature,
      max_tokens: modelInfo.maxOutput || 4096,
      stream: true
    }

    if (tools && tools.length > 0) {
      requestBody.tools = tools
      requestBody.tool_choice = 'auto'
    }

    const response = await fetch(COPILOT_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Editor-Version': 'vscode/1.85.0',
        'Copilot-Integration-Id': 'vscode-chat',
        'User-Agent': 'FilmDream-Studio/1.0'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Stream request failed: ${response.status} - ${error}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // 保留不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            return
          }
          try {
            yield JSON.parse(data)
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
    try {
      await this.getCopilotToken()
      return true
    } catch (error) {
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
      supportsOAuth: true,
      supportsStreaming: true,
      supportsTools: true,
      authType: 'device_flow',
      models: Object.keys(this.models)
    }
  }
}

export default GitHubCopilotProvider
