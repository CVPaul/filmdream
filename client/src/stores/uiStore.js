import { create } from 'zustand'

const useUIStore = create((set, get) => ({
  // Toast 通知
  toasts: [],
  
  addToast: (toast) => {
    const id = Date.now()
    const newToast = {
      id,
      type: 'info', // 'success' | 'error' | 'warning' | 'info'
      duration: 3000,
      ...toast,
    }
    
    set(state => ({
      toasts: [...state.toasts, newToast]
    }))
    
    // 自动移除
    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }
    
    return id
  },
  
  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },
  
  // 便捷方法
  success: (message) => get().addToast({ type: 'success', message }),
  error: (message) => get().addToast({ type: 'error', message, duration: 5000 }),
  warning: (message) => get().addToast({ type: 'warning', message }),
  info: (message) => get().addToast({ type: 'info', message }),

  // 全局加载状态
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}))

export default useUIStore
