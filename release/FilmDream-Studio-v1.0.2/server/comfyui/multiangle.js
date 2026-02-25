/**
 * Qwen-Image-Edit-2511-Multiple-Angles LoRA 服务
 * 
 * 基于 fal.ai 发布的多角度 LoRA，从单张图片生成多角度视图
 * 支持 96 个相机姿态：8 方位角 × 4 仰角 × 3 距离级别
 * 
 * 参考: https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA
 */

import fetch from 'node-fetch'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ComfyUI 配置
const COMFYUI_CONFIG = {
  host: process.env.COMFYUI_HOST || 'localhost',
  port: process.env.COMFYUI_PORT || 8188,
  get baseUrl() {
    return `http://${this.host}:${this.port}`
  }
}

/**
 * 多角度相机配置
 * 基于 LoRA 训练数据的 96 个姿态
 */
const CAMERA_CONFIG = {
  // 8 个方位角 (水平旋转, 45° 间隔)
  azimuth: [
    { value: 0, name: 'front', label: '正面', prompt: 'front view' },
    { value: 45, name: 'front-right', label: '右前', prompt: 'front-right quarter view' },
    { value: 90, name: 'right', label: '右侧', prompt: 'right side view' },
    { value: 135, name: 'back-right', label: '右后', prompt: 'back-right quarter view' },
    { value: 180, name: 'back', label: '背面', prompt: 'back view' },
    { value: 225, name: 'back-left', label: '左后', prompt: 'back-left quarter view' },
    { value: 270, name: 'left', label: '左侧', prompt: 'left side view' },
    { value: 315, name: 'front-left', label: '左前', prompt: 'front-left quarter view' }
  ],
  
  // 4 个仰角 (垂直角度)
  elevation: [
    { value: -30, name: 'low', label: '低角度', prompt: 'low-angle shot' },
    { value: 0, name: 'eye', label: '平视', prompt: 'eye-level shot' },
    { value: 30, name: 'elevated', label: '抬高', prompt: 'elevated shot' },
    { value: 60, name: 'high', label: '高角度', prompt: 'high-angle shot' }
  ],
  
  // 3 个距离级别
  distance: [
    { value: 0.6, name: 'close', label: '特写', prompt: 'close-up' },
    { value: 1.0, name: 'medium', label: '中景', prompt: 'medium shot' },
    { value: 1.8, name: 'wide', label: '广角', prompt: 'wide shot' }
  ]
}

/**
 * 预设角度组合
 */
const ANGLE_PRESETS = {
  // 电商产品 - 8 个基础角度
  'product-basic': {
    name: '产品基础',
    description: '8 个水平角度，平视中景',
    angles: CAMERA_CONFIG.azimuth.map(az => ({
      azimuth: az.name,
      elevation: 'eye',
      distance: 'medium'
    }))
  },
  
  // 电商产品 - 完整 360°
  'product-full': {
    name: '产品完整',
    description: '8 个水平角度 + 俯视图',
    angles: [
      ...CAMERA_CONFIG.azimuth.map(az => ({
        azimuth: az.name,
        elevation: 'eye',
        distance: 'medium'
      })),
      { azimuth: 'front', elevation: 'elevated', distance: 'medium' },
      { azimuth: 'front', elevation: 'high', distance: 'wide' }
    ]
  },
  
  // 角色设计 - 三视图
  'character-ortho': {
    name: '角色三视图',
    description: '正面、侧面、背面',
    angles: [
      { azimuth: 'front', elevation: 'eye', distance: 'medium' },
      { azimuth: 'right', elevation: 'eye', distance: 'medium' },
      { azimuth: 'back', elevation: 'eye', distance: 'medium' }
    ]
  },
  
  // 角色设计 - 完整
  'character-full': {
    name: '角色完整',
    description: '8 个角度 + 特写',
    angles: [
      ...CAMERA_CONFIG.azimuth.map(az => ({
        azimuth: az.name,
        elevation: 'eye',
        distance: 'medium'
      })),
      { azimuth: 'front', elevation: 'eye', distance: 'close' },
      { azimuth: 'front-right', elevation: 'low', distance: 'medium' }
    ]
  },
  
  // 机甲/怪兽 - 英雄角度
  'hero-shots': {
    name: '英雄角度',
    description: '戏剧性低角度拍摄',
    angles: [
      { azimuth: 'front', elevation: 'low', distance: 'medium' },
      { azimuth: 'front-right', elevation: 'low', distance: 'medium' },
      { azimuth: 'front-left', elevation: 'low', distance: 'medium' },
      { azimuth: 'front', elevation: 'low', distance: 'close' },
      { azimuth: 'front', elevation: 'low', distance: 'wide' }
    ]
  },
  
  // 细节展示
  'detail-closeups': {
    name: '细节特写',
    description: '多角度特写镜头',
    angles: [
      { azimuth: 'front', elevation: 'eye', distance: 'close' },
      { azimuth: 'front-right', elevation: 'eye', distance: 'close' },
      { azimuth: 'right', elevation: 'eye', distance: 'close' },
      { azimuth: 'front', elevation: 'elevated', distance: 'close' }
    ]
  },
  
  // 全景展示
  'panoramic': {
    name: '全景展示',
    description: '广角环绕 + 俯瞰',
    angles: [
      { azimuth: 'front', elevation: 'eye', distance: 'wide' },
      { azimuth: 'front-right', elevation: 'eye', distance: 'wide' },
      { azimuth: 'right', elevation: 'eye', distance: 'wide' },
      { azimuth: 'back', elevation: 'eye', distance: 'wide' },
      { azimuth: 'front', elevation: 'high', distance: 'wide' }
    ]
  }
}

