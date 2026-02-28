/**
 * Replicate Provider
 * 
 * 用于调用 Replicate 上的视频生成模型 (Seedance, CogVideoX 等)
 * https://replicate.com/docs/reference/http
 */

import { BaseProvider } from './base.js'

const REPLICATE_API_URL = 'https://api.replicate.com/v1'

// Replicate 视频生成模型
const REPLICATE_MODELS = {
  // Seedance 1.5 Pro - 最新版（推荐）
  'bytedance/seedance-1.5-pro': {
    id: 'bytedance/seedance-1.5-pro',
    name: 'Seedance 1.5 Pro',
    type: 'video',
    description: '最新版 · 支持音频 · 2-12秒 720p',
    capabilities: ['text-to-video', 'image-to-video'],
    defaultParams: {
      duration: 5,
      resolution: '720p',
      generate_audio: false,
      fps: 24,
      camera_fixed: false
    }
  },
  // Seedance 1 Pro Fast - 高性价比
  'bytedance/seedance-1-pro-fast': {
    id: 'bytedance/seedance-1-pro-fast',
    name: 'Seedance 1 Pro Fast',
    type: 'video',
    description: '高性价比 · 5-10秒 1080p',
    capabilities: ['text-to-video', 'image-to-video'],
    defaultParams: {
      duration: 5,
      resolution: '1080p'
    }
  },
  // Seedance 1 Pro - 高质量
  'bytedance/seedance-1-pro': {
    id: 'bytedance/seedance-1-pro',
    name: 'Seedance 1 Pro',
    type: 'video',
    description: '高质量 · 5-10秒 1080p',
    capabilities: ['text-to-video', 'image-to-video'],
    defaultParams: {
      duration: 5,
      resolution: '1080p'
    }
  },
  // Seedance 1 Lite - 轻量版
  'bytedance/seedance-1-lite': {
    id: 'bytedance/seedance-1-lite',
    name: 'Seedance 1 Lite',
    type: 'video',
    description: '轻量版 · 5-10秒 720p',
    capabilities: ['text-to-video', 'image-to-video'],
    defaultParams: {
      duration: 5,
      resolution: '720p'
    }
  },
  // CogVideoX - 智谱AI
  'fofr/cogvideox-5b': {
    id: 'fofr/cogvideox-5b',
    name: 'CogVideoX-5B',
    type: 'video',
    description: '智谱 CogVideoX 5B，文本/图像生成视频',
    capabilities: ['text-to-video', 'image-to-video'],
    defaultParams: {
      num_frames: 49,
      guidance_scale: 6
    }
  },
  // MiniMax Video (Hailuo)
  'minimax/video-01': {
    id: 'minimax/video-01',
    name: 'MiniMax Video-01',
    type: 'video',
    description: 'MiniMax (海螺AI) 视频生成',
    capabilities: ['text-to-video', 'image-to-video'],
    defaultParams: {}
  },
  // Kling
  'fofr/kling-v1': {
    id: 'fofr/kling-v1',
    name: 'Kling v1',
    type: 'video',
    description: '快手 Kling 视频生成',
    capabilities: ['text-to-video', 'image-to-video'],
    defaultParams: {
      duration: 5
    }
  }
}

