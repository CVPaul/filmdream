import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import db, { getNextId, findById, deleteById } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// 确保音频上传目录存在
const audioDir = join(__dirname, '..', 'uploads', 'audio')
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true })
}

// 配置音频文件存储
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/webm']
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|m4a|webm)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid audio file type'), false)
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
})

// ==================== 角色音色配置 ====================

// 获取所有角色音色配置
router.get('/profiles', async (req, res) => {
  try {
    const profiles = db.data.voiceProfiles || []
    res.json(profiles)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个角色的音色配置
router.get('/profiles/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId)
    const profile = (db.data.voiceProfiles || []).find(p => p.characterId === characterId)
    
    if (!profile) {
      return res.status(404).json({ error: 'Voice profile not found' })
    }
    
    res.json(profile)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建/更新角色音色配置
router.put('/profiles/:characterId', async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId)
    const { voiceType, pitch, defaultEmotion, defaultRate, accent, notes } = req.body
    
    // 确保 voiceProfiles 数组存在
    if (!db.data.voiceProfiles) {
      db.data.voiceProfiles = []
    }
    
    const existingIndex = db.data.voiceProfiles.findIndex(p => p.characterId === characterId)
    
    const profileData = {
      characterId,
      voiceType: voiceType || 'male-adult',
      pitch: pitch || 'medium',
      defaultEmotion: defaultEmotion || 'neutral',
      defaultRate: defaultRate || 'medium',
      accent: accent || '',
      notes: notes || '',
      updatedAt: new Date().toISOString()
    }
    
    if (existingIndex >= 0) {
      // 更新现有配置
      db.data.voiceProfiles[existingIndex] = {
        ...db.data.voiceProfiles[existingIndex],
        ...profileData
      }
    } else {
      // 创建新配置
      profileData.id = getNextId('voiceProfiles')
      profileData.createdAt = new Date().toISOString()
      db.data.voiceProfiles.push(profileData)
    }
    
    await db.write()
    
    const result = existingIndex >= 0 
      ? db.data.voiceProfiles[existingIndex] 
      : db.data.voiceProfiles[db.data.voiceProfiles.length - 1]
    
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== 配音条目 ====================

// 获取所有配音条目
router.get('/', async (req, res) => {
  try {
    const { shotId } = req.query
    let voiceovers = db.data.voiceovers || []
    
    if (shotId) {
      voiceovers = voiceovers.filter(v => v.shotId === parseInt(shotId))
    }
    
    // 按镜头ID和顺序排序
    voiceovers.sort((a, b) => {
      if (a.shotId !== b.shotId) return a.shotId - b.shotId
      return (a.orderIndex || 0) - (b.orderIndex || 0)
    })
    
    res.json(voiceovers)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个配音
router.get('/:id', async (req, res) => {
  try {
    const voiceover = findById('voiceovers', req.params.id)
    if (!voiceover) {
      return res.status(404).json({ error: 'Voiceover not found' })
    }
    res.json(voiceover)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建配音
router.post('/', async (req, res) => {
  try {
    const { 
      shotId, characterId, type, text, 
      emotion, speechRate, startTime, endTime, notes 
    } = req.body
    
    if (!shotId || !text) {
      return res.status(400).json({ error: 'shotId and text are required' })
    }
    
    // 确保 voiceovers 数组存在
    if (!db.data.voiceovers) {
      db.data.voiceovers = []
    }
    
    // 计算该镜头下的顺序
    const shotVoiceovers = db.data.voiceovers.filter(v => v.shotId === shotId)
    const maxOrder = shotVoiceovers.reduce((max, v) => Math.max(max, v.orderIndex || 0), 0)
    
    const newVoiceover = {
      id: getNextId('voiceovers'),
      shotId: parseInt(shotId),
      characterId: characterId ? parseInt(characterId) : null,
      type: type || 'dialogue',
      text,
      emotion: emotion || 'neutral',
      speechRate: speechRate || 'medium',
      startTime: startTime || 0,
      endTime: endTime || 3,
      notes: notes || '',
      orderIndex: maxOrder + 1,
      audioFile: null,
      ttsPrompt: null,
      createdAt: new Date().toISOString()
    }
    
    db.data.voiceovers.push(newVoiceover)
    await db.write()
    
    res.json(newVoiceover)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 更新配音
router.put('/:id', async (req, res) => {
  try {
    const voiceover = findById('voiceovers', req.params.id)
    if (!voiceover) {
      return res.status(404).json({ error: 'Voiceover not found' })
    }
    
    const allowedFields = [
      'shotId', 'characterId', 'type', 'text', 
      'emotion', 'speechRate', 'startTime', 'endTime', 
      'notes', 'orderIndex', 'ttsPrompt'
    ]
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        voiceover[field] = req.body[field]
      }
    }
    
    voiceover.updatedAt = new Date().toISOString()
    
    await db.write()
    res.json(voiceover)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除配音
router.delete('/:id', async (req, res) => {
  try {
    const deleted = deleteById('voiceovers', req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Voiceover not found' })
    }
    
    await db.write()
    res.json({ success: true, message: 'Voiceover deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 上传音频文件
router.post('/:id/audio', uploadAudio.single('audio'), async (req, res) => {
  try {
    const voiceover = findById('voiceovers', req.params.id)
    if (!voiceover) {
      return res.status(404).json({ error: 'Voiceover not found' })
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' })
    }
    
    voiceover.audioFile = req.file.filename
    voiceover.audioOriginalName = req.file.originalname
    voiceover.updatedAt = new Date().toISOString()
    
    await db.write()
    
    res.json({
      success: true,
      audioFile: voiceover.audioFile,
      audioOriginalName: voiceover.audioOriginalName
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 生成TTS提示词
router.post('/:id/generate-tts', async (req, res) => {
  try {
    const voiceover = findById('voiceovers', req.params.id)
    if (!voiceover) {
      return res.status(404).json({ error: 'Voiceover not found' })
    }
    
    // 获取角色信息和音色配置
    let characterName = '旁白'
    let voiceProfile = null
    
    if (voiceover.characterId) {
      const character = findById('characters', voiceover.characterId)
      if (character) {
        characterName = character.name
        voiceProfile = (db.data.voiceProfiles || []).find(p => p.characterId === character.id)
      }
    }
    
    // 构建TTS提示词
    const parts = []
    
    // 角色/说话者
    parts.push(`[Speaker: ${characterName}]`)
    
    // 音色类型
    if (voiceProfile?.voiceType) {
      const voiceTypeMap = {
        'male-adult': 'adult male voice',
        'male-young': 'young male voice',
        'male-old': 'elderly male voice',
        'female-adult': 'adult female voice',
        'female-young': 'young female voice',
        'female-old': 'elderly female voice',
        'child': 'child voice',
        'robot': 'robotic/mechanical voice',
        'monster': 'deep monstrous voice',
        'narrator': 'narrator voice'
      }
      parts.push(`[Voice: ${voiceTypeMap[voiceProfile.voiceType] || voiceProfile.voiceType}]`)
    }
    
    // 音调
    if (voiceProfile?.pitch && voiceProfile.pitch !== 'medium') {
      parts.push(`[Pitch: ${voiceProfile.pitch}]`)
    }
    
    // 情感/语气
    const emotionMap = {
      'neutral': 'neutral tone',
      'cheerful': 'cheerful and happy',
      'sad': 'sad and melancholic',
      'angry': 'angry and intense',
      'fearful': 'fearful and trembling',
      'serious': 'serious and formal',
      'excited': 'excited and energetic',
      'whisper': 'whispering softly',
      'shouting': 'shouting loudly'
    }
    if (voiceover.emotion) {
      parts.push(`[Emotion: ${emotionMap[voiceover.emotion] || voiceover.emotion}]`)
    }
    
    // 语速
    const rateMap = {
      'x-slow': 'very slow pace',
      'slow': 'slow pace',
      'medium': '',
      'fast': 'fast pace',
      'x-fast': 'very fast pace'
    }
    if (voiceover.speechRate && voiceover.speechRate !== 'medium') {
      parts.push(`[Rate: ${rateMap[voiceover.speechRate]}]`)
    }
    
    // 口音
    if (voiceProfile?.accent) {
      parts.push(`[Accent: ${voiceProfile.accent}]`)
    }
    
    // 台词内容
    parts.push(`"${voiceover.text}"`)
    
    // 备注
    if (voiceover.notes) {
      parts.push(`[Note: ${voiceover.notes}]`)
    }
    
    const ttsPrompt = parts.join(' ')
    
    // 保存到数据库
    voiceover.ttsPrompt = ttsPrompt
    voiceover.updatedAt = new Date().toISOString()
    await db.write()
    
    res.json({ 
      success: true, 
      ttsPrompt 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 重新排序配音
router.post('/reorder', async (req, res) => {
  try {
    const { shotId, order } = req.body
    
    if (!shotId || !Array.isArray(order)) {
      return res.status(400).json({ error: 'shotId and order array are required' })
    }
    
    for (const item of order) {
      const voiceover = findById('voiceovers', item.id)
      if (voiceover && voiceover.shotId === shotId) {
        voiceover.orderIndex = item.orderIndex
      }
    }
    
    await db.write()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
