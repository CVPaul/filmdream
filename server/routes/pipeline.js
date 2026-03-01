import express from 'express'
import pipelineState from '../agents/pipeline-state.js'
import { orchestrator } from '../agents/index.js'

const router = express.Router()

// POST /api/pipeline/start
router.post('/start', async (req, res) => {
  try {
    const { concept, brief } = req.body
    if (!concept && !brief) {
      return res.status(400).json({ success: false, error: 'concept or brief required' })
    }
    const result = await orchestrator.startPipeline(concept, brief)
    res.json({ success: true, data: { pipelineId: result.pipelineId, status: result.status } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/pipeline
router.get('/', async (req, res) => {
  try {
    const pipelines = await pipelineState.getAll()
    const sorted = pipelines.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json({ success: true, data: sorted })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/pipeline/:id/status
router.get('/:id/status', async (req, res) => {
  try {
    const pipeline = await pipelineState.getById(req.params.id)
    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline not found' })
    }
    res.json({ success: true, data: pipeline })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/pipeline/:id/stream — SSE endpoint
router.get('/:id/stream', async (req, res) => {
  const { id } = req.params

  // Verify pipeline exists
  const pipeline = await pipelineState.getById(id)
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Pipeline not found' })
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  // Send initial connection event
  sendEvent('connected', { pipelineId: id })

  // Subscribe to pipeline events
  const eventTypes = [
    'task:started',
    'task:completed',
    'task:failed',
    'phase:started',
    'phase:completed',
    'pipeline:completed',
    'pipeline:failed',
    'pipeline:progress'
  ]

  const unsubscribers = eventTypes.map(type =>
    pipelineState.on(type, (data) => {
      if (data.pipelineId !== id) return
      sendEvent(type, data)
    })
  )

  // Keepalive every 30 seconds
  const keepaliveInterval = setInterval(() => {
    res.write(':\n\n')
  }, 30000)

  // Cleanup on client disconnect
  req.on('close', () => {
    unsubscribers.forEach(unsub => unsub())
    clearInterval(keepaliveInterval)
  })
})

// POST /api/pipeline/:id/restart-phase
router.post('/:id/restart-phase', async (req, res) => {
  try {
    const { id } = req.params
    const { phaseId } = req.body
    await pipelineState.resetPhase(id, phaseId)
    // Execute in background
    orchestrator.execute(id).catch(console.error)
    res.json({ success: true, data: { pipelineId: id, phaseId, status: 'restarted' } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/pipeline/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    await pipelineState.updateStatus(id, 'cancelled')
    res.json({ success: true, data: { pipelineId: id, status: 'cancelled' } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/pipeline/:id/results
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params
    const pipeline = await pipelineState.getById(id)
    if (!pipeline) {
      return res.status(404).json({ success: false, error: 'Pipeline not found' })
    }
    res.json({
      success: true,
      data: {
        pipelineId: id,
        phases: pipeline.phases,
        completedAt: pipeline.updatedAt
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
