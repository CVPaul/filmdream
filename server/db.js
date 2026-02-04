import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 确保数据目录存在
const dataDir = join(__dirname, 'data')
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

// 默认数据结构
const defaultData = {
  images: [],
  characters: [],
  scenes: [],
  sceneCharacters: [],
  sceneConnections: [], // 场景间的连接关系（流程图边）
  scenePositions: [],   // 场景在流程图中的位置
  story: [],
  shots: [],
  shotCharacters: [],
  voiceovers: [],
  voiceProfiles: [],
  // 对话系统
  chatConversations: [],  // 对话会话
  chatMessages: [],       // 对话消息
  // 3D 资产系统
  assets3d: [],           // 3D 模型资产
  asset3dVariants: [],    // 3D 模型变体（不同角度/姿态渲染）
  // 多角度生成系统
  multiAngleJobs: [],     // 多角度生成任务
  meta: {
    nextId: {
      images: 1,
      characters: 1,
      scenes: 1,
      sceneCharacters: 1,
      sceneConnections: 1,
      scenePositions: 1,
      story: 1,
      shots: 1,
      shotCharacters: 1,
      voiceovers: 1,
      voiceProfiles: 1,
      chatConversations: 1,
      chatMessages: 1,
      assets3d: 1,
      asset3dVariants: 1,
      multiAngleJobs: 1
    }
  }
}

// 初始化数据库
const adapter = new JSONFile(join(dataDir, 'db.json'))
const db = new Low(adapter, defaultData)

// 读取数据
await db.read()

// 如果数据库为空，使用默认值
if (!db.data) {
  db.data = defaultData
  await db.write()
}

// 辅助函数：获取下一个ID
export function getNextId(collection) {
  const id = db.data.meta.nextId[collection]
  db.data.meta.nextId[collection]++
  return id
}

// 辅助函数：按ID查找
export function findById(collection, id) {
  return db.data[collection].find(item => item.id === parseInt(id))
}

// 辅助函数：按ID删除
export function deleteById(collection, id) {
  const index = db.data[collection].findIndex(item => item.id === parseInt(id))
  if (index !== -1) {
    db.data[collection].splice(index, 1)
    return true
  }
  return false
}

// 初始化检查
export async function initDatabase() {
  console.log('Database initialized successfully (LowDB/JSON)')
}

export default db
