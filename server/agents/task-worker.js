
import db from '../db.js'

const MAX_CONCURRENT = 3
const POLL_INTERVAL_MS = 2000

const runningTaskIds = new Set()

let pollTimer = null


async function executeImageGen(task) {
  console.log(`[task-worker] Executing ${task.type} task #${task.id}: ${task.name}`)
  await new Promise(resolve => setTimeout(resolve, 2000))
  return { message: 'stub executed', taskId: task.id, type: task.type }
}

async function executePromptPolish(task) {
  console.log(`[task-worker] Executing ${task.type} task #${task.id}: ${task.name}`)
  await new Promise(resolve => setTimeout(resolve, 2000))
  return { message: 'stub executed', taskId: task.id, type: task.type }
}

async function executeStoryboardGen(task) {
  console.log(`[task-worker] Executing ${task.type} task #${task.id}: ${task.name}`)
  await new Promise(resolve => setTimeout(resolve, 2000))
  return { message: 'stub executed', taskId: task.id, type: task.type }
}

async function executeTask(task) {
  switch (task.type) {
    case 'image_gen':      return executeImageGen(task)
    case 'prompt_polish':  return executePromptPolish(task)
    case 'storyboard_gen': return executeStoryboardGen(task)
    default:
      throw new Error(`Unknown task type: ${task.type}`)
  }
}


async function runTask(task) {
  runningTaskIds.add(task.id)

  task.status = 'running'
  task.startedAt = new Date().toISOString()
  await db.write()

  try {
    const result = await executeTask(task)

    const currentTask = db.data.tasks.find(t => t.id === task.id)
    if (currentTask && currentTask.status === 'running') {
      currentTask.status = 'completed'
      currentTask.completedAt = new Date().toISOString()
      currentTask.progress = 100
      currentTask.result = result
      await db.write()
    }
  } catch (err) {
    console.error(`[task-worker] Task #${task.id} failed:`, err.message)

    const currentTask = db.data.tasks.find(t => t.id === task.id)
    if (currentTask && currentTask.status === 'running') {
      currentTask.status = 'failed'
      currentTask.error = err.message
      currentTask.completedAt = new Date().toISOString()
      await db.write()
    }
  } finally {
    runningTaskIds.delete(task.id)
  }
}

function poll() {
  if (!db.data || !db.data.tasks) return

  const available = MAX_CONCURRENT - runningTaskIds.size
  if (available <= 0) return

  const pendingTasks = db.data.tasks.filter(
    t => t.status === 'pending' && !runningTaskIds.has(t.id)
  )

  const toRun = pendingTasks.slice(0, available)
  for (const task of toRun) {
    runTask(task).catch(err => {
      console.error(`[task-worker] Unhandled error in runTask #${task.id}:`, err)
    })
  }
}


export function startWorker() {
  if (pollTimer !== null) return
  console.log('[task-worker] Starting background task worker (interval: 2s, maxConcurrent: 3)')
  pollTimer = setInterval(poll, POLL_INTERVAL_MS)
}

export function stopWorker() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
    console.log('[task-worker] Stopped.')
  }
}
