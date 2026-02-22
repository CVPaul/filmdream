import express from 'express'
import db, { getNextId, findById, deleteById } from '../db.js'

const router = express.Router()

// 获取所有场景
router.get('/', async (req, res) => {
  try {
    const scenes = [...db.data.scenes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    // 获取每个场景的角色
    const result = scenes.map(scene => {
      const sceneChars = db.data.sceneCharacters.filter(sc => sc.sceneId === scene.id)
      const characters = sceneChars.map(sc => {
        const char = findById('characters', sc.characterId)
        return char ? { ...char, position: sc.position, role: sc.role } : null
      }).filter(Boolean)
      
      return {
        ...scene,
        characters
      }
    })
    
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个场景
router.get('/:id', async (req, res) => {
  try {
    const scene = findById('scenes', req.params.id)
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' })
    }
    
    // 获取关联的角色
    const sceneChars = db.data.sceneCharacters.filter(sc => sc.sceneId === scene.id)
    const characters = sceneChars.map(sc => {
      const char = findById('characters', sc.characterId)
      return char ? { ...char, position: sc.position, role: sc.role } : null
    }).filter(Boolean)
    
    // 获取背景图片
    let backgroundImage = null
    if (scene.backgroundImageId) {
      backgroundImage = findById('images', scene.backgroundImageId)
    }
    
    res.json({
      ...scene,
      characters,
      backgroundImage
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建场景
router.post('/', async (req, res) => {
  try {
    const { name, description, environment, atmosphere, timeOfDay, weather, backgroundImageId } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const newScene = {
      id: getNextId('scenes'),
      name,
      description: description || null,
      environment: environment || null,
      atmosphere: atmosphere || null,
      timeOfDay: timeOfDay || null,
      weather: weather || null,
      backgroundImageId: backgroundImageId || null,
      createdAt: new Date().toISOString()
    }

    db.data.scenes.push(newScene)
    await db.write()

    res.status(201).json(newScene)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新场景
router.put('/:id', async (req, res) => {
  try {
    const { name, description, environment, atmosphere, timeOfDay, weather, backgroundImageId } = req.body
    const scene = findById('scenes', req.params.id)

    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' })
    }

    if (name !== undefined) scene.name = name
    if (description !== undefined) scene.description = description
    if (environment !== undefined) scene.environment = environment
    if (atmosphere !== undefined) scene.atmosphere = atmosphere
    if (timeOfDay !== undefined) scene.timeOfDay = timeOfDay
    if (weather !== undefined) scene.weather = weather
    if (backgroundImageId !== undefined) scene.backgroundImageId = backgroundImageId

    await db.write()
    res.json(scene)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 添加角色到场景
router.post('/:id/characters', async (req, res) => {
  try {
    const { characterId, position, role } = req.body
    const sceneId = parseInt(req.params.id)

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' })
    }

    // 检查是否已存在
    const existingIndex = db.data.sceneCharacters.findIndex(
      sc => sc.sceneId === sceneId && sc.characterId === parseInt(characterId)
    )

    if (existingIndex !== -1) {
      // 更新
      db.data.sceneCharacters[existingIndex].position = position || null
      db.data.sceneCharacters[existingIndex].role = role || null
    } else {
      // 插入
      db.data.sceneCharacters.push({
        id: getNextId('sceneCharacters'),
        sceneId,
        characterId: parseInt(characterId),
        position: position || null,
        role: role || null
      })
    }

    await db.write()
    res.json({ success: true, message: 'Character added to scene' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 从场景移除角色
router.delete('/:id/characters/:characterId', async (req, res) => {
  try {
    const sceneId = parseInt(req.params.id)
    const characterId = parseInt(req.params.characterId)
    
    const index = db.data.sceneCharacters.findIndex(
      sc => sc.sceneId === sceneId && sc.characterId === characterId
    )

    if (index === -1) {
      return res.status(404).json({ error: 'Character not in scene' })
    }

    db.data.sceneCharacters.splice(index, 1)
    await db.write()

    res.json({ success: true, message: 'Character removed from scene' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除场景
router.delete('/:id', async (req, res) => {
  try {
    const sceneId = parseInt(req.params.id)
    
    // 删除场景角色关联
    db.data.sceneCharacters = db.data.sceneCharacters.filter(sc => sc.sceneId !== sceneId)
    
    const deleted = deleteById('scenes', req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Scene not found' })
    }

    await db.write()
    res.json({ success: true, message: 'Scene deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
