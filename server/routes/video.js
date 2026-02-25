/**
 * 视频生成 API 路由
 * 支持 Seedance, CogVideoX 等模型
 */

import express from 'express'
import providerManager from '../providers/index.js'
import db, { getNextId } from '../db.js'

const router = express.Router()

// ==================== 视频生成 Provider 管理 ====================

/**
 * GET /api/video/providers
 * 获取所有视频生成 Provider
 */
router.get('/providers', (req, res) => {
  try {
    const providers = providerManager.getAvailableProviders()
    res.json({
      success: true,
      data: providers.video || []
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/video/models
 * 获取视频生成模型列表
 */
router.get('/models', async (req, res) => {
  try {
    const provider = providerManager.getVideoProvider('replicate')
    const models = await provider.getModels()
    
    res.json({
      success: true,
      data: models
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== API Key 管理 ====================

/**
 * POST /api/video/auth/apikey
 * 设置视频 Provider 的 API Key
 */
router.post('/auth/apikey', async (req, res) => {
  try {
    const { provider = 'replicate', apiKey } = req.body
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key is required'
      })
    }

    // 验证 API Key
    const providerInstance = providerManager.getProvider(provider)
    providerInstance.setCredentials({ apiKey })
    
    const isValid = await providerInstance.validateCredentials()
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API Key'
      })
    }

    // 保存凭证
    providerManager.setProviderCredentials(provider, { apiKey })
    
    res.json({
      success: true,
      message: `${provider} API Key configured successfully`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 视频生成任务 ====================

/**
 * POST /api/video/generate
 * 创建视频生成任务
 */
router.post('/generate', async (req, res) => {
  try {
    const { 
      model = 'bytedance/seedance-1-lite',
      prompt,
      image,
      duration = 5,
      resolution = '720p',
      seed,
      params = {}
    } = req.body

    if (!prompt && !image) {
      return res.status(400).json({
        success: false,
        error: 'Either prompt or image is required'
      })
    }

    const provider = providerManager.getVideoProvider('replicate')

    // 根据模型类型调用不同方法
    let prediction
    if (model === 'bytedance/seedance-1-lite') {
      if (image) {
        prediction = await provider.seedanceI2V({ prompt, image, duration, resolution, seed })
      } else {
        prediction = await provider.seedanceT2V({ prompt, duration, resolution, seed })
      }
    } else {
      prediction = await provider.generateVideo({
        model,
        prompt,
        image,
        params: { duration, resolution, seed, ...params }
      })
    }

    // 保存任务到数据库
    if (!db.data.videoTasks) {
      db.data.videoTasks = []
    }

    const task = {
      id: getNextId('videoTasks'),
      predictionId: prediction.id,
      model,
      prompt,
      hasImage: !!image,
      duration,
      resolution,
      status: 'starting',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.videoTasks.push(task)
    await db.write()

    res.json({
      success: true,
      data: {
        taskId: task.id,
        predictionId: prediction.id,
        status: prediction.status
      }
    })
  } catch (error) {
    console.error('Video generation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/video/tasks
 * 获取所有视频生成任务
 */
router.get('/tasks', (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query

    if (!db.data.videoTasks) {
      db.data.videoTasks = []
    }

    let tasks = db.data.videoTasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    if (status) {
      tasks = tasks.filter(t => t.status === status)
    }

    tasks = tasks.slice(Number(offset), Number(offset) + Number(limit))

    res.json({
      success: true,
      data: tasks,
      total: db.data.videoTasks.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/video/tasks/:id
 * 获取单个任务状态（并同步 Replicate 状态）
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const taskId = parseInt(id)

    const task = db.data.videoTasks?.find(t => t.id === taskId)
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    // 如果任务还在进行中，从 Replicate 获取最新状态
    if (task.status !== 'succeeded' && task.status !== 'failed' && task.status !== 'canceled') {
      try {
        const provider = providerManager.getVideoProvider('replicate')
        const prediction = await provider.getPrediction(task.predictionId)

        task.status = prediction.status
        task.progress = prediction.progress || 0
        task.output = prediction.output
        task.error = prediction.error
        task.updatedAt = new Date().toISOString()

        if (prediction.metrics) {
          task.metrics = prediction.metrics
        }

        await db.write()
      } catch (e) {
        console.error('Failed to fetch prediction status:', e)
      }
    }

    res.json({
      success: true,
      data: task
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/video/tasks/:id/cancel
 * 取消视频生成任务
 */
router.post('/tasks/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const taskId = parseInt(id)

    const task = db.data.videoTasks?.find(t => t.id === taskId)
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    const provider = providerManager.getVideoProvider('replicate')
    await provider.cancelPrediction(task.predictionId)

    task.status = 'canceled'
    task.updatedAt = new Date().toISOString()
    await db.write()

    res.json({
      success: true,
      message: 'Task canceled'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/video/tasks/:id
 * 删除任务记录
 */
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const taskId = parseInt(id)

    const index = db.data.videoTasks?.findIndex(t => t.id === taskId)
    if (index === -1 || index === undefined) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    db.data.videoTasks.splice(index, 1)
    await db.write()

    res.json({
      success: true,
      message: 'Task deleted'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== Seedance 快捷接口 ====================

/**
 * POST /api/video/seedance/t2v
 * Seedance Text-to-Video
 */
router.post('/seedance/t2v', async (req, res) => {
  try {
    const { prompt, duration = 5, resolution = '720p', seed } = req.body

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      })
    }

    const provider = providerManager.getVideoProvider('replicate')
    const prediction = await provider.seedanceT2V({ prompt, duration, resolution, seed })

    // 保存任务
    if (!db.data.videoTasks) {
      db.data.videoTasks = []
    }

    const task = {
      id: getNextId('videoTasks'),
      predictionId: prediction.id,
      model: 'bytedance/seedance-1-lite',
      type: 'text-to-video',
      prompt,
      duration,
      resolution,
      seed,
      status: 'starting',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.videoTasks.push(task)
    await db.write()

    res.json({
      success: true,
      data: {
        taskId: task.id,
        predictionId: prediction.id,
        status: prediction.status
      }
    })
  } catch (error) {
    console.error('Seedance T2V error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/video/seedance/i2v
 * Seedance Image-to-Video
 */
router.post('/seedance/i2v', async (req, res) => {
  try {
    const { prompt, image, duration = 5, resolution = '720p', seed } = req.body

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image is required'
      })
    }

    const provider = providerManager.getVideoProvider('replicate')
    const prediction = await provider.seedanceI2V({ prompt, image, duration, resolution, seed })

    // 保存任务
    if (!db.data.videoTasks) {
      db.data.videoTasks = []
    }

    const task = {
      id: getNextId('videoTasks'),
      predictionId: prediction.id,
      model: 'bytedance/seedance-1-lite',
      type: 'image-to-video',
      prompt: prompt || '',
      image: typeof image === 'string' && image.startsWith('http') ? image : '[base64]',
      duration,
      resolution,
      seed,
      status: 'starting',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.videoTasks.push(task)
    await db.write()

    res.json({
      success: true,
      data: {
        taskId: task.id,
        predictionId: prediction.id,
        status: prediction.status
      }
    })
  } catch (error) {
    console.error('Seedance I2V error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/video/seedance/wait
 * 等待 Seedance 任务完成
 */
router.post('/seedance/wait', async (req, res) => {
  try {
    const { taskId, maxWait = 300000 } = req.body

    const task = db.data.videoTasks?.find(t => t.id === parseInt(taskId))
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    const provider = providerManager.getVideoProvider('replicate')
    const prediction = await provider.waitForPrediction(task.predictionId, maxWait)

    // 更新任务状态
    task.status = prediction.status
    task.output = prediction.output
    task.metrics = prediction.metrics
    task.updatedAt = new Date().toISOString()
    await db.write()

    res.json({
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        output: task.output,
        metrics: task.metrics
      }
    })
  } catch (error) {
    console.error('Wait error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
