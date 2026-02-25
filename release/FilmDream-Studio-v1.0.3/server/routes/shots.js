import express from 'express'
import db, { getNextId, findById, deleteById } from '../db.js'

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
