/**
 * Orchestrator - 任务编排器
 * 
 * 核心职责：
 * 1. 将用户需求分解为任务
 * 2. 分配任务给合适的 Agent
 * 3. 协调执行顺序
 * 4. 汇总结果
 */

import { Task, TaskStatus } from './task-queue.js'

export class Orchestrator {
  constructor(agentRegistry, taskQueue) {
    this.registry = agentRegistry
    this.queue = taskQueue
    this.currentProjectId = null
  }

  /**
   * 创建电影制作计划
   * 
   * 根据用户描述，生成完整的任务列表
   * 这是一个高层次的规划方法
   */
  createFilmPlan(description, options = {}) {
    const plan = {
      id: `plan_${Date.now()}`,
      description,
      phases: [],
      tasks: []
    }

    // 阶段 1: 前期准备
    plan.phases.push({
      name: '前期准备',
      tasks: [
        this._createTask('分析需求', 'director', 'analyze_requirement', { description }),
        this._createTask('创建项目', 'director', 'create_project', { name: options.projectName || '新项目' })
      ]
    })

    // 阶段 2: 角色设计
    plan.phases.push({
      name: '角色设计',
      tasks: [
        this._createTask('设计主角', 'character', 'create_character', { type: 'protagonist' }),
        this._createTask('设计配角', 'character', 'create_character', { type: 'supporting' }),
        this._createTask('设计反派', 'character', 'create_character', { type: 'antagonist' })
      ]
    })

    // 阶段 3: 场景设计
    plan.phases.push({
      name: '场景设计',
      tasks: [
        this._createTask('设计主场景', 'scene', 'create_scene', { type: 'main' }),
        this._createTask('设计次要场景', 'scene', 'create_scene', { type: 'secondary' })
      ]
    })

    // 阶段 4: 分镜设计
    plan.phases.push({
      name: '分镜设计',
      tasks: [
        this._createTask('创建分镜板', 'storyboard', 'create_storyboard', {}),
        this._createTask('设计关键镜头', 'storyboard', 'create_shot', { type: 'key' })
      ]
    })

    // 阶段 5: 图像生成
    plan.phases.push({
      name: '图像生成',
      tasks: [
        this._createTask('生成角色图', 'comfyui', 'execute_comfyui_workflow', { type: 'character' }),
        this._createTask('生成场景图', 'comfyui', 'execute_comfyui_workflow', { type: 'scene' }),
        this._createTask('生成分镜图', 'comfyui', 'execute_comfyui_workflow', { type: 'storyboard' })
      ]
    })

    return plan
  }

  /**
   * 分解用户请求为具体任务
   * 
   * 这是 LLM 调用的入口点
   */
  async decomposeRequest(userMessage, context = {}) {
    // 分析用户意图
    const intent = this._analyzeIntent(userMessage)
    
    const tasks = []

    switch (intent.type) {
      case 'create_character':
        tasks.push(this._createTask(
          `创建角色: ${intent.name || '新角色'}`,
          'character',
          'create_character',
          { name: intent.name, description: userMessage }
        ))
        break

      case 'create_scene':
        tasks.push(this._createTask(
          `创建场景: ${intent.name || '新场景'}`,
          'scene',
          'create_scene',
          { name: intent.name, description: userMessage }
        ))
        break

      case 'create_storyboard':
        tasks.push(this._createTask(
          `创建分镜`,
          'storyboard',
          'create_storyboard',
          { description: userMessage }
        ))
        break

      case 'generate_image':
        tasks.push(this._createTask(
          `生成图像`,
          'comfyui',
          'execute_comfyui_workflow',
          { prompt: userMessage }
        ))
        break

      case 'complex':
        // 复杂请求需要导演来分解
        tasks.push(this._createTask(
          `规划任务`,
          'director',
          'plan_tasks',
          { userMessage, context }
        ))
        break

      default:
        // 默认交给导演处理
        tasks.push(this._createTask(
          `处理请求`,
          'director',
          'handle_request',
          { userMessage, context }
        ))
    }

    return tasks
  }

