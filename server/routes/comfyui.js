/**
 * ComfyUI API 路由
 * 提供 ComfyUI 管理和工作流执行
 */

import express from 'express'
import comfyuiManager from '../comfyui/manager.js'
import multiAngleService from '../comfyui/multiangle.js'

const router = express.Router()

// ==================== 服务器状态 ====================

/**
 * GET /api/comfyui/status
 * 获取 ComfyUI 服务器状态
 */
router.get('/status', async (req, res) => {
  try {
    const info = await comfyuiManager.getServerInfo()
    res.json({
      success: true,
      data: info
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * PUT /api/comfyui/config
 * 更新 ComfyUI 配置
 */
router.put('/config', (req, res) => {
  try {
    const { host, port } = req.body
    
    if (host || port) {
      comfyuiManager.updateConfig({ host, port })
    }

    res.json({
      success: true,
      data: {
        host: comfyuiManager.getClient().config.host,
        port: comfyuiManager.getClient().config.port
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 模型管理 ====================

/**
 * GET /api/comfyui/models
 * 获取已安装的模型列表
 */
router.get('/models', async (req, res) => {
  try {
    const { type = 'checkpoints' } = req.query
    
    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    const client = comfyuiManager.getClient()
    const models = await client.getModels(type)

    res.json({
      success: true,
      data: models,
      type
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/comfyui/models/all
 * 获取所有类型的模型
 */
router.get('/models/all', async (req, res) => {
  try {
    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    const client = comfyuiManager.getClient()
    const types = ['checkpoints', 'loras', 'vae', 'controlnet']
    
    const models = {}
    for (const type of types) {
      try {
        models[type] = await client.getModels(type)
      } catch {
        models[type] = []
      }
    }

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

// ==================== 工作流模板 ====================

/**
 * GET /api/comfyui/workflows
 * 获取工作流模板列表
 */
router.get('/workflows', (req, res) => {
  try {
    const templates = comfyuiManager.getWorkflowTemplates()
    res.json({
      success: true,
      data: templates
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/comfyui/workflows/:id
 * 获取单个工作流模板
 */
router.get('/workflows/:id', (req, res) => {
  try {
    const workflow = comfyuiManager.loadWorkflowTemplate(req.params.id)
    res.json({
      success: true,
      data: workflow
    })
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/comfyui/workflows
 * 保存新工作流模板
 */
router.post('/workflows', (req, res) => {
  try {
    const { id, name, description, type, workflow } = req.body

    if (!id || !workflow) {
      return res.status(400).json({
        success: false,
        error: 'ID and workflow are required'
      })
    }

    const path = comfyuiManager.saveWorkflowTemplate(id, workflow, {
      name,
      description,
      type
    })

    res.json({
      success: true,
      data: { id, path }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 工作流执行 ====================

/**
 * POST /api/comfyui/execute
 * 执行工作流
 */
router.post('/execute', async (req, res) => {
  try {
    const { workflow, templateId, variables = {} } = req.body

    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    // 加载工作流
    let workflowData = workflow
    if (!workflowData && templateId) {
      workflowData = comfyuiManager.loadWorkflowTemplate(templateId)
      // 移除元数据
      delete workflowData._filmdream_meta
    }

    if (!workflowData) {
      return res.status(400).json({
        success: false,
        error: 'Workflow or templateId is required'
      })
    }

    // 替换变量
    let workflowStr = JSON.stringify(workflowData)
    for (const [key, value] of Object.entries(variables)) {
      workflowStr = workflowStr.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    workflowData = JSON.parse(workflowStr)

    // 提交执行
    const client = comfyuiManager.getClient()
    const { prompt_id: promptId } = await client.queuePrompt(workflowData)

    res.json({
      success: true,
      data: {
        promptId,
        status: 'queued'
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
 * POST /api/comfyui/execute-and-wait
 * 执行工作流并等待完成
 */
router.post('/execute-and-wait', async (req, res) => {
  try {
    const { workflow, templateId, variables = {}, timeout = 300000 } = req.body

    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    // 加载工作流
    let workflowData = workflow
    if (!workflowData && templateId) {
      workflowData = comfyuiManager.loadWorkflowTemplate(templateId)
      delete workflowData._filmdream_meta
    }

    if (!workflowData) {
      return res.status(400).json({
        success: false,
        error: 'Workflow or templateId is required'
      })
    }

    // 替换变量
    let workflowStr = JSON.stringify(workflowData)
    for (const [key, value] of Object.entries(variables)) {
      workflowStr = workflowStr.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    workflowData = JSON.parse(workflowStr)

    // 执行并等待
    const client = comfyuiManager.getClient()
    const result = await client.executeAndWait(workflowData, { timeout })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/comfyui/history/:promptId
 * 获取执行历史
 */
router.get('/history/:promptId', async (req, res) => {
  try {
    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    const client = comfyuiManager.getClient()
    const history = await client.getHistory(req.params.promptId)

    res.json({
      success: true,
      data: history[req.params.promptId] || null
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/comfyui/queue
 * 获取当前队列
 */
router.get('/queue', async (req, res) => {
  try {
    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    const client = comfyuiManager.getClient()
    const queue = await client.getQueue()

    res.json({
      success: true,
      data: queue
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/comfyui/interrupt
 * 中断当前执行
 */
router.post('/interrupt', async (req, res) => {
  try {
    const client = comfyuiManager.getClient()
    const success = await client.interrupt()

    res.json({
      success,
      message: success ? 'Execution interrupted' : 'Failed to interrupt'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/comfyui/queue
 * 清空队列
 */
router.delete('/queue', async (req, res) => {
  try {
    const client = comfyuiManager.getClient()
    const success = await client.clearQueue()

    res.json({
      success,
      message: success ? 'Queue cleared' : 'Failed to clear queue'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 图片操作 ====================

/**
 * POST /api/comfyui/upload
 * 上传图片到 ComfyUI
 */
router.post('/upload', async (req, res) => {
  try {
    const { image, subfolder = '', filename } = req.body

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image is required (base64 or URL)'
      })
    }

    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    const client = comfyuiManager.getClient()
    const result = await client.uploadImage(image, { subfolder, filename })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/comfyui/image/:filename
 * 获取生成的图片
 */
router.get('/image/:filename', async (req, res) => {
  try {
    const { subfolder = '', type = 'output' } = req.query

    const connected = await comfyuiManager.isConnected()
    if (!connected) {
      return res.status(503).json({
        success: false,
        error: 'ComfyUI server is not connected'
      })
    }

    const client = comfyuiManager.getClient()
    const buffer = await client.getImage(req.params.filename, subfolder, type)

    // 检测图片类型
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50
    const contentType = isPng ? 'image/png' : 'image/jpeg'

    res.setHeader('Content-Type', contentType)
    res.send(buffer)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 多角度生成 ====================

/**
 * GET /api/comfyui/multiangle/config
 * 获取多角度相机配置
 */
router.get('/multiangle/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: multiAngleService.getCameraConfig()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/comfyui/multiangle/presets
 * 获取多角度预设列表
 */
router.get('/multiangle/presets', (req, res) => {
  try {
    res.json({
      success: true,
      data: multiAngleService.getPresets()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/comfyui/multiangle/generate
 * 生成多角度视图
 */
router.post('/multiangle/generate', async (req, res) => {
  try {
    const { 
      image, 
      presetId, 
      angles, 
      loraStrength, 
      steps, 
      cfg, 
      seed 
    } = req.body

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image is required'
      })
    }

    let result
    if (presetId) {
      result = await multiAngleService.generateFromPreset(image, presetId, {
        loraStrength, steps, cfg, seed
      })
    } else if (angles && angles.length > 0) {
      result = await multiAngleService.generateMultipleAngles(image, angles, {
        loraStrength, steps, cfg, seed
      })
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either presetId or angles array is required'
      })
    }

    res.json({
      success: result.success,
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/comfyui/multiangle/status/:promptId
 * 检查多角度生成状态
 */
router.get('/multiangle/status/:promptId', async (req, res) => {
  try {
    const status = await multiAngleService.checkStatus(req.params.promptId)
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
