/**
 * 3D Assets Store - 管理 3D 资产状态
 */

import { create } from 'zustand'

const API_BASE = '/api'

const useAssets3dStore = create((set, get) => ({
  // 状态
  assets: [],
  currentAsset: null,
  isLoading: false,
  error: null,
  
  // 筛选条件
  filters: {
    type: null,
    status: null,
    characterId: null
  },
  
  // 统计
  stats: null,
  
  // 加载所有 3D 资产
  loadAssets: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      const mergedFilters = { ...get().filters, ...filters }
      
      if (mergedFilters.type) params.append('type', mergedFilters.type)
      if (mergedFilters.status) params.append('status', mergedFilters.status)
      if (mergedFilters.characterId) params.append('characterId', mergedFilters.characterId)
      
      const url = `${API_BASE}/assets3d${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        set({ 
          assets: data.data, 
          isLoading: false,
          filters: mergedFilters
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },
  
  // 加载单个资产详情
  loadAsset: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE}/assets3d/${id}`)
      const data = await response.json()
      
      if (data.success) {
        set({ currentAsset: data.data, isLoading: false })
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },
  
  // 创建 3D 资产（元数据）
  createAsset: async (assetData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE}/assets3d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      })
      const data = await response.json()
      
      if (data.success) {
        set(state => ({
          assets: [data.data, ...state.assets],
          isLoading: false
        }))
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },
  
  // 上传 3D 模型文件
  uploadAsset: async (file, metadata = {}) => {
    set({ isLoading: true, error: null })
    try {
      const formData = new FormData()
      formData.append('model', file)
      
      if (metadata.name) formData.append('name', metadata.name)
      if (metadata.description) formData.append('description', metadata.description)
      if (metadata.type) formData.append('type', metadata.type)
      if (metadata.characterId) formData.append('characterId', metadata.characterId)
      if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags))
      
      const response = await fetch(`${API_BASE}/assets3d/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      
      if (data.success) {
        set(state => ({
          assets: [data.data, ...state.assets],
          isLoading: false
        }))
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },
  
  // 更新 3D 资产
  updateAsset: async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE}/assets3d/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await response.json()
      
      if (data.success) {
        set(state => ({
          assets: state.assets.map(a => a.id === id ? { ...a, ...data.data } : a),
          currentAsset: state.currentAsset?.id === id 
            ? { ...state.currentAsset, ...data.data }
            : state.currentAsset
        }))
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message })
      return null
    }
  },
  
  // 删除 3D 资产
  deleteAsset: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/assets3d/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        set(state => ({
          assets: state.assets.filter(a => a.id !== id),
          currentAsset: state.currentAsset?.id === id ? null : state.currentAsset
        }))
        return true
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message })
      return false
    }
  },
  
  // 从图片生成 3D 模型
  generateFromImage: async (imageId, options = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`${API_BASE}/assets3d/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          ...options
        })
      })
      const data = await response.json()
      
      if (data.success) {
        set(state => ({
          assets: [data.data, ...state.assets],
          isLoading: false
        }))
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },
  
  // 添加渲染变体
  addVariant: async (assetId, variantData) => {
    try {
      const response = await fetch(`${API_BASE}/assets3d/${assetId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantData)
      })
      const data = await response.json()
      
      if (data.success) {
        // 更新当前资产的变体列表
        if (get().currentAsset?.id === assetId) {
          set(state => ({
            currentAsset: {
              ...state.currentAsset,
              variants: [...(state.currentAsset.variants || []), data.data]
            }
          }))
        }
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message })
      return null
    }
  },
  
  // 删除渲染变体
  deleteVariant: async (assetId, variantId) => {
    try {
      const response = await fetch(`${API_BASE}/assets3d/${assetId}/variants/${variantId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        if (get().currentAsset?.id === assetId) {
          set(state => ({
            currentAsset: {
              ...state.currentAsset,
              variants: (state.currentAsset.variants || []).filter(v => v.id !== variantId)
            }
          }))
        }
        return true
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message })
      return false
    }
  },
  
  // 加载统计
  loadStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/assets3d/stats`)
      const data = await response.json()
      
      if (data.success) {
        set({ stats: data.data })
        return data.data
      }
    } catch (error) {
      console.error('Failed to load 3D stats:', error)
    }
    return null
  },
  
  // 设置筛选条件
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } })
  },
  
  // 清除筛选条件
  clearFilters: () => {
    set({ filters: { type: null, status: null, characterId: null } })
  },
  
  // 清除当前选中
  clearCurrentAsset: () => {
    set({ currentAsset: null })
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null })
  }
}))

export default useAssets3dStore