/**
 * 生成多角度提示词
 */
function generateAnglePrompt(azimuth, elevation, distance) {
  const az = CAMERA_CONFIG.azimuth.find(a => a.name === azimuth) || CAMERA_CONFIG.azimuth[0]
  const el = CAMERA_CONFIG.elevation.find(e => e.name === elevation) || CAMERA_CONFIG.elevation[1]
  const dist = CAMERA_CONFIG.distance.find(d => d.name === distance) || CAMERA_CONFIG.distance[1]
  
  return `<sks> ${az.prompt} ${el.prompt} ${dist.prompt}`
}

/**
 * 生成 ComfyUI 工作流
 */
function generateMultiAngleWorkflow(options = {}) {
  const {
    imagePath,
    anglePrompt,
    loraStrength = 0.9,
    steps = 20,
    cfg = 7.0,
    seed = -1
  } = options

  return {
    // 加载基础模型
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: {
        ckpt_name: 'qwen-image-edit-2511.safetensors'
      }
    },
    
    // 加载 Multi-Angle LoRA
    '2': {
      class_type: 'LoraLoader',
      inputs: {
        model: ['1', 0],
        clip: ['1', 1],
        lora_name: 'qwen-image-edit-2511-multiple-angles-lora.safetensors',
        strength_model: loraStrength,
        strength_clip: loraStrength
      }
    },
    
    // 加载输入图片
    '3': {
      class_type: 'LoadImage',
      inputs: {
        image: imagePath
      }
    },
    
    // 编码提示词
    '4': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: anglePrompt,
        clip: ['2', 1]
      }
    },
    
    // 负面提示词
    '5': {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: 'blurry, low quality, distorted, deformed',
        clip: ['2', 1]
      }
    },
    
    // VAE 编码
    '6': {
      class_type: 'VAEEncode',
      inputs: {
        pixels: ['3', 0],
        vae: ['1', 2]
      }
    },
    
    // KSampler
    '7': {
      class_type: 'KSampler',
      inputs: {
        model: ['2', 0],
        positive: ['4', 0],
        negative: ['5', 0],
        latent_image: ['6', 0],
        seed: seed === -1 ? Math.floor(Math.random() * 2147483647) : seed,
        steps: steps,
        cfg: cfg,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 0.75
      }
    },
    
    // VAE 解码
    '8': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['7', 0],
        vae: ['1', 2]
      }
    },
    
    // 保存图片
    '9': {
      class_type: 'SaveImage',
      inputs: {
        images: ['8', 0],
        filename_prefix: 'multiangle'
      }
    }
  }
}

/**
 * ComfyUI 客户端
 */
class ComfyUIClient {
  constructor(config = COMFYUI_CONFIG) {
    this.config = config
    this.clientId = `filmdream_multiangle_${Date.now()}`
  }
  
