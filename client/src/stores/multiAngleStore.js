/**
 * Multi-Angle Store - 多角度图像生成状态管理
 */

import { create } from 'zustand'

const API_BASE = 'http://localhost:3001/api'

const useMultiAngleStore = create((set, get) => ({
  // 状态
  config: null,
  presets: [],
  jobs: [],
  currentJob: null,
  isLoading: false,
  error: null,
  
  // 加载配置
  loadConfig: async () => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/config`)
      const data = await response.json()
      
      if (data.success) {
        set({ 
          config: data.data,
          presets: data.data.presets 
        })
        return data.data
      }
    } catch (error) {
      console.error('Failed to load multiangle config:', error)
    }
    return null
  },
  
  // 加载预设列表
  loadPresets: async () => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/presets`)
      const data = await response.json()
      
      if (data.success) {
        set({ presets: data.data })
        return data.data
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
    return []
  },
  
  // 获取预设详情
  getPresetDetail: async (presetId) => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/presets/${presetId}`)
      const data = await response.json()
      
      if (data.success) {
        return data.data
      }
    } catch (error) {
      console.error('Failed to get preset detail:', error)
    }
    return null
  },
  
  // 生成提示词
  generatePrompt: async (azimuth, elevation, distance) => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azimuth, elevation, distance })
      })
      const data = await response.json()
      
      if (data.success) {
        return data.data.prompt
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error)
    }
    return null
  },
  
  // 开始生成
  startGeneration: async (options) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE}/multiangle/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })
      const data = await response.json()
      
      if (data.success) {
        set({ isLoading: false })
        // 刷新任务列表
        get().loadJobs()
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },
  
  // 加载任务列表
  loadJobs: async () => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/jobs`)
      const data = await response.json()
      
      if (data.success) {
        set({ jobs: data.data })
        return data.data
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
    return []
  },
  
  // 获取任务详情
  loadJob: async (jobId) => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/jobs/${jobId}`)
      const data = await response.json()
      
      if (data.success) {
        set({ currentJob: data.data })
        
        // 更新 jobs 列表中的对应项
        set(state => ({
          jobs: state.jobs.map(j => 
            j.id === jobId ? { ...j, ...data.data } : j
          )
        }))
        
        return data.data
      }
    } catch (error) {
      console.error('Failed to load job:', error)
    }
    return null
  },
  
  // 删除任务
  deleteJob: async (jobId) => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/jobs/${jobId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        set(state => ({
          jobs: state.jobs.filter(j => j.id !== jobId),
          currentJob: state.currentJob?.id === jobId ? null : state.currentJob
        }))
        return true
      }
    } catch (error) {
      console.error('Failed to delete job:', error)
    }
    return false
  },
  
  // 保存到资产
  saveToAsset: async (jobId, assetId) => {
    try {
      const response = await fetch(`${API_BASE}/multiangle/save-to-asset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, assetId })
      })
      const data = await response.json()
      
      if (data.success) {
        return data.data
      }
    } catch (error) {
      console.error('Failed to save to asset:', error)
    }
    return null
  },
  
  // 清除当前任务
  clearCurrentJob: () => {
    set({ currentJob: null })
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null })
  }
}))

export default useMultiAngleStore
