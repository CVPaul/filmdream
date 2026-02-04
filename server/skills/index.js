/**
 * Skill 管理器
 * 
 * 负责管理所有可用的 Skills，提供统一的访问接口
 */

import { AGENT_ACTIONS } from '../routes/agent.js'

// 导入预设 Skills
import ComfyUIExpertSkill from './presets/comfyui-expert.js'
import FilmDirectorSkill from './presets/film-director.js'
import StoryboardArtistSkill from './presets/storyboard-artist.js'
import CharacterDesignerSkill from './presets/character-designer.js'

class SkillManager {
  constructor() {
    this.skills = new Map()
    this._initializePresets()
  }

  /**
   * 初始化预设 Skills
   */
  _initializePresets() {
    const presets = [
      new ComfyUIExpertSkill(),
      new FilmDirectorSkill(),
      new StoryboardArtistSkill(),
      new CharacterDesignerSkill()
    ]

    for (const skill of presets) {
      const validation = skill.validate()
      if (validation.valid) {
        this.skills.set(skill.id, skill)
      } else {
        console.warn(`Skill validation failed for ${skill.id}:`, validation.errors)
      }
    }

    console.log(`Loaded ${this.skills.size} skills:`, [...this.skills.keys()])
  }

  /**
   * 获取所有可用的 Skills
   * @param {boolean} includeDisabled - 是否包含禁用的 Skills
   * @returns {Array} Skill 列表
   */
  getAllSkills(includeDisabled = false) {
    const skills = [...this.skills.values()]
    if (includeDisabled) return skills
    return skills.filter(s => s.enabled)
  }

  /**
   * 通过 ID 获取 Skill
   * @param {string} skillId - Skill ID
   * @returns {BaseSkill|null}
   */
  getSkill(skillId) {
    return this.skills.get(skillId) || null
  }

  /**
   * 获取 Skill 的系统提示词
   * @param {string} skillId - Skill ID（null 使用默认）
   * @param {Object} context - 上下文
   * @returns {string}
   */
  getSystemPrompt(skillId, context = {}) {
    const skill = this.getSkill(skillId)
    if (skill) {
      return skill.getSystemPrompt(context)
    }
    
    // 默认系统提示词
    return this._getDefaultSystemPrompt()
  }

  /**
   * 获取默认系统提示词（无 Skill 时使用）
   */
  _getDefaultSystemPrompt() {
    const toolNames = Object.keys(AGENT_ACTIONS).join(', ')
    
    return `你是 FilmDream Studio 的 AI 助手，专门帮助用户创作科幻电影。

你可以使用以下工具来帮助用户管理他们的电影项目：
${toolNames}

## 你的能力：
1. **项目管理**：查看项目统计、了解当前进度
2. **图片管理**：浏览、分类、标记图片素材
3. **角色管理**：创建、编辑角色档案，关联角色图片
4. **剧情创作**：帮助用户编写和优化剧情大纲
5. **场景规划**：创建和管理电影场景
6. **分镜设计**：设计分镜头，定义镜头运动和特效
7. **场景流程**：规划场景之间的转场和流转关系
8. **语音配音**：管理配音内容和字幕

## 工作流程建议：
1. 首先使用 get_project_stats 了解项目当前状态
2. 根据用户需求选择合适的工具
3. 执行操作后给出清晰的反馈
4. 主动提出下一步建议

## 注意事项：
- 使用中文与用户交流
- 在执行修改操作前确认用户意图
- 提供创意建议时考虑科幻电影的特点
- 保持专业但友好的语气`
  }

  /**
   * 获取指定 Skill 允许的 Agent Actions
   * @param {string} skillId - Skill ID
   * @returns {Object} 过滤后的 AGENT_ACTIONS
   */
  getFilteredActions(skillId) {
    const skill = this.getSkill(skillId)
    
    if (!skill || !skill.allowedActions) {
      // 返回所有 actions
      return AGENT_ACTIONS
    }
    
    // 过滤 actions
    const filtered = {}
    for (const name of skill.allowedActions) {
      if (AGENT_ACTIONS[name]) {
        filtered[name] = AGENT_ACTIONS[name]
      }
    }
    return filtered
  }

  /**
   * 将 Agent Actions 转换为 OpenAI Function Calling 格式
   * @param {string} skillId - Skill ID（可选）
   * @returns {Array} tools 数组
   */
  convertActionsToTools(skillId = null) {
    const actions = this.getFilteredActions(skillId)
    const skill = this.getSkill(skillId)
    
    // 转换 Agent Actions
    const tools = Object.values(actions).map(action => ({
      type: 'function',
      function: {
        name: action.name,
        description: action.description,
        parameters: action.parameters
      }
    }))
    
    // 添加 Skill 自定义工具
    if (skill) {
      tools.push(...skill.getCustomTools())
    }
    
    return tools
  }

  /**
   * 执行工具调用
   * @param {string} skillId - Skill ID
   * @param {string} toolName - 工具名称
   * @param {Object} parameters - 参数
   * @param {Object} actionHandlers - Agent action handlers
   * @returns {Promise<Object>}
   */
  async executeTool(skillId, toolName, parameters, actionHandlers) {
    const skill = this.getSkill(skillId)
    
    // 首先检查是否是 Skill 自定义工具
    if (skill) {
      const customTools = skill.getCustomTools()
      const isCustomTool = customTools.some(t => t.function?.name === toolName)
      if (isCustomTool) {
        return skill.handleCustomTool(toolName, parameters)
      }
    }
    
    // 否则使用 Agent handler
    const handler = actionHandlers[toolName]
    if (handler) {
      return handler(parameters)
    }
    
    return { error: `Unknown tool: ${toolName}` }
  }

  /**
   * 注册自定义 Skill
   * @param {BaseSkill} skill - Skill 实例
   */
  registerSkill(skill) {
    const validation = skill.validate()
    if (!validation.valid) {
      throw new Error(`Invalid skill: ${validation.errors.join(', ')}`)
    }
    this.skills.set(skill.id, skill)
  }

  /**
   * 移除 Skill
   * @param {string} skillId - Skill ID
   */
  unregisterSkill(skillId) {
    this.skills.delete(skillId)
  }
}

// 单例导出
const skillManager = new SkillManager()
export default skillManager
