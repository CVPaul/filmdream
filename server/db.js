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
  story: [],
  shots: [],
  shotCharacters: [],
  voiceovers: [],
  voiceProfiles: [],
  meta: {
    nextId: {
      images: 1,
      characters: 1,
      scenes: 1,
      sceneCharacters: 1,
      story: 1,
      shots: 1,
      shotCharacters: 1,
      voiceovers: 1,
      voiceProfiles: 1
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
