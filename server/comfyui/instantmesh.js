/**
 * ComfyUI InstantMesh 工作流集成
 * 从单张图片生成 3D 模型
 */

import fetch from 'node-fetch'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 默认 ComfyUI 配置
const COMFYUI_CONFIG = {
  host: process.env.COMFYUI_HOST || 'localhost',
  port: process.env.COMFYUI_PORT || 8188,
  get baseUrl() {
    return `http://${this.host}:${this.port}`
  }
}

/**
 * InstantMesh 工作流模板
 * 基于 ComfyUI-3D-Pack 的 InstantMesh 节点
 */
const INSTANTMESH_WORKFLOW = {
  // 工作流版本
  version: '1.0.0',
  
  // 生成工作流 JSON
  generateWorkflow: (options = {}) => {
    const {
      imagePath,
      outputPath = './output',
      meshFormat = 'glb',
      resolution = 256,
      mcubeThreshold = 0.0,
      removeBackground = true,
      backgroundColor = [255, 255, 255]
    } = options

    return {
      // 加载输入图片
      '1': {
        class_type: 'LoadImage',
        inputs: {
          image: imagePath
        }
      },
      
      // 可选：移除背景
      ...(removeBackground ? {
        '2': {
          class_type: 'Image Rembg (Remove Background)',
          inputs: {
            image: ['1', 0],
            model: 'u2net'
          }
        }
      } : {}),
      
      // InstantMesh 推理
      '3': {
        class_type: 'InstantMesh',
        inputs: {
          image: removeBackground ? ['2', 0] : ['1', 0],
          resolution: resolution,
          mcube_threshold: mcubeThreshold
        }
      },
      
      // 导出 3D 模型
      '4': {
        class_type: 'Save3DModel',
        inputs: {
          mesh: ['3', 0],
          filename_prefix: 'instantmesh_output',
          format: meshFormat
        }
      }
    }
  }
}

/**
 * ComfyUI API 客户端
 */
class ComfyUIClient {
  constructor(config = COMFYUI_CONFIG) {
    this.config = config
    this.clientId = `filmdream_${Date.now()}`
  }
  
