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
import providerManager from '../providers/index.js'
import pipelineState from './pipeline-state.js'

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
  /**
   * LLM-based phase/task decomposition
   * Returns: { phases: [{id, name, description, agentId, tasks: [{name, agentId, action, params, dependencies}]}] }
   */
  async decomposeRequest(userMessage, context = {}) {
    // Compose prompt for LLM
    const provider = providerManager.config?.defaultProvider
    const model = providerManager.config?.defaultModel
    // Team prompt for context
    const teamPrompt = this.getTeamPrompt()
    const prompt = [
      { role: 'system', content: teamPrompt },
      { role: 'user', content: userMessage }
    ]
    let plan = null
    try {
      const llmRes = await providerManager.chat({ provider, model, messages: prompt })
      // Try to parse JSON from LLM response
      plan = JSON.parse(llmRes.content)
    } catch (err) {
      // Fallback: use legacy intent-based decomposition
      const tasks = this._legacyDecompose(userMessage, context)
      plan = { phases: [{ id: 'fallback', name: 'Fallback', description: 'Legacy decomposition', agentId: 'director', tasks }] }
    }
    return plan
  }

  // Fallback for legacy decomposition
  _legacyDecompose(userMessage, context = {}) {
    const intent = this._analyzeIntent(userMessage)
    const tasks = []
    switch (intent.type) {
      case 'create_character':
        tasks.push(this._createTask(`创建角色: ${intent.name || '新角色'}`, 'character', 'create_character', { name: intent.name, description: userMessage }))
        break
      case 'create_scene':
        tasks.push(this._createTask(`创建场景: ${intent.name || '新场景'}`, 'scene', 'create_scene', { name: intent.name, description: userMessage }))
        break
      case 'create_storyboard':
        tasks.push(this._createTask(`创建分镜`, 'storyboard', 'create_storyboard', { description: userMessage }))
        break
      case 'generate_image':
        tasks.push(this._createTask(`生成图像`, 'comfyui', 'execute_comfyui_workflow', { prompt: userMessage }))
        break
      case 'complex':
        tasks.push(this._createTask(`规划任务`, 'director', 'plan_tasks', { userMessage, context }))
        break
      default:
        tasks.push(this._createTask(`处理请求`, 'director', 'handle_request', { userMessage, context }))
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
   * Parallel DAG execution for pipeline
   * - Runs all runnable tasks in parallel
   * - Retries failed tasks (max 3, exponential backoff)
   * - Updates pipeline/task/phase status
   * - Emits SSE events for progress
   */
  async execute(pipelineId) {
    const maxRetries = 3
    const backoff = attempt => Math.pow(2, attempt) * 500 // ms
    let running = true
    while (running) {
      // Get all runnable tasks
      const runnable = this.queue.getAllRunnable()
      if (!runnable.length) break
      // Run all tasks in parallel
      await Promise.all(runnable.map(async (task) => {
        if (task.status === 'completed' || task.status === 'failed') return
        task.start()
        pipelineState._emit('task:started', { pipelineId, phaseId: task.phaseId, taskId: task.id })
        let attempt = task.retryCount || 0
        let result, error
        while (attempt < maxRetries) {
          try {
            // Find agent and execute via LLM
            const agent = this.registry.get(task.agentId)
            const agentPrompt = agent?.getFullPrompt?.({}) ?? `你是${task.agentId}专家。`
            const llmRes = await providerManager.chat({
              provider: providerManager.config?.defaultProvider,
              model: providerManager.config?.defaultModel,
              messages: [
                { role: 'system', content: agentPrompt },
                { role: 'user', content: JSON.stringify(task.params || {}) }
              ]
            })
            result = llmRes.content
            this.queue.markCompleted(task.id, result)
            await pipelineState.updateTaskStatus(pipelineId, task.phaseId, task.id, 'completed', result)
            pipelineState._emit('task:completed', { pipelineId, phaseId: task.phaseId, taskId: task.id, result })
            break
          } catch (err) {
            attempt++
            task.retryCount = attempt
            error = err
            if (attempt < maxRetries) await new Promise(res => setTimeout(res, backoff(attempt)))
          }
        }
        if (attempt >= maxRetries) {
          this.queue.markFailed(task.id, error)
          await pipelineState.updateTaskStatus(pipelineId, task.phaseId, task.id, 'failed', error?.message)
          pipelineState._emit('task:failed', { pipelineId, phaseId: task.phaseId, taskId: task.id, error })
        }
      }))
      // Emit pipeline progress event
      pipelineState._emit('pipeline:progress', { pipelineId })
      // Check if more tasks are now runnable (DAG)
      running = !!this.queue.getAllRunnable().length
    }
    // Final pipeline status update
    await pipelineState.updateStatus(pipelineId, 'completed')
    pipelineState._emit('pipeline:completed', { pipelineId })
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

  /**
   * Bootstrap pipeline: create, expand brief, decompose, add phases, launch async execution
   * Returns pipeline ID and status immediately
   */
  async startPipeline(concept, brief = null) {
    // Expand brief via LLM if not provided
    if (!brief) {
      try {
        const llmRes = await providerManager.chat({
          provider: providerManager.config?.defaultProvider,
          model: providerManager.config?.defaultModel,
          messages: [
            { role: 'system', content: '你是电影项目导演，请根据概念生成详细的项目简介，输出JSON格式：{"title":"...","genre":"...","characters":[],"settings":[],"plot":"..."}' },
            { role: 'user', content: concept }
          ]
        })
        brief = JSON.parse(llmRes.content)
      } catch {
        brief = { title: concept, description: concept }
      }
    }
    // Create pipeline
    const pipeline = await pipelineState.create(concept, brief)
    const pipelineId = pipeline.id
    // Decompose into phases/tasks
    const plan = await this.decomposeRequest(concept, { brief, pipelineId })
    if (plan && plan.phases) {
      await pipelineState.addPhases(pipelineId, plan.phases)
      for (const phase of plan.phases) {
        for (const taskDef of (phase.tasks || [])) {
          const task = new Task({
            name: taskDef.name,
            agentId: taskDef.agentId || 'director',
            action: taskDef.action || 'handle_request',
            params: taskDef.params || {},
            dependencies: taskDef.dependencies || [],
            phaseId: phase.id || phase.name,
            pipelineId
          })
          this.queue.add(task)
        }
      }
    }
    await pipelineState.updateStatus(pipelineId, 'running')
    // Launch async execution (do not block)
    setTimeout(() => { this.execute(pipelineId).catch(console.error) }, 0)
    // Return pipeline ID and initial status
    return { pipelineId, status: 'running', concept, brief }
  }

  /**
   * Phase-level re-run: reset target phase + all downstream phases, then re-execute
   */
  async rerunPhase(pipelineId, phaseId, options = {}) {
    const pipeline = await pipelineState.getById(pipelineId)
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)
    if (pipeline.status === 'running') {
      const err = new Error('Cannot re-run phase while pipeline is running')
      err.status = 400
      throw err
    }

    const phases = pipeline.phases || []
    const targetIndex = phases.findIndex(p => p.id === phaseId)
    if (targetIndex === -1) throw new Error(`Phase ${phaseId} not found`)

    // Reset target phase + all downstream phases to pending
    for (let i = targetIndex; i < phases.length; i++) {
      const p = phases[i]
      await pipelineState.updatePhaseStatus(pipelineId, p.id, 'pending')
      for (const task of (p.tasks || [])) {
        await pipelineState.updateTaskStatus(pipelineId, p.id, task.id, 'pending')
      }
      // Reset tasks in the task queue if method exists
      if (typeof this.queue.resetPhase === 'function') {
        this.queue.resetPhase(p.id)
      }
    }

    // Update pipeline status to running
    await pipelineState.updateStatus(pipelineId, 'running')

    // Re-execute async
    setTimeout(() => { this.execute(pipelineId).catch(console.error) }, 0)

    return { pipelineId, phaseId, status: 'running' }
  }
}

export default Orchestrator
