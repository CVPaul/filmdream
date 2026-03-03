import express from 'express'
import db, { getNextId, findById } from '../db.js'

const router = express.Router()

// GET /api/tasks/stats — 必须在 /:id 之前注册，防止被参数路由拦截
router.get('/stats', (req, res) => {
  try {
    const tasks = db.data.tasks || []
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length
    }
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/tasks — 列出任务，支持 ?status=&type= 过滤，按 createdAt 降序
router.get('/', (req, res) => {
  try {
    let tasks = db.data.tasks || []

    // 按 status 过滤
    if (req.query.status) {
      tasks = tasks.filter(t => t.status === req.query.status)
    }

    // 按 type 过滤
    if (req.query.type) {
      tasks = tasks.filter(t => t.type === req.query.type)
    }

    // 按 createdAt 降序排列
    tasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.json({ success: true, data: tasks })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/tasks — 创建任务
router.post('/', async (req, res) => {
  try {
    const { name, type, params, description } = req.body

    if (!name) {
      return res.status(400).json({ error: 'name is required' })
    }
    if (!type) {
      return res.status(400).json({ error: 'type is required' })
    }

    const task = {
      id: getNextId('tasks'),
      name,
      type,
      description: description || '',
      params: params || {},
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      retryCount: 0
    }

    db.data.tasks.push(task)
    await db.write()

    res.status(201).json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/tasks/:id — 获取单个任务
router.get('/:id', (req, res) => {
  try {
    const task = findById('tasks', req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    res.json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/tasks/:id — 取消任务（status → cancelled）
router.delete('/:id', async (req, res) => {
  try {
    const task = findById('tasks', req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // 已完成或已取消的任务不可取消
    if (task.status === 'completed' || task.status === 'cancelled') {
      return res.status(400).json({
        error: `Cannot cancel task with status '${task.status}'`
      })
    }

    task.status = 'cancelled'
    await db.write()

    res.json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/tasks/:id/retry — 重试失败任务（status → pending, error → null）
router.post('/:id/retry', async (req, res) => {
  try {
    const task = findById('tasks', req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    if (task.status !== 'failed') {
      return res.status(400).json({
        error: `Only failed tasks can be retried. Current status: '${task.status}'`
      })
    }

    task.status = 'pending'
    task.error = null
    task.progress = 0
    task.startedAt = null
    task.completedAt = null
    task.retryCount = (task.retryCount || 0) + 1
    await db.write()

    res.json({ success: true, data: task })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
