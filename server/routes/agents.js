/**
 * Agent API 路由
 * 提供 Agent 管理和任务委派功能
 */

import express from 'express'
import agents, { 
  getAgents, 
  getAgent, 
  getAgentPrompt, 
  canUseTool,
  orchestrator 
} from '../agents/index.js'

const router = express.Router()

// ==================== Agent 列表和详情 ====================

/**
 * GET /api/agents
 * 获取所有可用的 Agents
 */
router.get('/', (req, res) => {
  try {
    const agentList = getAgents()
    
    // 分类：Primary Agents 和 Subagents
    // 注意：Agent 使用 mode 字段而不是 type
    const primary = agentList.filter(a => a.mode === 'primary')
    const subagents = agentList.filter(a => a.mode === 'subagent')
    
    res.json({
      success: true,
      data: {
        primary,
        subagents,
        all: agentList
      },
      count: agentList.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/agents/:id
 * 获取单个 Agent 详情
 */
router.get('/:id', (req, res) => {
  try {
    const agent = getAgent(req.params.id)
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      })
    }
    
    res.json({
      success: true,
      data: agent.toJSON()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/agents/:id/prompt
 * 获取 Agent 的完整 System Prompt
 */
router.get('/:id/prompt', (req, res) => {
  try {
    const { context } = req.query
    let contextObj = {}
    
    if (context) {
      try {
        contextObj = JSON.parse(context)
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    const prompt = getAgentPrompt(req.params.id, contextObj)
    
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        agentId: req.params.id,
        prompt
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
 * GET /api/agents/:id/tools
 * 获取 Agent 可用的工具列表
 */
router.get('/:id/tools', (req, res) => {
  try {
    const agent = getAgent(req.params.id)
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        agentId: req.params.id,
        tools: agent.tools,
        allToolsAllowed: agent.tools === null
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 任务管理 ====================

/**
 * POST /api/agents/tasks
 * 提交新任务给 Orchestrator
 */
router.post('/tasks', async (req, res) => {
  try {
    const { description, userMessage, context } = req.body
    
    if (!description && !userMessage) {
      return res.status(400).json({
        success: false,
        error: 'Either description or userMessage is required'
      })
    }
    
    // 使用 Orchestrator 分解和分发任务
    const task = await orchestrator.submitTask({
      description: description || userMessage,
      userMessage,
      context: context || {}
    })
    
    res.json({
      success: true,
      data: task
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/agents/tasks/:id
 * 获取任务状态
 */
router.get('/tasks/:id', (req, res) => {
  try {
    const task = orchestrator.getTask(req.params.id)
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }
    
    res.json({
      success: true,
      data: task
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/agents/tasks
 * 获取所有任务
 */
router.get('/tasks', (req, res) => {
  try {
    const { status, limit = 50 } = req.query
    let tasks = orchestrator.getAllTasks()
    
    if (status) {
      tasks = tasks.filter(t => t.status === status)
    }
    
    tasks = tasks.slice(0, Number(limit))
    
    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 工具权限检查 ====================

/**
 * POST /api/agents/:id/can-use-tool
 * 检查 Agent 是否可以使用某个工具
 */
router.post('/:id/can-use-tool', (req, res) => {
  try {
    const { toolName } = req.body
    
    if (!toolName) {
      return res.status(400).json({
        success: false,
        error: 'toolName is required'
      })
    }
    
    const allowed = canUseTool(req.params.id, toolName)
    
    res.json({
      success: true,
      data: {
        agentId: req.params.id,
        toolName,
        allowed
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