  async checkConnection() {
    try {
      const response = await fetch(`${this.config.baseUrl}/system_stats`, {
        timeout: 5000
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
  
  async uploadImage(imagePath, subfolder = 'multiangle') {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    
    const imageBuffer = fs.readFileSync(imagePath)
    const filename = path.basename(imagePath)
    
    form.append('image', imageBuffer, { filename })
    form.append('subfolder', subfolder)
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
  
  async queuePrompt(workflow) {
    const response = await fetch(`${this.config.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: this.clientId
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to queue prompt: ${await response.text()}`)
    }
    
    return await response.json()
  }
  
  async getHistory(promptId) {
    const response = await fetch(`${this.config.baseUrl}/history/${promptId}`)
    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.statusText}`)
    }
    return await response.json()
  }
  
  async downloadImage(filename, subfolder = '', type = 'output') {
    const params = new URLSearchParams({ filename, subfolder, type })
    const response = await fetch(`${this.config.baseUrl}/view?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`)
    }
    
    return await response.buffer()
  }
}

/**
 * 多角度生成服务
 */
class MultiAngleService {
  constructor() {
    this.client = new ComfyUIClient()
    this.outputDir = path.join(__dirname, '../data/multiangle')
    
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }
  
  /**
   * 获取相机配置
   */
  getCameraConfig() {
    return CAMERA_CONFIG
  }
  
  /**
   * 获取预设列表
   */
  getPresets() {
    return Object.entries(ANGLE_PRESETS).map(([id, preset]) => ({
      id,
      ...preset,
      angleCount: preset.angles.length
    }))
  }
  
  /**
   * 获取预设详情
   */
  getPreset(presetId) {
    return ANGLE_PRESETS[presetId] || null
  }
  
  /**
   * 生成角度提示词
   */
  generatePrompt(azimuth, elevation, distance) {
    return generateAnglePrompt(azimuth, elevation, distance)
  }
  
  /**
   * 生成单个角度
   */
  async generateSingleAngle(imageSource, angle, options = {}) {
    const {
      loraStrength = 0.9,
      steps = 20,
      cfg = 7.0,
      seed = -1
    } = options
    
    // 检查连接
    const connected = await this.client.checkConnection()
    if (!connected) {
      return {
        success: false,
        error: 'ComfyUI server is not available'
      }
    }
    
    try {
      // 上传图片
      let comfyImagePath = imageSource
      if (imageSource.startsWith('/') || imageSource.startsWith('./')) {
        const uploadResult = await this.client.uploadImage(imageSource)
        comfyImagePath = `multiangle/${uploadResult.name}`
      }
      
      // 生成提示词
      const anglePrompt = generateAnglePrompt(
        angle.azimuth, 
        angle.elevation, 
        angle.distance
      )
      
      // 生成工作流
      const workflow = generateMultiAngleWorkflow({
        imagePath: comfyImagePath,
        anglePrompt,
        loraStrength,
        steps,
        cfg,
        seed
      })
      
      // 提交队列
      const queueResult = await this.client.queuePrompt(workflow)
      
      return {
        success: true,
        promptId: queueResult.prompt_id,
        angle,
        prompt: anglePrompt,
        status: 'processing'
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * 批量生成多个角度
   */
  async generateMultipleAngles(imageSource, angles, options = {}) {
    const results = []
    
    for (const angle of angles) {
      const result = await this.generateSingleAngle(imageSource, angle, options)
      results.push(result)
      
      // 避免过快提交
      if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return {
      success: results.some(r => r.success),
      results,
      total: angles.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  }
  
  /**
   * 使用预设生成
   */
  async generateFromPreset(imageSource, presetId, options = {}) {
    const preset = ANGLE_PRESETS[presetId]
    if (!preset) {
      return {
        success: false,
        error: `Unknown preset: ${presetId}`
      }
    }
    
    return await this.generateMultipleAngles(imageSource, preset.angles, options)
  }
  
  /**
   * 检查生成状态
   */
  async checkStatus(promptId) {
    try {
      const history = await this.client.getHistory(promptId)
      
      if (!history[promptId]) {
        return { status: 'processing', message: 'Still in queue' }
      }
      
      const result = history[promptId]
      
      if (result.status?.status_str === 'error') {
        return {
          status: 'failed',
          error: result.status.messages?.[0] || 'Generation failed'
        }
      }
      
      if (result.status?.completed) {
        // 找到输出图片
        const outputs = result.outputs
        let outputImage = null
        
        for (const nodeId of Object.keys(outputs)) {
          const nodeOutput = outputs[nodeId]
          if (nodeOutput.images && nodeOutput.images.length > 0) {
            outputImage = nodeOutput.images[0]
            break
          }
        }
        
        if (outputImage) {
          return {
            status: 'ready',
            output: {
              filename: outputImage.filename,
              subfolder: outputImage.subfolder || '',
              type: outputImage.type || 'output'
            }
          }
        }
      }
      
      return { status: 'processing', message: 'Still processing' }
      
    } catch (error) {
      return { status: 'error', error: error.message }
    }
  }
  
  /**
   * 下载生成的图片
   */
  async downloadResult(promptId, outputFilename) {
    const status = await this.checkStatus(promptId)
    
    if (status.status !== 'ready' || !status.output) {
      throw new Error('Image not ready for download')
    }
    
    const { filename, subfolder, type } = status.output
    const buffer = await this.client.downloadImage(filename, subfolder, type)
    
    const outputPath = path.join(this.outputDir, outputFilename)
    fs.writeFileSync(outputPath, buffer)
    
    return {
      success: true,
      filePath: `/data/multiangle/${outputFilename}`,
      size: buffer.length
    }
  }
}

// 导出单例
const multiAngleService = new MultiAngleService()

export {
  MultiAngleService,
  multiAngleService,
  CAMERA_CONFIG,
  ANGLE_PRESETS,
  generateAnglePrompt,
  generateMultiAngleWorkflow
}

export default multiAngleService
