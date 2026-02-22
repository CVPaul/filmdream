/**
 * 3D 资产管理 API
 * 
 * 管理 GLB/GLTF 3D 模型文件，支持：
 * - 从 2D 图片生成 3D 模型（通过 ComfyUI InstantMesh）
 * - 导入现有 3D 资产
 * - 关联到角色/场景
 * - 多角度渲染变体
 */

import express from 'express'
import multer from 'multer'
import { existsSync, mkdirSync, unlinkSync, copyFileSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import db, { getNextId, findById, deleteById } from '../db.js'
import instantMeshService from '../comfyui/instantmesh.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// 3D 资产存储目录
const ASSETS_3D_DIR = join(__dirname, '../data/assets3d')
const VARIANTS_DIR = join(__dirname, '../data/assets3d/variants')

// 确保目录存在
if (!existsSync(ASSETS_3D_DIR)) {
  mkdirSync(ASSETS_3D_DIR, { recursive: true })
}
if (!existsSync(VARIANTS_DIR)) {
  mkdirSync(VARIANTS_DIR, { recursive: true })
}

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ASSETS_3D_DIR)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = extname(file.originalname).toLowerCase()
    cb(null, `model-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.glb', '.gltf', '.obj', '.fbx']
    const ext = extname(file.originalname).toLowerCase()
    if (allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件格式: ${ext}。支持: ${allowedExts.join(', ')}`))
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
})

// ==================== 3D 资产 CRUD ====================

/**
 * GET /api/assets3d
 * 获取所有 3D 资产
 */
