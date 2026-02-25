/**
 * ComfyUI 服务管理器
 * 
 * 提供统一的 ComfyUI 连接和工作流管理
 */

import fetch from 'node-fetch'
import FormData from 'form-data'
import WebSocket from 'ws'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ComfyUI 配置
const DEFAULT_CONFIG = {
  host: process.env.COMFYUI_HOST || 'localhost',
  port: process.env.COMFYUI_PORT || 8188,
  timeout: 30000,
  get baseUrl() {
    return `http://${this.host}:${this.port}`
  },
  get wsUrl() {
    return `ws://${this.host}:${this.port}/ws`
  }
}

/**
 * ComfyUI 客户端
 */
export class ComfyUIClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.clientId = `filmdream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.ws = null
    this.connected = false
    this.listeners = new Map()
  }

  /**
   * 检查 ComfyUI 服务器状态
   */
  async checkConnection() {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.baseUrl}/system_stats`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStats() {
    const response = await fetch(`${this.config.baseUrl}/system_stats`)
    if (!response.ok) {
      throw new Error(`Failed to get system stats: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * 获取对象信息（节点定义）
   */
  async getObjectInfo() {
    const response = await fetch(`${this.config.baseUrl}/object_info`)
    if (!response.ok) {
      throw new Error(`Failed to get object info: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * 获取已安装的模型列表
   */
  async getModels(type = 'checkpoints') {
    const objectInfo = await this.getObjectInfo()
    
    const loaderNodes = {
      checkpoints: 'CheckpointLoaderSimple',
      loras: 'LoraLoader',
      vae: 'VAELoader',
      controlnet: 'ControlNetLoader'
    }

    const loaderNode = loaderNodes[type]
    if (!loaderNode || !objectInfo[loaderNode]) {
      return []
    }

    const inputSpec = objectInfo[loaderNode].input?.required
    const nameKey = type === 'checkpoints' ? 'ckpt_name' : 
                    type === 'loras' ? 'lora_name' :
                    type === 'vae' ? 'vae_name' : 
                    'control_net_name'

    return inputSpec?.[nameKey]?.[0] || []
  }

  /**
   * 上传图片到 ComfyUI
   */
  async uploadImage(imageSource, options = {}) {
    const { subfolder = '', filename, overwrite = true } = options
    
    const form = new FormData()
    
    // 支持文件路径、Buffer 或 Base64
    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:')) {
        // Base64 data URL
        const matches = imageSource.match(/^data:image\/(\w+);base64,(.+)$/)
        if (!matches) throw new Error('Invalid base64 image')
        
        const ext = matches[1]
        const buffer = Buffer.from(matches[2], 'base64')
        form.append('image', buffer, { filename: filename || `upload.${ext}` })
      } else if (fs.existsSync(imageSource)) {
        // 文件路径
        const buffer = fs.readFileSync(imageSource)
        form.append('image', buffer, { filename: filename || path.basename(imageSource) })
      } else if (imageSource.startsWith('http')) {
        // URL - 先下载
        const response = await fetch(imageSource)
        const buffer = await response.buffer()
        const ext = imageSource.split('.').pop()?.split('?')[0] || 'png'
        form.append('image', buffer, { filename: filename || `upload.${ext}` })
      } else {
        throw new Error('Invalid image source')
      }
    } else if (Buffer.isBuffer(imageSource)) {
      form.append('image', imageSource, { filename: filename || 'upload.png' })
    } else {
      throw new Error('Unsupported image source type')
    }

    if (subfolder) form.append('subfolder', subfolder)
    form.append('type', 'input')
    form.append('overwrite', overwrite.toString())

    const response = await fetch(`${this.config.baseUrl}/upload/image`, {
      method: 'POST',
      body: form
    })

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${await response.text()}`)
    }

    return await response.json()
  }

  /**
   * 提交工作流到队列
   */
  async queuePrompt(workflow, extraData = {}) {
    const response = await fetch(`${this.config.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: this.clientId,
        extra_data: extraData
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to queue prompt: ${error}`)
    }

    return await response.json()
  }

  /**
   * 获取队列状态
   */
  async getQueue() {
    const response = await fetch(`${this.config.baseUrl}/queue`)
    if (!response.ok) {
      throw new Error(`Failed to get queue: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * 获取历史记录
   */
  async getHistory(promptId = null) {
    const url = promptId 
      ? `${this.config.baseUrl}/history/${promptId}`
      : `${this.config.baseUrl}/history`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.statusText}`)
    }
    return await response.json()
  }

  /**
   * 取消当前执行
   */
  async interrupt() {
    const response = await fetch(`${this.config.baseUrl}/interrupt`, {
      method: 'POST'
    })
    return response.ok
  }

  /**
   * 清空队列
   */
  async clearQueue() {
    const response = await fetch(`${this.config.baseUrl}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: true })
    })
    return response.ok
  }

  /**
   * 下载生成的图片
   */
  async getImage(filename, subfolder = '', type = 'output') {
    const params = new URLSearchParams({ filename, subfolder, type })
    const response = await fetch(`${this.config.baseUrl}/view?${params}`)

    if (!response.ok) {
      throw new Error(`Failed to get image: ${response.statusText}`)
    }

    return await response.buffer()
  }

  /**
   * 连接 WebSocket 监听进度
   */
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.connected) {
        resolve()
        return
      }

      this.ws = new WebSocket(`${this.config.wsUrl}?clientId=${this.clientId}`)

      this.ws.on('open', () => {
        this.connected = true
        resolve()
      })

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.emit(message.type, message.data)
        } catch (e) {
          // 忽略非 JSON 消息
        }
      })

      this.ws.on('close', () => {
        this.connected = false
      })

      this.ws.on('error', (error) => {
        this.connected = false
        reject(error)
      })

      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000)
    })
  }

  /**
   * 断开 WebSocket
   */
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.connected = false
    }
  }

  /**
   * 监听事件
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  /**
   * 移除监听
   */
  off(event, callback) {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    const listeners = this.listeners.get(event) || []
    listeners.forEach(callback => {
      try {
        callback(data)
      } catch (e) {
        console.error('Event listener error:', e)
      }
    })
  }

  /**
   * 执行工作流并等待完成
   */
  async executeAndWait(workflow, options = {}) {
    const { timeout = 300000, onProgress } = options

    // 连接 WebSocket
    await this.connectWebSocket()

    // 提交工作流
    const { prompt_id: promptId } = await this.queuePrompt(workflow)

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error('Execution timeout'))
      }, timeout)

      const onExecuting = (data) => {
        if (data.prompt_id === promptId && onProgress) {
          onProgress({ type: 'executing', node: data.node })
        }
      }

      const onProgress_ = (data) => {
        if (data.prompt_id === promptId && onProgress) {
          onProgress({ type: 'progress', value: data.value, max: data.max })
        }
      }

      const onExecuted = async (data) => {
        if (data.prompt_id === promptId) {
          cleanup()

          // 获取完整历史
          const history = await this.getHistory(promptId)
          const result = history[promptId]

          if (result) {
            // 提取输出图片
            const outputs = []
            for (const nodeId of Object.keys(result.outputs || {})) {
              const nodeOutput = result.outputs[nodeId]
              if (nodeOutput.images) {
                outputs.push(...nodeOutput.images.map(img => ({
                  ...img,
                  nodeId
                })))
              }
            }

            resolve({
              promptId,
              outputs,
              status: result.status
            })
          } else {
            reject(new Error('No result in history'))
          }
        }
      }

      const onError = (data) => {
        if (data.prompt_id === promptId) {
          cleanup()
          reject(new Error(data.message || 'Execution error'))
        }
      }

      const cleanup = () => {
        clearTimeout(timeoutId)
        this.off('executing', onExecuting)
        this.off('progress', onProgress_)
        this.off('executed', onExecuted)
        this.off('execution_error', onError)
      }

      this.on('executing', onExecuting)
      this.on('progress', onProgress_)
      this.on('executed', onExecuted)
      this.on('execution_error', onError)
    })
  }
}

