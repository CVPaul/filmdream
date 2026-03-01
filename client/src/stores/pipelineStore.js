import { create } from 'zustand'

const API_BASE = '/api'

const usePipelineStore = create((set, get) => ({
  // State
  pipelines: [],
  currentPipeline: null,
  sseConnection: null,
  isStreaming: false,
  error: null,

  // Actions
  startPipeline: async (concept, brief = null) => {
    set({ error: null })
    try {
      const response = await fetch(`${API_BASE}/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, brief })
      })
      const data = await response.json()
      if (data.success) {
        await get().loadPipelines()
        return data.data.pipelineId
      } else {
        set({ error: data.error })
        return null
      }
    } catch (err) {
      set({ error: err.message })
      return null
    }
  },

  loadPipelines: async () => {
    try {
      const response = await fetch(`${API_BASE}/pipeline`)
      const data = await response.json()
      if (data.success) {
        set({ pipelines: data.data })
      }
    } catch (err) {
      set({ error: err.message })
    }
  },

  loadPipelineStatus: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/pipeline/${id}/status`)
      const data = await response.json()
      if (data.success) {
        set({ currentPipeline: data.data })
        return data.data
      }
    } catch (err) {
      set({ error: err.message })
    }
    return null
  },

  connectSSE: (pipelineId) => {
    const { disconnectSSE } = get()
    disconnectSSE()  // Close any existing connection

    const es = new EventSource(`${API_BASE}/pipeline/${pipelineId}/stream`)
    set({ sseConnection: es, isStreaming: true })

    const handleTaskStarted = (e) => {
      const payload = JSON.parse(e.data)
      set(state => {
        if (!state.currentPipeline) return {}
        const phases = state.currentPipeline.phases?.map(phase => {
          if (phase.id !== payload.phaseId) return phase
          const tasks = phase.tasks?.map(t => t.id === payload.taskId ? { ...t, status: 'running' } : t)
          return { ...phase, tasks }
        })
        return { currentPipeline: { ...state.currentPipeline, phases } }
      })
    }

    const handleTaskCompleted = (e) => {
      const payload = JSON.parse(e.data)
      set(state => {
        if (!state.currentPipeline) return {}
        const phases = state.currentPipeline.phases?.map(phase => {
          if (phase.id !== payload.phaseId) return phase
          const tasks = phase.tasks?.map(t => t.id === payload.taskId ? { ...t, status: 'completed', result: payload.result } : t)
          return { ...phase, tasks }
        })
        return { currentPipeline: { ...state.currentPipeline, phases } }
      })
    }

    const handleTaskFailed = (e) => {
      const payload = JSON.parse(e.data)
      set(state => {
        if (!state.currentPipeline) return {}
        const phases = state.currentPipeline.phases?.map(phase => {
          if (phase.id !== payload.phaseId) return phase
          const tasks = phase.tasks?.map(t => t.id === payload.taskId ? { ...t, status: 'failed', error: payload.error } : t)
          return { ...phase, tasks }
        })
        return { currentPipeline: { ...state.currentPipeline, phases } }
      })
    }

    const handlePipelineCompleted = (e) => {
      const payload = JSON.parse(e.data)
      set(state => ({
        currentPipeline: state.currentPipeline ? { ...state.currentPipeline, status: 'completed' } : null,
        isStreaming: false
      }))
      disconnectSSE()
      get().loadPipelines()
    }

    const handlePipelineFailed = (e) => {
      set(state => ({
        currentPipeline: state.currentPipeline ? { ...state.currentPipeline, status: 'failed' } : null,
        isStreaming: false,
        error: 'Pipeline failed'
      }))
      disconnectSSE()
    }

    es.addEventListener('task:started', handleTaskStarted)
    es.addEventListener('task:completed', handleTaskCompleted)
    es.addEventListener('task:failed', handleTaskFailed)
    es.addEventListener('pipeline:completed', handlePipelineCompleted)
    es.addEventListener('pipeline:failed', handlePipelineFailed)

    es.onerror = () => {
      set({ isStreaming: false })
      es.close()
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (get().currentPipeline?.id === pipelineId) {
          get().connectSSE(pipelineId)
        }
      }, 3000)
    }
  },

  disconnectSSE: () => {
    const { sseConnection } = get()
    if (sseConnection) {
      sseConnection.close()
      set({ sseConnection: null, isStreaming: false })
    }
  },

  restartPhase: async (pipelineId, phaseId) => {
    try {
      const response = await fetch(`${API_BASE}/pipeline/${pipelineId}/restart-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseId })
      })
      const data = await response.json()
      if (data.success) {
        await get().loadPipelineStatus(pipelineId)
        get().connectSSE(pipelineId)
      } else {
        set({ error: data.error })
      }
    } catch (err) {
      set({ error: err.message })
    }
  },

  cancelPipeline: async (pipelineId) => {
    try {
      const response = await fetch(`${API_BASE}/pipeline/${pipelineId}/cancel`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        get().disconnectSSE()
        await get().loadPipelines()
      } else {
        set({ error: data.error })
      }
    } catch (err) {
      set({ error: err.message })
    }
  },

  setCurrentPipeline: (pipeline) => set({ currentPipeline: pipeline }),
  clearError: () => set({ error: null }),
}))

export default usePipelineStore
