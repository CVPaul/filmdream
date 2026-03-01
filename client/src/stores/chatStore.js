/**
 * Chat Store - 管理 AI 对话状态
 */

import { create } from 'zustand'

const API_BASE = '/api'

const useChatStore = create((set, get) => ({
  // 状态
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  
  // 会话管理
  conversations: [],
  currentConversationId: null,
  isLoadingConversations: false,
  
  // Provider/Model 配置
  providers: [],
  models: [],
  currentProvider: 'github-copilot',
  currentModel: 'gpt-4o',
  authStatus: {},
  
  // OAuth 状态
  deviceFlowInfo: null,
  isAuthenticating: false,
  
  // 工具调用历史
  toolCallHistory: [],
  
  // Agent 配置
  agents: [],
  currentAgentId: 'director',
  
  // ==================== 会话管理 ====================
  
  // 加载所有会话
  loadConversations: async () => {
    set({ isLoadingConversations: true })
    try {
      const response = await fetch(`${API_BASE}/llm/conversations`)
      const data = await response.json()
      if (data.success) {
        set({ conversations: data.data, isLoadingConversations: false })
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      set({ isLoadingConversations: false })
    }
  },
  
  // 创建新会话
  createConversation: async (title = '新对话') => {
    try {
      const { currentProvider, currentModel } = get()
      const response = await fetch(`${API_BASE}/llm/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          provider: currentProvider,
          model: currentModel
        })
      })
      const data = await response.json()
      if (data.success) {
        set(state => ({
          conversations: [data.data, ...state.conversations],
          currentConversationId: data.data.id,
          messages: [],
          toolCallHistory: []
        }))
        return data.data
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
    return null
  },
  
  // 选择会话（加载消息）
  selectConversation: async (conversationId) => {
    if (conversationId === null) {
      set({ currentConversationId: null, messages: [], toolCallHistory: [] })
      return
    }
    
    set({ isLoading: true })
    try {
      const response = await fetch(`${API_BASE}/llm/conversations/${conversationId}`)
      const data = await response.json()
      if (data.success) {
        // 转换消息格式
        const messages = (data.data.messages || []).map(m => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
          toolCalls: m.toolCalls
        }))
        
        set({ 
          currentConversationId: conversationId,
          messages,
          toolCallHistory: [],
          isLoading: false
        })
      }
    } catch (error) {
      console.error('Failed to select conversation:', error)
      set({ isLoading: false })
    }
  },
  
  // 更新会话标题
  updateConversationTitle: async (conversationId, title) => {
    try {
      const response = await fetch(`${API_BASE}/llm/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      const data = await response.json()
      if (data.success) {
        set(state => ({
          conversations: state.conversations.map(c => 
            c.id === conversationId ? { ...c, title } : c
          )
        }))
      }
    } catch (error) {
      console.error('Failed to update conversation:', error)
    }
  },
  
  // 删除会话
  deleteConversation: async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE}/llm/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        const { currentConversationId } = get()
        set(state => ({
          conversations: state.conversations.filter(c => c.id !== conversationId),
          // 如果删除的是当前会话，清空状态
          ...(currentConversationId === conversationId ? {
            currentConversationId: null,
            messages: [],
            toolCallHistory: []
          } : {})
        }))
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  },
  
  // 开始新对话（不持久化，只清空当前状态）
  startNewChat: () => {
    set({ 
      currentConversationId: null, 
      messages: [], 
      toolCallHistory: [],
      error: null 
    })
  },
  
  // ==================== Agent 管理 ====================
  
  // 加载 Agent 列表
  loadAgents: async () => {
    try {
      const response = await fetch(`${API_BASE}/agents`)
      const data = await response.json()
      if (data.success) {
        set({ agents: data.data.all || [] })
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  },
  
  // 设置当前 Agent
  setAgent: (agentId) => {
    set({ currentAgentId: agentId })
  },
  
  // ==================== Provider 管理 ====================
  
  // 加载 Provider 列表
  loadProviders: async () => {
    try {
      const response = await fetch(`${API_BASE}/llm/providers`)
      const data = await response.json()
      if (data.success) {
        set({ providers: data.data })
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  },
  
  // 加载模型列表
  loadModels: async () => {
    try {
      const response = await fetch(`${API_BASE}/llm/models`)
      const data = await response.json()
      if (data.success) {
        const { currentProvider, currentModel } = get()
        // 只有当前没有设置 provider/model 时才使用默认值
        const newState = { models: data.data }
        const allModelIds = data.data.flatMap(pm => pm.models.map(m => m.id))
        if (!currentProvider || !data.data.some(pm => pm.provider === currentProvider)) {
          newState.currentProvider = data.defaults?.provider || 'github-copilot'
        }
        if (!currentModel || !allModelIds.includes(currentModel)) {
          newState.currentModel = data.defaults?.model || 'gpt-4o'
        }
        set(newState)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  },
  
  // 检查认证状态
  checkAuthStatus: async () => {
    try {
      const response = await fetch(`${API_BASE}/llm/auth/status`)
      const data = await response.json()
      if (data.success) {
        set({ authStatus: data.data })
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
    }
  },
  
  // 开始 Device Flow 认证（通过后端调用 GitHub API）
  startAuth: async (provider) => {
    set({ isAuthenticating: true, error: null })
    
    try {
      const response = await fetch(`${API_BASE}/llm/auth/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })
      const data = await response.json()
      if (data.success) {
        set({ deviceFlowInfo: data.data })
        return data.data
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isAuthenticating: false })
      throw error
    }
  },
  
  // 轮询认证状态（通过后端轮询 GitHub API）
  pollAuth: async (provider, deviceCode) => {
    try {
      const response = await fetch(`${API_BASE}/llm/auth/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, deviceCode })
      })
      const data = await response.json()
      if (data.success) {
        if (data.data.status === 'success') {
          set({ 
            isAuthenticating: false, 
            deviceFlowInfo: null,
            authStatus: { ...get().authStatus, [provider]: true }
          })
          get().loadModels()
        }
        return data.data
      }
      return { status: 'error', message: data.error }
    } catch (error) {
      return { status: 'error', message: error.message }
    }
  },
  
  // 登出
  logout: async (provider) => {
    try {
      await fetch(`${API_BASE}/llm/auth/${provider}`, { method: 'DELETE' })
      set({ 
        authStatus: { ...get().authStatus, [provider]: false },
        models: []
      })
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  },
  
  // 手动设置 Token（用于网络问题无法完成 OAuth 时）
  setManualToken: async (provider, accessToken) => {
    try {
      const response = await fetch(`${API_BASE}/llm/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, accessToken })
      })
      const data = await response.json()
      if (data.success) {
        set({ 
          authStatus: { ...get().authStatus, [provider]: true },
          isAuthenticating: false,
          deviceFlowInfo: null
        })
        get().loadModels()
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
  
  // 设置 API Key（用于 GLM/Qwen/DeepSeek/OpenAI/Anthropic 等）
  setApiKey: async (provider, apiKey) => {
    try {
      const response = await fetch(`${API_BASE}/llm/auth/apikey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey })
      })
      const data = await response.json()
      if (data.success) {
        set({ 
          authStatus: { ...get().authStatus, [provider]: true }
        })
        get().loadModels()
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },
  
  // 设置当前模型
  setModel: (provider, model) => {
    set({ currentProvider: provider, currentModel: model })
  },
  
  // 添加用户消息
  addUserMessage: (content) => {
    const message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    set(state => ({ messages: [...state.messages, message] }))
    return message
  },
  
  // 发送消息（完整对话循环）
  sendMessage: async (content) => {
    const { currentProvider, currentModel, messages, currentConversationId } = get()
    
    // 如果没有当前会话，先创建一个
    let conversationId = currentConversationId
    if (!conversationId) {
      const newConv = await get().createConversation()
      if (newConv) {
        conversationId = newConv.id
      }
    }
    
    // 添加用户消息
    get().addUserMessage(content)
    
    set({ isLoading: true, error: null, toolCallHistory: [] })
    
    try {
      // 准备消息（只发送 role 和 content）
      const apiMessages = [...messages, { role: 'user', content }].map(m => ({
        role: m.role,
        content: m.content
      }))
      
      const response = await fetch(`${API_BASE}/llm/chat/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: currentProvider,
          model: currentModel,
          messages: apiMessages,
          conversationId,
          agentId: get().currentAgentId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // 添加 AI 回复
        const aiMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.data.content,
          timestamp: new Date().toISOString(),
          toolCalls: data.data.toolCallHistory
        }
        set(state => ({ 
          messages: [...state.messages, aiMessage],
          toolCallHistory: data.data.toolCallHistory || [],
          isLoading: false
        }))
        
        // 刷新会话列表以获取更新的标题
        get().loadConversations()
        
        return aiMessage
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  // 流式发送消息
  sendMessageStream: async (content) => {
    const { currentProvider, currentModel, messages, currentConversationId } = get()
    
    // 如果没有当前会话，先创建一个
    let conversationId = currentConversationId
    if (!conversationId) {
      const newConv = await get().createConversation()
      if (newConv) {
        conversationId = newConv.id
      }
    }
    
    // 添加用户消息
    get().addUserMessage(content)
    
    set({ isStreaming: true, error: null, toolCallHistory: [] })
    
    // 创建一个占位的 AI 消息
    const aiMessageId = Date.now().toString()
    const aiMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolCalls: [],
      isStreaming: true
    }
    set(state => ({ messages: [...state.messages, aiMessage] }))
    
    try {
      const apiMessages = [...messages, { role: 'user', content }].map(m => ({
        role: m.role,
        content: m.content
      }))
      
      const response = await fetch(`${API_BASE}/llm/chat/complete/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: currentProvider,
          model: currentModel,
          messages: apiMessages,
          conversationId,
          agentId: get().currentAgentId
        })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            continue
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              
              // 处理不同类型的事件
              if (parsed.content) {
                // 更新消息内容
                set(state => ({
                  messages: state.messages.map(m => 
                    m.id === aiMessageId 
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                }))
              }
              
              if (parsed.id && parsed.name) {
                // 工具调用开始
                set(state => ({
                  toolCallHistory: [...state.toolCallHistory, {
                    id: parsed.id,
                    name: parsed.name,
                    arguments: parsed.arguments,
                    status: 'calling'
                  }]
                }))
              }
              
              if (parsed.result) {
                // 工具调用结果
                set(state => ({
                  toolCallHistory: state.toolCallHistory.map(tc =>
                    tc.id === parsed.id ? { ...tc, result: parsed.result, status: 'done' } : tc
                  )
                }))
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      // 标记流式结束
      set(state => ({
        messages: state.messages.map(m =>
          m.id === aiMessageId ? { ...m, isStreaming: false } : m
        ),
        isStreaming: false
      }))
      
      // 刷新会话列表
      get().loadConversations()
      
    } catch (error) {
      set({ error: error.message, isStreaming: false })
      throw error
    }
  },
  
  // 清空对话
  clearMessages: () => {
    set({ messages: [], toolCallHistory: [], error: null })
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null })
  }
}))

export default useChatStore
