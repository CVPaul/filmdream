import { create } from 'zustand'

// 转场类型选项
export const TRANSITION_TYPES = [
  { value: 'cut', label: '硬切', icon: '⚡', description: '直接切换，节奏紧凑' },
  { value: 'fade', label: '淡入淡出', icon: '🌫️', description: '渐变过渡，时间流逝' },
  { value: 'dissolve', label: '溶解', icon: '💨', description: '两个画面交融' },
  { value: 'wipe', label: '划变', icon: '➡️', description: '方向性转场' },
  { value: 'zoom', label: '变焦', icon: '🔍', description: '推拉镜头过渡' },
  { value: 'match', label: '匹配剪辑', icon: '🔗', description: '形状/动作匹配' },
  { value: 'flashback', label: '闪回', icon: '⏪', description: '回到过去' },
  { value: 'flashforward', label: '闪前', icon: '⏩', description: '跳到未来' },
]

// 连接条件类型
export const CONNECTION_CONDITIONS = [
  { value: 'sequential', label: '顺序', color: '#3B82F6', description: '按时间线顺序' },
  { value: 'branching', label: '分支', color: '#F59E0B', description: '多个可能的后续' },
  { value: 'parallel', label: '平行', color: '#10B981', description: '同时发生' },
  { value: 'conditional', label: '条件', color: '#8B5CF6', description: '根据剧情条件' },
]

const useSceneFlowStore = create((set, get) => ({
  // 节点（场景）
  nodes: [],
  // 边（连接）
  edges: [],
  // 选中的节点
  selectedNodeId: null,
  // 选中的边
  selectedEdgeId: null,
  // 连接模式
  connectingFrom: null,
  // 加载状态
  loading: false,
  error: null,
  // 画布缩放和偏移
  zoom: 1,
  panX: 0,
  panY: 0,
  
  // 获取流程图数据
  fetchFlowData: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/scene-flow')
      const data = await res.json()
      set({ 
        nodes: data.nodes || [], 
        edges: data.edges || [],
        loading: false 
      })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
  
  // 创建连接
  createConnection: async (sourceId, targetId, options = {}) => {
    try {
      const res = await fetch('/api/scene-flow/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          targetId,
          transitionType: options.transitionType || 'cut',
          condition: options.condition || 'sequential',
          description: options.description || null
        })
      })
      const data = await res.json()
      if (res.ok) {
        set(state => ({ edges: [...state.edges, data] }))
      } else {
        throw new Error(data.error)
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 更新连接
  updateConnection: async (id, updates) => {
    try {
      const res = await fetch(`/api/scene-flow/connections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (res.ok) {
        set(state => ({
          edges: state.edges.map(e => e.id === id ? { ...e, ...data } : e)
        }))
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 删除连接
  deleteConnection: async (id) => {
    try {
      await fetch(`/api/scene-flow/connections/${id}`, { method: 'DELETE' })
      set(state => ({
        edges: state.edges.filter(e => e.id !== id),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId
      }))
    } catch (error) {
      throw error
    }
  },
  
  // 更新节点位置
  updateNodePosition: async (sceneId, x, y) => {
    // 先更新本地状态
    set(state => ({
      nodes: state.nodes.map(n => n.id === sceneId ? { ...n, x, y } : n)
    }))
    
    // 异步保存到服务器
    try {
      await fetch(`/api/scene-flow/positions/${sceneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
      })
    } catch (error) {
      console.error('Failed to save position:', error)
    }
  },
  
  // 批量更新位置
  updatePositions: async (positions) => {
    try {
      await fetch('/api/scene-flow/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions })
      })
    } catch (error) {
      console.error('Failed to save positions:', error)
    }
  },
  
  // 自动布局
  autoLayout: async () => {
    try {
      const res = await fetch('/api/scene-flow/auto-layout', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        // 刷新数据
        get().fetchFlowData()
      }
      return data
    } catch (error) {
      throw error
    }
  },
  
  // 选中节点
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  
  // 选中边
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  
  // 清除选择
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
  
  // 开始连接
  startConnecting: (nodeId) => set({ connectingFrom: nodeId }),
  
  // 结束连接
  endConnecting: async (targetId) => {
    const { connectingFrom, createConnection } = get()
    if (connectingFrom && connectingFrom !== targetId) {
      try {
        await createConnection(connectingFrom, targetId)
      } catch (error) {
        console.error('Failed to create connection:', error)
      }
    }
    set({ connectingFrom: null })
  },
  
  // 取消连接
  cancelConnecting: () => set({ connectingFrom: null }),
  
  // 缩放
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),
  
  // 平移
  setPan: (x, y) => set({ panX: x, panY: y }),
  
  // 重置视图
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
}))

export default useSceneFlowStore
