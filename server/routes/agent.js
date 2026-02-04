/**
 * AI Agent API - 统一的 LLM 调用接口
 * 
 * 这个模块将 FilmDream 的所有功能暴露为可被 AI/LLM 调用的 Actions
 * 支持 OpenAI Function Calling 格式
 */

import express from 'express'
import db, { getNextId, findById, deleteById } from '../db.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// 加载技巧数据
let techniques = {}
try {
  const techniquesPath = join(__dirname, '../../client/src/data/techniques.json')
  techniques = JSON.parse(readFileSync(techniquesPath, 'utf-8'))
} catch (e) {
  console.warn('Could not load techniques.json:', e.message)
}

// ==================== Action 定义 ====================

/**
 * 所有可用的 Actions 及其 Schema
 * 这些定义可以直接转换为 OpenAI Function Calling 格式
 */
export const AGENT_ACTIONS = {
  // ========== 项目概览 ==========
  get_project_stats: {
    name: 'get_project_stats',
    description: '获取项目统计数据，包括图片数量、角色数量、场景数量、分镜数量等',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // ========== 图片管理 ==========
  list_images: {
    name: 'list_images',
    description: '列出图片库中的所有图片，可按分类和状态筛选',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['mech', 'monster', 'human', 'scene', 'prop', 'other'],
          description: '图片分类：mech(机甲), monster(怪兽), human(人物), scene(场景), prop(道具), other(其他)'
        },
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'used'],
          description: '图片状态'
        },
        limit: {
          type: 'number',
          description: '返回数量限制，默认50'
        }
      },
      required: []
    }
  },

  get_image: {
    name: 'get_image',
    description: '获取单张图片的详细信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '图片ID' }
      },
      required: ['id']
    }
  },

  update_image: {
    name: 'update_image',
    description: '更新图片信息（分类、状态、标签、描述等）',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '图片ID' },
        category: { type: 'string', description: '分类' },
        status: { type: 'string', description: '状态' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签数组' },
        description: { type: 'string', description: '图片描述' },
        viewType: { type: 'string', description: '视角类型' }
      },
      required: ['id']
    }
  },

  // ========== 角色管理 ==========
  list_characters: {
    name: 'list_characters',
    description: '列出所有角色档案',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['mech', 'monster', 'human', 'other'],
          description: '角色类型'
        }
      },
      required: []
    }
  },

  get_character: {
    name: 'get_character',
    description: '获取角色详细信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '角色ID' }
      },
      required: ['id']
    }
  },

  create_character: {
    name: 'create_character',
    description: '创建新角色',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '角色名称' },
        type: { 
          type: 'string', 
          enum: ['mech', 'monster', 'human', 'other'],
          description: '角色类型' 
        },
        description: { type: 'string', description: '角色描述' },
        appearance: { type: 'string', description: '外观特征' },
        abilities: { type: 'string', description: '能力/武器' },
        backstory: { type: 'string', description: '背景故事' },
        personality: { type: 'string', description: '性格特点' },
        height: { type: 'string', description: '身高/尺寸' },
        faction: { type: 'string', description: '所属阵营' }
      },
      required: ['name', 'type']
    }
  },

  update_character: {
    name: 'update_character',
    description: '更新角色信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '角色ID' },
        name: { type: 'string', description: '角色名称' },
        type: { type: 'string', description: '角色类型' },
        description: { type: 'string', description: '角色描述' },
        appearance: { type: 'string', description: '外观特征' },
        abilities: { type: 'string', description: '能力/武器' },
        backstory: { type: 'string', description: '背景故事' }
      },
      required: ['id']
    }
  },

  delete_character: {
    name: 'delete_character',
    description: '删除角色',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '角色ID' }
      },
      required: ['id']
    }
  },

  // ========== 场景管理 ==========
  list_scenes: {
    name: 'list_scenes',
    description: '列出所有场景',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  get_scene: {
    name: 'get_scene',
    description: '获取场景详细信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '场景ID' }
      },
      required: ['id']
    }
  },

  create_scene: {
    name: 'create_scene',
    description: '创建新场景',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '场景名称' },
        description: { type: 'string', description: '场景描述' },
        location: { type: 'string', description: '地点' },
        timeOfDay: { 
          type: 'string', 
          enum: ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'night'],
          description: '时间' 
        },
        weather: { type: 'string', description: '天气' },
        mood: { type: 'string', description: '氛围/情绪' },
        environment: { type: 'string', description: '环境描述' }
      },
      required: ['name']
    }
  },

  update_scene: {
    name: 'update_scene',
    description: '更新场景信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '场景ID' },
        name: { type: 'string', description: '场景名称' },
        description: { type: 'string', description: '场景描述' },
        location: { type: 'string', description: '地点' },
        timeOfDay: { type: 'string', description: '时间' },
        weather: { type: 'string', description: '天气' },
        mood: { type: 'string', description: '氛围' }
      },
      required: ['id']
    }
  },

  add_character_to_scene: {
    name: 'add_character_to_scene',
    description: '将角色添加到场景中',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'number', description: '场景ID' },
        characterId: { type: 'number', description: '角色ID' },
        role: { type: 'string', description: '角色在场景中的作用' }
      },
      required: ['sceneId', 'characterId']
    }
  },

  // ========== 场景流程图 ==========
  get_scene_flow: {
    name: 'get_scene_flow',
    description: '获取场景流程图数据，包含所有场景节点和它们之间的连接关系',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  create_scene_connection: {
    name: 'create_scene_connection',
    description: '创建场景之间的连接（流程图边），表示场景之间的流转关系',
    parameters: {
      type: 'object',
      properties: {
        sourceId: { type: 'number', description: '起始场景ID' },
        targetId: { type: 'number', description: '目标场景ID' },
        transitionType: {
          type: 'string',
          enum: ['cut', 'fade', 'dissolve', 'wipe', 'zoom', 'match', 'flashback', 'flashforward'],
          description: '转场类型：cut(硬切), fade(淡入淡出), dissolve(溶解), wipe(划变), zoom(变焦), match(匹配剪辑), flashback(闪回), flashforward(闪前)'
        },
        condition: {
          type: 'string',
          enum: ['sequential', 'branching', 'parallel', 'conditional'],
          description: '连接类型：sequential(顺序), branching(分支), parallel(平行), conditional(条件)'
        },
        description: { type: 'string', description: '连接描述，说明场景转换的剧情意义' }
      },
      required: ['sourceId', 'targetId']
    }
  },

  update_scene_connection: {
    name: 'update_scene_connection',
    description: '更新场景连接的属性（转场类型、条件等）',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '连接ID' },
        transitionType: { type: 'string', description: '转场类型' },
        condition: { type: 'string', description: '连接类型' },
        description: { type: 'string', description: '连接描述' }
      },
      required: ['id']
    }
  },

  delete_scene_connection: {
    name: 'delete_scene_connection',
    description: '删除场景之间的连接',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '连接ID' }
      },
      required: ['id']
    }
  },

  get_scene_connections: {
    name: 'get_scene_connections',
    description: '获取指定场景的所有入边和出边连接',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'number', description: '场景ID' }
      },
      required: ['sceneId']
    }
  },

  auto_layout_scene_flow: {
    name: 'auto_layout_scene_flow',
    description: '自动计算场景流程图的布局位置',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  update_scene_position: {
    name: 'update_scene_position',
    description: '更新场景在流程图中的位置',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'number', description: '场景ID' },
        x: { type: 'number', description: 'X坐标' },
        y: { type: 'number', description: 'Y坐标' }
      },
      required: ['sceneId', 'x', 'y']
    }
  },

  // ========== 分镜/镜头管理 ==========
  list_shots: {
    name: 'list_shots',
    description: '列出所有分镜/镜头，可按场景筛选',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'number', description: '按场景ID筛选' }
      },
      required: []
    }
  },

  get_shot: {
    name: 'get_shot',
    description: '获取单个镜头的详细信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '镜头ID' }
      },
      required: ['id']
    }
  },

  create_shot: {
    name: 'create_shot',
    description: '创建新的分镜/镜头',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: '镜头描述' },
        duration: { type: 'number', description: '时长（秒）' },
        sceneId: { type: 'number', description: '所属场景ID' },
        shotType: { 
          type: 'string',
          enum: ['extreme_wide', 'wide', 'full', 'medium', 'close_up', 'extreme_close_up', 'over_shoulder', 'pov', 'low_angle', 'high_angle', 'dutch_angle'],
          description: '镜头类型' 
        },
        cameraMovement: {
          type: 'string',
          enum: ['static', 'pan', 'tilt', 'dolly_in', 'dolly_out', 'tracking', 'crane', 'handheld', 'zoom_in', 'zoom_out', 'orbit'],
          description: '运镜方式'
        },
        dialogue: { type: 'string', description: '对白' },
        notes: { type: 'string', description: '备注' },
        techniques: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              category: { type: 'string' }
            }
          },
          description: '应用的拍摄技巧'
        }
      },
      required: ['description']
    }
  },

  update_shot: {
    name: 'update_shot',
    description: '更新镜头信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '镜头ID' },
        description: { type: 'string', description: '镜头描述' },
        duration: { type: 'number', description: '时长（秒）' },
        sceneId: { type: 'number', description: '所属场景ID' },
        shotType: { type: 'string', description: '镜头类型' },
        cameraMovement: { type: 'string', description: '运镜方式' },
        dialogue: { type: 'string', description: '对白' },
        notes: { type: 'string', description: '备注' },
        techniques: { type: 'array', description: '应用的拍摄技巧' }
      },
      required: ['id']
    }
  },

  delete_shot: {
    name: 'delete_shot',
    description: '删除镜头',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '镜头ID' }
      },
      required: ['id']
    }
  },

  reorder_shots: {
    name: 'reorder_shots',
    description: '重新排序镜头',
    parameters: {
      type: 'object',
      properties: {
        order: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              orderIndex: { type: 'number' }
            }
          },
          description: '镜头排序数组 [{id, orderIndex}]'
        }
      },
      required: ['order']
    }
  },

  add_character_to_shot: {
    name: 'add_character_to_shot',
    description: '将角色添加到镜头中',
    parameters: {
      type: 'object',
      properties: {
        shotId: { type: 'number', description: '镜头ID' },
        characterId: { type: 'number', description: '角色ID' },
        action: { type: 'string', description: '角色在镜头中的动作' }
      },
      required: ['shotId', 'characterId']
    }
  },

  // ========== 技巧库 ==========
  list_techniques: {
    name: 'list_techniques',
    description: '列出所有可用的拍摄技巧',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['shotTypes', 'transitions', 'scifiEffects'],
          description: '技巧分类'
        }
      },
      required: []
    }
  },

  get_technique: {
    name: 'get_technique',
    description: '获取单个技巧的详细信息',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '技巧ID' },
        category: { type: 'string', description: '技巧分类' }
      },
      required: ['id', 'category']
    }
  },

  apply_technique_to_shot: {
    name: 'apply_technique_to_shot',
    description: '将技巧应用到镜头',
    parameters: {
      type: 'object',
      properties: {
        shotId: { type: 'number', description: '镜头ID' },
        techniqueId: { type: 'string', description: '技巧ID' },
        techniqueCategory: { type: 'string', description: '技巧分类' }
      },
      required: ['shotId', 'techniqueId', 'techniqueCategory']
    }
  },

  // ========== 提示词生成 ==========
  generate_shot_prompt: {
    name: 'generate_shot_prompt',
    description: '为镜头生成 AI 图像/视频生成提示词',
    parameters: {
      type: 'object',
      properties: {
        shotId: { type: 'number', description: '镜头ID' },
        style: {
          type: 'string',
          enum: ['cinematic', 'anime', 'realistic', 'stylized'],
          description: '风格'
        },
        includeCharacters: { type: 'boolean', description: '是否包含角色描述' },
        includeTechniques: { type: 'boolean', description: '是否包含技巧提示' }
      },
      required: ['shotId']
    }
  },

  generate_scene_prompt: {
    name: 'generate_scene_prompt',
    description: '为场景生成 AI 图像生成提示词',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'number', description: '场景ID' },
        style: { type: 'string', description: '风格' }
      },
      required: ['sceneId']
    }
  },

  // ========== 配音管理 ==========
  list_voiceovers: {
    name: 'list_voiceovers',
    description: '列出所有配音台词',
    parameters: {
      type: 'object',
      properties: {
        shotId: { type: 'number', description: '按镜头筛选' },
        characterId: { type: 'number', description: '按角色筛选' }
      },
      required: []
    }
  },

  create_voiceover: {
    name: 'create_voiceover',
    description: '创建配音台词',
    parameters: {
      type: 'object',
      properties: {
        shotId: { type: 'number', description: '关联的镜头ID' },
        characterId: { type: 'number', description: '说话的角色ID' },
        text: { type: 'string', description: '台词文本' },
        emotion: { type: 'string', description: '情感/语气' },
        notes: { type: 'string', description: '备注' }
      },
      required: ['text']
    }
  },

  // ========== 故事/剧本 ==========
  list_story_chapters: {
    name: 'list_story_chapters',
    description: '列出所有故事章节',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  create_story_chapter: {
    name: 'create_story_chapter',
    description: '创建故事章节',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '章节标题' },
        content: { type: 'string', description: '章节内容' },
        orderIndex: { type: 'number', description: '排序索引' },
        synopsis: { type: 'string', description: '章节概要' }
      },
      required: ['title']
    }
  },

  update_story_chapter: {
    name: 'update_story_chapter',
    description: '更新故事章节',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '章节ID' },
        title: { type: 'string', description: '章节标题' },
        content: { type: 'string', description: '章节内容' },
        synopsis: { type: 'string', description: '章节概要' }
      },
      required: ['id']
    }
  },

  // ========== 导出功能 ==========
  export_timeline: {
    name: 'export_timeline',
    description: '导出分镜时间线',
    parameters: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['json', 'markdown', 'comfyui'],
          description: '导出格式'
        },
        includePrompts: { type: 'boolean', description: '是否包含生成的提示词' }
      },
      required: ['format']
    }
  },

  export_comfyui_workflow: {
    name: 'export_comfyui_workflow',
    description: '导出 ComfyUI 工作流',
    parameters: {
      type: 'object',
      properties: {
        shotIds: {
          type: 'array',
          items: { type: 'number' },
          description: '要导出的镜头ID列表'
        },
        template: {
          type: 'string',
          enum: ['animatediff', 'svd', 'cogvideox'],
          description: '工作流模板'
        },
        resolution: {
          type: 'string',
          enum: ['512x512', '768x512', '1024x576', '720x480'],
          description: '输出分辨率'
        }
      },
      required: ['shotIds', 'template']
    }
  },

  // ========== 批量操作 ==========
  batch_create_shots: {
    name: 'batch_create_shots',
    description: '批量创建多个镜头',
    parameters: {
      type: 'object',
      properties: {
        shots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              duration: { type: 'number' },
              sceneId: { type: 'number' },
              shotType: { type: 'string' },
              cameraMovement: { type: 'string' }
            }
          },
          description: '镜头数组'
        }
      },
      required: ['shots']
    }
  },

  batch_apply_techniques: {
    name: 'batch_apply_techniques',
    description: '批量为多个镜头应用技巧',
    parameters: {
      type: 'object',
      properties: {
        shotIds: {
          type: 'array',
          items: { type: 'number' },
          description: '镜头ID列表'
        },
        techniques: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              category: { type: 'string' }
            }
          },
          description: '技巧列表'
        }
      },
      required: ['shotIds', 'techniques']
    }
  }
}