  /**
   * 检查 ComfyUI 是否可用
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.config.baseUrl}/system_stats`, {
        timeout: 5000
      })
      return response.ok
    } catch (error) {
      console.error('ComfyUI connection failed:', error.message)
      return false
    }
  }
  
  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    try {
      const response = await fetch(`${this.config.baseUrl}/queue`)
      return await response.json()
    } catch (error) {
      throw new Error(`Failed to get queue status: ${error.message}`)
    }
  }
  
  /**
   * 上传图片到 ComfyUI
   */
  async uploadImage(imagePath, subfolder = '') {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    
    const imageBuffer = fs.readFileSync(imagePath)
    const filename = path.basename(imagePath)
    
    form.append('image', imageBuffer, { filename })
    if (subfolder) {
      form.append('subfolder', subfolder)
    }
    form.append('type', 'input')
    form.append('overwrite', 'true')
    
    const response = await fetch(`${this.config.baseUrl}/upload/image`, {
      method: 'POST',
      body: form
    })
    
    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`)
    }
    
    return await response.json()
  }
  
  /**
   * 提交工作流到队列
   */
  async queuePrompt(workflow) {
    const response = await fetch(`${this.config.baseUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: this.clientId
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to queue prompt: ${error}`)
    }
    
    return await response.json()
  }
  
  /**
   * 获取生成历史
   */
  async getHistory(promptId) {
    const response = await fetch(`${this.config.baseUrl}/history/${promptId}`)
    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.statusText}`)
    }
    return await response.json()
  }
  
  /**
   * 等待工作流完成
   */
  async waitForCompletion(promptId, timeout = 300000, pollInterval = 2000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const history = await this.getHistory(promptId)
      
      if (history[promptId]) {
        const status = history[promptId].status
        
        if (status?.completed) {
          return {
            success: true,
            outputs: history[promptId].outputs
          }
        }
        
        if (status?.status_str === 'error') {
          return {
            success: false,
            error: status.messages?.[0] || 'Unknown error'
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    return {
      success: false,
      error: 'Timeout waiting for completion'
    }
  }
  
  /**
   * 下载生成的文件
   */
  async downloadOutput(filename, subfolder = '', type = 'output') {
    const params = new URLSearchParams({ filename, subfolder, type })
    const response = await fetch(`${this.config.baseUrl}/view?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }
    
    return await response.buffer()
  }
}

/**
 * InstantMesh 3D 生成服务
 */
class InstantMeshService {
  constructor() {
    this.client = new ComfyUIClient()
    this.outputDir = path.join(__dirname, '../data/assets3d')
  }
  
  /**
   * 从图片生成 3D 模型
   * @param {string} imageSource - 图片路径或 URL
   * @param {object} options - 生成选项
   * @returns {object} - 生成结果
   */
  async generateFromImage(imageSource, options = {}) {
    const {
      name = `model_${Date.now()}`,
      meshFormat = 'glb',
      resolution = 256,
      removeBackground = true
    } = options
    
    // 检查连接
    const connected = await this.client.checkConnection()
    if (!connected) {
      return {
        success: false,
        error: 'ComfyUI server is not available',
        status: 'failed'
      }
    }
    
    try {
      // 如果是本地路径，上传到 ComfyUI
      let comfyImagePath = imageSource
      if (imageSource.startsWith('/') || imageSource.startsWith('./')) {
        const uploadResult = await this.client.uploadImage(imageSource)
        comfyImagePath = uploadResult.name
      }
      
      // 生成工作流
      const workflow = INSTANTMESH_WORKFLOW.generateWorkflow({
        imagePath: comfyImagePath,
        meshFormat,
        resolution,
        removeBackground
      })
      
      // 提交到队列
      const queueResult = await this.client.queuePrompt(workflow)
      const promptId = queueResult.prompt_id
      
      // 返回任务信息（异步处理）
      return {
        success: true,
        promptId,
        status: 'processing',
        message: 'Model generation started'
      }
      
    } catch (error) {
      console.error('InstantMesh generation error:', error)
      return {
        success: false,
        error: error.message,
        status: 'failed'
      }
    }
  }
  
  /**
   * 检查生成状态并获取结果
   */
  async checkStatus(promptId) {
    try {
      const history = await this.client.getHistory(promptId)
      
      if (!history[promptId]) {
        return {
          status: 'processing',
          message: 'Still in queue or processing'
        }
      }
      
      const result = history[promptId]
      
      if (result.status?.status_str === 'error') {
        return {
          status: 'failed',
          error: result.status.messages?.[0] || 'Generation failed'
        }
      }
      
      if (result.status?.completed) {
        // 找到输出的 3D 模型
        const outputs = result.outputs
        let modelFile = null
        
        for (const nodeId of Object.keys(outputs)) {
          const nodeOutput = outputs[nodeId]
          if (nodeOutput.meshes && nodeOutput.meshes.length > 0) {
            modelFile = nodeOutput.meshes[0]
            break
          }
        }
        
        if (modelFile) {
          return {
            status: 'ready',
            output: {
              filename: modelFile.filename,
              subfolder: modelFile.subfolder || '',
              type: modelFile.type || 'output'
            }
          }
        }
        
        return {
          status: 'completed',
          message: 'Generation completed but no model found'
        }
      }
      
      return {
        status: 'processing',
        message: 'Still processing'
      }
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      }
    }
  }
  
  /**
   * 下载并保存生成的模型
   */
  async downloadModel(promptId, outputFilename) {
    const status = await this.checkStatus(promptId)
    
    if (status.status !== 'ready' || !status.output) {
      throw new Error('Model not ready for download')
    }
    
    const { filename, subfolder, type } = status.output
    const buffer = await this.client.downloadOutput(filename, subfolder, type)
    
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
    
    const outputPath = path.join(this.outputDir, outputFilename)
    fs.writeFileSync(outputPath, buffer)
    
    return {
      success: true,
      filePath: `/assets3d/${outputFilename}`,
      size: buffer.length
    }
  }
}

// 导出单例
const instantMeshService = new InstantMeshService()

export {
  ComfyUIClient,
  InstantMeshService,
  instantMeshService,
  INSTANTMESH_WORKFLOW,
  COMFYUI_CONFIG
}

export default instantMeshService
