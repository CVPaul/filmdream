/**
 * LLM Provider 管理器
 * 负责管理所有 Provider 和凭证
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { GitHubCopilotProvider } from './github-copilot.js'
import { OpenAIProvider } from './openai.js'
import { AnthropicProvider } from './anthropic.js'
import { OpenRouterProvider } from './openrouter.js'
import { ReplicateProvider } from './replicate.js'
import { GLMProvider } from './glm.js'
import { QwenProvider } from './qwen.js'
import { DeepSeekProvider } from './deepseek.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// LLM Provider 注册表
const PROVIDER_REGISTRY = {
  'github-copilot': GitHubCopilotProvider,
  'openai': OpenAIProvider,
  'anthropic': AnthropicProvider,
  'openrouter': OpenRouterProvider,
  'glm': GLMProvider,
  'qwen': QwenProvider,
  'deepseek': DeepSeekProvider
}

// 视频生成 Provider 注册表
const VIDEO_PROVIDER_REGISTRY = {
  'replicate': ReplicateProvider
}

class ProviderManager {
  constructor() {
    this.providers = new Map()
    this.authPath = join(__dirname, '../data/auth.json')
    this.configPath = join(__dirname, '../data/llm-config.json')
    this.loadAuth()
    this.loadConfig()
  }

  /**
   * 加载保存的凭证
   */
  loadAuth() {
    try {
      if (existsSync(this.authPath)) {
        const data = JSON.parse(readFileSync(this.authPath, 'utf-8'))
        this.authData = data
      } else {
        this.authData = {}
      }
    } catch (error) {
      console.error('Failed to load auth data:', error)
      this.authData = {}
    }
  }

  /**
   * 保存凭证
   */
  saveAuth() {
    try {
      const dir = dirname(this.authPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.authPath, JSON.stringify(this.authData, null, 2))
    } catch (error) {
      console.error('Failed to save auth data:', error)
    }
  }

  /**
   * 加载配置
   */
  loadConfig() {
    try {
      if (existsSync(this.configPath)) {
        this.config = JSON.parse(readFileSync(this.configPath, 'utf-8'))
      } else {
        this.config = {
          defaultProvider: 'github-copilot',
          defaultModel: 'claude-sonnet-4',
          providers: {}
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
      this.config = {
        defaultProvider: 'github-copilot',
        defaultModel: 'claude-sonnet-4',
        providers: {}
      }
    }
  }

  /**
   * 保存配置
   */
  saveConfig() {
    try {
      const dir = dirname(this.configPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  /**
   * 获取所有可用的 Provider
   */
  getAvailableProviders() {
    const llmProviders = Object.keys(PROVIDER_REGISTRY).map(id => {
      const ProviderClass = PROVIDER_REGISTRY[id]
      const instance = new ProviderClass()
      return {
        ...instance.getInfo(),
        isConfigured: !!this.authData[id]
      }
    })

    const videoProviders = Object.keys(VIDEO_PROVIDER_REGISTRY).map(id => {
      const ProviderClass = VIDEO_PROVIDER_REGISTRY[id]
      const instance = new ProviderClass()
      return {
        ...instance.getInfo(),
        isConfigured: !!this.authData[id]
      }
    })

    return { llm: llmProviders, video: videoProviders }
  }

  /**
   * 获取所有可用的 LLM Provider（兼容旧接口）
   */
  getAvailableLLMProviders() {
    return Object.keys(PROVIDER_REGISTRY).map(id => {
      const ProviderClass = PROVIDER_REGISTRY[id]
      const instance = new ProviderClass()
      return {
        ...instance.getInfo(),
        isConfigured: !!this.authData[id]
      }
    })
  }

  /**
   * 获取或创建 Provider 实例
   */
  getProvider(providerId) {
    if (!this.providers.has(providerId)) {
      // 先查找 LLM Provider
      let ProviderClass = PROVIDER_REGISTRY[providerId]
      
      // 如果不是 LLM Provider，查找 Video Provider
      if (!ProviderClass) {
        ProviderClass = VIDEO_PROVIDER_REGISTRY[providerId]
      }
      
      if (!ProviderClass) {
        throw new Error(`Unknown provider: ${providerId}`)
      }

      const provider = new ProviderClass(this.config.providers[providerId] || {})
      
      // 加载保存的凭证
      if (this.authData[providerId]) {
        provider.setCredentials(this.authData[providerId])
      }

      this.providers.set(providerId, provider)
    }

    return this.providers.get(providerId)
  }

  /**
   * 获取视频生成 Provider
   */
  getVideoProvider(providerId = 'replicate') {
    return this.getProvider(providerId)
  }

  /**
   * 保存 Provider 凭证
   */
  setProviderCredentials(providerId, credentials) {
    this.authData[providerId] = credentials
    this.saveAuth()

    // 更新已加载的 Provider 实例
    if (this.providers.has(providerId)) {
      this.providers.get(providerId).setCredentials(credentials)
    }
  }

  /**
   * 删除 Provider 凭证
   */
  removeProviderCredentials(providerId) {
    delete this.authData[providerId]
    this.saveAuth()
    this.providers.delete(providerId)
  }

  /**
   * 检查 Provider 是否已配置
   */
  isProviderConfigured(providerId) {
    return !!this.authData[providerId]
  }

  /**
   * 获取默认 Provider
   */
  getDefaultProvider() {
    return this.getProvider(this.config.defaultProvider)
  }

  /**
   * 设置默认 Provider 和模型
   */
  setDefaults(providerId, modelId) {
    if (providerId) {
      this.config.defaultProvider = providerId
    }
    if (modelId) {
      this.config.defaultModel = modelId
    }
    this.saveConfig()
  }

  /**
   * 获取所有已配置的 Provider 的模型列表
   */
  async getAllModels() {
    const result = []
    
    for (const [providerId, credentials] of Object.entries(this.authData)) {
      if (!credentials) continue
      
      try {
        const provider = this.getProvider(providerId)
        const models = await provider.getModels()
        
        result.push({
          provider: providerId,
          providerName: provider.name,
          models: models.map(m => ({
            ...m,
            fullId: `${providerId}/${m.id}`,
            isDefault: providerId === this.config.defaultProvider && m.id === this.config.defaultModel
          }))
        })
      } catch (error) {
        console.error(`Failed to get models for ${providerId}:`, error)
      }
    }
    
    return result
  }

  /**
   * 发送聊天请求
   * @param {Object} options
   * @param {string} options.provider - Provider ID（可选，默认使用默认 Provider）
   * @param {string} options.model - 模型 ID
   * @param {Array} options.messages - 消息数组
   * @param {Array} options.tools - 工具定义
   * @param {boolean} options.stream - 是否流式输出
   */
  async chat(options) {
    const providerId = options.provider || this.config.defaultProvider
    const provider = this.getProvider(providerId)
    
    return provider.chat({
      model: options.model || this.config.defaultModel,
      messages: options.messages,
      tools: options.tools,
      temperature: options.temperature
    })
  }

  /**
   * 流式聊天
   */
  async *chatStream(options) {
    const providerId = options.provider || this.config.defaultProvider
    const provider = this.getProvider(providerId)
    
    yield* provider.chatStream({
      model: options.model || this.config.defaultModel,
      messages: options.messages,
      tools: options.tools,
      temperature: options.temperature
    })
  }
}

// 单例
const providerManager = new ProviderManager()

export { providerManager, ProviderManager, PROVIDER_REGISTRY, VIDEO_PROVIDER_REGISTRY }
export default providerManager
