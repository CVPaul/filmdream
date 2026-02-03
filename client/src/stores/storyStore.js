import { create } from 'zustand'

const useStoryStore = create((set, get) => ({
  chapters: [],
  currentChapter: null,
  loading: false,
  error: null,
  saving: false,
  hasUnsavedChanges: false,
  
  // 获取所有章节
  fetchChapters: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/story')
      const data = await res.json()
      set({ chapters: data, loading: false })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
  
  // 获取单个章节
  fetchChapter: async (id) => {
    try {
      const res = await fetch(`/api/story/${id}`)
      const data = await res.json()
      set({ currentChapter: data, hasUnsavedChanges: false })
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 设置当前章节
  setCurrentChapter: (chapter) => {
    set({ currentChapter: chapter, hasUnsavedChanges: false })
  },
  
  // 更新当前章节（本地）
  updateCurrentChapter: (updates) => {
    set(state => ({
      currentChapter: state.currentChapter 
        ? { ...state.currentChapter, ...updates }
        : null,
      hasUnsavedChanges: true
    }))
  },
  
  // 创建章节
  createChapter: async (chapterData) => {
    set({ saving: true })
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chapterData)
      })
      const data = await res.json()
      if (res.ok) {
        set(state => ({
          chapters: [...state.chapters, data],
          currentChapter: data,
          hasUnsavedChanges: false
        }))
      }
      return data
    } catch (error) {
      throw error
    } finally {
      set({ saving: false })
    }
  },
  
  // 保存章节
  saveChapter: async (id, updates) => {
    set({ saving: true })
    try {
      const res = await fetch(`/api/story/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      
      set(state => ({
        chapters: state.chapters.map(ch => 
          ch.id === id ? { ...ch, ...data } : ch
        ),
        currentChapter: state.currentChapter?.id === id 
          ? { ...state.currentChapter, ...data }
          : state.currentChapter,
        hasUnsavedChanges: false
      }))
      return data
    } catch (error) {
      throw error
    } finally {
      set({ saving: false })
    }
  },
  
  // 删除章节
  deleteChapter: async (id) => {
    try {
      await fetch(`/api/story/${id}`, { method: 'DELETE' })
      set(state => ({
        chapters: state.chapters.filter(ch => ch.id !== id),
        currentChapter: state.currentChapter?.id === id ? null : state.currentChapter
      }))
    } catch (error) {
      throw error
    }
  },
  
  // 重新排序章节
  reorderChapters: async (order) => {
    try {
      await fetch('/api/story/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      })
      // 更新本地排序
      set(state => {
        const orderMap = new Map(order.map(o => [o.id, o.orderIndex]))
        const sorted = [...state.chapters].sort((a, b) => 
          (orderMap.get(a.id) || a.orderIndex) - (orderMap.get(b.id) || b.orderIndex)
        )
        return { chapters: sorted }
      })
    } catch (error) {
      throw error
    }
  },
  
  // 清除未保存状态
  clearUnsavedChanges: () => set({ hasUnsavedChanges: false }),
}))

export default useStoryStore
