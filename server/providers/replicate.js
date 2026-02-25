/**
 * Replicate Provider
 * 
 * 用于调用 Replicate 上的视频生成模型 (Seedance, CogVideoX 等)
 * https://replicate.com/docs/reference/http
 */

import { BaseProvider } from './base.js'
import fetch from 'node-fetch'

const REPLICATE_API_URL = 'https://api.replicate.com/v1'

// Replicate 视频生成模型
const REPLICATE_MODELS = {
  // Seedance - 字节跳动
  'bytedance/seedance-1-lite': {
    id: 'bytedance/seedance-1-lite',
    name: 'Seedance 1 Lite',
    type: 'video',
    description: '字节跳动 Seedance，支持 T2V 和 I2V，5-10秒 480p/720p',
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
  // Stable Video Diffusion
  'stability-ai/stable-video-diffusion': {
    id: 'stability-ai/stable-video-diffusion',
    name: 'Stable Video Diffusion',
    type: 'video',
    description: 'Stability AI 图像转视频',
    capabilities: ['image-to-video'],
    defaultParams: {
      motion_bucket_id: 127,
      fps: 7
    }
  },
  // Runway Gen-3 Alpha (如果可用)
  'lucataco/animate-diff': {
    id: 'lucataco/animate-diff',
    name: 'AnimateDiff',
    type: 'video',
    description: 'AnimateDiff 动画生成',
    capabilities: ['text-to-video'],
    defaultParams: {
      steps: 25
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
  // Kling (可能需要特殊访问)
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
    const { prompt, duration = 5, resolution = '720p', seed } = options

    const input = {
      prompt,
      duration,
      resolution
    }

    if (seed !== undefined) {
      input.seed = seed
    }

    return this.generateVideo({
      model: 'bytedance/seedance-1-lite',
      prompt,
      params: input
    })
  }

  /**
   * Seedance 专用：Image-to-Video
   */
  async seedanceI2V(options) {
    const { prompt, image, duration = 5, resolution = '720p', seed } = options

    if (!image) {
      throw new Error('Image is required for Image-to-Video')
    }

    const input = {
      prompt,
      image,
      duration,
      resolution
    }

    if (seed !== undefined) {
      input.seed = seed
    }

    return this.generateVideo({
      model: 'bytedance/seedance-1-lite',
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
