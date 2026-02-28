import { create } from 'zustand'

const API_BASE = 'http://localhost:3001/api'

// 视频模型列表
export const VIDEO_MODELS = [
  { id: 'bytedance/seedance-1.5-pro', name: 'Seedance 1.5 Pro ⭐', capabilities: ['text-to-video', 'image-to-video'], description: '最新版 · 支持音频 · 2-12秒 720p', audio: true },
  { id: 'bytedance/seedance-1-pro-fast', name: 'Seedance 1 Pro Fast', capabilities: ['text-to-video', 'image-to-video'], description: '高性价比 · 5-10秒 1080p' },
  { id: 'bytedance/seedance-1-pro', name: 'Seedance 1 Pro', capabilities: ['text-to-video', 'image-to-video'], description: '高质量 · 5-10秒 1080p' },
  { id: 'bytedance/seedance-1-lite', name: 'Seedance 1 Lite', capabilities: ['text-to-video', 'image-to-video'], description: '轻量版 · 5-10秒 720p' },
  { id: 'fofr/cogvideox-5b', name: 'CogVideoX-5B', capabilities: ['text-to-video', 'image-to-video'], description: '智谱 CogVideoX 5B' },
  { id: 'minimax/video-01', name: 'MiniMax Video-01', capabilities: ['text-to-video', 'image-to-video'], description: 'MiniMax 海螺AI' },
  { id: 'fofr/kling-v1', name: 'Kling v1', capabilities: ['text-to-video', 'image-to-video'], description: '快手 Kling' },
]

// 分辨率选项
export const RESOLUTIONS = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p (推荐)' },
]

// 时长选项
export const DURATIONS = [
  { value: 2, label: '2秒' },
  { value: 5, label: '5秒' },
  { value: 8, label: '8秒' },
  { value: 10, label: '10秒' },
  { value: 12, label: '12秒' },
]

const useVideoStore = create((set, get) => ({
  // 状态
  models: [],
  tasks: [],
  currentModel: 'bytedance/seedance-1.5-pro',
  loading: false,
  generating: false,
  error: null,
  apiKeyConfigured: false,

  // 加载模型列表
  loadModels: async () => {
    try {
      const res = await fetch(`${API_BASE}/video/models`)
      const data = await res.json()
      if (data.success) {
        set({ models: data.data })
      }
    } catch (error) {
      console.error('Failed to load video models:', error)
    }
  },

  // 通用视频生成
  generateVideo: async (opts) => {
    set({ generating: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts)
      })
      const data = await res.json()
      if (data.success) {
        set({ generating: false })
        // 刷新任务列表
        get().loadTasks()
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ generating: false, error: error.message })
      throw error
    }
  },

  // Seedance 文生视频
  seedanceT2V: async (opts) => {
    set({ generating: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/video/seedance/t2v`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts)
      })
      const data = await res.json()
      if (data.success) {
        set({ generating: false })
        get().loadTasks()
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ generating: false, error: error.message })
      throw error
    }
  },

  // Seedance 图生视频
  seedanceI2V: async (opts) => {
    set({ generating: true, error: null })
    try {
      const res = await fetch(`${API_BASE}/video/seedance/i2v`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts)
      })
      const data = await res.json()
      if (data.success) {
        set({ generating: false })
        get().loadTasks()
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ generating: false, error: error.message })
      throw error
    }
  },

  // 加载任务列表
  loadTasks: async () => {
    try {
      const res = await fetch(`${API_BASE}/video/tasks`)
      const data = await res.json()
      if (data.success) {
        set({ tasks: data.data })
      }
    } catch (error) {
      console.error('Failed to load video tasks:', error)
    }
  },

  // 获取单个任务状态
  getTaskStatus: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/video/tasks/${id}`)
      const data = await res.json()
      if (data.success) {
        // 更新任务列表中的对应任务
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? data.data : t)
        }))
        return data.data
      }
    } catch (error) {
      console.error('Failed to get task status:', error)
    }
  },

  // 取消任务
  cancelTask: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/video/tasks/${id}/cancel`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        set(state => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, status: 'canceled' } : t)
        }))
      }
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  },

  // 删除任务
  deleteTask: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/video/tasks/${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        set(state => ({
          tasks: state.tasks.filter(t => t.id !== id)
        }))
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  },

  // 等待任务完成
  waitForTask: async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/video/seedance/wait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })
      const data = await res.json()
      if (data.success) {
        get().loadTasks()
        return data.data
      }
    } catch (error) {
      console.error('Failed to wait for task:', error)
    }
  },

  // 设置 API Key
  setApiKey: async (apiKey) => {
    try {
      const res = await fetch(`${API_BASE}/video/auth/apikey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'replicate', apiKey })
      })
      const data = await res.json()
      if (data.success) {
        set({ apiKeyConfigured: true, error: null })
        return { success: true }
      } else {
        set({ error: data.error })
        return { success: false, error: data.error }
      }
    } catch (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
  },

  // 设置当前模型
  setModel: (model) => {
    set({ currentModel: model })
  },

  // 清除错误
  clearError: () => {
    set({ error: null })
  }
}))

export default useVideoStore
