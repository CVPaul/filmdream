import express from 'express'
import db, { getNextId, findById, deleteById } from '../db.js'
import providerManager from '../providers/index.js'
import storyboardGeneratorAgent from '../agents/presets/storyboard-generator.js'

const router = express.Router()

// 获取所有镜头
router.get('/', async (req, res) => {
  try {
    const { scene_id } = req.query
    let shots = [...db.data.shots]

    if (scene_id) {
      shots = shots.filter(s => s.sceneId === parseInt(scene_id))
    }

    shots.sort((a, b) => a.orderIndex - b.orderIndex)
    
    // 获取每个镜头的角色
    const result = shots.map(shot => {
      const shotChars = db.data.shotCharacters.filter(sc => sc.shotId === shot.id)
      const characters = shotChars.map(sc => {
        const char = findById('characters', sc.characterId)
        return char ? { ...char, action: sc.action, imageId: sc.imageId } : null
      }).filter(Boolean)
      
      return {
        ...shot,
        characters
      }
    })
    
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// AI生成分镜预览（不写入DB）
router.post('/generate', async (req, res) => {
  try {
    const { sceneId, count = 5, style, provider, model } = req.body

    if (!sceneId) {
      return res.status(400).json({ success: false, error: 'sceneId is required' })
    }

    // 获取场景信息
    const scene = db.data.scenes.find(s => s.id === parseInt(sceneId))
    if (!scene) {
      return res.status(404).json({ success: false, error: 'Scene not found' })
    }

    // 构建用户消息
    let userMessage = `## 场景信息\n`
    if (scene.name) userMessage += `场景名称：${scene.name}\n`
    if (scene.description) userMessage += `场景描述：${scene.description}\n`
    if (scene.location) userMessage += `地点：${scene.location}\n`
    if (scene.mood) userMessage += `氛围：${scene.mood}\n`
    if (scene.timeOfDay) userMessage += `时间：${scene.timeOfDay}\n`

    userMessage += `\n## 生成要求\n请生成 ${count} 个分镜头。`

    if (style) {
      userMessage += `\n风格要求：${style}`
    }

    // 检查场景是否已有镜头（作为上下文参考）
    const existingShots = db.data.shots.filter(s => s.sceneId === parseInt(sceneId))
    if (existingShots.length > 0) {
      userMessage += `\n\n## 已有镜头（仅供参考，生成新镜头时注意衔接）\n`
      userMessage += `当前场景已有 ${existingShots.length} 个镜头，新生成的镜头将追加在末尾。`
    }

    const messages = [
      { role: 'system', content: storyboardGeneratorAgent.systemPrompt },
      { role: 'user', content: userMessage }
    ]

    // 非流式调用，获取完整响应后解析JSON
    const response = await providerManager.chat({ provider, model, messages })

    // 解析JSON数组（处理可能包裹在```json代码块中的情况）
    let raw = response.content || ''
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      raw = fenceMatch[1].trim()
    } else {
      raw = raw.trim()
    }

    let parsedShots
    try {
      parsedShots = JSON.parse(raw)
    } catch (parseErr) {
      return res.json({
        success: false,
        error: 'Invalid JSON from LLM',
        raw: response.content
      })
    }

    res.json({
      success: true,
      data: { shots: parsedShots, sceneId: parseInt(sceneId) }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 确认并写入AI生成的分镜
router.post('/generate/confirm', async (req, res) => {
  try {
    const { sceneId, shots } = req.body

    if (!sceneId) {
      return res.status(400).json({ success: false, error: 'sceneId is required' })
    }
    if (!shots || !Array.isArray(shots) || shots.length === 0) {
      return res.status(400).json({ success: false, error: 'shots array is required and must not be empty' })
    }

    // 获取当前最大 orderIndex
    const maxOrder = db.data.shots.reduce((max, s) => Math.max(max, s.orderIndex || 0), 0)

    const createdShots = []
    shots.forEach((shot, idx) => {
      const newShot = {
        id: getNextId('shots'),
        sceneId: parseInt(sceneId),
        orderIndex: maxOrder + idx + 1,
        description: shot.description || '',
        duration: shot.duration || 3,
        shotType: shot.shotType || null,
        cameraMovement: shot.cameraMovement || null,
        dialogue: shot.dialogue || null,
        notes: shot.notes || null,
        compositorData: null,
        generatedPrompt: shot.generatedPrompt || null,
        createdAt: new Date().toISOString()
      }
      db.data.shots.push(newShot)
      createdShots.push(newShot)
    })

    await db.write()

    res.status(201).json({
      success: true,
      data: { shots: createdShots }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取单个镜头
router.get('/:id', async (req, res) => {
  try {
    const shot = findById('shots', req.params.id)
    if (!shot) {
      return res.status(404).json({ error: 'Shot not found' })
    }
    
    // 获取关联的角色
    const shotChars = db.data.shotCharacters.filter(sc => sc.shotId === shot.id)
    const characters = shotChars.map(sc => {
      const char = findById('characters', sc.characterId)
      return char ? { ...char, action: sc.action, imageId: sc.imageId } : null
    }).filter(Boolean)
    
    // 获取场景信息
    let scene = null
    if (shot.sceneId) {
      scene = findById('scenes', shot.sceneId)
    }
    
    res.json({
      ...shot,
      characters,
      scene
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建镜头
router.post('/', async (req, res) => {
  try {
    const { 
      sceneId, 
      description, 
      duration, 
      shotType, 
      cameraMovement, 
      dialogue, 
      notes,
      compositorData 
    } = req.body

    // 获取最大orderIndex
    const maxOrder = db.data.shots.reduce((max, s) => Math.max(max, s.orderIndex || 0), 0)

    const newShot = {
      id: getNextId('shots'),
      sceneId: sceneId || null,
      orderIndex: maxOrder + 1,
      description: description || '',
      duration: duration || 3,
      shotType: shotType || null,
      cameraMovement: cameraMovement || null,
      dialogue: dialogue || null,
      notes: notes || null,
      compositorData: compositorData || null,
      generatedPrompt: null,
      createdAt: new Date().toISOString()
    }

    db.data.shots.push(newShot)
    await db.write()

    res.status(201).json(newShot)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新镜头
router.put('/:id', async (req, res) => {
  try {
    const { 
      sceneId, 
      orderIndex,
      description, 
      duration, 
      shotType, 
      cameraMovement, 
      dialogue, 
      notes,
      compositorData,
      generatedPrompt 
    } = req.body

    const shot = findById('shots', req.params.id)
    if (!shot) {
      return res.status(404).json({ error: 'Shot not found' })
    }

    if (sceneId !== undefined) shot.sceneId = sceneId
    if (orderIndex !== undefined) shot.orderIndex = orderIndex
    if (description !== undefined) shot.description = description
    if (duration !== undefined) shot.duration = duration
    if (shotType !== undefined) shot.shotType = shotType
    if (cameraMovement !== undefined) shot.cameraMovement = cameraMovement
    if (dialogue !== undefined) shot.dialogue = dialogue
    if (notes !== undefined) shot.notes = notes
    if (compositorData !== undefined) shot.compositorData = compositorData
    if (generatedPrompt !== undefined) shot.generatedPrompt = generatedPrompt

    await db.write()
    res.json(shot)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 重新排序镜头
router.post('/reorder', async (req, res) => {
  try {
    const { order } = req.body

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'Order array is required' })
    }

    for (const item of order) {
      const shot = findById('shots', item.id)
      if (shot) {
        shot.orderIndex = item.orderIndex
      }
    }

    await db.write()
    res.json({ success: true, message: 'Shots reordered' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 添加角色到镜头
router.post('/:id/characters', async (req, res) => {
  try {
    const { characterId, action, imageId } = req.body
    const shotId = parseInt(req.params.id)

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' })
    }

    // 检查是否已存在
    const existingIndex = db.data.shotCharacters.findIndex(
      sc => sc.shotId === shotId && sc.characterId === parseInt(characterId)
    )

    if (existingIndex !== -1) {
      // 更新
      db.data.shotCharacters[existingIndex].action = action || null
      db.data.shotCharacters[existingIndex].imageId = imageId || null
    } else {
      // 插入
      db.data.shotCharacters.push({
        id: getNextId('shotCharacters'),
        shotId,
        characterId: parseInt(characterId),
        action: action || null,
        imageId: imageId || null
      })
    }

    await db.write()
    res.json({ success: true, message: 'Character added to shot' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 从镜头移除角色
router.delete('/:id/characters/:characterId', async (req, res) => {
  try {
    const shotId = parseInt(req.params.id)
    const characterId = parseInt(req.params.characterId)
    
    const index = db.data.shotCharacters.findIndex(
      sc => sc.shotId === shotId && sc.characterId === characterId
    )

    if (index === -1) {
      return res.status(404).json({ error: 'Character not in shot' })
    }

    db.data.shotCharacters.splice(index, 1)
    await db.write()

    res.json({ success: true, message: 'Character removed from shot' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 生成提示词
router.post('/:id/generate-prompt', async (req, res) => {
  try {
    const shot = findById('shots', req.params.id)
    if (!shot) {
      return res.status(404).json({ error: 'Shot not found' })
    }

    // 获取角色和他们的提示词模板
    const shotChars = db.data.shotCharacters.filter(sc => sc.shotId === shot.id)
    const characters = shotChars.map(sc => {
      const char = findById('characters', sc.characterId)
      return char ? { ...char, action: sc.action } : null
    }).filter(Boolean)

    // 获取场景信息
    let scene = null
    if (shot.sceneId) {
      scene = findById('scenes', shot.sceneId)
    }

    // 组装提示词
    const promptParts = []

    // 场景描述
    if (scene) {
      if (scene.environment) promptParts.push(scene.environment)
      if (scene.atmosphere) promptParts.push(scene.atmosphere)
      if (scene.timeOfDay) promptParts.push(scene.timeOfDay)
    }

    // 角色描述
    for (const char of characters) {
      if (char.promptTemplate) {
        let charPrompt = char.promptTemplate
        if (char.action) {
          charPrompt += `, ${char.action}`
        }
        promptParts.push(charPrompt)
      }
    }

    // 镜头描述
    if (shot.description) promptParts.push(shot.description)
    if (shot.shotType) promptParts.push(`${shot.shotType} shot`)
    if (shot.cameraMovement) promptParts.push(`camera: ${shot.cameraMovement}`)

    // 构图器数据
    if (shot.compositorData) {
      const comp = shot.compositorData
      if (comp.foreground?.length) promptParts.push(`foreground: ${comp.foreground.join(', ')}`)
      if (comp.middleground?.length) promptParts.push(`middleground: ${comp.middleground.join(', ')}`)
      if (comp.background?.length) promptParts.push(`background: ${comp.background.join(', ')}`)
      if (comp.pov) promptParts.push(`POV: ${comp.pov}`)
      if (comp.atmosphere) promptParts.push(comp.atmosphere)
    }

    // 添加质量词
    promptParts.push('cinematic lighting', 'high quality', '4K', 'detailed')

    const generatedPrompt = promptParts.join(', ')

    // 保存生成的提示词
    shot.generatedPrompt = generatedPrompt
    await db.write()

    res.json({ 
      success: true, 
      prompt: generatedPrompt 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除镜头
router.delete('/:id', async (req, res) => {
  try {
    const shotId = parseInt(req.params.id)
    
    // 删除镜头角色关联
    db.data.shotCharacters = db.data.shotCharacters.filter(sc => sc.shotId !== shotId)
    
    const deleted = deleteById('shots', req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Shot not found' })
    }

    await db.write()
    res.json({ success: true, message: 'Shot deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
