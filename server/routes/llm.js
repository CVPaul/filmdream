/**
 * LLM API 路由
 * 处理 LLM Provider 管理、认证和聊天请求
 */

import express from 'express'
import providerManager from '../providers/index.js'
import { AGENT_ACTIONS, actionHandlers } from './agent.js'
import db, { getNextId, findById, deleteById } from '../db.js'
import skillManager from '../skills/index.js'
import agents from '../agents/index.js'

const router = express.Router()

// ==================== 对话会话管理 ====================

/**
 * GET /api/llm/conversations
 * 获取所有对话会话
 */
router.get('/conversations', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    
    // 确保集合存在
    if (!db.data.chatConversations) {
      db.data.chatConversations = []
    }
    
    const conversations = db.data.chatConversations
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(Number(offset), Number(offset) + Number(limit))
    
    res.json({
      success: true,
      data: conversations,
      total: db.data.chatConversations.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/llm/conversations
 * 创建新对话会话
 */
router.post('/conversations', async (req, res) => {
  try {
    const { title, skillId, provider, model } = req.body
    
    if (!db.data.chatConversations) {
      db.data.chatConversations = []
    }
    if (!db.data.chatMessages) {
      db.data.chatMessages = []
    }
    
    const conversation = {
      id: getNextId('chatConversations'),
      title: title || '新对话',
      skillId: skillId || null,
      provider: provider || providerManager.config.defaultProvider,
      model: model || providerManager.config.defaultModel,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    db.data.chatConversations.push(conversation)
    await db.write()
    
    res.json({
      success: true,
      data: conversation
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/llm/conversations/:id
 * 获取单个对话及其消息
 */
router.get('/conversations/:id', (req, res) => {
  try {
    const { id } = req.params
    
    if (!db.data.chatConversations) {
      db.data.chatConversations = []
    }
    if (!db.data.chatMessages) {
      db.data.chatMessages = []
    }
    
    const conversation = db.data.chatConversations.find(c => c.id === parseInt(id))
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      })
    }
    
    const messages = db.data.chatMessages
      .filter(m => m.conversationId === parseInt(id))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    
    res.json({
      success: true,
      data: {
        ...conversation,
        messages
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * PUT /api/llm/conversations/:id
 * 更新对话会话（标题等）
 */
router.put('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, skillId } = req.body
    
    const conversation = db.data.chatConversations?.find(c => c.id === parseInt(id))
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      })
    }
    
    if (title !== undefined) conversation.title = title
    if (skillId !== undefined) conversation.skillId = skillId
    conversation.updatedAt = new Date().toISOString()
    
    await db.write()
    
    res.json({
      success: true,
      data: conversation
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/llm/conversations/:id
 * 删除对话及其所有消息
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params
    const convId = parseInt(id)
    
    // 删除对话
    const index = db.data.chatConversations?.findIndex(c => c.id === convId)
    if (index === -1 || index === undefined) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      })
    }
    
    db.data.chatConversations.splice(index, 1)
    
    // 删除关联的消息
    if (db.data.chatMessages) {
      db.data.chatMessages = db.data.chatMessages.filter(m => m.conversationId !== convId)
    }
    
    await db.write()
    
    res.json({
      success: true,
      message: 'Conversation deleted'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/llm/conversations/:id/messages
 * 添加消息到对话（内部使用，通常由 chat 端点自动调用）
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const { role, content, toolCalls, toolCallId } = req.body
    const convId = parseInt(id)
    
    const conversation = db.data.chatConversations?.find(c => c.id === convId)
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      })
    }
    
    if (!db.data.chatMessages) {
      db.data.chatMessages = []
    }
    
    const message = {
      id: getNextId('chatMessages'),
      conversationId: convId,
      role,
      content,
      toolCalls: toolCalls || null,
      toolCallId: toolCallId || null,
      createdAt: new Date().toISOString()
    }
    
    db.data.chatMessages.push(message)
    
    // 更新对话
    conversation.messageCount = (conversation.messageCount || 0) + 1
    conversation.updatedAt = new Date().toISOString()
    
    // 自动生成标题（如果是第一条用户消息且标题是默认的）
    if (role === 'user' && conversation.messageCount === 1 && conversation.title === '新对话') {
      conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '')
    }
    
    await db.write()
    
    res.json({
      success: true,
      data: message
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== Provider 管理 ====================

/**
 * GET /api/llm/providers
 * 获取所有可用的 LLM Provider 列表
 */
router.get('/providers', (req, res) => {
  try {
    const providers = providerManager.getAvailableLLMProviders()
    res.json({
      success: true,
      data: providers
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/llm/models
 * 获取所有已配置 Provider 的模型列表
 */
router.get('/models', async (req, res) => {
  try {
    const models = await providerManager.getAllModels()
    res.json({
      success: true,
      data: models,
      defaults: {
        provider: providerManager.config.defaultProvider,
        model: providerManager.config.defaultModel
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * PUT /api/llm/config
 * 更新默认 Provider 和模型
 */
router.put('/config', (req, res) => {
  try {
    const { provider, model } = req.body
    providerManager.setDefaults(provider, model)
    res.json({
      success: true,
      data: {
        defaultProvider: providerManager.config.defaultProvider,
        defaultModel: providerManager.config.defaultModel
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== OAuth 认证 ====================

/**
 * POST /api/llm/auth/start
 * 开始 OAuth Device Flow 认证
 */
router.post('/auth/start', async (req, res) => {
  try {
    const { provider } = req.body
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID is required'
      })
    }

    const providerInstance = providerManager.getProvider(provider)
    
    // 检查 Provider 是否支持 Device Flow
    if (!providerInstance.startDeviceFlow) {
      return res.status(400).json({
        success: false,
        error: 'Provider does not support device flow authentication'
      })
    }

    const deviceFlowInfo = await providerInstance.startDeviceFlow()
    
    res.json({
      success: true,
      data: deviceFlowInfo
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/llm/auth/poll
 * 轮询 OAuth 认证状态
 */
router.post('/auth/poll', async (req, res) => {
  try {
    const { provider, deviceCode } = req.body
    
    if (!provider || !deviceCode) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID and device code are required'
      })
    }

    const providerInstance = providerManager.getProvider(provider)
    
    if (!providerInstance.pollDeviceFlow) {
      return res.status(400).json({
        success: false,
        error: 'Provider does not support device flow authentication'
      })
    }

    const result = await providerInstance.pollDeviceFlow(deviceCode)

    
    if (result.status === 'success') {
      // 保存凭证
      providerManager.setProviderCredentials(provider, result.credentials)
    }
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/llm/auth/:provider
 * 删除 Provider 凭证（登出）
 */
router.delete('/auth/:provider', (req, res) => {
  try {
    const { provider } = req.params
    providerManager.removeProviderCredentials(provider)
    
    res.json({
      success: true,
      message: `Provider ${provider} credentials removed`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/llm/auth/status
 * 获取认证状态
 */
router.get('/auth/status', (req, res) => {
  try {
    const providers = providerManager.getAvailableLLMProviders()
    const status = providers.reduce((acc, p) => {
      acc[p.id] = p.isConfigured
      return acc
    }, {})
    
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/llm/auth/apikey
 * 设置 API Key 认证（用于 OpenAI, Anthropic, OpenRouter）
 */
router.post('/auth/apikey', async (req, res) => {
  try {
    const { provider, apiKey } = req.body
    
    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID and API Key are required'
      })
    }

    // 支持的 API Key 认证 Provider
    const apiKeyProviders = ['openai', 'anthropic', 'openrouter', 'glm', 'qwen', 'deepseek']
    if (!apiKeyProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `Provider ${provider} does not support API key authentication`
      })
    }

    // 设置凭证
    const providerInstance = providerManager.getProvider(provider)
    providerInstance.setCredentials({ apiKey })
    
    // 尝试验证凭证（带超时，验证失败不阻塞保存）
    let isValid = true
    let validationError = null
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('验证超时')), 10000)
      )
      isValid = await Promise.race([
        providerInstance.validateCredentials(),
        timeoutPromise
      ])
    } catch (error) {
      console.warn(`API Key validation failed for ${provider}:`, error.message)
      validationError = error.message
      // 验证失败时仍然保存，让用户自己测试
      isValid = true
    }

    // 保存凭证
    providerManager.setProviderCredentials(provider, { apiKey })
    
    res.json({
      success: true,
      message: validationError 
        ? `${provider} API Key 已保存（验证跳过: ${validationError}）` 
        : `${provider} API Key configured successfully`,
      data: {
        provider,
        isConfigured: true,
        validated: !validationError
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/llm/auth/token
 * 直接设置 GitHub Token（绕过 Device Flow OAuth）
 * 用于命令行无法进行 TLS 连接的情况
 */
router.post('/auth/token', async (req, res) => {
  try {
    const { provider, accessToken } = req.body
    
    if (!provider || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID and access token are required'
      })
    }

    if (provider !== 'github-copilot') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint only supports github-copilot provider'
      })
    }

    // 设置凭证
    const providerInstance = providerManager.getProvider(provider)
    const credentials = {
      accessToken,
      tokenType: 'bearer',
      scope: 'read:user'
    }
    providerInstance.setCredentials(credentials)
    
    // 尝试获取 Copilot Token 来验证
    try {
      await providerInstance.getCopilotToken()
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Invalid GitHub Token: ${error.message}`
      })
    }

    // 保存凭证
    providerManager.setProviderCredentials(provider, credentials)
    
    res.json({
      success: true,
      message: 'GitHub Copilot token configured successfully',
      data: {
        provider,
        isConfigured: true
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 聊天请求 ====================

/**
 * POST /api/llm/chat
 * 发送聊天请求（非流式）
 */
router.post('/chat', async (req, res) => {
  try {
    const { 
      provider, 
      model, 
      messages, 
      tools,
      useAgentTools = false,
      temperature 
    } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      })
    }

    // 如果请求使用 Agent Tools，将 AGENT_ACTIONS 转换为 tools
    let finalTools = tools
    if (useAgentTools) {
      finalTools = convertAgentActionsToTools()
    }

    const result = await providerManager.chat({
      provider,
      model,
      messages,
      tools: finalTools,
      temperature
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/llm/chat/stream
 * 流式聊天（SSE）
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const { 
      provider, 
      model, 
      messages, 
      tools,
      useAgentTools = false,
      temperature 
    } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      })
    }

    // 设置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 如果请求使用 Agent Tools，将 AGENT_ACTIONS 转换为 tools
    let finalTools = tools
    if (useAgentTools) {
      finalTools = convertAgentActionsToTools()
    }

    const stream = providerManager.chatStream({
      provider,
      model,
      messages,
      tools: finalTools,
      temperature
    })

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('Stream error:', error)
    
    // 如果还没开始流式输出，返回 JSON 错误
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    } else {
      // 如果已经开始流式输出，发送错误事件
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  }
})

// ==================== Skills 管理 ====================

/**
 * GET /api/llm/skills
 * 获取所有可用的 Skills
 */
router.get('/skills', (req, res) => {
  try {
    const skills = skillManager.getAllSkills()
    res.json({
      success: true,
      data: skills.map(s => s.toJSON()),
      count: skills.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/llm/skills/:id
 * 获取单个 Skill 详情
 */
router.get('/skills/:id', (req, res) => {
  try {
    const skill = skillManager.getSkill(req.params.id)
    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        ...skill.toJSON(),
        systemPrompt: skill.getSystemPrompt(),
        customTools: skill.getCustomTools()
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 工具相关 ====================

/**
 * GET /api/llm/tools
 * 获取所有可用的 Agent Tools（用于 Function Calling）
 */
router.get('/tools', (req, res) => {
  try {
    const { skillId } = req.query
    const tools = convertAgentActionsToTools(skillId)
    res.json({
      success: true,
      data: tools,
      count: tools.length,
      skillId: skillId || null
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * @deprecated 将在未来版本中迁移到 Agent 系统。
 * 新代码应使用 agentId 参数而非 skillId。
 * 将 AGENT_ACTIONS 转换为 OpenAI Function Calling 格式的 tools
 * @param {string|null} skillId - Skill ID，用于过滤和添加自定义工具
 */
function convertAgentActionsToTools(skillId = null) {
  return skillManager.convertActionsToTools(skillId)
}

/**
 * GET /api/llm/system-prompt
 * 获取默认的系统提示词
 */
router.get('/system-prompt', (req, res) => {
  try {
    const { skillId } = req.query
    const systemPrompt = generateSystemPrompt(skillId)
    res.json({
      success: true,
      data: systemPrompt,
      skillId: skillId || null
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * @deprecated 将在未来版本中迁移到 Agent 系统。
 * 新代码应使用 agents.getAgentPrompt(agentId) 而非此函数。
 * 生成系统提示词
 * @param {string|null} skillId - Skill ID
 */
function generateSystemPrompt(skillId = null) {
  return skillManager.getSystemPrompt(skillId)
}

// ==================== 工具执行 ====================

/**
 * 执行单个工具调用
 * @param {Object} toolCall - 工具调用对象
 * @param {string|null} skillId - Skill ID（用于处理自定义工具）
 */
async function executeToolCall(toolCall, skillId = null) {
  const { id, function: func } = toolCall
  const actionName = func.name
  
  let parameters = {}
  try {
    parameters = typeof func.arguments === 'string' 
      ? JSON.parse(func.arguments) 
      : func.arguments || {}
  } catch (e) {
    return {
      tool_call_id: id,
      role: 'tool',
      content: JSON.stringify({ error: 'Invalid JSON in arguments', details: e.message })
    }
  }
  
  try {
    // 使用 skillManager 执行工具（会自动处理自定义工具）
    const result = await skillManager.executeTool(skillId, actionName, parameters, actionHandlers)
    return {
      tool_call_id: id,
      role: 'tool',
      content: JSON.stringify(result)
    }
  } catch (error) {
    return {
      tool_call_id: id,
      role: 'tool',
      content: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * POST /api/llm/chat/complete
 * 完整对话循环 - 自动执行工具调用直到获得最终回复
 * 
 * 这是一个高级端点，会自动：
 * 1. 发送消息给 LLM
 * 2. 如果 LLM 返回工具调用，执行工具并将结果发回
 * 3. 重复步骤 1-2 直到 LLM 返回文本回复
 * 4. 如果提供 conversationId，自动保存消息到对话
 * 
 * 支持两种模式：
 * - skillId: 使用 Skill 系统（@deprecated - 旧版，将迁移到 Agent 系统）
 * - agentId: 使用 Agent 系统（Multi-Agent 协作）【推荐】
 */
router.post('/chat/complete', async (req, res) => {
  try {
    const { 
      provider, 
      model, 
      messages: initialMessages, 
      conversationId,
      maxIterations = 10,
      temperature,
      includeSystemPrompt = true,
      skillId,    // @deprecated - 将迁移到 Agent 系统
      agentId     // 推荐：使用 Agent 系统
    } = req.body

    if (!initialMessages || !Array.isArray(initialMessages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      })
    }

    // 验证对话存在（如果提供了 conversationId）
    let conversation = null
    if (conversationId) {
      conversation = db.data.chatConversations?.find(c => c.id === parseInt(conversationId))
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        })
      }
    }

    // 保存用户消息到对话
    const userMessage = initialMessages[initialMessages.length - 1]
    if (conversation && userMessage?.role === 'user') {
      await saveMessageToConversation(conversation.id, userMessage.role, userMessage.content)
    }

    // 准备消息
    let messages = [...initialMessages]
    
    // 添加系统提示词（如果没有）
    // 优先级：agentId > skillId > 默认
    if (includeSystemPrompt && !messages.some(m => m.role === 'system')) {
      let systemPrompt
      
      if (agentId) {
        // 使用 Agent 系统的 Prompt
        systemPrompt = agents.getAgentPrompt(agentId, {
          // 可以传入上下文信息
          timestamp: new Date().toISOString()
        })
        if (!systemPrompt) {
          return res.status(400).json({
            success: false,
            error: `Agent '${agentId}' not found`
          })
        }
      } else {
        // @deprecated - Skill 系统的 Prompt，将迁移到 Agent 系统
        systemPrompt = generateSystemPrompt(skillId)
      }
      
      messages.unshift({
        role: 'system',
        content: systemPrompt
      })
    }

    // 获取工具列表
    // 如果使用 Agent，可以根据 Agent 的 tools 配置过滤
    let tools = convertAgentActionsToTools(skillId)
    
    if (agentId) {
      const agent = agents.getAgent(agentId)
      if (agent && agent.tools !== null) {
        // Agent 有工具限制，过滤工具列表
        tools = tools.filter(t => agent.tools.includes(t.function.name))
      }
      // 如果 agent.tools === null，表示可以使用所有工具
    }
    const toolCallHistory = []
    let iterations = 0

    while (iterations < maxIterations) {
      iterations++
      
      // 调用 LLM
      const response = await providerManager.chat({
        provider,
        model,
        messages,
        tools,
        temperature
      })

      // 检查是否有工具调用
      if (response.tool_calls && response.tool_calls.length > 0) {
        // 添加 assistant 消息（包含工具调用）
        messages.push({
          role: 'assistant',
          content: response.content || null,
          tool_calls: response.tool_calls
        })

        // 执行所有工具调用
        const toolResults = []
        for (const toolCall of response.tool_calls) {
          const result = await executeToolCall(toolCall, skillId)
          toolResults.push(result)
          messages.push(result)
          
          // 记录工具调用历史
          toolCallHistory.push({
            iteration: iterations,
            call: {
              id: toolCall.id,
              name: toolCall.function.name,
              arguments: toolCall.function.arguments
            },
            result: result.content
          })
        }
      } else {
        // 没有工具调用，保存 AI 回复并返回最终结果
        if (conversation) {
          await saveMessageToConversation(
            conversation.id, 
            'assistant', 
            response.content,
            toolCallHistory.length > 0 ? toolCallHistory : null
          )
        }
        
        return res.json({
          success: true,
          data: {
            content: response.content,
            toolCallHistory,
            iterations,
            usage: response.usage,
            conversationId: conversation?.id
          }
        })
      }
    }

    // 达到最大迭代次数
    const maxIterContent = '抱歉，操作过于复杂，已达到最大迭代次数。请尝试简化您的请求。'
    if (conversation) {
      await saveMessageToConversation(conversation.id, 'assistant', maxIterContent, toolCallHistory)
    }
    
    return res.json({
      success: true,
      data: {
        content: maxIterContent,
        toolCallHistory,
        iterations,
        warning: 'Max iterations reached',
        conversationId: conversation?.id
      }
    })
  } catch (error) {
    console.error('Chat complete error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 保存消息到对话
 */
async function saveMessageToConversation(conversationId, role, content, toolCalls = null) {
  if (!db.data.chatMessages) {
    db.data.chatMessages = []
  }
  
  const message = {
    id: getNextId('chatMessages'),
    conversationId: parseInt(conversationId),
    role,
    content,
    toolCalls,
    createdAt: new Date().toISOString()
  }
  
  db.data.chatMessages.push(message)
  
  // 更新对话
  const conversation = db.data.chatConversations?.find(c => c.id === parseInt(conversationId))
  if (conversation) {
    conversation.messageCount = (conversation.messageCount || 0) + 1
    conversation.updatedAt = new Date().toISOString()
    
    // 自动生成标题
    if (role === 'user' && conversation.messageCount === 1 && conversation.title === '新对话') {
      conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '')
    }
  }
  
  await db.write()
  return message
}

/**
 * POST /api/llm/chat/complete/stream
 * 流式完整对话循环
 * 返回 SSE 流，包括工具调用过程和最终回复
 * 
 * 支持两种模式：
 * - skillId: 使用 Skill 系统（@deprecated - 旧版，将迁移到 Agent 系统）
 * - agentId: 使用 Agent 系统（Multi-Agent 协作）【推荐】
 */
router.post('/chat/complete/stream', async (req, res) => {
  try {
    const { 
      provider, 
      model, 
      messages: initialMessages, 
      maxIterations = 10,
      temperature,
      includeSystemPrompt = true,
      skillId,    // @deprecated - 将迁移到 Agent 系统
      agentId     // 推荐：使用 Agent 系统
    } = req.body

    if (!initialMessages || !Array.isArray(initialMessages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      })
    }

    // 设置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 发送事件的辅助函数
    const sendEvent = (type, data) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    // 准备消息
    let messages = [...initialMessages]
    
    // 添加系统提示词
    // 优先级：agentId > skillId > 默认
    if (includeSystemPrompt && !messages.some(m => m.role === 'system')) {
      let systemPrompt
      
      if (agentId) {
        // 使用 Agent 系统的 Prompt
        systemPrompt = agents.getAgentPrompt(agentId, {
          timestamp: new Date().toISOString()
        })
        if (!systemPrompt) {
          return res.status(400).json({
            success: false,
            error: `Agent '${agentId}' not found`
          })
        }
        sendEvent('agent', { agentId, name: agents.getAgent(agentId)?.name })
      } else {
        // @deprecated - Skill 系统的 Prompt，将迁移到 Agent 系统
        systemPrompt = generateSystemPrompt(skillId)
      }
      
      messages.unshift({
        role: 'system',
        content: systemPrompt
      })
    }

    // 获取工具列表
    let tools = convertAgentActionsToTools(skillId)
    
    if (agentId) {
      const agent = agents.getAgent(agentId)
      if (agent && agent.tools !== null) {
        // Agent 有工具限制，过滤工具列表
        tools = tools.filter(t => agent.tools.includes(t.function.name))
      }
    }
    
    let iterations = 0

    sendEvent('start', { timestamp: new Date().toISOString(), agentId })

    while (iterations < maxIterations) {
      iterations++
      sendEvent('iteration', { iteration: iterations })

      // 使用流式 API
      let accumulatedContent = ''
      let toolCalls = []
      let currentToolCall = null

      const stream = providerManager.chatStream({
        provider,
        model,
        messages,
        tools,
        temperature
      })

      for await (const chunk of stream) {
        // 处理文本内容
        if (chunk.content) {
          accumulatedContent += chunk.content
          sendEvent('content', { content: chunk.content })
        }

        // 处理工具调用（流式累积）
        if (chunk.tool_calls) {
          for (const tc of chunk.tool_calls) {
            if (tc.index !== undefined) {
              // 初始化或更新工具调用
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || '',
                  type: 'function',
                  function: { name: '', arguments: '' }
                }
              }
              if (tc.id) toolCalls[tc.index].id = tc.id
              if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name
              if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments
            }
          }
        }
      }

      // 过滤有效的工具调用
      toolCalls = toolCalls.filter(tc => tc && tc.id && tc.function.name)

      if (toolCalls.length > 0) {
        // 添加 assistant 消息
        messages.push({
          role: 'assistant',
          content: accumulatedContent || null,
          tool_calls: toolCalls
        })

        // 执行工具调用
        for (const toolCall of toolCalls) {
          sendEvent('tool_call', {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: toolCall.function.arguments
          })

          const result = await executeToolCall(toolCall, skillId)
          messages.push(result)

          sendEvent('tool_result', {
            id: toolCall.id,
            name: toolCall.function.name,
            result: result.content
          })
        }
      } else {
        // 没有工具调用，对话结束
        sendEvent('complete', {
          iterations,
          timestamp: new Date().toISOString()
        })
        res.write('data: [DONE]\n\n')
        return res.end()
      }
    }

    // 达到最大迭代次数
    sendEvent('warning', { message: 'Max iterations reached' })
    sendEvent('complete', { iterations, maxReached: true })
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('Stream complete error:', error)
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  }
})

export default router
