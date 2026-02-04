/**
 * 多角度图像生成 API
 * 
 * 基于 Qwen-Image-Edit-2511-Multiple-Angles LoRA
 * 从单张图片生成多角度视图
 */

import express from 'express'
import { join, basename } from 'path'
import { existsSync, mkdirSync, unlinkSync, statSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import db, { getNextId, findById, deleteById } from '../db.js'
import multiAngleService, { CAMERA_CONFIG, ANGLE_PRESETS } from '../comfyui/multiangle.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// 输出目录
const MULTIANGLE_DIR = join(__dirname, '../data/multiangle')

// 确保目录存在
if (!existsSync(MULTIANGLE_DIR)) {
  mkdirSync(MULTIANGLE_DIR, { recursive: true })
}

// ==================== 配置 API ====================

/**
 * GET /api/multiangle/config
 * 获取多角度配置（相机参数、预设等）
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        camera: CAMERA_CONFIG,
        presets: multiAngleService.getPresets(),
        loraInfo: {
          name: 'Qwen-Image-Edit-2511-Multiple-Angles-LoRA',
          version: '1.0.0',
          totalPoses: 96,
          description: '96 个相机姿态：8 方位角 × 4 仰角 × 3 距离'
        }
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/multiangle/presets
 * 获取预设列表
 */
router.get('/presets', (req, res) => {
  try {
    const presets = multiAngleService.getPresets()
    res.json({
      success: true,
      data: presets
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/multiangle/presets/:id
 * 获取预设详情
 */
router.get('/presets/:id', (req, res) => {
  try {
    const preset = multiAngleService.getPreset(req.params.id)
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: '预设不存在'
      })
    }
    
    // 生成每个角度的提示词
    const anglesWithPrompts = preset.angles.map(angle => ({
      ...angle,
      prompt: multiAngleService.generatePrompt(angle.azimuth, angle.elevation, angle.distance)
    }))
    
    res.json({
      success: true,
      data: {
        id: req.params.id,
        ...preset,
        angles: anglesWithPrompts
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/multiangle/prompt
 * 生成角度提示词
 */
router.post('/prompt', (req, res) => {
  try {
    const { azimuth, elevation, distance } = req.body
    
    const prompt = multiAngleService.generatePrompt(
      azimuth || 'front',
      elevation || 'eye',
      distance || 'medium'
    )
    
    res.json({
      success: true,
      data: {
        azimuth,
        elevation,
        distance,
        prompt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== 生成 API ====================

/**
 * POST /api/multiangle/generate
 * 生成多角度图像
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      imageId,        // 图库图片 ID
      imageUrl,       // 或直接提供 URL
      assetId,        // 可选：关联到 3D 资产
      angles,         // 自定义角度列表
      presetId,       // 或使用预设
      options = {}    // 生成选项
    } = req.body
    
    // 获取源图片路径
    let sourceImagePath = null
    let sourceImageInfo = null
    
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
      sourceImagePath = imageUrl
      sourceImageInfo = { filename: 'external', id: null }
    } else {
      return res.status(400).json({
        success: false,
        error: '需要提供 imageId 或 imageUrl'
      })
    }
    
    // 确定要生成的角度
    let targetAngles = angles
    let usedPreset = null
    
    if (presetId) {
      const preset = multiAngleService.getPreset(presetId)
      if (!preset) {
        return res.status(400).json({
          success: false,
          error: `未知预设: ${presetId}`
        })
      }
      targetAngles = preset.angles
      usedPreset = presetId
    }
    
    if (!targetAngles || targetAngles.length === 0) {
      // 默认使用产品基础预设
      targetAngles = ANGLE_PRESETS['product-basic'].angles
      usedPreset = 'product-basic'
    }
    
    // 初始化数据库集合
    if (!db.data.multiAngleJobs) {
      db.data.multiAngleJobs = []
    }
    
    // 创建生成任务记录
    const job = {
      id: getNextId('multiAngleJobs'),
      sourceImageId: imageId ? parseInt(imageId) : null,
      sourceImageUrl: imageUrl || null,
      assetId: assetId ? parseInt(assetId) : null,
      preset: usedPreset,
      angles: targetAngles.map((angle, idx) => ({
        index: idx,
        azimuth: angle.azimuth,
        elevation: angle.elevation,
        distance: angle.distance,
        prompt: multiAngleService.generatePrompt(angle.azimuth, angle.elevation, angle.distance),
        status: 'pending',
        promptId: null,
        outputPath: null,
        error: null
      })),
      options: {
        loraStrength: options.loraStrength || 0.9,
        steps: options.steps || 20,
        cfg: options.cfg || 7.0
      },
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    db.data.multiAngleJobs.push(job)
    await db.write()
    
    // 开始异步生成
    generateAnglesAsync(job, sourceImagePath).catch(console.error)
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'processing',
        totalAngles: targetAngles.length,
        preset: usedPreset,
        message: `开始生成 ${targetAngles.length} 个角度，请使用 /api/multiangle/jobs/${job.id} 查询进度`
      }
    })
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 异步生成多角度
 */
async function generateAnglesAsync(job, sourceImagePath) {
  try {
    for (let i = 0; i < job.angles.length; i++) {
      const angle = job.angles[i]
      
      // 更新状态
      angle.status = 'processing'
      job.progress = Math.round((i / job.angles.length) * 100)
      job.updatedAt = new Date().toISOString()
      await db.write()
      
      // 生成单个角度
      const result = await multiAngleService.generateSingleAngle(
        sourceImagePath,
        { azimuth: angle.azimuth, elevation: angle.elevation, distance: angle.distance },
        job.options
      )
      
      if (result.success) {
        angle.promptId = result.promptId
        angle.status = 'submitted'
      } else {
        angle.status = 'failed'
        angle.error = result.error
      }
      
      await db.write()
      
      // 等待一下避免过载
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 更新任务状态
    const allDone = job.angles.every(a => a.status === 'submitted' || a.status === 'failed')
    if (allDone) {
      job.status = 'submitted'
      job.progress = 100
    }
    job.updatedAt = new Date().toISOString()
    await db.write()
    
  } catch (error) {
    console.error('Multi-angle generation error:', error)
    job.status = 'failed'
    job.error = error.message
    await db.write()
  }
}

// ==================== 任务管理 ====================

/**
 * GET /api/multiangle/jobs
 * 获取所有生成任务
 */
router.get('/jobs', (req, res) => {
  try {
    const jobs = db.data.multiAngleJobs || []
    const { status, limit = 20, offset = 0 } = req.query
    
    let filtered = [...jobs]
    if (status) {
      filtered = filtered.filter(j => j.status === status)
    }
    
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    const total = filtered.length
    filtered = filtered.slice(Number(offset), Number(offset) + Number(limit))
    
    res.json({
      success: true,
      data: filtered.map(job => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        preset: job.preset,
        angleCount: job.angles.length,
        completedCount: job.angles.filter(a => a.status === 'ready').length,
        createdAt: job.createdAt
      })),
      total
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/multiangle/jobs/:id
 * 获取任务详情
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const jobs = db.data.multiAngleJobs || []
    const job = jobs.find(j => j.id === parseInt(req.params.id))
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      })
    }
    
    // 检查并更新每个角度的状态
    let updated = false
    for (const angle of job.angles) {
      if (angle.status === 'submitted' && angle.promptId) {
        const status = await multiAngleService.checkStatus(angle.promptId)
        
        if (status.status === 'ready') {
          // 下载图片
          try {
            const outputFilename = `angle-${job.id}-${angle.index}-${Date.now()}.png`
            const downloadResult = await multiAngleService.downloadResult(angle.promptId, outputFilename)
            angle.outputPath = downloadResult.filePath
            angle.status = 'ready'
            updated = true
          } catch (err) {
            console.error('Download error:', err)
          }
        } else if (status.status === 'failed' || status.status === 'error') {
          angle.status = 'failed'
          angle.error = status.error
          updated = true
        }
      }
    }
    
    // 更新整体状态
    const allReady = job.angles.every(a => a.status === 'ready')
    const allDone = job.angles.every(a => a.status === 'ready' || a.status === 'failed')
    
    if (allReady) {
      job.status = 'completed'
      job.progress = 100
      updated = true
    } else if (allDone) {
      job.status = 'partial'
      job.progress = 100
      updated = true
    }
    
    if (updated) {
      job.updatedAt = new Date().toISOString()
      await db.write()
    }
    
    res.json({
      success: true,
      data: job
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/multiangle/jobs/:id
 * 删除任务
 */
router.delete('/jobs/:id', async (req, res) => {
  try {
    const jobs = db.data.multiAngleJobs || []
    const index = jobs.findIndex(j => j.id === parseInt(req.params.id))
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      })
    }
    
    const job = jobs[index]
    
    // 删除输出文件
    for (const angle of job.angles) {
      if (angle.outputPath) {
        const fullPath = join(__dirname, '..', angle.outputPath)
        if (existsSync(fullPath)) {
          unlinkSync(fullPath)
        }
      }
    }
    
    jobs.splice(index, 1)
    await db.write()
    
    res.json({
      success: true,
      message: '任务已删除'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== 工具 API ====================

/**
 * POST /api/multiangle/save-to-asset
 * 将多角度结果保存为 3D 资产的变体
 */
router.post('/save-to-asset', async (req, res) => {
  try {
    const { jobId, assetId } = req.body
    
    if (!jobId || !assetId) {
      return res.status(400).json({
        success: false,
        error: '需要提供 jobId 和 assetId'
      })
    }
    
    // 获取任务
    const jobs = db.data.multiAngleJobs || []
    const job = jobs.find(j => j.id === parseInt(jobId))
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      })
    }
    
    // 获取资产
    const asset = findById('assets3d', assetId)
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: '3D 资产不存在'
      })
    }
    
    // 初始化变体集合
    if (!db.data.asset3dVariants) {
      db.data.asset3dVariants = []
    }
    
    // 将完成的角度添加为变体
    const variants = []
    for (const angle of job.angles) {
      if (angle.status === 'ready' && angle.outputPath) {
        const variant = {
          id: getNextId('asset3dVariants'),
          assetId: parseInt(assetId),
          name: `${angle.azimuth} ${angle.elevation} ${angle.distance}`,
          type: 'multiangle',
          imagePath: angle.outputPath,
          camera: {
            azimuth: angle.azimuth,
            elevation: angle.elevation,
            distance: angle.distance
          },
          prompt: angle.prompt,
          order: angle.index,
          createdAt: new Date().toISOString()
        }
        
        db.data.asset3dVariants.push(variant)
        variants.push(variant)
      }
    }
    
    await db.write()
    
    res.json({
      success: true,
      data: {
        assetId: parseInt(assetId),
        addedVariants: variants.length,
        variants
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
