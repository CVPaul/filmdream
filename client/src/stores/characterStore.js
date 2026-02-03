import { create } from 'zustand'

// 角色类型选项
export const CHARACTER_TYPES = [
  { value: 'mecha', label: '机甲', color: 'bg-blue-500', icon: '🤖' },
  { value: 'monster', label: '怪兽', color: 'bg-red-500', icon: '👾' },
  { value: 'human', label: '人物', color: 'bg-amber-500', icon: '👤' },
  { value: 'vehicle', label: '载具', color: 'bg-green-500', icon: '🚀' },
  { value: 'other', label: '其他', color: 'bg-gray-500', icon: '✨' },
]

const useCharacterStore = create((set, get) => ({
  characters: [],
  loading: false,
  error: null,
  filter: {
    type: 'all',
    search: '',
  },
  currentCharacter: null,
  
  // 获取所有角色
  fetchCharacters: async () => {
    set({ loading: true, error: null })
    try {
      const { filter } = get()
      const params = new URLSearchParams()
      if (filter.type !== 'all') params.append('type', filter.type)
      
      const res = await fetch(`/api/characters?${params}`)
      const data = await res.json()
      set({ characters: data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },
  
  // 获取单个角色详情
  fetchCharacter: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/characters/${id}`)
      const data = await res.json()
      set({ currentCharacter: data, loading: false })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
  
  // 创建角色
  createCharacter: async (characterData) => {
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterData)
      })
      const data = await res.json()
      if (res.ok) {
        // 刷新列表
        get().fetchCharacters()
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 更新角色
  updateCharacter: async (id, updates) => {
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      
      // 更新本地状态
      set(state => ({
        characters: state.characters.map(char => 
          char.id === id ? { ...char, ...data } : char
        ),
        currentCharacter: state.currentCharacter?.id === id 
          ? { ...state.currentCharacter, ...data }
          : state.currentCharacter
      }))
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 删除角色
  deleteCharacter: async (id) => {
    try {
      await fetch(`/api/characters/${id}`, { method: 'DELETE' })
      set(state => ({
        characters: state.characters.filter(char => char.id !== id),
        currentCharacter: state.currentCharacter?.id === id ? null : state.currentCharacter
      }))
    } catch (error) {
      throw error
    }
  },
  
  // 关联图片到角色
  linkImages: async (characterId, imageIds) => {
    try {
      const res = await fetch(`/api/characters/${characterId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds })
      })
      const data = await res.json()
      if (data.success) {
        // 刷新当前角色
        get().fetchCharacter(characterId)
        // 刷新角色列表
        get().fetchCharacters()
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 设置筛选条件
  setFilter: (newFilter) => {
    set(state => ({ filter: { ...state.filter, ...newFilter } }))
    get().fetchCharacters()
  },
  
  // 清除当前角色
  clearCurrentCharacter: () => set({ currentCharacter: null }),
}))

export default useCharacterStore
