import express from 'express'
import multer from 'multer'
import db, { getNextId } from '../db.js'

const router = express.Router()

// multer: in-memory storage for .txt files (no disk needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true)
    } else {
      cb(new Error('只支持 .txt 文件'))
    }
  }
})

/**
 * Parse text into chapters.
 * Supports two modes:
 * - chapters: splits by title patterns (第X章, Chapter X, ## heading)
 * - single: whole text as one chapter
 */
function parseText(text, mode = 'chapters') {
  if (mode === 'single') {
    return [{ title: '导入内容', content: text.trim() }]
  }

  // Split by Chinese chapter headers, Markdown headers, or English Chapter N
  const lines = text.split('\n')
  const chapters = []
  let currentTitle = null
  let currentLines = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Detect chapter heading
    const isHeading =
      /^第[一二三四五六七八九十百千\d]+[章节回]/.test(trimmed) ||
      /^Chapter\s+\d+/i.test(trimmed) ||
      /^#{1,3}\s+\S/.test(trimmed)

    if (isHeading) {
      // Save previous chapter
      if (currentTitle !== null) {
        chapters.push({ title: currentTitle, content: currentLines.join('\n').trim() })
      }
      // Extract heading text (strip ## prefix)
      currentTitle = trimmed.replace(/^#{1,3}\s+/, '')
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  // Last chapter
  if (currentTitle !== null) {
    chapters.push({ title: currentTitle, content: currentLines.join('\n').trim() })
  }

  // If no chapters detected, fall back to single mode
  if (chapters.length === 0) {
    return [{ title: '导入内容', content: text.trim() }]
  }
  return chapters
}

// POST /api/import/text — parse plain text
router.post('/text', (req, res) => {
  try {
    const { text, mode = 'chapters' } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ error: '文本内容不能为空' })
    }
    const chapters = parseText(text, mode)
    res.json({ success: true, data: { chapters, total: chapters.length } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/import/file — upload .txt file
router.post('/file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' })
    }
    const text = req.file.buffer.toString('utf-8')
    const mode = req.body.mode || 'chapters'
    const chapters = parseText(text, mode)
    res.json({ success: true, data: { chapters, total: chapters.length } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/import/confirm — write parsed chapters to db.data.story
router.post('/confirm', async (req, res) => {
  try {
    const { chapters } = req.body
    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: '没有可导入的章节' })
    }

    const maxOrder = db.data.story.reduce((max, c) => Math.max(max, c.orderIndex || 0), 0)

    const created = chapters.map((ch, idx) => {
      const chapter = {
        id: getNextId('story'),
        title: ch.title || `章节 ${idx + 1}`,
        content: ch.content || '',
        chapter: db.data.story.length + idx + 1,
        orderIndex: maxOrder + idx + 1,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      db.data.story.push(chapter)
      return chapter
    })

    await db.write()
    res.json({ success: true, data: { created, total: created.length } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
