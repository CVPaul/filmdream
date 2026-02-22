import express from 'express'
import db, { getNextId, findById, deleteById } from '../db.js'

const router = express.Router()

// 获取所有章节
router.get('/', async (req, res) => {
  try {
    const chapters = [...db.data.story].sort((a, b) => a.orderIndex - b.orderIndex)
    res.json(chapters)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个章节
router.get('/:id', async (req, res) => {
  try {
    const chapter = findById('story', req.params.id)
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }
    res.json(chapter)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建章节
router.post('/', async (req, res) => {
  try {
    const { title, content, chapter } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    // 获取最大orderIndex
    const maxOrder = db.data.story.reduce((max, c) => Math.max(max, c.orderIndex || 0), 0)

    const newChapter = {
      id: getNextId('story'),
      title,
      content: content || '',
      chapter: chapter || 1,
      orderIndex: maxOrder + 1,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.data.story.push(newChapter)
    await db.write()

    res.status(201).json(newChapter)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新章节
router.put('/:id', async (req, res) => {
  try {
    const { title, content, chapter, orderIndex } = req.body
    const storyChapter = findById('story', req.params.id)

    if (!storyChapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }

    if (title !== undefined) storyChapter.title = title
    if (content !== undefined) storyChapter.content = content
    if (chapter !== undefined) storyChapter.chapter = chapter
    if (orderIndex !== undefined) storyChapter.orderIndex = orderIndex
    storyChapter.version++
    storyChapter.updatedAt = new Date().toISOString()

    await db.write()
    res.json(storyChapter)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 重新排序章节
router.post('/reorder', async (req, res) => {
  try {
    const { order } = req.body

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'Order array is required' })
    }

    for (const item of order) {
      const chapter = findById('story', item.id)
      if (chapter) {
        chapter.orderIndex = item.orderIndex
      }
    }

    await db.write()
    res.json({ success: true, message: 'Chapters reordered' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除章节
router.delete('/:id', async (req, res) => {
  try {
    const deleted = deleteById('story', req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Chapter not found' })
    }

    await db.write()
    res.json({ success: true, message: 'Chapter deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