/**
 * ComfyUI 服务管理器
 */
class ComfyUIManager {
  constructor() {
    this.client = new ComfyUIClient()
    this.workflowsDir = path.join(__dirname, '../templates/comfyui-workflows')
  }

  /**
   * 获取客户端
   */
  getClient() {
    return this.client
  }

  /**
   * 检查连接状态
   */
  async isConnected() {
    return await this.client.checkConnection()
  }

  /**
   * 获取服务器信息
   */
  async getServerInfo() {
    const connected = await this.isConnected()
    if (!connected) {
      return { connected: false }
    }

    try {
      const stats = await this.client.getSystemStats()
      return {
        connected: true,
        ...stats
      }
    } catch (error) {
      return { connected: false, error: error.message }
    }
  }

  /**
   * 获取可用工作流模板
   */
  getWorkflowTemplates() {
    if (!fs.existsSync(this.workflowsDir)) {
      return []
    }

    const indexPath = path.join(this.workflowsDir, 'index.json')
    if (fs.existsSync(indexPath)) {
      try {
        return JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
      } catch {
        return []
      }
    }

    // 扫描目录
    return fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith('.json') && f !== 'index.json')
      .map(f => ({
        id: f.replace('.json', ''),
        name: f.replace('.json', '').replace(/-/g, ' ')
      }))
  }

  /**
   * 加载工作流模板
   */
  loadWorkflowTemplate(templateId) {
    const templatePath = path.join(this.workflowsDir, `${templateId}.json`)
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Workflow template not found: ${templateId}`)
    }

    return JSON.parse(fs.readFileSync(templatePath, 'utf-8'))
  }

  /**
   * 保存工作流模板
   */
  saveWorkflowTemplate(templateId, workflow, metadata = {}) {
    if (!fs.existsSync(this.workflowsDir)) {
      fs.mkdirSync(this.workflowsDir, { recursive: true })
    }

    const templatePath = path.join(this.workflowsDir, `${templateId}.json`)
    
    // 添加元数据
    const fullWorkflow = {
      _filmdream_meta: {
        id: templateId,
        ...metadata,
        savedAt: new Date().toISOString()
      },
      ...workflow
    }

    fs.writeFileSync(templatePath, JSON.stringify(fullWorkflow, null, 2))

    // 更新索引
    this.updateWorkflowIndex()

    return templatePath
  }

  /**
   * 更新工作流索引
   */
  updateWorkflowIndex() {
    const templates = fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith('.json') && f !== 'index.json')
      .map(f => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(this.workflowsDir, f), 'utf-8'))
          return {
            id: f.replace('.json', ''),
            name: content._filmdream_meta?.name || f.replace('.json', '').replace(/-/g, ' '),
            description: content._filmdream_meta?.description || '',
            type: content._filmdream_meta?.type || 'custom'
          }
        } catch {
          return {
            id: f.replace('.json', ''),
            name: f.replace('.json', '').replace(/-/g, ' ')
          }
        }
      })

    const indexPath = path.join(this.workflowsDir, 'index.json')
    fs.writeFileSync(indexPath, JSON.stringify(templates, null, 2))
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    Object.assign(this.client.config, newConfig)
  }
}

// 单例
const comfyuiManager = new ComfyUIManager()

export { ComfyUIManager, comfyuiManager }
export default comfyuiManager
