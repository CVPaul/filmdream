/**
 * FilmDream Agent 系统
 * 
 * 参考 OpenCode 的设计理念：
 * - Markdown 定义 Agent（简洁、可读）
 * - Primary Agent + Subagent 分层
 * - 权限控制和工具访问
 * 
 * 核心组件：
 * - AgentLoader: 从 Markdown 加载 Agent 定义
 * - AgentExecutor: 执行 Agent 任务
 * - TaskQueue: 任务队列（可选，用于复杂流程）
 */

import { AgentLoader, agentLoader, AgentDefinition } from './loader.js'
import { TaskQueue, Task, TaskStatus } from './task-queue.js'
import { Orchestrator } from './orchestrator.js'

// 初始化：加载所有 Agents
agentLoader.loadAll()

// 创建 Orchestrator
const taskQueue = new TaskQueue()
const orchestrator = new Orchestrator(
  { 
    getAll: () => agentLoader.getAll(),
    get: (id) => agentLoader.get(id)
  }, 
  taskQueue
)

/**
 * 获取 Agent 列表（供前端展示）
 */
export function getAgents() {
  return agentLoader.getAll().map(a => a.toJSON())
}

/**
 * 获取单个 Agent
 */
export function getAgent(id) {
  return agentLoader.get(id)
}

/**
 * 获取 Agent 的完整 System Prompt
 */
export function getAgentPrompt(id, context = {}) {
  const agent = agentLoader.get(id)
  if (!agent) return null
  
  return agent.getFullPrompt({
    teamPrompt: agentLoader.getTeamPrompt(),
    ...context
  })
}

/**
 * 检查 Agent 是否可以使用某个工具
 */
export function canUseTool(agentId, toolName) {
  const agent = agentLoader.get(agentId)
  if (!agent) return false
  
  // tools 为 null 表示可以使用所有工具
  if (agent.tools === null) return true
  
  return agent.tools.includes(toolName)
}

export {
  agentLoader,
  AgentLoader,
  AgentDefinition,
  TaskQueue,
  Task,
  TaskStatus,
  orchestrator
}

export default {
  getAgents,
  getAgent,
  getAgentPrompt,
  canUseTool,
  agentLoader,
  orchestrator
}
