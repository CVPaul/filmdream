import { create } from 'zustand'

const API_BASE = '/api'

const useTaskStore = create((set, get) => ({
  tasks: [],
  stats: { total: 0, pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 },
  loading: false,
  error: null,
  _pollTimer: null,

  loadTasks: async (filters = {}) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams(filters)
      const url = params.toString() ? `${API_BASE}/tasks?${params}` : `${API_BASE}/tasks`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) set({ tasks: data.data, error: null })
      else set({ error: data.error })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ loading: false })
    }
  },

  loadStats: async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks/stats`)
      const data = await res.json()
      if (data.success) set({ stats: data.data })
    } catch (err) {
      console.error('loadStats error:', err)
    }
  },

  cancelTask: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        await get().loadTasks()
        await get().loadStats()
      } else {
        set({ error: data.error })
      }
    } catch (err) {
      set({ error: err.message })
    }
  },

  retryTask: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}/retry`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        await get().loadTasks()
        await get().loadStats()
      } else {
        set({ error: data.error })
      }
    } catch (err) {
      set({ error: err.message })
    }
  },

  startPolling: () => {
    const { _pollTimer } = get()
    if (_pollTimer) return
    const timer = setInterval(async () => {
      await get().loadTasks()
      await get().loadStats()
      // Stop polling when no active tasks
      const { tasks } = get()
      const hasActive = tasks.some(t => t.status === 'running' || t.status === 'pending')
      if (!hasActive) get().stopPolling()
    }, 3000)
    set({ _pollTimer: timer })
  },

  stopPolling: () => {
    const { _pollTimer } = get()
    if (_pollTimer) {
      clearInterval(_pollTimer)
      set({ _pollTimer: null })
    }
  },

  clearError: () => set({ error: null }),
}))

export default useTaskStore
