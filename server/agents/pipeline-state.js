import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// pipeline 状态管理器
class PipelineState {
  constructor() {
    // 事件监听器
    this.listeners = []
    // 数据库初始化
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const dataDir = join(__dirname, '../data')
    this.adapter = new JSONFile(join(dataDir, 'pipeline-state.json'))
    this.db = new Low(this.adapter, { pipelines: [] })
    this._dbReady = this.db.read().then(() => {
      if (!this.db.data) {
        this.db.data = { pipelines: [] }
        return this.db.write()
      }
    })
  }

  // 事件监听
  on(event, callback) {
    this.listeners.push({ event, callback })
    return () => {
      this.listeners = this.listeners.filter(l => l.callback !== callback)
    }
  }

  // 事件触发
  _emit(event, data) {
    this.listeners
      .filter(l => l.event === event || l.event === '*')
      .forEach(l => l.callback(event, data))
  }

  // 创建新 pipeline
  async create(concept, brief = null) {
    await this._dbReady
    await this.db.read()
    const id = 'pipeline_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8)
    const now = new Date().toISOString()
    const pipeline = {
      id,
      concept,
      brief,
      status: 'idle',
      phases: [],
      checkpoints: {},
      createdAt: now,
      updatedAt: now,
      completedAt: null
    }
    this.db.data.pipelines.push(pipeline)
    await this.db.write()
    this._emit('pipeline:created', pipeline)
    return pipeline
  }

  // 按ID获取 pipeline
  async getById(id) {
    await this._dbReady
    await this.db.read()
    return this.db.data.pipelines.find(p => p.id === id) || null
  }

  // 获取所有 pipeline
  async getAll() {
    await this._dbReady
    await this.db.read()
    return [...this.db.data.pipelines]
  }

  // 更新 pipeline 状态
  async updateStatus(pipelineId, status) {
    await this._dbReady
    await this.db.read()
    const pipeline = this.db.data.pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null
    pipeline.status = status
    pipeline.updatedAt = new Date().toISOString()
    if (status === 'completed') pipeline.completedAt = pipeline.updatedAt
    await this.db.write()
    this._emit(`pipeline:${status}`, pipeline)
    return pipeline
  }

  // 更新阶段状态
  async updatePhaseStatus(pipelineId, phaseId, status) {
    await this._dbReady
    await this.db.read()
    const pipeline = this.db.data.pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null
    const phase = pipeline.phases.find(ph => ph.id === phaseId)
    if (!phase) return null
    phase.status = status
    pipeline.updatedAt = new Date().toISOString()
    await this.db.write()
    this._emit(`phase:${status}`, { pipelineId, phase })
    return phase
  }

  // 更新任务状态
  async updateTaskStatus(pipelineId, phaseId, taskId, status, result = null) {
    await this._dbReady
    await this.db.read()
    const pipeline = this.db.data.pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null
    const phase = pipeline.phases.find(ph => ph.id === phaseId)
    if (!phase) return null
    const task = phase.tasks.find(t => t.taskId === taskId)
    if (!task) return null
    task.status = status
    if (result !== undefined) task.result = result
    if (status === 'failed') task.error = result
    if (status === 'running') task.startedAt = new Date().toISOString()
    if (status === 'completed' || status === 'failed') task.completedAt = new Date().toISOString()
    pipeline.updatedAt = new Date().toISOString()
    await this.db.write()
    this._emit(`task:${status}`, { pipelineId, phaseId, task })
    return task
  }

  // 添加阶段
  async addPhases(pipelineId, phases) {
    await this._dbReady
    await this.db.read()
    const pipeline = this.db.data.pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null
    pipeline.phases.push(...phases.map(ph => ({
      ...ph,
      status: ph.status || 'pending',
      tasks: Array.isArray(ph.tasks) ? ph.tasks : []
    })))
    pipeline.updatedAt = new Date().toISOString()
    await this.db.write()
    return pipeline.phases
  }

  // 保存检查点
  async saveCheckpoint(pipelineId, phaseId, data) {
    await this._dbReady
    await this.db.read()
    const pipeline = this.db.data.pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null
    pipeline.checkpoints[phaseId] = data
    pipeline.updatedAt = new Date().toISOString()
    await this.db.write()
    return true
  }

  // 加载检查点
  async loadCheckpoint(pipelineId, phaseId) {
    await this._dbReady
    await this.db.read()
    const pipeline = this.db.data.pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null
    return pipeline.checkpoints[phaseId] || null
  }

  // 重置阶段
  async resetPhase(pipelineId, phaseId) {
    await this._dbReady
    await this.db.read()
    const pipeline = this.db.data.pipelines.find(p => p.id === pipelineId)
    if (!pipeline) return null
    const phase = pipeline.phases.find(ph => ph.id === phaseId)
    if (!phase) return null
    phase.status = 'pending'
    phase.tasks = []
    pipeline.updatedAt = new Date().toISOString()
    await this.db.write()
    return phase
  }
}

export const pipelineState = new PipelineState()
export { PipelineState }
export default pipelineState
