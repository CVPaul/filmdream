/**
 * LLM Provider 基础类
 * 所有 Provider 都继承此类
 */

export class BaseProvider {
  constructor(config = {}) {
    this.id = config.id || 'base'
    this.name = config.name || 'Base Provider'
    this.config = config
    this.credentials = null
  }

  /**
   * 设置凭证
   */
  setCredentials(credentials) {
    this.credentials = credentials
  }

  /**
   * 获取可用的模型列表
   */
  async getModels() {
    throw new Error('getModels() must be implemented by subclass')
  }

  /**
   * 发送聊天请求
   * @param {Object} options
   * @param {string} options.model - 模型 ID
   * @param {Array} options.messages - 消息数组
   * @param {Array} options.tools - 工具/函数定义
   * @param {boolean} options.stream - 是否流式输出
   */
  async chat(options) {
    throw new Error('chat() must be implemented by subclass')
  }

  /**
   * 流式聊天（返回 AsyncGenerator）
   */
  async *chatStream(options) {
    throw new Error('chatStream() must be implemented by subclass')
  }

  /**
   * 检查凭证是否有效
   */
  async validateCredentials() {
    throw new Error('validateCredentials() must be implemented by subclass')
  }

  /**
   * 获取 OAuth 授权 URL（如果支持）
   */
  getAuthUrl() {
    return null
  }

  /**
   * 处理 OAuth 回调
   */
  async handleOAuthCallback(code) {
    throw new Error('OAuth not supported for this provider')
  }

  /**
   * 刷新访问令牌（如果需要）
   */
  async refreshToken() {
    // 默认不需要刷新
    return this.credentials
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
      supportsTools: true
    }
  }
}

export default BaseProvider
