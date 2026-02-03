import { create } from 'zustand'

// 镜头类型选项
export const SHOT_TYPES = [
  { value: 'extreme_wide', label: '超远景', description: '展示宏大场景' },
  { value: 'wide', label: '远景', description: '展示环境和角色关系' },
  { value: 'full', label: '全景', description: '展示角色全身' },
  { value: 'medium', label: '中景', description: '腰部以上' },
  { value: 'close_up', label: '特写', description: '头部或重要细节' },
  { value: 'extreme_close_up', label: '大特写', description: '眼睛或微小细节' },
  { value: 'over_shoulder', label: '过肩镜头', description: '从背后看向对象' },
  { value: 'pov', label: 'POV', description: '主观视角' },
  { value: 'low_angle', label: '仰拍', description: '从下往上，显得高大' },
  { value: 'high_angle', label: '俯拍', description: '从上往下，显得渺小' },
  { value: 'dutch_angle', label: '荷兰角', description: '倾斜镜头，营造紧张感' },
]

// 运镜方式选项
export const CAMERA_MOVEMENTS = [
  { value: 'static', label: '固定', description: '摄影机不动' },
  { value: 'pan', label: '水平摇摄', description: '左右摇动' },
  { value: 'tilt', label: '垂直摇摄', description: '上下摇动' },
  { value: 'dolly_in', label: '推进', description: '向前移动' },
  { value: 'dolly_out', label: '拉远', description: '向后移动' },
  { value: 'tracking', label: '跟踪', description: '跟随主体移动' },
  { value: 'crane', label: '升降', description: '垂直升降移动' },
  { value: 'handheld', label: '手持', description: '轻微晃动，真实感' },
  { value: 'zoom_in', label: '变焦推近', description: '镜头变焦放大' },
  { value: 'zoom_out', label: '变焦拉远', description: '镜头变焦缩小' },
  { value: 'orbit', label: '环绕', description: '围绕主体旋转' },
]

const useShotStore = create((set, get) => ({
  shots: [],
  currentShot: null,
  loading: false,
  error: null,
  
  // 获取所有镜头
  fetchShots: async (sceneId = null) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (sceneId) params.append('scene_id', sceneId)
      
      const res = await fetch(`/api/shots?${params}`)
      const data = await res.json()
      set({ shots: data, loading: false })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
  
  // 获取单个镜头
  fetchShot: async (id) => {
    try {
      const res = await fetch(`/api/shots/${id}`)
      const data = await res.json()
      set({ currentShot: data })
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 创建镜头
  createShot: async (shotData) => {
    try {
      const res = await fetch('/api/shots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shotData)
      })
      const data = await res.json()
      if (res.ok) {
        set(state => ({ shots: [...state.shots, data] }))
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 更新镜头
  updateShot: async (id, updates) => {
    try {
      const res = await fetch(`/api/shots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      
      set(state => ({
        shots: state.shots.map(s => s.id === id ? { ...s, ...data } : s),
        currentShot: state.currentShot?.id === id 
          ? { ...state.currentShot, ...data }
          : state.currentShot
      }))
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 删除镜头
  deleteShot: async (id) => {
    try {
      await fetch(`/api/shots/${id}`, { method: 'DELETE' })
      set(state => ({
        shots: state.shots.filter(s => s.id !== id),
        currentShot: state.currentShot?.id === id ? null : state.currentShot
      }))
    } catch (error) {
      throw error
    }
  },
  
  // 重新排序镜头
  reorderShots: async (order) => {
    try {
      // 先更新本地状态
      set(state => {
        const orderMap = new Map(order.map(o => [o.id, o.orderIndex]))
        const sorted = [...state.shots].map(s => ({
          ...s,
          orderIndex: orderMap.get(s.id) ?? s.orderIndex
        })).sort((a, b) => a.orderIndex - b.orderIndex)
        return { shots: sorted }
      })
      
      // 然后保存到后端
      await fetch('/api/shots/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      })
    } catch (error) {
      // 如果失败，重新获取
      get().fetchShots()
      throw error
    }
  },
  
  // 生成提示词
  generatePrompt: async (id) => {
    try {
      const res = await fetch(`/api/shots/${id}/generate-prompt`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        set(state => ({
          shots: state.shots.map(s => 
            s.id === id ? { ...s, generatedPrompt: data.prompt } : s
          ),
          currentShot: state.currentShot?.id === id 
            ? { ...state.currentShot, generatedPrompt: data.prompt }
            : state.currentShot
        }))
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 添加角色到镜头
  addCharacterToShot: async (shotId, characterId, action) => {
    try {
      const res = await fetch(`/api/shots/${shotId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, action })
      })
      const data = await res.json()
      if (data.success) {
        get().fetchShot(shotId)
        get().fetchShots()
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 设置当前镜头
  setCurrentShot: (shot) => set({ currentShot: shot }),
  
  // 清除当前镜头
  clearCurrentShot: () => set({ currentShot: null }),
}))

export default useShotStore
