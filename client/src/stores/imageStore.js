import { create } from 'zustand'

// 图片分类选项
export const IMAGE_CATEGORIES = [
  { value: 'mecha', label: '机甲', color: 'bg-blue-500' },
  { value: 'monster', label: '怪兽', color: 'bg-red-500' },
  { value: 'scene', label: '场景', color: 'bg-green-500' },
  { value: 'prop', label: '道具', color: 'bg-yellow-500' },
  { value: 'effect', label: '特效', color: 'bg-purple-500' },
  { value: 'uncategorized', label: '未分类', color: 'bg-gray-500' },
]

// 视图类型选项
export const VIEW_TYPES = [
  { value: 'front', label: '正面' },
  { value: 'side', label: '侧面' },
  { value: 'back', label: '背面' },
  { value: 'detail', label: '细节' },
  { value: 'action', label: '动作' },
  { value: 'expression', label: '表情' },
]

// 状态选项
export const IMAGE_STATUS = [
  { value: 'pending', label: '待定', color: 'bg-gray-500' },
  { value: 'adopted', label: '已采用', color: 'bg-green-500' },
  { value: 'rejected', label: '已废弃', color: 'bg-red-500' },
]

const useImageStore = create((set, get) => ({
  images: [],
  loading: false,
  error: null,
  filter: {
    category: 'all',
    status: 'all',
    search: '',
  },
  selectedImages: [],
  
  // 获取所有图片
  fetchImages: async () => {
    set({ loading: true, error: null })
    try {
      const { filter } = get()
      const params = new URLSearchParams()
      if (filter.category !== 'all') params.append('category', filter.category)
      if (filter.status !== 'all') params.append('status', filter.status)
      
      const res = await fetch(`/api/images?${params}`)
      const data = await res.json()
      set({ images: data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },
  
  // 上传图片
  uploadImages: async (files, onProgress) => {
    const formData = new FormData()
    for (const file of files) {
      formData.append('images', file)
    }
    
    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        // 刷新图片列表
        get().fetchImages()
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 更新图片
  updateImage: async (id, updates) => {
    try {
      const res = await fetch(`/api/images/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      
      // 更新本地状态
      set(state => ({
        images: state.images.map(img => 
          img.id === id ? { ...img, ...data } : img
        )
      }))
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 删除图片
  deleteImage: async (id) => {
    try {
      await fetch(`/api/images/${id}`, { method: 'DELETE' })
      set(state => ({
        images: state.images.filter(img => img.id !== id),
        selectedImages: state.selectedImages.filter(imgId => imgId !== id)
      }))
    } catch (error) {
      throw error
    }
  },
  
  // 批量更新
  batchUpdate: async (updates) => {
    const { selectedImages } = get()
    try {
      const res = await fetch('/api/images/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedImages, ...updates })
      })
      const data = await res.json()
      if (data.success) {
        get().fetchImages()
        set({ selectedImages: [] })
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 设置筛选条件
  setFilter: (newFilter) => {
    set(state => ({ filter: { ...state.filter, ...newFilter } }))
    get().fetchImages()
  },
  
  // 选择/取消选择图片
  toggleSelect: (id) => {
    set(state => ({
      selectedImages: state.selectedImages.includes(id)
        ? state.selectedImages.filter(imgId => imgId !== id)
        : [...state.selectedImages, id]
    }))
  },
  
  // 全选/取消全选
  toggleSelectAll: () => {
    set(state => ({
      selectedImages: state.selectedImages.length === state.images.length
        ? []
        : state.images.map(img => img.id)
    }))
  },
  
  // 清除选择
  clearSelection: () => set({ selectedImages: [] }),
}))

export default useImageStore
