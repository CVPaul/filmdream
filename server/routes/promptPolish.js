import { Router } from 'express'
import db, { getNextId } from '../db.js'
import providerManager from '../providers/index.js'
import promptPolisherAgent from '../agents/presets/prompt-polisher.js'

const router = Router()

/**
 * POST /api/prompt-polish
 * 将场景/故事文本转换为图像提示词，SSE流式输出
 */
router.post('/', async (req, res) => {
  try {
    const {
      text,
      characterIds,
      sceneId,
      style,
      provider,
      model
    } = req.body

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text is required'
      })
    }

    // 设置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 构建用户消息
    let userMessage = `请将以下内容转换为高质量的图像生成提示词：\n\n${text}`

    // 如果提供了角色ID，获取角色描述
    if (characterIds && Array.isArray(characterIds) && characterIds.length > 0) {
      const characters = characterIds
        .map(id => db.data.characters.find(c => c.id === parseInt(id)))
        .filter(Boolean)

      if (characters.length > 0) {
        userMessage += '\n\n## 相关角色信息\n'
        for (const char of characters) {
          userMessage += `\n### ${char.name}\n`
          if (char.description) userMessage += `描述：${char.description}\n`
          if (char.appearance) userMessage += `外观：${char.appearance}\n`
          if (char.type) userMessage += `类型：${char.type}\n`
        }
      }
    }

    // 如果提供了场景ID，获取场景上下文
    if (sceneId) {
      const scene = db.data.scenes.find(s => s.id === parseInt(sceneId))
      if (scene) {
        userMessage += '\n\n## 场景信息\n'
        if (scene.name) userMessage += `场景名称：${scene.name}\n`
        if (scene.description) userMessage += `场景描述：${scene.description}\n`
        if (scene.location) userMessage += `地点：${scene.location}\n`
        if (scene.mood) userMessage += `氛围：${scene.mood}\n`
        if (scene.timeOfDay) userMessage += `时间：${scene.timeOfDay}\n`
      }
    }

    // 如果提供了风格，加入请求
    if (style) {
      userMessage += `\n\n## 风格要求\n请使用 ${style} 风格生成提示词。`
    }

    const messages = [
      {
        role: 'system',
        content: promptPolisherAgent.systemPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ]

    const stream = providerManager.chatStream({
      provider,
      model,
      messages
    })

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('Prompt polish stream error:', error)

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      })
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  }
})

/**
 * POST /api/prompt-polish/batch
 * 批量提示词润色，创建异步任务
 */
router.post('/batch', async (req, res) => {
  try {
    const { items, provider, model } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items array is required and must not be empty'
      })
    }

    const taskId = getNextId('tasks')
    const now = new Date().toISOString()

    const task = {
      id: taskId,
      name: `批量提示词润色 (${items.length} 条)`,
      type: 'prompt_polish',
      description: `批量将 ${items.length} 条文本转换为图像生成提示词`,
      params: { items, provider, model },
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      retryCount: 0
    }

    db.data.tasks.push(task)
    await db.write()

    res.json({
      success: true,
      data: { taskId }
    })
  } catch (error) {
    console.error('Prompt polish batch error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
