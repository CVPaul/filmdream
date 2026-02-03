import { create } from 'zustand'

const API_BASE = 'http://localhost:3001/api'

// 语音风格选项
export const VOICE_STYLES = [
  { value: 'neutral', label: '中性', description: '平静自然的语调' },
  { value: 'cheerful', label: '欢快', description: '充满活力和热情' },
  { value: 'sad', label: '悲伤', description: '低沉忧郁的情绪' },
  { value: 'angry', label: '愤怒', description: '激动强烈的表达' },
  { value: 'fearful', label: '恐惧', description: '紧张害怕的语气' },
  { value: 'serious', label: '严肃', description: '庄重正式的风格' },
  { value: 'excited', label: '激动', description: '兴奋高涨的状态' },
  { value: 'whisper', label: '低语', description: '轻声细语' },
  { value: 'shouting', label: '呐喊', description: '大声呼喊' },
]

// 语速选项
export const SPEECH_RATES = [
  { value: 'x-slow', label: '极慢', multiplier: 0.5 },
  { value: 'slow', label: '慢速', multiplier: 0.75 },
  { value: 'medium', label: '正常', multiplier: 1.0 },
  { value: 'fast', label: '快速', multiplier: 1.25 },
  { value: 'x-fast', label: '极快', multiplier: 1.5 },
]

// 配音类型
export const VOICEOVER_TYPES = [
  { value: 'dialogue', label: '对白', icon: '💬', description: '角色之间的对话' },
  { value: 'monologue', label: '独白', icon: '💭', description: '角色内心独白' },
  { value: 'narration', label: '旁白', icon: '📖', description: '场景解说或叙述' },
  { value: 'sfx', label: '音效描述', icon: '🔊', description: '需要的音效说明' },
]

const useVoiceoverStore = create((set, get) => ({
  // 角色音色配置
  voiceProfiles: [],
  // 配音条目
  voiceovers: [],
  // 当前选中
  currentVoiceover: null,
  
  loading: false,
  error: null,

  // 获取所有角色音色配置
  fetchVoiceProfiles: async () => {
    set({ loading: true })
    try {
      const res = await fetch(`${API_BASE}/voiceovers/profiles`)
      const data = await res.json()
      set({ voiceProfiles: data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  // 创建/更新角色音色配置
  saveVoiceProfile: async (characterId, profileData) => {
    try {
      const res = await fetch(`${API_BASE}/voiceovers/profiles/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })
      const data = await res.json()
      
      set(state => {
        const exists = state.voiceProfiles.find(p => p.characterId === characterId)
        if (exists) {
          return {
            voiceProfiles: state.voiceProfiles.map(p =>
              p.characterId === characterId ? data : p
            )
          }
        }
        return { voiceProfiles: [...state.voiceProfiles, data] }
      })
      
      return data
    } catch (error) {
      throw error
    }
  },

  // 获取所有配音条目
  fetchVoiceovers: async (shotId = null) => {
    set({ loading: true })
    try {
      const url = shotId 
        ? `${API_BASE}/voiceovers?shotId=${shotId}`
        : `${API_BASE}/voiceovers`
      const res = await fetch(url)
      const data = await res.json()
      set({ voiceovers: data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  // 创建配音条目
  createVoiceover: async (voiceoverData) => {
    try {
      const res = await fetch(`${API_BASE}/voiceovers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voiceoverData)
      })
      const data = await res.json()
      set(state => ({ voiceovers: [...state.voiceovers, data] }))
      return data
    } catch (error) {
      throw error
    }
  },

  // 更新配音条目
  updateVoiceover: async (id, updates) => {
    try {
      const res = await fetch(`${API_BASE}/voiceovers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      set(state => ({
        voiceovers: state.voiceovers.map(v => v.id === id ? data : v),
        currentVoiceover: state.currentVoiceover?.id === id ? data : state.currentVoiceover
      }))
      return data
    } catch (error) {
      throw error
    }
  },

  // 删除配音条目
  deleteVoiceover: async (id) => {
    try {
      await fetch(`${API_BASE}/voiceovers/${id}`, { method: 'DELETE' })
      set(state => ({
        voiceovers: state.voiceovers.filter(v => v.id !== id),
        currentVoiceover: state.currentVoiceover?.id === id ? null : state.currentVoiceover
      }))
    } catch (error) {
      throw error
    }
  },

  // 上传音频文件
  uploadAudio: async (id, file) => {
    try {
      const formData = new FormData()
      formData.append('audio', file)
      
      const res = await fetch(`${API_BASE}/voiceovers/${id}/audio`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      set(state => ({
        voiceovers: state.voiceovers.map(v => v.id === id ? { ...v, ...data } : v)
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },

  // 生成TTS提示词
  generateTTSPrompt: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/voiceovers/${id}/generate-tts`, {
        method: 'POST'
      })
      const data = await res.json()
      
      set(state => ({
        voiceovers: state.voiceovers.map(v => v.id === id ? { ...v, ttsPrompt: data.ttsPrompt } : v)
      }))
      
      return data
    } catch (error) {
      throw error
    }
  },

  // 重新排序配音
  reorderVoiceovers: async (shotId, order) => {
    try {
      await fetch(`${API_BASE}/voiceovers/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId, order })
      })
      get().fetchVoiceovers(shotId)
    } catch (error) {
      throw error
    }
  },

  setCurrentVoiceover: (voiceover) => set({ currentVoiceover: voiceover }),
}))

export default useVoiceoverStore
