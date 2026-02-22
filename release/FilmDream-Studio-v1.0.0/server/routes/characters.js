import express from 'express'
import db, { getNextId, findById, deleteById } from '../db.js'

const router = express.Router()

// 获取所有角色
router.get('/', async (req, res) => {
  try {
    const { type } = req.query
    let characters = [...db.data.characters]

    if (type && type !== 'all') {
      characters = characters.filter(char => char.type === type)
    }

    // 按创建时间倒序
    characters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    // 获取每个角色的图片
    const result = characters.map(char => ({
      ...char,
      images: db.data.images.filter(img => img.characterId === char.id)
    }))
    
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个角色
router.get('/:id', async (req, res) => {
  try {
    const character = findById('characters', req.params.id)
    if (!character) {
      return res.status(404).json({ error: 'Character not found' })
    }
    
    // 获取关联的图片
    const images = db.data.images.filter(img => img.characterId === character.id)
    
    res.json({
      ...character,
      images
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建角色
router.post('/', async (req, res) => {
  try {
    const { name, type, height, abilities, weaknesses, backstory, promptTemplate } = req.body

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' })
    }

    const newCharacter = {
      id: getNextId('characters'),
      name,
      type,
      height: height || null,
      abilities: abilities || [],
      weaknesses: weaknesses || null,
      backstory: backstory || null,
      promptTemplate: promptTemplate || null,
      coverImageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.characters.push(newCharacter)
    await db.write()

    res.status(201).json(newCharacter)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新角色
router.put('/:id', async (req, res) => {
  try {
    const { name, type, height, abilities, weaknesses, backstory, promptTemplate, coverImageId } = req.body
    const character = findById('characters', req.params.id)

    if (!character) {
      return res.status(404).json({ error: 'Character not found' })
    }

    if (name !== undefined) character.name = name
    if (type !== undefined) character.type = type
    if (height !== undefined) character.height = height
    if (abilities !== undefined) character.abilities = abilities
    if (weaknesses !== undefined) character.weaknesses = weaknesses
    if (backstory !== undefined) character.backstory = backstory
    if (promptTemplate !== undefined) character.promptTemplate = promptTemplate
    if (coverImageId !== undefined) character.coverImageId = coverImageId
    character.updatedAt = new Date().toISOString()

    await db.write()
    res.json(character)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 关联图片到角色
router.post('/:id/images', async (req, res) => {
  try {
    const { imageIds } = req.body
    
    if (!imageIds || !Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'imageIds array is required' })
    }

    const characterId = parseInt(req.params.id)
    for (const imageId of imageIds) {
      const image = findById('images', imageId)
      if (image) {
        image.characterId = characterId
      }
    }

    await db.write()
    res.json({ success: true, message: `${imageIds.length} images linked` })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除角色
router.delete('/:id', async (req, res) => {
  try {
    const characterId = parseInt(req.params.id)
    
    // 解除图片关联
    db.data.images.forEach(img => {
      if (img.characterId === characterId) {
        img.characterId = null
      }
    })
    
    const deleted = deleteById('characters', req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Character not found' })
    }

    await db.write()
    res.json({ success: true, message: 'Character deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
