/**
 * Task Queue - 任务队列和依赖管理
 * 
 * 简单直接：
 * - Task 有状态、优先级、依赖
 * - Queue 管理执行顺序
 */

/**
 * 任务状态
 */
export const TaskStatus = {
  PENDING: 'pending',     // 等待执行
  BLOCKED: 'blocked',     // 被依赖阻塞
  RUNNING: 'running',     // 执行中
  COMPLETED: 'completed', // 已完成
  FAILED: 'failed',       // 失败
  CANCELLED: 'cancelled'  // 已取消
}

/**
 * 单个任务
 */
export class Task {
  constructor(options) {
    this.id = options.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.name = options.name || 'Unnamed Task'
    this.description = options.description || ''
    this.agentId = options.agentId // 指定执行的 Agent
    this.action = options.action   // 要执行的 action 名称
    this.params = options.params || {} // action 参数
    this.context = options.context || {} // 上下文信息
    
    this.status = TaskStatus.PENDING
    this.priority = options.priority || 0
    this.dependencies = options.dependencies || [] // 依赖的 task ids
    
    this.result = null
    this.error = null
    this.createdAt = new Date()
    this.startedAt = null
    this.completedAt = null
    
    // 回调
    this.onComplete = options.onComplete || null
    this.onError = options.onError || null
  }

  /**
   * 检查依赖是否都已完成
   */
  canRun(completedTaskIds) {
    if (this.status !== TaskStatus.PENDING && this.status !== TaskStatus.BLOCKED) {
      return false
    }
    return this.dependencies.every(depId => completedTaskIds.has(depId))
  }

  /**
   * 标记开始
   */
  start() {
    this.status = TaskStatus.RUNNING
    this.startedAt = new Date()
  }

  /**
   * 标记完成
   */
  complete(result) {
    this.status = TaskStatus.COMPLETED
    this.result = result
    this.completedAt = new Date()
    if (this.onComplete) {
      this.onComplete(this)
    }
  }

  /**
   * 标记失败
   */
  fail(error) {
    this.status = TaskStatus.FAILED
    this.error = error
    this.completedAt = new Date()
    if (this.onError) {
      this.onError(this)
    }
  }

  /**
   * 序列化
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      agentId: this.agentId,
      action: this.action,
      params: this.params,
      status: this.status,
      priority: this.priority,
      dependencies: this.dependencies,
      result: this.result,
      error: this.error?.message || this.error,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    }
  }
}

/**
 * 任务队列
 */
export class TaskQueue {
  constructor() {
    this.tasks = new Map()
    this.completedTaskIds = new Set()
    this.listeners = []
  }

  /**
   * 添加任务
   */
  add(taskOrOptions) {
    const task = taskOrOptions instanceof Task ? taskOrOptions : new Task(taskOrOptions)
    this.tasks.set(task.id, task)
    
    // 检查是否被阻塞
    if (task.dependencies.length > 0 && !task.canRun(this.completedTaskIds)) {
      task.status = TaskStatus.BLOCKED
    }
    
    this._emit('task:added', task)
    return task
  }

  /**
   * 批量添加任务
   */
  addAll(tasksOrOptions) {
    return tasksOrOptions.map(t => this.add(t))
  }

  /**
   * 获取任务
   */
  get(taskId) {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有任务
   */
  getAll() {
    return Array.from(this.tasks.values())
  }

  /**
   * 获取下一个可执行的任务
   */
  getNextRunnable() {
    const runnableTasks = this.getAll()
      .filter(task => task.canRun(this.completedTaskIds))
      .sort((a, b) => b.priority - a.priority) // 高优先级优先
    
    return runnableTasks[0] || null
  }

  /**
   * 获取所有可执行的任务（用于并行执行）
   */
  getAllRunnable() {
    return this.getAll()
      .filter(task => task.canRun(this.completedTaskIds))
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * 标记任务完成
   */
  markCompleted(taskId, result) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.complete(result)
      this.completedTaskIds.add(taskId)
      this._unblockDependents(taskId)
      this._emit('task:completed', task)
    }
    return task
  }

  /**
   * 标记任务失败
   */
  markFailed(taskId, error) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.fail(error)
      this._emit('task:failed', task)
    }
    return task
  }

  /**
   * 解除被阻塞的任务
   */
  _unblockDependents(completedTaskId) {
    this.getAll().forEach(task => {
      if (task.status === TaskStatus.BLOCKED && task.canRun(this.completedTaskIds)) {
        task.status = TaskStatus.PENDING
        this._emit('task:unblocked', task)
      }
    })
  }

  /**
   * 获取队列统计
   */
  getStats() {
    const all = this.getAll()
    return {
      total: all.length,
      pending: all.filter(t => t.status === TaskStatus.PENDING).length,
      blocked: all.filter(t => t.status === TaskStatus.BLOCKED).length,
      running: all.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: all.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: all.filter(t => t.status === TaskStatus.FAILED).length
    }
  }

  /**
   * 清空队列
   */
  clear() {
    this.tasks.clear()
    this.completedTaskIds.clear()
    this._emit('queue:cleared')
  }

  /**
   * 事件监听
   */
  on(event, callback) {
    this.listeners.push({ event, callback })
    return () => {
      this.listeners = this.listeners.filter(l => l.callback !== callback)
    }
  }

  _emit(event, data) {
    this.listeners
      .filter(l => l.event === event || l.event === '*')
      .forEach(l => l.callback(event, data))
  }
}

export default TaskQueue
