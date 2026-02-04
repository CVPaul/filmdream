/**
 * Skill 基类
 * 
 * Skill 定义了 AI 助手的专业角色和能力范围
 * 每个 Skill 可以：
 * 1. 定义专属的系统提示词
 * 2. 限定可用的 Agent Tools 子集
 * 3. 提供领域特定的工具和指令
 */

export class BaseSkill {
  constructor() {
    // 唯一标识符
    this.id = 'base'
    
    // 显示名称
    this.name = '基础助手'
    
    // 描述
    this.description = '通用的 FilmDream 助手'
    
    // 图标（Lucide icon name）
    this.icon = 'Bot'
    
    // 是否启用（可用于控制 Skill 的可见性）
    this.enabled = true
    
    // 可使用的 Agent Action 名称列表
    // null 表示可以使用所有 actions
    // 数组表示只能使用指定的 actions
    this.allowedActions = null
    
    // 额外的专属工具定义（OpenAI Function Calling 格式）
    this.customTools = []
    
    // 系统提示词模板（使用模板字符串）
    this.systemPromptTemplate = ''
  }

  /**
   * 获取系统提示词
   * @param {Object} context - 上下文信息（如当前项目、用户偏好等）
   * @returns {string} 完整的系统提示词
   */
  getSystemPrompt(context = {}) {
    const basePrompt = this._getBasePrompt()
    const skillPrompt = this._getSkillPrompt(context)
    const toolsDescription = this._getToolsDescription()
    
    return `${basePrompt}\n\n${skillPrompt}\n\n${toolsDescription}`
  }

  /**
   * 获取基础提示词（所有 Skill 共享）
   */
  _getBasePrompt() {
    return `你是 FilmDream Studio 的 AI 助手，一个专业的科幻电影创作辅助工具。
你的主要职责是帮助用户完成从概念设计到视频生成的全流程电影创作。

## 核心原则：
1. 使用中文与用户交流
2. 在执行修改操作前确认用户意图
3. 提供专业但友好的建议
4. 主动告知可用的工具和下一步操作`
  }

  /**
   * 获取 Skill 特定的提示词
   * 子类应该重写此方法
   */
  _getSkillPrompt(context = {}) {
    return this.systemPromptTemplate || ''
  }

  /**
   * 获取可用工具的描述
   */
  _getToolsDescription() {
    const toolNames = this.getAllowedActionNames()
    if (!toolNames) {
      return '你可以使用所有可用的 FilmDream 工具来帮助用户。'
    }
    return `你可以使用以下工具：${toolNames.join(', ')}`
  }

  /**
   * 获取允许的 Action 名称列表
   * @returns {Array|null} Action 名称数组，null 表示所有
   */
  getAllowedActionNames() {
    return this.allowedActions
  }

  /**
   * 获取自定义工具定义
   * @returns {Array} OpenAI Function Calling 格式的工具定义
   */
  getCustomTools() {
    return this.customTools
  }

  /**
   * 处理自定义工具调用
   * 子类应该重写此方法以处理 customTools 中定义的工具
   * 
   * @param {string} toolName - 工具名称
   * @param {Object} parameters - 工具参数
   * @returns {Promise<Object>} 工具执行结果
   */
  async handleCustomTool(toolName, parameters) {
    return { error: `Unknown custom tool: ${toolName}` }
  }

  /**
   * 验证 Skill 配置是否有效
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = []
    
    if (!this.id) errors.push('Skill ID is required')
    if (!this.name) errors.push('Skill name is required')
    
    if (this.allowedActions && !Array.isArray(this.allowedActions)) {
      errors.push('allowedActions must be an array or null')
    }
    
    if (this.customTools && !Array.isArray(this.customTools)) {
      errors.push('customTools must be an array')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 序列化为 JSON（用于 API 返回）
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      enabled: this.enabled,
      allowedActions: this.allowedActions,
      hasCustomTools: this.customTools.length > 0
    }
  }
}

export default BaseSkill