// ==================== Action 执行器 ====================

const actionHandlers = {
  // 项目统计
  get_project_stats: async () => {
    return {
      images: db.data.images.length,
      characters: db.data.characters.length,
      scenes: db.data.scenes.length,
      shots: db.data.shots.length,
      voiceovers: db.data.voiceovers?.length || 0,
      stories: db.data.story.length,
      totalDuration: db.data.shots.reduce((sum, s) => sum + (s.duration || 0), 0)
    }
  },

  // 图片管理
  list_images: async ({ category, status, limit = 50 }) => {
    let images = [...db.data.images]
    if (category) images = images.filter(i => i.category === category)
    if (status) images = images.filter(i => i.status === status)
    return images.slice(0, limit).map(i => ({
      id: i.id,
      filename: i.filename,
      originalName: i.originalName,
      category: i.category,
      status: i.status,
      tags: i.tags,
      description: i.description
    }))
  },

  get_image: async ({ id }) => {
    return findById('images', id)
  },

  update_image: async ({ id, ...updates }) => {
    const image = findById('images', id)
    if (!image) throw new Error(`Image ${id} not found`)
    Object.assign(image, updates, { updatedAt: new Date().toISOString() })
    await db.write()
    return image
  },

  // 角色管理
  list_characters: async ({ type }) => {
    let characters = [...db.data.characters]
    if (type) characters = characters.filter(c => c.type === type)
    return characters
  },

  get_character: async ({ id }) => {
    const character = findById('characters', id)
    if (!character) throw new Error(`Character ${id} not found`)
    // 附加关联的图片
    character.images = db.data.images.filter(i => 
      character.imageIds?.includes(i.id)
    )
    return character
  },

  create_character: async (data) => {
    const character = {
      id: getNextId('characters'),
      ...data,
      imageIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.data.characters.push(character)
    await db.write()
    return character
  },

  update_character: async ({ id, ...updates }) => {
    const character = findById('characters', id)
    if (!character) throw new Error(`Character ${id} not found`)
    Object.assign(character, updates, { updatedAt: new Date().toISOString() })
    await db.write()
    return character
  },

  delete_character: async ({ id }) => {
    const success = deleteById('characters', id)
    if (!success) throw new Error(`Character ${id} not found`)
    await db.write()
    return { success: true, id }
  },

  // 场景管理
  list_scenes: async () => {
    return db.data.scenes.map(scene => ({
      ...scene,
      characters: db.data.sceneCharacters
        .filter(sc => sc.sceneId === scene.id)
        .map(sc => {
          const char = findById('characters', sc.characterId)
          return char ? { ...char, role: sc.role } : null
        })
        .filter(Boolean)
    }))
  },

  get_scene: async ({ id }) => {
    const scene = findById('scenes', id)
    if (!scene) throw new Error(`Scene ${id} not found`)
    scene.characters = db.data.sceneCharacters
      .filter(sc => sc.sceneId === id)
      .map(sc => {
        const char = findById('characters', sc.characterId)
        return char ? { ...char, role: sc.role } : null
      })
      .filter(Boolean)
    scene.shots = db.data.shots.filter(s => s.sceneId === id)
    return scene
  },

  create_scene: async (data) => {
    const scene = {
      id: getNextId('scenes'),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.data.scenes.push(scene)
    await db.write()
    return scene
  },

  update_scene: async ({ id, ...updates }) => {
    const scene = findById('scenes', id)
    if (!scene) throw new Error(`Scene ${id} not found`)
    Object.assign(scene, updates, { updatedAt: new Date().toISOString() })
    await db.write()
    return scene
  },

  add_character_to_scene: async ({ sceneId, characterId, role }) => {
    const scene = findById('scenes', sceneId)
    const character = findById('characters', characterId)
    if (!scene) throw new Error(`Scene ${sceneId} not found`)
    if (!character) throw new Error(`Character ${characterId} not found`)
    
    // 检查是否已存在
    const existing = db.data.sceneCharacters.find(
      sc => sc.sceneId === sceneId && sc.characterId === characterId
    )
    if (existing) {
      existing.role = role
    } else {
      db.data.sceneCharacters.push({
        id: getNextId('sceneCharacters'),
        sceneId,
        characterId,
        role
      })
    }
    await db.write()
    return { success: true, sceneId, characterId, role }
  },

  // 场景流程图
  get_scene_flow: async () => {
    const scenes = db.data.scenes.map(scene => {
      const position = db.data.scenePositions?.find(p => p.sceneId === scene.id)
      return {
        ...scene,
        x: position?.x ?? 100,
        y: position?.y ?? 100,
        characterCount: db.data.sceneCharacters.filter(sc => sc.sceneId === scene.id).length
      }
    })
    
    const connections = (db.data.sceneConnections || []).map(conn => ({
      ...conn,
      sourceName: findById('scenes', conn.sourceId)?.name,
      targetName: findById('scenes', conn.targetId)?.name
    }))
    
    return {
      nodes: scenes,
      edges: connections,
      stats: {
        sceneCount: scenes.length,
        connectionCount: connections.length
      }
    }
  },

  create_scene_connection: async ({ sourceId, targetId, transitionType = 'cut', condition = 'sequential', description }) => {
    const source = findById('scenes', sourceId)
    const target = findById('scenes', targetId)
    if (!source) throw new Error(`Source scene ${sourceId} not found`)
    if (!target) throw new Error(`Target scene ${targetId} not found`)
    
    // 检查是否已存在
    if (!db.data.sceneConnections) db.data.sceneConnections = []
    const existing = db.data.sceneConnections.find(
      c => c.sourceId === parseInt(sourceId) && c.targetId === parseInt(targetId)
    )
    if (existing) throw new Error('Connection already exists')
    
    const connection = {
      id: getNextId('sceneConnections'),
      sourceId: parseInt(sourceId),
      targetId: parseInt(targetId),
      transitionType,
      condition,
      description: description || null,
      createdAt: new Date().toISOString()
    }
    
    db.data.sceneConnections.push(connection)
    await db.write()
    
    return {
      ...connection,
      sourceName: source.name,
      targetName: target.name
    }
  },

  update_scene_connection: async ({ id, ...updates }) => {
    if (!db.data.sceneConnections) db.data.sceneConnections = []
    const connection = db.data.sceneConnections.find(c => c.id === parseInt(id))
    if (!connection) throw new Error(`Connection ${id} not found`)
    
    if (updates.transitionType !== undefined) connection.transitionType = updates.transitionType
    if (updates.condition !== undefined) connection.condition = updates.condition
    if (updates.description !== undefined) connection.description = updates.description
    
    await db.write()
    return connection
  },

  delete_scene_connection: async ({ id }) => {
    if (!db.data.sceneConnections) db.data.sceneConnections = []
    const index = db.data.sceneConnections.findIndex(c => c.id === parseInt(id))
    if (index === -1) throw new Error(`Connection ${id} not found`)
    
    db.data.sceneConnections.splice(index, 1)
    await db.write()
    return { success: true, id }
  },

  get_scene_connections: async ({ sceneId }) => {
    const sid = parseInt(sceneId)
    const connections = db.data.sceneConnections || []
    
    const incoming = connections.filter(c => c.targetId === sid).map(c => ({
      ...c,
      sourceName: findById('scenes', c.sourceId)?.name
    }))
    
    const outgoing = connections.filter(c => c.sourceId === sid).map(c => ({
      ...c,
      targetName: findById('scenes', c.targetId)?.name
    }))
    
    return { sceneId: sid, incoming, outgoing }
  },

  auto_layout_scene_flow: async () => {
    const scenes = db.data.scenes
    const connections = db.data.sceneConnections || []
    
    // 简单的层级布局算法
    const hasIncoming = new Set(connections.map(c => c.targetId))
    const startNodes = scenes.filter(s => !hasIncoming.has(s.id))
    
    const levels = []
    const visited = new Set()
    let currentLevel = startNodes.length > 0 ? startNodes : [scenes[0]].filter(Boolean)
    
    while (currentLevel.length > 0 && visited.size < scenes.length) {
      const levelNodes = []
      const nextLevel = []
      
      for (const node of currentLevel) {
        if (node && !visited.has(node.id)) {
          visited.add(node.id)
          levelNodes.push(node)
          
          const outgoing = connections.filter(c => c.sourceId === node.id)
          for (const conn of outgoing) {
            const target = scenes.find(s => s.id === conn.targetId)
            if (target && !visited.has(target.id)) {
              nextLevel.push(target)
            }
          }
        }
      }
      
      if (levelNodes.length > 0) levels.push(levelNodes)
      currentLevel = nextLevel
    }
    
    // 处理孤立节点
    const unvisited = scenes.filter(s => !visited.has(s.id))
    if (unvisited.length > 0) levels.push(unvisited)
    
    // 计算位置
    const nodeWidth = 200
    const nodeHeight = 120
    const horizontalGap = 100
    const verticalGap = 80
    
    if (!db.data.scenePositions) db.data.scenePositions = []
    
    const newPositions = []
    levels.forEach((level, levelIndex) => {
      level.forEach((node, nodeIndex) => {
        const pos = {
          sceneId: node.id,
          x: 50 + nodeIndex * (nodeWidth + horizontalGap),
          y: 50 + levelIndex * (nodeHeight + verticalGap)
        }
        newPositions.push(pos)
        
        let existing = db.data.scenePositions.find(p => p.sceneId === node.id)
        if (existing) {
          existing.x = pos.x
          existing.y = pos.y
        } else {
          db.data.scenePositions.push({
            id: getNextId('scenePositions'),
            sceneId: node.id,
            x: pos.x,
            y: pos.y
          })
        }
      })
    })
    
    await db.write()
    return { success: true, positions: newPositions, levels: levels.length }
  },

  update_scene_position: async ({ sceneId, x, y }) => {
    const scene = findById('scenes', sceneId)
    if (!scene) throw new Error(`Scene ${sceneId} not found`)
    
    if (!db.data.scenePositions) db.data.scenePositions = []
    
    let position = db.data.scenePositions.find(p => p.sceneId === parseInt(sceneId))
    if (position) {
      position.x = x
      position.y = y
    } else {
      position = {
        id: getNextId('scenePositions'),
        sceneId: parseInt(sceneId),
        x,
        y
      }
      db.data.scenePositions.push(position)
    }
    
    await db.write()
    return position
  },

  // 镜头管理
  list_shots: async ({ sceneId }) => {
    let shots = [...db.data.shots].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    if (sceneId) shots = shots.filter(s => s.sceneId === sceneId)
    
    return shots.map(shot => {
      const scene = findById('scenes', shot.sceneId)
      const characters = db.data.shotCharacters
        .filter(sc => sc.shotId === shot.id)
        .map(sc => {
          const char = findById('characters', sc.characterId)
          return char ? { ...char, action: sc.action } : null
        })
        .filter(Boolean)
      
      return { ...shot, scene, characters }
    })
  },

  get_shot: async ({ id }) => {
    const shot = findById('shots', id)
    if (!shot) throw new Error(`Shot ${id} not found`)
    
    shot.scene = findById('scenes', shot.sceneId)
    shot.characters = db.data.shotCharacters
      .filter(sc => sc.shotId === id)
      .map(sc => {
        const char = findById('characters', sc.characterId)
        return char ? { ...char, action: sc.action } : null
      })
      .filter(Boolean)
    
    return shot
  },

  create_shot: async (data) => {
    const maxOrder = Math.max(0, ...db.data.shots.map(s => s.orderIndex || 0))
    const shot = {
      id: getNextId('shots'),
      duration: 3,
      ...data,
      orderIndex: maxOrder + 1,
      techniques: data.techniques || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.data.shots.push(shot)
    await db.write()
    return shot
  },

  update_shot: async ({ id, ...updates }) => {
    const shot = findById('shots', id)
    if (!shot) throw new Error(`Shot ${id} not found`)
    Object.assign(shot, updates, { updatedAt: new Date().toISOString() })
    await db.write()
    return shot
  },

  delete_shot: async ({ id }) => {
    const success = deleteById('shots', id)
    if (!success) throw new Error(`Shot ${id} not found`)
    // 删除关联的角色
    db.data.shotCharacters = db.data.shotCharacters.filter(sc => sc.shotId !== id)
    await db.write()
    return { success: true, id }
  },

  reorder_shots: async ({ order }) => {
    for (const { id, orderIndex } of order) {
      const shot = findById('shots', id)
      if (shot) shot.orderIndex = orderIndex
    }
    await db.write()
    return { success: true, order }
  },

  add_character_to_shot: async ({ shotId, characterId, action }) => {
    const shot = findById('shots', shotId)
    const character = findById('characters', characterId)
    if (!shot) throw new Error(`Shot ${shotId} not found`)
    if (!character) throw new Error(`Character ${characterId} not found`)
    
    const existing = db.data.shotCharacters.find(
      sc => sc.shotId === shotId && sc.characterId === characterId
    )
    if (existing) {
      existing.action = action
    } else {
      db.data.shotCharacters.push({
        id: getNextId('shotCharacters'),
        shotId,
        characterId,
        action
      })
    }
    await db.write()
    return { success: true, shotId, characterId, action }
  },

  // 技巧库
  list_techniques: async ({ category }) => {
    if (category) {
      return techniques[category] || []
    }
    return {
      shotTypes: techniques.shotTypes || [],
      transitions: techniques.transitions || [],
      scifiEffects: techniques.scifiEffects || []
    }
  },

  get_technique: async ({ id, category }) => {
    const list = techniques[category]
    if (!list) throw new Error(`Unknown category: ${category}`)
    const technique = list.find(t => t.id === id)
    if (!technique) throw new Error(`Technique ${id} not found in ${category}`)
    return technique
  },

  apply_technique_to_shot: async ({ shotId, techniqueId, techniqueCategory }) => {
    const shot = findById('shots', shotId)
    if (!shot) throw new Error(`Shot ${shotId} not found`)
    
    const technique = techniques[techniqueCategory]?.find(t => t.id === techniqueId)
    if (!technique) throw new Error(`Technique ${techniqueId} not found`)
    
    if (!shot.techniques) shot.techniques = []
    
    // 检查是否已存在
    const exists = shot.techniques.some(t => t.id === techniqueId && t.category === techniqueCategory)
    if (!exists) {
      shot.techniques.push({
        id: techniqueId,
        name: technique.name,
        category: techniqueCategory
      })
    }
    
    await db.write()
    return { success: true, shot }
  },

  // 提示词生成
  generate_shot_prompt: async ({ shotId, style = 'cinematic', includeCharacters = true, includeTechniques = true }) => {
    const shot = findById('shots', shotId)
    if (!shot) throw new Error(`Shot ${shotId} not found`)
    
    const parts = []
    
    // 基础描述
    if (shot.description) {
      parts.push(shot.description)
    }
    
    // 场景信息
    if (shot.sceneId) {
      const scene = findById('scenes', shot.sceneId)
      if (scene) {
        if (scene.location) parts.push(scene.location)
        if (scene.timeOfDay) parts.push(scene.timeOfDay)
        if (scene.weather) parts.push(scene.weather)
        if (scene.mood) parts.push(`${scene.mood} atmosphere`)
      }
    }
    
    // 角色
    if (includeCharacters) {
      const shotCharacters = db.data.shotCharacters.filter(sc => sc.shotId === shotId)
      for (const sc of shotCharacters) {
        const char = findById('characters', sc.characterId)
        if (char) {
          let charDesc = char.name
          if (char.appearance) charDesc += `, ${char.appearance}`
          if (sc.action) charDesc += `, ${sc.action}`
          parts.push(charDesc)
        }
      }
    }
    
    // 镜头类型
    if (shot.shotType) {
      const shotTypeInfo = techniques.shotTypes?.find(t => t.id === shot.shotType)
      if (shotTypeInfo?.comfyuiHint) {
        parts.push(shotTypeInfo.comfyuiHint)
      } else {
        parts.push(shot.shotType.replace(/_/g, ' '))
      }
    }
    
    // 运镜
    if (shot.cameraMovement && shot.cameraMovement !== 'static') {
      parts.push(`camera ${shot.cameraMovement.replace(/_/g, ' ')}`)
    }
    
    // 技巧
    if (includeTechniques && shot.techniques?.length > 0) {
      for (const tech of shot.techniques) {
        const techInfo = techniques[tech.category]?.find(t => t.id === tech.id)
        if (techInfo?.comfyuiHint) {
          parts.push(techInfo.comfyuiHint)
        } else if (techInfo?.comfyuiPrompt) {
          parts.push(techInfo.comfyuiPrompt)
        }
      }
    }
    
    // 风格
    const styleMap = {
      cinematic: 'cinematic lighting, film grain, dramatic, movie still',
      anime: 'anime style, cel shading, vibrant colors',
      realistic: 'photorealistic, highly detailed, 8k',
      stylized: 'stylized, artistic, concept art'
    }
    parts.push(styleMap[style] || styleMap.cinematic)
    
    const prompt = parts.join(', ')
    
    // 保存生成的提示词
    shot.generatedPrompt = prompt
    shot.promptStyle = style
    shot.promptGeneratedAt = new Date().toISOString()
    await db.write()
    
    return { prompt, shotId, style }
  },

  generate_scene_prompt: async ({ sceneId, style = 'cinematic' }) => {
    const scene = findById('scenes', sceneId)
    if (!scene) throw new Error(`Scene ${sceneId} not found`)
    
    const parts = []
    
    if (scene.description) parts.push(scene.description)
    if (scene.location) parts.push(scene.location)
    if (scene.environment) parts.push(scene.environment)
    if (scene.timeOfDay) parts.push(scene.timeOfDay)
    if (scene.weather) parts.push(scene.weather)
    if (scene.mood) parts.push(`${scene.mood} atmosphere`)
    
    const styleMap = {
      cinematic: 'cinematic, wide establishing shot, dramatic lighting',
      anime: 'anime background, detailed environment, studio ghibli style',
      realistic: 'photorealistic, highly detailed, 8k resolution',
      stylized: 'concept art, matte painting, artistic'
    }
    parts.push(styleMap[style] || styleMap.cinematic)
    
    return { prompt: parts.join(', '), sceneId, style }
  },

  // 配音
  list_voiceovers: async ({ shotId, characterId }) => {
    let voiceovers = [...(db.data.voiceovers || [])]
    if (shotId) voiceovers = voiceovers.filter(v => v.shotId === shotId)
    if (characterId) voiceovers = voiceovers.filter(v => v.characterId === characterId)
    return voiceovers
  },

  create_voiceover: async (data) => {
    const voiceover = {
      id: getNextId('voiceovers'),
      ...data,
      createdAt: new Date().toISOString()
    }
    if (!db.data.voiceovers) db.data.voiceovers = []
    db.data.voiceovers.push(voiceover)
    await db.write()
    return voiceover
  },

  // 故事
  list_story_chapters: async () => {
    return db.data.story.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  },

  create_story_chapter: async (data) => {
    const chapter = {
      id: getNextId('story'),
      orderIndex: db.data.story.length + 1,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.data.story.push(chapter)
    await db.write()
    return chapter
  },

  update_story_chapter: async ({ id, ...updates }) => {
    const chapter = findById('story', id)
    if (!chapter) throw new Error(`Chapter ${id} not found`)
    Object.assign(chapter, updates, { updatedAt: new Date().toISOString() })
    await db.write()
    return chapter
  },

  // 导出
  export_timeline: async ({ format, includePrompts = true }) => {
    const shots = await actionHandlers.list_shots({})
    const scenes = db.data.scenes
    
    if (format === 'json') {
      return { shots, scenes }
    }
    
    if (format === 'markdown') {
      let md = `# 分镜时间线\n\n`
      md += `> 导出时间: ${new Date().toLocaleString()}\n`
      md += `> 总镜头数: ${shots.length}\n\n`
      
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i]
        md += `## 镜头 ${i + 1}: ${shot.description || '未命名'}\n\n`
        md += `- 时长: ${shot.duration}秒\n`
        md += `- 场景: ${shot.scene?.name || '未设置'}\n`
        md += `- 镜头类型: ${shot.shotType || '未设置'}\n`
        md += `- 运镜: ${shot.cameraMovement || '未设置'}\n`
        
        if (shot.characters?.length > 0) {
          md += `- 角色: ${shot.characters.map(c => c.name).join(', ')}\n`
        }
        
        if (shot.techniques?.length > 0) {
          md += `- 技巧: ${shot.techniques.map(t => t.name).join(', ')}\n`
        }
        
        if (includePrompts && shot.generatedPrompt) {
          md += `\n**提示词:**\n\`\`\`\n${shot.generatedPrompt}\n\`\`\`\n`
        }
        
        md += '\n---\n\n'
      }
      
      return { content: md, format: 'markdown' }
    }
    
    if (format === 'comfyui') {
      // 生成 ComfyUI 批量任务
      const tasks = []
      for (const shot of shots) {
        if (shot.generatedPrompt) {
          tasks.push({
            shotId: shot.id,
            description: shot.description,
            prompt: shot.generatedPrompt,
            duration: shot.duration
          })
        }
      }
      return { tasks, format: 'comfyui' }
    }
    
    throw new Error(`Unknown format: ${format}`)
  },

  export_comfyui_workflow: async ({ shotIds, template, resolution = '768x512' }) => {
    const shots = shotIds.map(id => findById('shots', id)).filter(Boolean)
    
    // 基础工作流结构
    const workflow = {
      template,
      resolution,
      batch: shots.map(shot => ({
        shotId: shot.id,
        description: shot.description,
        prompt: shot.generatedPrompt || shot.description,
        duration: shot.duration,
        settings: {
          steps: template === 'cogvideox' ? 50 : 20,
          cfg: 7,
          frames: shot.duration * (template === 'svd' ? 14 : 8)
        }
      }))
    }
    
    return workflow
  },

  // 批量操作
  batch_create_shots: async ({ shots: shotsData }) => {
    const created = []
    for (const data of shotsData) {
      const shot = await actionHandlers.create_shot(data)
      created.push(shot)
    }
    return { success: true, count: created.length, shots: created }
  },

  batch_apply_techniques: async ({ shotIds, techniques: techList }) => {
    const results = []
    for (const shotId of shotIds) {
      const shot = findById('shots', shotId)
      if (shot) {
        if (!shot.techniques) shot.techniques = []
        for (const tech of techList) {
          const exists = shot.techniques.some(t => t.id === tech.id)
          if (!exists) {
            shot.techniques.push(tech)
          }
        }
        results.push({ shotId, techniques: shot.techniques })
      }
    }
    await db.write()
    return { success: true, results }
  }
}


// ==================== API 路由 ====================

/**
 * GET /api/agent/actions
 * 获取所有可用的 Actions 列表（OpenAI Function Calling 格式）
 */
router.get('/actions', (req, res) => {
  const functions = Object.values(AGENT_ACTIONS).map(action => ({
    type: 'function',
    function: {
      name: action.name,
      description: action.description,
      parameters: action.parameters
    }
  }))
  
  res.json({
    version: '1.0.0',
    description: 'FilmDream Studio AI Agent API',
    total_actions: functions.length,
    tools: functions
  })
})

/**
 * GET /api/agent/actions/:name
 * 获取单个 Action 的详细信息
 */
router.get('/actions/:name', (req, res) => {
  const action = AGENT_ACTIONS[req.params.name]
  if (!action) {
    return res.status(404).json({ error: `Action '${req.params.name}' not found` })
  }
  res.json({
    type: 'function',
    function: {
      name: action.name,
      description: action.description,
      parameters: action.parameters
    }
  })
})

/**
 * POST /api/agent/execute
 * 执行单个 Action
 * 
 * Request body:
 * {
 *   "action": "create_shot",
 *   "parameters": { "description": "机甲出场", "duration": 5 }
 * }
 */
router.post('/execute', async (req, res) => {
  const { action, parameters = {} } = req.body
  
  if (!action) {
    return res.status(400).json({ error: 'Missing action name' })
  }
  
  const handler = actionHandlers[action]
  if (!handler) {
    return res.status(404).json({ error: `Unknown action: ${action}` })
  }
  
  try {
    const result = await handler(parameters)
    res.json({
      success: true,
      action,
      result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      action,
      error: error.message
    })
  }
})

/**
 * POST /api/agent/batch
 * 批量执行多个 Actions
 * 
 * Request body:
 * {
 *   "actions": [
 *     { "action": "create_scene", "parameters": { "name": "城市战斗" } },
 *     { "action": "create_character", "parameters": { "name": "铁甲战神", "type": "mech" } }
 *   ]
 * }
 */
router.post('/batch', async (req, res) => {
  const { actions } = req.body
  
  if (!Array.isArray(actions)) {
    return res.status(400).json({ error: 'actions must be an array' })
  }
  
  const results = []
  
  for (const { action, parameters = {} } of actions) {
    const handler = actionHandlers[action]
    if (!handler) {
      results.push({ action, success: false, error: `Unknown action: ${action}` })
      continue
    }
    
    try {
      const result = await handler(parameters)
      results.push({ action, success: true, result })
    } catch (error) {
      results.push({ action, success: false, error: error.message })
    }
  }
  
  res.json({
    success: results.every(r => r.success),
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  })
})

/**
 * POST /api/agent/chat
 * 模拟 OpenAI Function Calling 响应
 * 用于直接集成 LLM
 */
router.post('/chat', async (req, res) => {
  const { tool_calls } = req.body
  
  if (!Array.isArray(tool_calls)) {
    return res.status(400).json({ error: 'tool_calls must be an array' })
  }
  
  const results = []
  
  for (const call of tool_calls) {
    const { id, function: func } = call
    const action = func.name
    let parameters = {}
    
    try {
      parameters = typeof func.arguments === 'string' 
        ? JSON.parse(func.arguments) 
        : func.arguments
    } catch (e) {
      results.push({
        tool_call_id: id,
        role: 'tool',
        content: JSON.stringify({ error: 'Invalid JSON in arguments' })
      })
      continue
    }
    
    const handler = actionHandlers[action]
    if (!handler) {
      results.push({
        tool_call_id: id,
        role: 'tool',
        content: JSON.stringify({ error: `Unknown action: ${action}` })
      })
      continue
    }
    
    try {
      const result = await handler(parameters)
      results.push({
        tool_call_id: id,
        role: 'tool',
        content: JSON.stringify(result)
      })
    } catch (error) {
      results.push({
        tool_call_id: id,
        role: 'tool',
        content: JSON.stringify({ error: error.message })
      })
    }
  }
  
  res.json(results)
})

export default router
export { actionHandlers }