  /**
   * 简单的意图分析（可以用 LLM 增强）
   */
  _analyzeIntent(message) {
    const lowerMsg = message.toLowerCase()
    
    if (lowerMsg.includes('角色') || lowerMsg.includes('人物') || lowerMsg.includes('character')) {
      return { type: 'create_character', name: this._extractName(message) }
    }
    if (lowerMsg.includes('场景') || lowerMsg.includes('环境') || lowerMsg.includes('scene')) {
      return { type: 'create_scene', name: this._extractName(message) }
    }
    if (lowerMsg.includes('分镜') || lowerMsg.includes('镜头') || lowerMsg.includes('storyboard')) {
      return { type: 'create_storyboard' }
    }
    if (lowerMsg.includes('生成') || lowerMsg.includes('画') || lowerMsg.includes('generate')) {
      return { type: 'generate_image' }
    }
    if (message.length > 100 || lowerMsg.includes('电影') || lowerMsg.includes('项目')) {
      return { type: 'complex' }
    }
    
    return { type: 'unknown' }
  }

  _extractName(message) {
    // 简单提取：引号内的内容或"叫/名为/是"后面的词
    const quotedMatch = message.match(/[「「"']([^」」"']+)[」」"']/)
    if (quotedMatch) return quotedMatch[1]
    
    const namedMatch = message.match(/(?:叫|名为|名字是|called|named)\s*[「「"']?(\S+)[」」"']?/i)
    if (namedMatch) return namedMatch[1]
    
    return null
  }

  /**
   * 创建任务辅助方法
   */
  _createTask(name, agentId, action, params, options = {}) {
    return new Task({
      name,
      agentId,
      action,
      params,
      priority: this.registry.get(agentId)?.priority || 0,
      ...options
    })
  }

  /**
   * 执行任务队列
   * 
   * 简单的串行执行器
   */
  async execute(executor) {
    const results = []
    
    while (true) {
      const task = this.queue.getNextRunnable()
      if (!task) break
      
      task.start()
      
      try {
        const result = await executor.execute(task)
        this.queue.markCompleted(task.id, result)
        results.push({ task: task.toJSON(), success: true, result })
      } catch (error) {
        this.queue.markFailed(task.id, error)
        results.push({ task: task.toJSON(), success: false, error: error.message })
      }
    }
    
    return {
      results,
      stats: this.queue.getStats()
    }
  }

  /**
   * 获取可用 Agent 列表（供 LLM 了解团队）
   */
  getTeamDescription() {
    const agents = this.registry.getAll()
    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      capabilities: agent.capabilities,
      description: agent.description
    }))
  }

  /**
   * 提交任务（供 delegate_task action 使用）
   */
  async submitTask({ description, targetAgent, context = {}, priority = 'medium', userMessage, delegatedAt }) {
    const priorityMap = { high: 2, medium: 1, low: 0 }
    
    const task = new Task({
      name: description,
      agentId: targetAgent || 'director',
      action: 'handle_delegated_task',
      params: {
        description,
        context,
        userMessage
      },
      priority: priorityMap[priority] || 1,
      metadata: {
        delegatedAt: delegatedAt || new Date().toISOString()
      }
    })
    
    this.queue.add(task)
    
    return {
      id: task.id,
      targetAgent: task.agentId,
      status: task.status,
      description: task.name,
      createdAt: task.createdAt
    }
  }

  /**
   * 获取任务
   */
  getTask(taskId) {
    return this.queue.get(taskId)?.toJSON()
  }

  /**
   * 获取所有任务
   */
  getAllTasks() {
    return this.queue.getAll().map(t => t.toJSON())
  }

  /**
   * 生成团队介绍（作为 System Prompt 的一部分）
   */
  getTeamPrompt() {
    const agents = this.registry.getAll()
    let prompt = `## 你的团队\n\n你有以下团队成员可以协作：\n\n`
    
    agents.forEach(agent => {
      prompt += `### ${agent.name} (${agent.id})\n`
      prompt += `- 角色: ${agent.role}\n`
      prompt += `- 能力: ${agent.capabilities.join(', ')}\n`
      prompt += `- 说明: ${agent.description}\n\n`
    })
    
    prompt += `\n当需要特定专业能力时，可以委派任务给相应的团队成员。`
    
    return prompt
  }
}

export default Orchestrator