router.get('/', (req, res) => {
  try {
    const { 
      characterId, 
      type,
      status,
      limit = 50, 
      offset = 0,
      sort = 'createdAt',
      order = 'desc'
    } = req.query

    // 确保集合存在
    if (!db.data.assets3d) {
      db.data.assets3d = []
    }

    let assets = [...db.data.assets3d]

    // 过滤
    if (characterId) {
      assets = assets.filter(a => a.characterId === parseInt(characterId))
    }
    if (type) {
      assets = assets.filter(a => a.type === type)
    }
    if (status) {
      assets = assets.filter(a => a.status === status)
    }

    // 排序
    assets.sort((a, b) => {
      const aVal = a[sort] || ''
      const bVal = b[sort] || ''
      if (order === 'desc') {
        return bVal > aVal ? 1 : -1
      }
      return aVal > bVal ? 1 : -1
    })

    // 分页
    const total = assets.length
    assets = assets.slice(Number(offset), Number(offset) + Number(limit))

    // 添加变体数量
    assets = assets.map(asset => ({
      ...asset,
      variantCount: (db.data.asset3dVariants || []).filter(v => v.assetId === asset.id).length
    }))

    res.json({
      success: true,
      data: assets,
      total,
      limit: Number(limit),
      offset: Number(offset)
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/assets3d/:id
 * 获取单个 3D 资产详情
 */
router.get('/:id', (req, res) => {
  try {
    const asset = findById('assets3d', req.params.id)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }

    // 获取变体
    const variants = (db.data.asset3dVariants || [])
      .filter(v => v.assetId === asset.id)
      .sort((a, b) => a.order - b.order)

    // 获取关联角色
    let character = null
    if (asset.characterId) {
      character = findById('characters', asset.characterId)
    }

    res.json({
      success: true,
      data: {
        ...asset,
        variants,
        character
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/assets3d
 * 创建新的 3D 资产（元数据，不含文件）
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'character', // character, prop, environment
      characterId,
      sourceImageId,
      tags = [],
      metadata = {}
    } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '名称是必需的'
      })
    }

    if (!db.data.assets3d) {
      db.data.assets3d = []
    }

    const asset = {
      id: getNextId('assets3d'),
      name,
      description: description || '',
      type,
      characterId: characterId ? parseInt(characterId) : null,
      sourceImageId: sourceImageId ? parseInt(sourceImageId) : null,
      filePath: null,
      fileSize: null,
      format: null,
      status: 'pending', // pending, processing, ready, error
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        vertices: null,
        faces: null,
        materials: null,
        animations: [],
        ...metadata
      },
      generationParams: null, // InstantMesh 生成参数
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.assets3d.push(asset)
    await db.write()

    res.json({
      success: true,
      data: asset
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/assets3d/upload
 * 上传 3D 模型文件
 */
router.post('/upload', upload.single('model'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传 3D 模型文件'
      })
    }

    const {
      name,
      description,
      type = 'character',
      characterId,
      tags
    } = req.body

    if (!db.data.assets3d) {
      db.data.assets3d = []
    }

    const filePath = `/assets3d/${req.file.filename}`
    const stats = statSync(req.file.path)

    const asset = {
      id: getNextId('assets3d'),
      name: name || basename(req.file.originalname, extname(req.file.originalname)),
      description: description || '',
      type,
      characterId: characterId ? parseInt(characterId) : null,
      sourceImageId: null,
      filePath,
      fileSize: stats.size,
      format: extname(req.file.originalname).toLowerCase().slice(1),
      status: 'ready',
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      metadata: {
        vertices: null,
        faces: null,
        materials: null,
        animations: [],
        originalFilename: req.file.originalname
      },
      generationParams: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.assets3d.push(asset)
    await db.write()

    res.json({
      success: true,
      data: asset
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * PUT /api/assets3d/:id
 * 更新 3D 资产
 */
router.put('/:id', async (req, res) => {
  try {
    const asset = findById('assets3d', req.params.id)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }

    const {
      name,
      description,
      type,
      characterId,
      status,
      tags,
      metadata
    } = req.body

    if (name !== undefined) asset.name = name
    if (description !== undefined) asset.description = description
    if (type !== undefined) asset.type = type
    if (characterId !== undefined) asset.characterId = characterId ? parseInt(characterId) : null
    if (status !== undefined) asset.status = status
    if (tags !== undefined) asset.tags = Array.isArray(tags) ? tags : []
    if (metadata !== undefined) asset.metadata = { ...asset.metadata, ...metadata }
    
    asset.updatedAt = new Date().toISOString()

    await db.write()

    res.json({
      success: true,
      data: asset
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/assets3d/:id
 * 删除 3D 资产
 */
router.delete('/:id', async (req, res) => {
  try {
    const asset = findById('assets3d', req.params.id)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }

    // 删除文件
    if (asset.filePath) {
      const fullPath = join(ASSETS_3D_DIR, basename(asset.filePath))
      if (existsSync(fullPath)) {
        unlinkSync(fullPath)
      }
    }

    // 删除变体文件和记录
    const variants = (db.data.asset3dVariants || []).filter(v => v.assetId === asset.id)
    for (const variant of variants) {
      if (variant.imagePath) {
        const variantPath = join(VARIANTS_DIR, basename(variant.imagePath))
        if (existsSync(variantPath)) {
          unlinkSync(variantPath)
        }
      }
    }
    db.data.asset3dVariants = (db.data.asset3dVariants || []).filter(v => v.assetId !== asset.id)

    // 删除资产记录
    deleteById('assets3d', req.params.id)
    await db.write()

    res.json({
      success: true,
      message: '3D 资产已删除'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 变体管理 ====================

/**
 * GET /api/assets3d/:id/variants
 * 获取 3D 资产的所有渲染变体
 */
router.get('/:id/variants', (req, res) => {
  try {
    const asset = findById('assets3d', req.params.id)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }

    const variants = (db.data.asset3dVariants || [])
      .filter(v => v.assetId === asset.id)
      .sort((a, b) => a.order - b.order)

    res.json({
      success: true,
      data: variants
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/assets3d/:id/variants
 * 添加渲染变体
 */
router.post('/:id/variants', async (req, res) => {
  try {
    const asset = findById('assets3d', req.params.id)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }

    const {
      name,
      imagePath,
      camera = {},  // { position, rotation, fov }
      lighting = {},
      pose = null,
      order = 0
    } = req.body

    if (!db.data.asset3dVariants) {
      db.data.asset3dVariants = []
    }

    const variant = {
      id: getNextId('asset3dVariants'),
      assetId: asset.id,
      name: name || `变体 ${db.data.asset3dVariants.filter(v => v.assetId === asset.id).length + 1}`,
      imagePath,
      camera,
      lighting,
      pose,
      order,
      createdAt: new Date().toISOString()
    }

    db.data.asset3dVariants.push(variant)
    await db.write()

    res.json({
      success: true,
      data: variant
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/assets3d/:id/variants/:variantId
 * 删除渲染变体
 */
router.delete('/:id/variants/:variantId', async (req, res) => {
  try {
    const { id, variantId } = req.params

    if (!db.data.asset3dVariants) {
      return res.status(404).json({
        success: false,
        error: '变体不存在'
      })
    }

    const index = db.data.asset3dVariants.findIndex(
      v => v.id === parseInt(variantId) && v.assetId === parseInt(id)
    )

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '变体不存在'
      })
    }

    const variant = db.data.asset3dVariants[index]

    // 删除图片文件
    if (variant.imagePath) {
      const imagePath = join(VARIANTS_DIR, basename(variant.imagePath))
      if (existsSync(imagePath)) {
        unlinkSync(imagePath)
      }
    }

    db.data.asset3dVariants.splice(index, 1)
    await db.write()

    res.json({
      success: true,
      message: '变体已删除'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== InstantMesh 生成 ====================

/**
 * POST /api/assets3d/generate
 * 从 2D 图片生成 3D 模型（通过 ComfyUI InstantMesh）
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      imageId,
      imageUrl, // 可以直接传图片 URL
      name,
      type = 'character',
      characterId,
      options = {}
    } = req.body

    let sourceImagePath = null
    let sourceImageInfo = null

    // 从图库获取图片
    if (imageId) {
      const sourceImage = findById('images', imageId)
      if (!sourceImage) {
        return res.status(404).json({
          success: false,
          error: '源图片不存在'
        })
      }
      sourceImagePath = join(__dirname, '..', sourceImage.path)
      sourceImageInfo = sourceImage
    } else if (imageUrl) {
      // 直接使用 URL
      sourceImagePath = imageUrl
      sourceImageInfo = { filename: 'external', id: null }
    } else {
      return res.status(400).json({
        success: false,
        error: '需要提供 imageId 或 imageUrl'
      })
    }

    if (!db.data.assets3d) {
      db.data.assets3d = []
    }

    // 创建 3D 资产记录
    const asset = {
      id: getNextId('assets3d'),
      name: name || `3D-${sourceImageInfo.filename || 'model'}`,
      description: `从图片生成: ${sourceImageInfo.filename || sourceImageInfo.id || 'external'}`,
      type,
      characterId: characterId ? parseInt(characterId) : sourceImageInfo.characterId || null,
      sourceImageId: imageId ? parseInt(imageId) : null,
      filePath: null,
      fileSize: null,
      format: 'glb',
      status: 'processing',
      tags: ['ai-generated', 'instantmesh'],
      metadata: {
        vertices: null,
        faces: null,
        materials: null,
        animations: []
      },
      generationParams: {
        method: 'instantmesh',
        sourceImage: sourceImagePath,
        options: {
          removeBackground: options.removeBackground !== false,
          resolution: options.resolution || 256,
          ...options
        },
        promptId: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
        error: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.assets3d.push(asset)
    await db.write()

    // 调用 InstantMesh 服务生成
    const genResult = await instantMeshService.generateFromImage(sourceImagePath, {
      name: asset.name,
      meshFormat: 'glb',
      resolution: options.resolution || 256,
      removeBackground: options.removeBackground !== false
    })

    if (genResult.success) {
      // 更新资产记录
      asset.generationParams.promptId = genResult.promptId
      asset.status = 'processing'
      await db.write()

      res.json({
        success: true,
        data: asset,
        generation: {
          promptId: genResult.promptId,
          status: 'processing',
          message: '3D 模型生成已开始，请使用 /api/assets3d/:id/status 查询进度'
        }
      })
    } else {
      // 生成失败
      asset.status = 'pending'
      asset.generationParams.error = genResult.error
      await db.write()

      res.json({
        success: true,
        data: asset,
        generation: {
          status: 'pending',
          error: genResult.error,
          message: 'ComfyUI 暂不可用，资产已创建为待处理状态。请确保 ComfyUI 服务运行后手动触发生成。'
        }
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/assets3d/:id/complete
 * 标记 3D 生成完成（由 ComfyUI 工作流完成后调用）
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const asset = findById('assets3d', req.params.id)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }

    const {
      filePath,
      metadata,
      error
    } = req.body

    if (error) {
      asset.status = 'error'
      asset.generationParams = {
        ...asset.generationParams,
        error,
        completedAt: new Date().toISOString()
      }
    } else if (filePath) {
      asset.status = 'ready'
      asset.filePath = filePath
      
      // 尝试获取文件大小
      const fullPath = join(ASSETS_3D_DIR, basename(filePath))
      if (existsSync(fullPath)) {
        const stats = statSync(fullPath)
        asset.fileSize = stats.size
      }

      if (metadata) {
        asset.metadata = { ...asset.metadata, ...metadata }
      }

      asset.generationParams = {
        ...asset.generationParams,
        completedAt: new Date().toISOString()
      }
    }

    asset.updatedAt = new Date().toISOString()
    await db.write()

    res.json({
      success: true,
      data: asset
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/assets3d/:id/status
 * 查询 3D 模型生成状态（轮询 ComfyUI）
 */
router.get('/:id/status', async (req, res) => {
  try {
    const asset = findById('assets3d', req.params.id)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }

    // 如果已经就绪或失败，直接返回
    if (asset.status === 'ready' || asset.status === 'error') {
      return res.json({
        success: true,
        data: {
          assetId: asset.id,
          status: asset.status,
          filePath: asset.filePath,
          error: asset.generationParams?.error
        }
      })
    }

    // 如果有 promptId，查询 ComfyUI 状态
    const promptId = asset.generationParams?.promptId
    if (!promptId) {
      return res.json({
        success: true,
        data: {
          assetId: asset.id,
          status: asset.status,
          message: '等待 ComfyUI 生成任务'
        }
      })
    }

    // 查询 ComfyUI 生成状态
    const genStatus = await instantMeshService.checkStatus(promptId)

    if (genStatus.status === 'ready') {
      // 下载并保存模型
      const outputFilename = `model-${asset.id}-${Date.now()}.glb`
      const downloadResult = await instantMeshService.downloadModel(promptId, outputFilename)

      if (downloadResult.success) {
        asset.status = 'ready'
        asset.filePath = downloadResult.filePath
        asset.fileSize = downloadResult.size
        asset.generationParams.completedAt = new Date().toISOString()
        asset.updatedAt = new Date().toISOString()
        await db.write()

        return res.json({
          success: true,
          data: {
            assetId: asset.id,
            status: 'ready',
            filePath: asset.filePath,
            fileSize: asset.fileSize
          }
        })
      }
    }

    if (genStatus.status === 'failed' || genStatus.status === 'error') {
      asset.status = 'error'
      asset.generationParams.error = genStatus.error
      asset.generationParams.completedAt = new Date().toISOString()
      asset.updatedAt = new Date().toISOString()
      await db.write()

      return res.json({
        success: true,
        data: {
          assetId: asset.id,
          status: 'error',
          error: genStatus.error
        }
      })
    }

    // 仍在处理中
    res.json({
      success: true,
      data: {
        assetId: asset.id,
        status: 'processing',
        message: genStatus.message || '生成中...'
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 统计 ====================

/**
 * GET /api/assets3d/stats
 * 获取 3D 资产统计
 */
router.get('/stats', (req, res) => {
  try {
    const assets = db.data.assets3d || []
    const variants = db.data.asset3dVariants || []

    const stats = {
      total: assets.length,
      byStatus: {
        pending: assets.filter(a => a.status === 'pending').length,
        processing: assets.filter(a => a.status === 'processing').length,
        ready: assets.filter(a => a.status === 'ready').length,
        error: assets.filter(a => a.status === 'error').length
      },
      byType: {
        character: assets.filter(a => a.type === 'character').length,
        prop: assets.filter(a => a.type === 'prop').length,
        environment: assets.filter(a => a.type === 'environment').length
      },
      totalVariants: variants.length,
      aiGenerated: assets.filter(a => a.tags?.includes('ai-generated')).length,
      imported: assets.filter(a => !a.tags?.includes('ai-generated')).length
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
