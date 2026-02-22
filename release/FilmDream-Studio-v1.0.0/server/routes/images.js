import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import db, { getNextId, findById, deleteById } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '..', 'uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'), false)
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
})

// 获取所有图片
router.get('/', async (req, res) => {
  try {
    const { category, status, character_id } = req.query
    let images = [...db.data.images]

    if (category && category !== 'all') {
      images = images.filter(img => img.category === category)
    }
    if (status) {
      images = images.filter(img => img.status === status)
    }
    if (character_id) {
      images = images.filter(img => img.characterId === parseInt(character_id))
    }

    // 按创建时间倒序
    images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    res.json(images)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个图片
router.get('/:id', async (req, res) => {
  try {
    const image = findById('images', req.params.id)
    if (!image) {
      return res.status(404).json({ error: 'Image not found' })
    }
    res.json(image)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 上传图片（支持多张）
router.post('/upload', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const insertedImages = []
    for (const file of req.files) {
      const newImage = {
        id: getNextId('images'),
        filename: file.filename,
        originalName: file.originalname,
        category: 'uncategorized',
        viewType: null,
        status: 'pending',
        tags: [],
        characterId: null,
        createdAt: new Date().toISOString()
      }
      db.data.images.push(newImage)
      insertedImages.push(newImage)
    }

    await db.write()

    res.json({ 
      success: true, 
      message: `${req.files.length} images uploaded`,
      images: insertedImages
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新图片信息
router.put('/:id', async (req, res) => {
  try {
    const { category, viewType, status, tags, characterId } = req.body
    const image = findById('images', req.params.id)
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' })
    }

    if (category !== undefined) image.category = category
    if (viewType !== undefined) image.viewType = viewType
    if (status !== undefined) image.status = status
    if (tags !== undefined) image.tags = tags
    if (characterId !== undefined) image.characterId = characterId

    await db.write()
    res.json(image)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除图片
router.delete('/:id', async (req, res) => {
  try {
    const deleted = deleteById('images', req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Image not found' })
    }

    await db.write()
    res.json({ success: true, message: 'Image deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 批量更新分类
router.post('/batch-update', async (req, res) => {
  try {
    const { ids, category, status } = req.body
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No image IDs provided' })
    }

    let updated = 0
    for (const id of ids) {
      const image = findById('images', id)
      if (image) {
        if (category) image.category = category
        if (status) image.status = status
        updated++
      }
    }

    await db.write()
    res.json({ success: true, updated })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
