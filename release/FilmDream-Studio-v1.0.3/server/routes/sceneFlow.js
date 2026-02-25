import express from 'express'
import db, { getNextId, findById, deleteById } from '../db.js'

const router = express.Router()

// 转场类型
export const TRANSITION_TYPES = [
  { value: 'cut', label: '硬切', icon: '⚡' },
  { value: 'fade', label: '淡入淡出', icon: '🌫️' },
  { value: 'dissolve', label: '溶解', icon: '💨' },
  { value: 'wipe', label: '划变', icon: '➡️' },
  { value: 'zoom', label: '变焦', icon: '🔍' },
  { value: 'match', label: '匹配剪辑', icon: '🔗' },
  { value: 'flashback', label: '闪回', icon: '⏪' },
  { value: 'flashforward', label: '闪前', icon: '⏩' },
]

// 连接条件类型
export const CONNECTION_CONDITIONS = [
  { value: 'sequential', label: '顺序', description: '按时间线顺序' },
  { value: 'branching', label: '分支', description: '多个可能的后续' },
  { value: 'parallel', label: '平行', description: '同时发生' },
  { value: 'conditional', label: '条件', description: '根据剧情条件' },
]

// 获取完整的流程图数据
router.get('/', async (req, res) => {
  try {
    // 获取所有场景（作为节点）
    const scenes = db.data.scenes.map(scene => {
      const position = db.data.scenePositions.find(p => p.sceneId === scene.id)
      return {
        ...scene,
        // 流程图位置
        x: position?.x ?? 100,
        y: position?.y ?? 100,
        // 获取角色数量
        characterCount: db.data.sceneCharacters.filter(sc => sc.sceneId === scene.id).length
      }
    })
    
    // 获取所有连接（作为边）
    const connections = db.data.sceneConnections.map(conn => ({
      ...conn,
      // 获取源和目标场景名称
      sourceName: findById('scenes', conn.sourceId)?.name,
      targetName: findById('scenes', conn.targetId)?.name
    }))
    
    res.json({
      nodes: scenes,
      edges: connections,
      transitionTypes: TRANSITION_TYPES,
      conditionTypes: CONNECTION_CONDITIONS
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个连接
router.get('/connections/:id', async (req, res) => {
  try {
    const connection = findById('sceneConnections', req.params.id)
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' })
    }
    res.json(connection)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建场景连接
router.post('/connections', async (req, res) => {
  try {
    const { sourceId, targetId, transitionType, condition, description, order } = req.body
    
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' })
    }
    
    // 检查是否已存在相同的连接
    const existing = db.data.sceneConnections.find(
      c => c.sourceId === parseInt(sourceId) && c.targetId === parseInt(targetId)
    )
    if (existing) {
      return res.status(400).json({ error: 'Connection already exists' })
    }
    
    const newConnection = {
      id: getNextId('sceneConnections'),
      sourceId: parseInt(sourceId),
      targetId: parseInt(targetId),
      transitionType: transitionType || 'cut',
      condition: condition || 'sequential',
      description: description || null,
      order: order ?? 0,
      createdAt: new Date().toISOString()
    }
    
    db.data.sceneConnections.push(newConnection)
    await db.write()
    
    res.status(201).json(newConnection)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新场景连接
router.put('/connections/:id', async (req, res) => {
  try {
    const { transitionType, condition, description, order } = req.body
    const connection = findById('sceneConnections', req.params.id)
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' })
    }
    
    if (transitionType !== undefined) connection.transitionType = transitionType
    if (condition !== undefined) connection.condition = condition
    if (description !== undefined) connection.description = description
    if (order !== undefined) connection.order = order
    
    await db.write()
    res.json(connection)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除场景连接
router.delete('/connections/:id', async (req, res) => {
  try {
    const deleted = deleteById('sceneConnections', req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Connection not found' })
    }
    await db.write()
    res.json({ success: true, message: 'Connection deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新场景位置（用于拖拽）
router.put('/positions/:sceneId', async (req, res) => {
  try {
    const { x, y } = req.body
    const sceneId = parseInt(req.params.sceneId)
    
    // 检查场景是否存在
    const scene = findById('scenes', sceneId)
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' })
    }
    
    // 查找或创建位置记录
    let position = db.data.scenePositions.find(p => p.sceneId === sceneId)
    
    if (position) {
      position.x = x
      position.y = y
    } else {
      position = {
        id: getNextId('scenePositions'),
        sceneId,
        x,
        y
      }
      db.data.scenePositions.push(position)
    }
    
    await db.write()
    res.json(position)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 批量更新位置
router.put('/positions', async (req, res) => {
  try {
    const { positions } = req.body
    
    if (!Array.isArray(positions)) {
      return res.status(400).json({ error: 'positions must be an array' })
    }
    
    for (const pos of positions) {
      const sceneId = parseInt(pos.sceneId)
      let existing = db.data.scenePositions.find(p => p.sceneId === sceneId)
      
      if (existing) {
        existing.x = pos.x
        existing.y = pos.y
      } else {
        db.data.scenePositions.push({
          id: getNextId('scenePositions'),
          sceneId,
          x: pos.x,
          y: pos.y
        })
      }
    }
    
    await db.write()
    res.json({ success: true, message: 'Positions updated' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 自动布局（计算场景位置）
router.post('/auto-layout', async (req, res) => {
  try {
    const scenes = db.data.scenes
    const connections = db.data.sceneConnections
    
    // 简单的层级布局算法
    // 1. 找到起始节点（没有入边的节点）
    const hasIncoming = new Set(connections.map(c => c.targetId))
    const startNodes = scenes.filter(s => !hasIncoming.has(s.id))
    
    // 2. BFS 分层
    const levels = []
    const visited = new Set()
    let currentLevel = startNodes.length > 0 ? startNodes : [scenes[0]].filter(Boolean)
    
    while (currentLevel.length > 0 && visited.size < scenes.length) {
      const levelNodes = []
      const nextLevel = []
      
      for (const node of currentLevel) {
        if (node && !visited.has(node.id)) {
          visited.add(node.id)
          levelNodes.push(node)
          
          // 找到所有出边的目标
          const outgoing = connections.filter(c => c.sourceId === node.id)
          for (const conn of outgoing) {
            const target = scenes.find(s => s.id === conn.targetId)
            if (target && !visited.has(target.id)) {
              nextLevel.push(target)
            }
          }
        }
      }
      
      if (levelNodes.length > 0) {
        levels.push(levelNodes)
      }
      currentLevel = nextLevel
    }
    
    // 处理未访问的节点（孤立节点）
    const unvisited = scenes.filter(s => !visited.has(s.id))
    if (unvisited.length > 0) {
      levels.push(unvisited)
    }
    
    // 3. 计算位置
    const nodeWidth = 200
    const nodeHeight = 120
    const horizontalGap = 100
    const verticalGap = 80
    const startX = 50
    const startY = 50
    
    const newPositions = []
    
    levels.forEach((level, levelIndex) => {
      const levelWidth = level.length * nodeWidth + (level.length - 1) * horizontalGap
      const levelStartX = startX
      
      level.forEach((node, nodeIndex) => {
        newPositions.push({
          sceneId: node.id,
          x: levelStartX + nodeIndex * (nodeWidth + horizontalGap),
          y: startY + levelIndex * (nodeHeight + verticalGap)
        })
      })
    })
    
    // 4. 保存位置
    for (const pos of newPositions) {
      let existing = db.data.scenePositions.find(p => p.sceneId === pos.sceneId)
      
      if (existing) {
        existing.x = pos.x
        existing.y = pos.y
      } else {
        db.data.scenePositions.push({
          id: getNextId('scenePositions'),
          sceneId: pos.sceneId,
          x: pos.x,
          y: pos.y
        })
      }
    }
    
    await db.write()
    
    res.json({ 
      success: true, 
      message: 'Auto layout applied',
      positions: newPositions,
      levels: levels.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取场景的所有连接（入边和出边）
router.get('/scene/:sceneId/connections', async (req, res) => {
  try {
    const sceneId = parseInt(req.params.sceneId)
    
    const incoming = db.data.sceneConnections.filter(c => c.targetId === sceneId)
    const outgoing = db.data.sceneConnections.filter(c => c.sourceId === sceneId)
    
    res.json({
      incoming: incoming.map(c => ({
        ...c,
        sourceName: findById('scenes', c.sourceId)?.name
      })),
      outgoing: outgoing.map(c => ({
        ...c,
        targetName: findById('scenes', c.targetId)?.name
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
