import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

import db, { initDatabase } from './db.js'
import imagesRouter from './routes/images.js'
import charactersRouter from './routes/characters.js'
import storyRouter from './routes/story.js'
import scenesRouter from './routes/scenes.js'
import shotsRouter from './routes/shots.js'
import voiceoversRouter from './routes/voiceovers.js'
import sceneFlowRouter from './routes/sceneFlow.js'
import agentRouter from './routes/agent.js'
import llmRouter from './routes/llm.js'
import assets3dRouter from './routes/assets3d.js'
import multiangleRouter from './routes/multiangle.js'
import videoRouter from './routes/video.js'
import comfyuiRouter from './routes/comfyui.js'
import agentsRouter from './routes/agents.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// 确保必要的目录存在
const uploadDir = join(__dirname, 'uploads')
const audioDir = join(uploadDir, 'audio')
const dataDir = join(__dirname, 'data')
const assets3dDir = join(dataDir, 'assets3d')
const multiangleDir = join(dataDir, 'multiangle')

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true })
}
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true })
}
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}
if (!existsSync(assets3dDir)) {
  mkdirSync(assets3dDir, { recursive: true })
}
if (!existsSync(multiangleDir)) {
  mkdirSync(multiangleDir, { recursive: true })
}

// 中间件
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadDir))
app.use('/assets3d', express.static(assets3dDir))
app.use('/data/multiangle', express.static(multiangleDir))

// 初始化数据库
await initDatabase()

// API路由
app.use('/api/images', imagesRouter)
app.use('/api/characters', charactersRouter)
app.use('/api/story', storyRouter)
app.use('/api/scenes', scenesRouter)
app.use('/api/shots', shotsRouter)
app.use('/api/voiceovers', voiceoversRouter)
app.use('/api/scene-flow', sceneFlowRouter)
app.use('/api/agent', agentRouter)
app.use('/api/llm', llmRouter)
app.use('/api/assets3d', assets3dRouter)
app.use('/api/multiangle', multiangleRouter)
app.use('/api/video', videoRouter)
app.use('/api/comfyui', comfyuiRouter)
app.use('/api/agents', agentsRouter)

// 提供前端静态文件 (生产模式)
// 支持两种目录结构: client/dist (开发) 或 client (发布包)
let clientDir = join(__dirname, '..', 'client', 'dist')
if (!existsSync(clientDir)) {
  clientDir = join(__dirname, '..', 'client')
}

if (existsSync(join(clientDir, 'index.html'))) {
  app.use(express.static(clientDir))
  // SPA fallback - 所有非 API 请求返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || 
        req.path.startsWith('/assets3d/') || req.path.startsWith('/data/')) {
      return next()
    }
    res.sendFile(join(clientDir, 'index.html'))
  })
  console.log('📦 Serving static files from', clientDir)
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FilmDream Studio API is running' })
})

// 统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      images: db.data.images.length,
      characters: db.data.characters.length,
      stories: db.data.story.length,
      scenes: db.data.scenes.length,
      shots: db.data.shots.length,
      voiceovers: db.data.voiceovers?.length || 0,
      voiceProfiles: db.data.voiceProfiles?.length || 0,
      sceneConnections: db.data.sceneConnections?.length || 0,
      assets3d: db.data.assets3d?.length || 0,
      multiAngleJobs: db.data.multiAngleJobs?.length || 0,
      videoTasks: db.data.videoTasks?.length || 0,
      chatConversations: db.data.chatConversations?.length || 0,
    }
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🎬 FilmDream Studio Server                      ║
  ║                                                   ║
  ║   Server running at http://localhost:${PORT}        ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `)
})
