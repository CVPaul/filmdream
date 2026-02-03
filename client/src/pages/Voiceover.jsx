import { useState, useEffect, useRef } from 'react'
import { 
  Mic, Plus, Play, Pause, Upload, Trash2, Edit2, Save, 
  Volume2, Clock, User, Film, Copy, Check, Wand2,
  MessageSquare, BookOpen, VolumeX, Settings, ChevronDown
} from 'lucide-react'
import useVoiceoverStore, { VOICE_STYLES, SPEECH_RATES, VOICEOVER_TYPES } from '../stores/voiceoverStore'
import useCharacterStore, { CHARACTER_TYPES } from '../stores/characterStore'
import useShotStore from '../stores/shotStore'
import useSceneStore from '../stores/sceneStore'

export default function Voiceover() {
  const {
    voiceProfiles, voiceovers, loading,
    fetchVoiceProfiles, fetchVoiceovers, saveVoiceProfile,
    createVoiceover, updateVoiceover, deleteVoiceover,
    uploadAudio, generateTTSPrompt
  } = useVoiceoverStore()
  
  const { characters, fetchCharacters } = useCharacterStore()
  const { shots, fetchShots } = useShotStore()
  const { scenes, fetchScenes } = useSceneStore()
  
  const [activeTab, setActiveTab] = useState('voicelines') // 'voicelines' | 'profiles' | 'timeline'
  const [selectedShot, setSelectedShot] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingVoiceover, setEditingVoiceover] = useState(null)
  const [editingProfile, setEditingProfile] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [playingId, setPlayingId] = useState(null)
  
  const audioRef = useRef(null)

  useEffect(() => {
    fetchVoiceProfiles()
    fetchVoiceovers()
    fetchCharacters()
    fetchShots()
    fetchScenes()
  }, [])

  // 获取角色信息
  const getCharacter = (id) => characters.find(c => c.id === id)
  const getShot = (id) => shots.find(s => s.id === id)
  const getScene = (id) => scenes.find(s => s.id === id)
  const getVoiceProfile = (characterId) => voiceProfiles.find(p => p.characterId === characterId)

  // 复制TTS提示词
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // 播放音频
  const handlePlay = (voiceover) => {
    if (!voiceover.audioFile) return
    
    if (playingId === voiceover.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = `/uploads/audio/${voiceover.audioFile}`
        audioRef.current.play()
        setPlayingId(voiceover.id)
      }
    }
  }

  // 按镜头分组的配音
  const voiceoversByShot = shots.map(shot => ({
    shot,
    scene: getScene(shot.sceneId),
    voiceovers: voiceovers.filter(v => v.shotId === shot.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  })).filter(g => g.voiceovers.length > 0 || selectedShot?.id === g.shot.id)

  return (
    <div className="space-y-6">
      {/* 隐藏的音频播放器 */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      {/* 标签页 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('voicelines')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'voicelines'
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            台词管理
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'profiles'
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            角色音色
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'timeline'
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Film className="w-4 h-4 mr-2" />
            时间轴视图
          </button>
        </div>
        
        {activeTab === 'voicelines' && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加台词
          </button>
        )}
      </div>

      {/* 台词管理 */}
      {activeTab === 'voicelines' && (
        <div className="space-y-6">
          {/* 筛选栏 */}
          <div className="flex items-center gap-4">
            <select
              value={selectedShot?.id || ''}
              onChange={(e) => {
                const shot = shots.find(s => s.id === parseInt(e.target.value))
                setSelectedShot(shot || null)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">全部镜头</option>
              {shots.map((shot, idx) => (
                <option key={shot.id} value={shot.id}>
                  #{idx + 1}: {shot.description?.slice(0, 30) || '未命名'}
                </option>
              ))}
            </select>
            
            <span className="text-sm text-gray-500">
              共 {voiceovers.length} 条配音
            </span>
          </div>

          {/* 配音列表 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto"></div>
            </div>
          ) : voiceovers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Mic className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">还没有配音</h3>
              <p className="text-gray-400 mb-4">为你的镜头添加对白、旁白或音效描述</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加第一条台词
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {voiceoversByShot.map(({ shot, scene, voiceovers: shotVoiceovers }) => (
                <div key={shot.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* 镜头头部 */}
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white rounded text-sm font-medium">
                        {shots.findIndex(s => s.id === shot.id) + 1}
                      </span>
                      <div>
                        <h4 className="font-medium text-gray-900">{shot.description || '未命名镜头'}</h4>
                        <p className="text-xs text-gray-500">
                          {scene?.name || '未设置场景'} · {shot.duration}秒
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedShot(shot); setShowNewForm(true) }}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      + 添加台词
                    </button>
                  </div>
                  
                  {/* 配音列表 */}
                  <div className="divide-y divide-gray-100">
                    {shotVoiceovers.map((voiceover) => {
                      const character = getCharacter(voiceover.characterId)
                      const typeInfo = VOICEOVER_TYPES.find(t => t.value === voiceover.type)
                      const charType = CHARACTER_TYPES.find(t => t.value === character?.type)
                      
                      return (
                        <VoiceoverItem
                          key={voiceover.id}
                          voiceover={voiceover}
                          character={character}
                          charType={charType}
                          typeInfo={typeInfo}
                          isPlaying={playingId === voiceover.id}
                          copiedId={copiedId}
                          onPlay={() => handlePlay(voiceover)}
                          onCopy={(text) => handleCopy(text, voiceover.id)}
                          onEdit={() => setEditingVoiceover(voiceover)}
                          onDelete={() => deleteVoiceover(voiceover.id)}
                          onGenerateTTS={() => generateTTSPrompt(voiceover.id)}
                          onUploadAudio={(file) => uploadAudio(voiceover.id, file)}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 角色音色配置 */}
      {activeTab === 'profiles' && (
        <VoiceProfilesPanel
          characters={characters}
          voiceProfiles={voiceProfiles}
          onSave={saveVoiceProfile}
          editingProfile={editingProfile}
          setEditingProfile={setEditingProfile}
        />
      )}

      {/* 时间轴视图 */}
      {activeTab === 'timeline' && (
        <TimelineView
          shots={shots}
          scenes={scenes}
          voiceovers={voiceovers}
          characters={characters}
          getCharacter={getCharacter}
        />
      )}

      {/* 新建/编辑配音表单 */}
      {(showNewForm || editingVoiceover) && (
        <VoiceoverForm
          voiceover={editingVoiceover}
          shots={shots}
          characters={characters}
          voiceProfiles={voiceProfiles}
          defaultShotId={selectedShot?.id}
          onClose={() => { setShowNewForm(false); setEditingVoiceover(null) }}
          onSave={async (data) => {
            if (editingVoiceover) {
              await updateVoiceover(editingVoiceover.id, data)
            } else {
              await createVoiceover(data)
            }
            setShowNewForm(false)
            setEditingVoiceover(null)
          }}
        />
      )}
    </div>
  )
}

// 配音条目组件
function VoiceoverItem({ 
  voiceover, character, charType, typeInfo,
  isPlaying, copiedId, 
  onPlay, onCopy, onEdit, onDelete, onGenerateTTS, onUploadAudio
}) {
  const fileInputRef = useRef(null)
  const [generating, setGenerating] = useState(false)

  const handleGenerateTTS = async () => {
    setGenerating(true)
    try {
      await onGenerateTTS()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-4 hover:bg-gray-50 group">
      <div className="flex items-start gap-4">
        {/* 类型图标 */}
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
          {typeInfo?.icon || '💬'}
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {character && (
              <span className="flex items-center text-sm">
                <span className="mr-1">{charType?.icon}</span>
                <span className="font-medium text-gray-900">{character.name}</span>
              </span>
            )}
            {!character && voiceover.type === 'narration' && (
              <span className="text-sm font-medium text-gray-900">旁白</span>
            )}
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              {typeInfo?.label}
            </span>
            {voiceover.emotion && (
              <span className="text-xs text-gray-400">
                · {VOICE_STYLES.find(s => s.value === voiceover.emotion)?.label}
              </span>
            )}
          </div>
          
          {/* 台词内容 */}
          <p className="text-gray-800 mb-2">{voiceover.text}</p>
          
          {/* 时间和音频信息 */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {voiceover.startTime !== undefined && (
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {voiceover.startTime}s - {voiceover.endTime}s
              </span>
            )}
            {voiceover.audioFile && (
              <button
                onClick={onPlay}
                className="flex items-center text-primary-600 hover:text-primary-700"
              >
                {isPlaying ? (
                  <><Pause className="w-3.5 h-3.5 mr-1" /> 暂停</>
                ) : (
                  <><Play className="w-3.5 h-3.5 mr-1" /> 播放</>
                )}
              </button>
            )}
          </div>
          
          {/* TTS 提示词 */}
          {voiceover.ttsPrompt && (
            <div className="mt-3 p-2 bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">TTS 提示词</span>
                <button
                  onClick={() => onCopy(voiceover.ttsPrompt)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  {copiedId === voiceover.id ? (
                    <><Check className="w-3 h-3 inline mr-1" />已复制</>
                  ) : (
                    <><Copy className="w-3 h-3 inline mr-1" />复制</>
                  )}
                </button>
              </div>
              <p className="text-xs text-green-400 font-mono">{voiceover.ttsPrompt}</p>
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleGenerateTTS}
            disabled={generating}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            title="生成TTS提示词"
          >
            <Wand2 className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="上传音频"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onUploadAudio(e.target.files[0])
              }
            }}
          />
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// 配音表单弹窗
function VoiceoverForm({ voiceover, shots, characters, voiceProfiles, defaultShotId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    shotId: voiceover?.shotId || defaultShotId || '',
    characterId: voiceover?.characterId || '',
    type: voiceover?.type || 'dialogue',
    text: voiceover?.text || '',
    emotion: voiceover?.emotion || 'neutral',
    speechRate: voiceover?.speechRate || 'medium',
    startTime: voiceover?.startTime || 0,
    endTime: voiceover?.endTime || 3,
    notes: voiceover?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!formData.shotId || !formData.text.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...formData,
        shotId: parseInt(formData.shotId),
        characterId: formData.characterId ? parseInt(formData.characterId) : null,
      })
    } finally {
      setSaving(false)
    }
  }

  // 当选择角色时，自动应用其音色配置
  const handleCharacterChange = (characterId) => {
    setFormData(prev => ({ ...prev, characterId }))
    
    if (characterId) {
      const profile = voiceProfiles.find(p => p.characterId === parseInt(characterId))
      if (profile) {
        setFormData(prev => ({
          ...prev,
          characterId,
          emotion: profile.defaultEmotion || prev.emotion,
          speechRate: profile.defaultRate || prev.speechRate,
        }))
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold">
            {voiceover ? '编辑配音' : '添加配音'}
          </h3>
        </div>
        
        <div className="p-5 space-y-4">
          {/* 镜头选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所属镜头 *</label>
            <select
              value={formData.shotId}
              onChange={(e) => setFormData(prev => ({ ...prev, shotId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">选择镜头</option>
              {shots.map((shot, idx) => (
                <option key={shot.id} value={shot.id}>
                  #{idx + 1}: {shot.description?.slice(0, 40) || '未命名'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 配音类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {VOICEOVER_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            
            {/* 角色选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                说话角色 {formData.type === 'narration' && '(可选)'}
              </label>
              <select
                value={formData.characterId}
                onChange={(e) => handleCharacterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">
                  {formData.type === 'narration' ? '旁白（无角色）' : '选择角色'}
                </option>
                {characters.map(char => {
                  const typeInfo = CHARACTER_TYPES.find(t => t.value === char.type)
                  return (
                    <option key={char.id} value={char.id}>
                      {typeInfo?.icon} {char.name}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* 台词内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">台词内容 *</label>
            <textarea
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              rows={4}
              placeholder="输入对白或旁白内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 情感/语气 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">情感/语气</label>
              <select
                value={formData.emotion}
                onChange={(e) => setFormData(prev => ({ ...prev, emotion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {VOICE_STYLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label} - {s.description}</option>
                ))}
              </select>
            </div>
            
            {/* 语速 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">语速</label>
              <select
                value={formData.speechRate}
                onChange={(e) => setFormData(prev => ({ ...prev, speechRate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {SPEECH_RATES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 时间范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 (秒)</label>
              <input
                type="number"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: parseFloat(e.target.value) || 0 }))}
                step={0.1}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 (秒)</label>
              <input
                type="number"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: parseFloat(e.target.value) || 0 }))}
                step={0.1}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="如：需要回声效果、背景有爆炸声等"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.shotId || !formData.text.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : (voiceover ? '保存修改' : '添加配音')}
          </button>
        </div>
      </div>
    </div>
  )
}

// 角色音色配置面板
function VoiceProfilesPanel({ characters, voiceProfiles, onSave, editingProfile, setEditingProfile }) {
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(null)

  const handleEdit = (character) => {
    const profile = voiceProfiles.find(p => p.characterId === character.id) || {}
    setFormData({
      voiceType: profile.voiceType || 'male-adult',
      pitch: profile.pitch || 'medium',
      defaultEmotion: profile.defaultEmotion || 'neutral',
      defaultRate: profile.defaultRate || 'medium',
      accent: profile.accent || '',
      notes: profile.notes || '',
    })
    setEditingProfile(character)
  }

  const handleSave = async () => {
    if (!editingProfile) return
    setSaving(editingProfile.id)
    try {
      await onSave(editingProfile.id, formData)
      setEditingProfile(null)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 角色列表 */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">角色音色配置</h3>
        <p className="text-sm text-gray-500">为每个角色设置默认的语音参数，创建配音时将自动应用</p>
        
        {characters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">请先创建角色</p>
          </div>
        ) : (
          <div className="space-y-2">
            {characters.map(character => {
              const typeInfo = CHARACTER_TYPES.find(t => t.value === character.type)
              const profile = voiceProfiles.find(p => p.characterId === character.id)
              const isEditing = editingProfile?.id === character.id
              
              return (
                <div 
                  key={character.id}
                  className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
                    isEditing ? 'border-primary-300 ring-2 ring-primary-100' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleEdit(character)}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{typeInfo?.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{character.name}</p>
                      {profile ? (
                        <p className="text-xs text-gray-500">
                          {profile.voiceType} · {VOICE_STYLES.find(s => s.value === profile.defaultEmotion)?.label || '中性'}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">未配置音色</p>
                      )}
                    </div>
                    {profile && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">已配置</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* 编辑表单 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {editingProfile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">
                {CHARACTER_TYPES.find(t => t.value === editingProfile.type)?.icon} {editingProfile.name} 的音色
              </h4>
              <button
                onClick={() => setEditingProfile(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                取消
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">音色类型</label>
              <select
                value={formData.voiceType}
                onChange={(e) => setFormData(prev => ({ ...prev, voiceType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="male-adult">成年男性</option>
                <option value="male-young">青年男性</option>
                <option value="male-old">老年男性</option>
                <option value="female-adult">成年女性</option>
                <option value="female-young">青年女性</option>
                <option value="female-old">老年女性</option>
                <option value="child">儿童</option>
                <option value="robot">机械/机器人</option>
                <option value="monster">怪物/非人</option>
                <option value="narrator">叙述者</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">音调</label>
              <select
                value={formData.pitch}
                onChange={(e) => setFormData(prev => ({ ...prev, pitch: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="x-low">极低</option>
                <option value="low">低沉</option>
                <option value="medium">中等</option>
                <option value="high">高亢</option>
                <option value="x-high">极高</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认情感</label>
              <select
                value={formData.defaultEmotion}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultEmotion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {VOICE_STYLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认语速</label>
              <select
                value={formData.defaultRate}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultRate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {SPEECH_RATES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">口音/特点</label>
              <input
                type="text"
                value={formData.accent}
                onChange={(e) => setFormData(prev => ({ ...prev, accent: e.target.value }))}
                placeholder="如：日式口音、沙哑、电子音效..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="其他语音特征说明..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving === editingProfile.id}
              className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving === editingProfile.id ? '保存中...' : '保存音色配置'}
            </button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>选择一个角色配置音色</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 时间轴视图
function TimelineView({ shots, scenes, voiceovers, characters, getCharacter }) {
  const getVoiceoversForShot = (shotId) => 
    voiceovers.filter(v => v.shotId === shotId).sort((a, b) => a.startTime - b.startTime)

  // 计算累积时间偏移
  let timeOffset = 0
  const shotsWithOffset = shots.map(shot => {
    const result = { ...shot, timeOffset }
    timeOffset += shot.duration || 3
    return result
  })

  const totalDuration = shots.reduce((sum, s) => sum + (s.duration || 3), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">配音时间轴</h3>
        <span className="text-sm text-gray-500">总时长: {totalDuration}秒</span>
      </div>

      {/* 时间轴 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 时间刻度 */}
        <div className="h-8 bg-gray-100 border-b border-gray-200 relative">
          {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
            <div 
              key={i}
              className="absolute top-0 h-full flex items-center"
              style={{ left: `${(i * 5 / totalDuration) * 100}%` }}
            >
              <div className="h-3 w-px bg-gray-300"></div>
              <span className="text-xs text-gray-400 ml-1">{i * 5}s</span>
            </div>
          ))}
        </div>

        {/* 镜头和配音轨道 */}
        <div className="divide-y divide-gray-100">
          {shotsWithOffset.map((shot, idx) => {
            const scene = scenes.find(s => s.id === shot.sceneId)
            const shotVoiceovers = getVoiceoversForShot(shot.id)
            const widthPercent = ((shot.duration || 3) / totalDuration) * 100
            const leftPercent = (shot.timeOffset / totalDuration) * 100

            return (
              <div key={shot.id} className="relative" style={{ minHeight: 80 }}>
                {/* 镜头信息 */}
                <div className="absolute left-0 top-0 w-32 h-full p-2 border-r border-gray-100 bg-gray-50">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    #{idx + 1} {shot.description?.slice(0, 15)}
                  </p>
                  <p className="text-xs text-gray-400">{shot.duration}s</p>
                </div>

                {/* 时间轴区域 */}
                <div className="ml-32 relative h-full" style={{ minHeight: 60 }}>
                  {/* 镜头背景 */}
                  <div 
                    className="absolute top-1 h-6 bg-gray-200 rounded opacity-30"
                    style={{ 
                      left: `${leftPercent}%`, 
                      width: `${widthPercent}%` 
                    }}
                  />

                  {/* 配音条 */}
                  {shotVoiceovers.map((vo, voIdx) => {
                    const character = getCharacter(vo.characterId)
                    const voStart = shot.timeOffset + (vo.startTime || 0)
                    const voDuration = (vo.endTime || 3) - (vo.startTime || 0)
                    const voLeft = (voStart / totalDuration) * 100
                    const voWidth = (voDuration / totalDuration) * 100
                    const typeInfo = VOICEOVER_TYPES.find(t => t.value === vo.type)

                    return (
                      <div
                        key={vo.id}
                        className="absolute h-5 rounded text-xs flex items-center px-1 overflow-hidden cursor-pointer hover:opacity-90"
                        style={{
                          left: `${voLeft}%`,
                          width: `${Math.max(voWidth, 2)}%`,
                          top: 28 + voIdx * 24,
                          backgroundColor: vo.type === 'narration' ? '#8b5cf6' :
                                         vo.type === 'dialogue' ? '#3b82f6' :
                                         vo.type === 'monologue' ? '#10b981' : '#f59e0b',
                        }}
                        title={`${character?.name || '旁白'}: ${vo.text}`}
                      >
                        <span className="text-white truncate">
                          {typeInfo?.icon} {character?.name || '旁白'}: {vo.text.slice(0, 20)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-gray-500">图例:</span>
        {VOICEOVER_TYPES.map(t => (
          <span key={t.value} className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded"
              style={{ 
                backgroundColor: t.value === 'narration' ? '#8b5cf6' :
                               t.value === 'dialogue' ? '#3b82f6' :
                               t.value === 'monologue' ? '#10b981' : '#f59e0b'
              }}
            />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}
