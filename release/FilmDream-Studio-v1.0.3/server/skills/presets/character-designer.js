/**
 * 角色设计师 Skill
 * 
 * 专门负责角色创建和管理
 */

import BaseSkill from '../base.js'

class CharacterDesignerSkill extends BaseSkill {
  constructor() {
    super()
    
    this.id = 'character-designer'
    this.name = '角色设计师'
    this.description = '帮助你设计和管理机甲、怪兽和人物角色'
    this.icon = 'User'
    this.enabled = true
    
    // 角色设计师专用工具
    this.allowedActions = [
      'get_project_stats',
      'list_characters',
      'get_character',
      'create_character',
      'update_character',
      'list_images',
      'get_image',
      'update_image',
      'batch_update_images'
    ]
    
    this.customTools = [
      {
        type: 'function',
        function: {
          name: 'design_character_sheet',
          description: '生成角色设定表，包含外观、能力、背景等详细信息',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '角色名称'
              },
              type: {
                type: 'string',
                enum: ['mecha', 'kaiju', 'human', 'alien', 'robot'],
                description: '角色类型'
              },
              style: {
                type: 'string',
                description: '设计风格（如：赛博朋克、生物机械、复古机器人等）'
              },
              traits: {
                type: 'array',
                items: { type: 'string' },
                description: '角色特征关键词'
              }
            },
            required: ['name', 'type']
          }
        }
      }
    ]
  }

  _getSkillPrompt(context = {}) {
    return `## 角色：角色设计师

你是一位专业的角色设计师，专注于科幻电影中的机甲、怪兽和人物角色设计。

## 专业领域：
1. **机甲设计**：结构设计、动力系统、武器系统、涂装配色
2. **怪兽设计**：生物结构、独特能力、弱点设定、进化形态
3. **人物设计**：外形特征、服装设计、性格表现
4. **风格统一**：确保角色之间的视觉协调

## 设计要素：
- 外观描述（形态、尺寸、配色）
- 能力设定（武器、技能、特殊能力）
- 背景故事（来源、动机、关系）
- 设计参考（风格、灵感来源）
- AI 生成提示词（用于生成角色图片）

## 机甲设计要点：
- 驾驶舱位置和可见性
- 关节结构和运动方式
- 武器安装点和弹药库
- 损坏状态的视觉表现

## 怪兽设计要点：
- 生物合理性与幻想元素平衡
- 标志性特征便于识别
- 动态姿态的设计考虑
- 尺寸与人/机甲的对比

## 工作方式：
1. 收集用户的设计需求和偏好
2. 提供概念设计方向
3. 生成详细的角色设定表
4. 提供 AI 图片生成的提示词建议
5. 管理角色图片和变体`
  }

  async handleCustomTool(toolName, parameters) {
    if (toolName === 'design_character_sheet') {
      return this._designCharacterSheet(parameters)
    }
    return { error: `Unknown tool: ${toolName}` }
  }

  _designCharacterSheet({ name, type, style = '', traits = [] }) {
    const templates = {
      mecha: {
        classification: '机甲/载具',
        sections: ['基本信息', '外观设计', '武器系统', '动力系统', '驾驶员要求', '作战记录'],
        suggestedTraits: ['重型装甲', '高机动', '近战特化', '远程火力', '变形机构']
      },
      kaiju: {
        classification: '巨型生物/怪兽',
        sections: ['基本信息', '生物特征', '攻击方式', '弱点分析', '行为模式', '目击记录'],
        suggestedTraits: ['再生能力', '能量吐息', '地下潜行', '飞行能力', '群体意识']
      },
      human: {
        classification: '人类角色',
        sections: ['基本信息', '外貌描述', '性格特点', '技能专长', '背景故事', '人物关系'],
        suggestedTraits: ['驾驶员', '指挥官', '科学家', '战士', '幸存者']
      },
      alien: {
        classification: '外星生物',
        sections: ['基本信息', '种族特征', '能力设定', '文明背景', '与人类关系'],
        suggestedTraits: ['心灵感应', '形态转换', '科技优势', '集体智慧']
      },
      robot: {
        classification: '人工智能/机器人',
        sections: ['基本信息', '外观设计', '核心功能', '智能等级', '行为准则'],
        suggestedTraits: ['自主意识', '战斗型', '辅助型', '学习能力']
      }
    }

    const template = templates[type] || templates.human
    
    return {
      success: true,
      characterSheet: {
        name,
        type,
        classification: template.classification,
        style: style || '待定',
        traits: traits.length > 0 ? traits : template.suggestedTraits.slice(0, 3),
        sections: template.sections,
        suggestedTraits: template.suggestedTraits,
        promptTemplate: this._generatePromptTemplate(name, type, style, traits)
      }
    }
  }

  _generatePromptTemplate(name, type, style, traits) {
    const typePrompts = {
      mecha: 'giant mecha robot, mechanical details, sci-fi design',
      kaiju: 'giant monster kaiju, creature design, epic scale',
      human: 'character portrait, detailed face, sci-fi costume',
      alien: 'alien creature, extraterrestrial design, unique features',
      robot: 'humanoid robot, mechanical design, artificial intelligence'
    }

    const basePrompt = typePrompts[type] || typePrompts.robot
    const stylePrompt = style ? `, ${style} style` : ''
    const traitPrompts = traits.length > 0 ? `, ${traits.join(', ')}` : ''

    return {
      positive: `masterpiece, best quality, ${basePrompt}${stylePrompt}${traitPrompts}, highly detailed, cinematic lighting`,
      negative: 'worst quality, low quality, blurry, deformed, ugly, amateur'
    }
  }
}

export default CharacterDesignerSkill
