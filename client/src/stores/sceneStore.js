import { create } from 'zustand'

// 环境类型选项
export const ENVIRONMENTS = [
  { value: 'city', label: '城市', icon: '🏙️' },
  { value: 'downtown', label: '市中心', icon: '🌆' },
  { value: 'industrial', label: '工业区', icon: '🏭' },
  { value: 'harbor', label: '港口', icon: '⚓' },
  { value: 'bridge', label: '大桥', icon: '🌉' },
  { value: 'mountain', label: '山地', icon: '⛰️' },
  { value: 'ocean', label: '海洋', icon: '🌊' },
  { value: 'sky', label: '天空', icon: '☁️' },
  { value: 'space', label: '太空', icon: '🚀' },
  { value: 'underground', label: '地下', icon: '🕳️' },
]

// 时间选项
export const TIME_OF_DAY = [
  { value: 'dawn', label: '黎明', icon: '🌅' },
  { value: 'day', label: '白天', icon: '☀️' },
  { value: 'dusk', label: '黄昏', icon: '🌇' },
  { value: 'night', label: '夜晚', icon: '🌙' },
]

// 天气选项
export const WEATHER = [
  { value: 'clear', label: '晴朗', icon: '☀️' },
  { value: 'cloudy', label: '多云', icon: '⛅' },
  { value: 'rain', label: '雨天', icon: '🌧️' },
  { value: 'storm', label: '暴风雨', icon: '⛈️' },
  { value: 'snow', label: '雪', icon: '❄️' },
  { value: 'fog', label: '雾', icon: '🌫️' },
]

// 氛围选项
export const ATMOSPHERES = [
  { value: 'tense', label: '紧张' },
  { value: 'epic', label: '史诗' },
  { value: 'dramatic', label: '戏剧性' },
  { value: 'peaceful', label: '平静' },
  { value: 'chaotic', label: '混乱' },
  { value: 'mysterious', label: '神秘' },
]

const useSceneStore = create((set, get) => ({
  scenes: [],
  currentScene: null,
  loading: false,
  error: null,
  
  // 获取所有场景
  fetchScenes: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/scenes')
      const data = await res.json()
      set({ scenes: data, loading: false })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
  
  // 获取单个场景
  fetchScene: async (id) => {
    try {
      const res = await fetch(`/api/scenes/${id}`)
      const data = await res.json()
      set({ currentScene: data })
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 创建场景
  createScene: async (sceneData) => {
    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sceneData)
      })
      const data = await res.json()
      if (res.ok) {
        set(state => ({ scenes: [data, ...state.scenes] }))
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 更新场景
  updateScene: async (id, updates) => {
    try {
      const res = await fetch(`/api/scenes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      
      set(state => ({
        scenes: state.scenes.map(s => s.id === id ? { ...s, ...data } : s),
        currentScene: state.currentScene?.id === id 
          ? { ...state.currentScene, ...data }
          : state.currentScene
      }))
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 删除场景
  deleteScene: async (id) => {
    try {
      await fetch(`/api/scenes/${id}`, { method: 'DELETE' })
      set(state => ({
        scenes: state.scenes.filter(s => s.id !== id),
        currentScene: state.currentScene?.id === id ? null : state.currentScene
      }))
    } catch (error) {
      throw error
    }
  },
  
  // 添加角色到场景
  addCharacterToScene: async (sceneId, characterId, position, role) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, position, role })
      })
      const data = await res.json()
      if (data.success) {
        // 刷新场景
        get().fetchScene(sceneId)
        get().fetchScenes()
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 从场景移除角色
  removeCharacterFromScene: async (sceneId, characterId) => {
    try {
      await fetch(`/api/scenes/${sceneId}/characters/${characterId}`, { 
        method: 'DELETE' 
      })
      // 刷新场景
      get().fetchScene(sceneId)
      get().fetchScenes()
    } catch (error) {
      throw error
    }
  },
  
  // 设置当前场景
  setCurrentScene: (scene) => set({ currentScene: scene }),
  
  // 清除当前场景
  clearCurrentScene: () => set({ currentScene: null }),
}))

export default useSceneStore