export class ReplicateProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'replicate',
      name: 'Replicate',
      ...config
    })
    this.models = REPLICATE_MODELS
  }

  /**
   * 获取可用模型列表
   */
  async getModels() {
    return Object.values(this.models).map(model => ({
      ...model,
      available: true
    }))
  }

  /**
   * 获取模型的最新版本
   */
  async getModelVersion(modelId) {
    if (!this.credentials?.apiKey) {
      throw new Error('Replicate API Key not configured')
    }

    const response = await fetch(`${REPLICATE_API_URL}/models/${modelId}`, {
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.status}`)
    }

    const data = await response.json()
    return data.latest_version?.id
  }

  /**
   * 创建预测（启动任务）
   */
  async createPrediction(modelId, input) {
    if (!this.credentials?.apiKey) {
      throw new Error('Replicate API Key not configured')
    }

    const modelInfo = this.models[modelId]
    const version = await this.getModelVersion(modelId)

    const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version,
        input: {
          ...modelInfo?.defaultParams,
          ...input
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Replicate API error: ${response.status} - ${error}`)
    }

    return await response.json()
  }

  /**
   * 获取预测状态
   */
  async getPrediction(predictionId) {
    if (!this.credentials?.apiKey) {
      throw new Error('Replicate API Key not configured')
    }

    const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get prediction: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 等待预测完成
   */
  async waitForPrediction(predictionId, maxWait = 300000, interval = 2000) {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWait) {
      const prediction = await this.getPrediction(predictionId)

      if (prediction.status === 'succeeded') {
        return prediction
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new Error(`Prediction ${prediction.status}: ${prediction.error || 'Unknown error'}`)
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('Prediction timeout')
  }

  /**
   * 取消预测
   */
  async cancelPrediction(predictionId) {
    if (!this.credentials?.apiKey) {
      throw new Error('Replicate API Key not configured')
    }

    const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apiKey}`
      }
    })

    return response.ok
  }

  /**
   * 生成视频 - 高级接口
   * @param {Object} options
   * @param {string} options.model - 模型 ID
   * @param {string} options.prompt - 文本提示词（T2V）
   * @param {string} options.image - 输入图像 URL 或 Base64（I2V）
   * @param {Object} options.params - 额外参数
   */
  async generateVideo(options) {
    const { model, prompt, image, params = {} } = options

    const input = { ...params }

    if (prompt) {
      input.prompt = prompt
    }

    if (image) {
      input.image = image
    }

    // 创建预测
    const prediction = await this.createPrediction(model, input)

    return {
      id: prediction.id,
      status: prediction.status,
      model,
      createdAt: prediction.created_at,
      urls: prediction.urls
    }
  }

  /**
   * Seedance 专用：Text-to-Video
   */
  async seedanceT2V(options) {
    const {
      model = 'bytedance/seedance-1.5-pro',
      prompt,
      duration = 5,
      resolution = '720p',
      seed,
      generate_audio,
      fps,
      camera_fixed,
      aspect_ratio
    } = options

    const input = {
      prompt,
      duration,
      resolution
    }

    if (seed !== undefined) input.seed = seed
    if (generate_audio !== undefined) input.generate_audio = generate_audio
    if (fps !== undefined) input.fps = fps
    if (camera_fixed !== undefined) input.camera_fixed = camera_fixed
    if (aspect_ratio !== undefined) input.aspect_ratio = aspect_ratio

    return this.generateVideo({
      model,
      prompt,
      params: input
    })
  }

  /**
   * Seedance 专用：Image-to-Video
   */
  async seedanceI2V(options) {
    const {
      model = 'bytedance/seedance-1.5-pro',
      prompt,
      image,
      duration = 5,
      resolution = '720p',
      seed,
      generate_audio,
      fps,
      camera_fixed,
      last_frame_image
    } = options

    if (!image) {
      throw new Error('Image is required for Image-to-Video')
    }

    const input = {
      prompt,
      image,
      duration,
      resolution
    }

    if (seed !== undefined) input.seed = seed
    if (generate_audio !== undefined) input.generate_audio = generate_audio
    if (fps !== undefined) input.fps = fps
    if (camera_fixed !== undefined) input.camera_fixed = camera_fixed
    if (last_frame_image !== undefined) input.last_frame_image = last_frame_image

    return this.generateVideo({
      model,
      prompt,
      image,
      params: input
    })
  }

  /**
   * 验证凭证
   */
  async validateCredentials() {
    if (!this.credentials?.apiKey) return false

    try {
      const response = await fetch(`${REPLICATE_API_URL}/account`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 获取 Provider 信息
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      supportsOAuth: false,
      supportsStreaming: false,  // 视频生成是异步的
      supportsTools: false,      // 不是 LLM
      authType: 'api_key',
      models: Object.keys(this.models),
      type: 'video-generation'   // 特殊类型标记
    }
  }

  // ========== BaseProvider 接口适配 ==========
  // Replicate 不是 LLM，这些方法不适用

  async chat(options) {
    throw new Error('Replicate is a video generation provider, not an LLM. Use generateVideo() instead.')
  }

  async *chatStream(options) {
    throw new Error('Replicate is a video generation provider, not an LLM. Use generateVideo() instead.')
  }
}

export default ReplicateProvider
