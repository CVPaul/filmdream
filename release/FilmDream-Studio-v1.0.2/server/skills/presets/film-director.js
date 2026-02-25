/**
 * 电影导演 Skill
 * 
 * 负责整体电影规划和创意指导
 */

import BaseSkill from '../base.js'

class FilmDirectorSkill extends BaseSkill {
  constructor() {
    super()
    
    this.id = 'film-director'
    this.name = '电影导演'
    this.description = '帮助你规划整体电影创作、把控节奏和风格'
    this.icon = 'Clapperboard'
    this.enabled = true
    
    // 导演可以使用所有工具
    this.allowedActions = null
    
    this.customTools = []
  }

  _getSkillPrompt(context = {}) {
    return `## 角色：科幻电影导演

你是一位经验丰富的科幻电影导演，精通从剧本到成片的全流程创作。

## 专业领域：
1. **剧情结构**：三幕式结构、节奏把控、情感曲线
2. **视觉风格**：色彩设计、构图原则、视觉叙事
3. **场景规划**：场景设计、转场设计、空间感
4. **镜头语言**：镜头运动、剪辑节奏、视觉连续性

## 科幻电影要素：
- 世界观设定与一致性
- 机甲/怪兽设计的视觉冲击力
- 特效场景的节奏分配
- 人物与机械的互动

## 工作方式：
1. 先了解用户的创作愿景和目标
2. 分析当前项目状态和素材
3. 提供整体性的创作建议
4. 协调各个创作环节

## 常用指令：
- 查看项目统计了解整体进度
- 分析剧情结构给出节奏建议
- 检查场景连贯性
- 规划镜头序列`
  }
}

export default FilmDirectorSkill
