import { useState, useEffect } from 'react'
import { 
  Plus, Search, Map as MapIcon, Edit2, Trash2, 
  Users, Sun, Cloud, Clock, Image as ImageIcon, Film
} from 'lucide-react'
import useSceneStore, { ENVIRONMENTS, TIME_OF_DAY, WEATHER, ATMOSPHERES } from '../stores/sceneStore'
import useCharacterStore, { CHARACTER_TYPES } from '../stores/characterStore'
import SceneForm from '../components/SceneForm'

const API_BASE = '/api'

export default function Scenes() {
  const { scenes, loading, fetchScenes, deleteScene, addCharacterToScene, removeCharacterFromScene } = useSceneStore()
  const { characters, fetchCharacters } = useCharacterStore()
  
  const [searchInput, setSearchInput] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingScene, setEditingScene] = useState(null)
  const [selectedScene, setSelectedScene] = useState(null)
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateCount, setGenerateCount] = useState(5)
  const [generateStyle, setGenerateStyle] = useState('科幻动作')
  const [previewShots, setPreviewShots] = useState([])
  const [generateError, setGenerateError] = useState('')
  const [generateSuccess, setGenerateSuccess] = useState('')

  useEffect(() => {
    fetchScenes()
    fetchCharacters()
  }, [])

  // 筛选场景
  const filteredScenes = scenes.filter(scene => 
    scene.name.toLowerCase().includes(searchInput.toLowerCase())
  )

  const handleEdit = (scene) => {
    setEditingScene(scene)
    setShowForm(true)
  }

  const handleDelete = async (scene) => {
    if (confirm(`确定要删除场景 "${scene.name}" 吗？`)) {
      await deleteScene(scene.id)
      if (selectedScene?.id === scene.id) {
        setSelectedScene(null)
      }
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingScene(null)
  }

  const handleAddCharacter = async (characterId) => {
    if (!selectedScene) return
    await addCharacterToScene(selectedScene.id, characterId)
    // 刷新选中场景的数据
    const updated = scenes.find(s => s.id === selectedScene.id)
    if (updated) setSelectedScene(updated)
    setShowCharacterPicker(false)
  }

  const handleRemoveCharacter = async (characterId) => {
    if (!selectedScene) return
    await removeCharacterFromScene(selectedScene.id, characterId)
  }

  const getEnvInfo = (value) => ENVIRONMENTS.find(e => e.value === value)
  const getTimeInfo = (value) => TIME_OF_DAY.find(t => t.value === value)
  const getWeatherInfo = (value) => WEATHER.find(w => w.value === value)
  const getAtmosphereInfo = (value) => ATMOSPHERES.find(a => a.value === value)

  const handleOpenGenerateModal = () => {
    setPreviewShots([])
    setGenerateError('')
    setGenerateSuccess('')
    setGenerateCount(5)
    setGenerateStyle('科幻动作')
    setShowGenerateModal(true)
  }

  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false)
    setPreviewShots([])
    setGenerateError('')
    setGenerateSuccess('')
  }

  const handleGeneratePreview = async () => {
    if (!selectedScene) return
    setGenerating(true)
    setGenerateError('')
    setPreviewShots([])
    try {
      const res = await fetch(`${API_BASE}/shots/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: selectedScene.id, count: generateCount, style: generateStyle })
      })
      const json = await res.json()
      if (json.success) {
        setPreviewShots(json.data.shots)
      } else {
        setGenerateError(json.error || '生成失败')
      }
    } catch (err) {
      setGenerateError('网络错误：' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmGenerate = async () => {
    if (!selectedScene || previewShots.length === 0) return
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch(`${API_BASE}/shots/generate/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: selectedScene.id, shots: previewShots })
      })
      const json = await res.json()
      if (json.success) {
        setGenerateSuccess(`成功生成 ${json.data.count} 个分镜！`)
        setTimeout(() => {
          handleCloseGenerateModal()
        }, 1500)
      } else {
        setGenerateError(json.error || '确认失败')
      }
    } catch (err) {
      setGenerateError('网络错误：' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdatePreviewShot = (index, field, value) => {
    setPreviewShots(prev => prev.map((shot, i) => i === index ? { ...shot, [field]: value } : shot))
  }

  // 可添加的角色（不在当前场景中）
  const availableCharacters = selectedScene 
    ? characters.filter(c => !selectedScene.characters?.some(sc => sc.id === c.id))
    : []

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6">
      {/* 场景列表 */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">场景列表</h2>
            <button 
              onClick={() => { setEditingScene(null); setShowForm(true) }}
              className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              新建
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索场景..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent mx-auto"></div>
            </div>
          ) : filteredScenes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 px-4">
              <MapIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">还没有场景</p>
              <p className="text-xs mt-1">创建战斗场景，规划角色和环境</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredScenes.map(scene => {
                const env = getEnvInfo(scene.environment)
                const time = getTimeInfo(scene.timeOfDay)
                const isSelected = selectedScene?.id === scene.id
                
                return (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedScene(scene)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start">
                      {/* 缩略图 */}
                      <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden flex-shrink-0 mr-3">
                        {scene.backgroundImage ? (
                          <img 
                            src={`/uploads/${scene.backgroundImage.filename}`} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {env?.icon || '🎬'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{scene.name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{env?.icon} {env?.label}</span>
                          <span>·</span>
                          <span>{time?.icon} {time?.label}</span>
                        </div>
                        {scene.characters?.length > 0 && (
                          <div className="flex items-center mt-1.5">
                            <Users className="w-3 h-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-400">
                              {scene.characters.length} 个角色
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 场景详情 */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {selectedScene ? (
          <div className="p-6">
            {/* 背景图 */}
            <div className="relative rounded-xl overflow-hidden bg-gray-200 aspect-video mb-6">
              {selectedScene.backgroundImage ? (
                <img
                  src={`/uploads/${selectedScene.backgroundImage.filename}`}
                  alt={selectedScene.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                    <p>暂无背景图片</p>
                  </div>
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => handleEdit(selectedScene)}
                  className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => handleDelete(selectedScene)}
                  className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* 场景信息覆盖层 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h1 className="text-2xl font-bold text-white mb-2">{selectedScene.name}</h1>
                <div className="flex items-center gap-4 text-white/80 text-sm">
                  <span className="flex items-center">
                    {getEnvInfo(selectedScene.environment)?.icon} {getEnvInfo(selectedScene.environment)?.label}
                  </span>
                  <span className="flex items-center">
                    {getTimeInfo(selectedScene.timeOfDay)?.icon} {getTimeInfo(selectedScene.timeOfDay)?.label}
                  </span>
                  <span className="flex items-center">
                    {getWeatherInfo(selectedScene.weather)?.icon} {getWeatherInfo(selectedScene.weather)?.label}
                  </span>
                  {selectedScene.atmosphere && (
                    <span className="px-2 py-0.5 bg-white/20 rounded">
                      {getAtmosphereInfo(selectedScene.atmosphere)?.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 场景描述 */}
            {selectedScene.description && (
              <div className="bg-white rounded-xl p-5 mb-6">
                <h3 className="font-medium text-gray-900 mb-2">场景描述</h3>
                <p className="text-gray-600">{selectedScene.description}</p>
              </div>
            )}

            {/* 场景角色 */}
            <div className="bg-white rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">场景角色</h3>
                <button
                  onClick={() => setShowCharacterPicker(true)}
                  className="flex items-center px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加角色
                </button>
              </div>
              
              {selectedScene.characters?.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {selectedScene.characters.map(char => {
                    const typeInfo = CHARACTER_TYPES.find(t => t.value === char.type)
                    const coverImage = char.images?.[0]
                    
                    return (
                      <div key={char.id} className="flex items-center p-3 bg-gray-50 rounded-lg group">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 mr-3 flex-shrink-0">
                          {coverImage ? (
                            <img 
                              src={`/uploads/${coverImage.filename}`} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              {typeInfo?.icon}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{char.name}</p>
                          <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveCharacter(char.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">还没有添加角色</p>
                </div>
              )}
            </div>

            {/* AI分镜生成 */}
            <div className="bg-white rounded-xl p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">AI分镜生成</h3>
                <button
                  onClick={handleOpenGenerateModal}
                  className="flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                >
                  <Film className="w-4 h-4 mr-1" />
                  🎬 AI生成分镜
                </button>
              </div>
              <p className="text-sm text-gray-400">点击按钮，AI将根据场景信息自动生成分镜脚本</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MapIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">选择一个场景查看详情</p>
              <p className="text-sm mt-1">或创建新的战斗场景</p>
            </div>
          </div>
        )}
      </div>

      {/* 场景表单 */}
      {showForm && (
        <SceneForm
          scene={editingScene}
          onClose={handleCloseForm}
          onSaved={() => fetchScenes()}
        />
      )}

      {/* 角色选择器 */}
      {showCharacterPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowCharacterPicker(false)}>
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[70vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <h3 className="font-medium">选择角色添加到场景</h3>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {availableCharacters.length === 0 ? (
                <p className="text-center text-gray-400 py-8">没有可添加的角色</p>
              ) : (
                <div className="space-y-2">
                  {availableCharacters.map(char => {
                    const typeInfo = CHARACTER_TYPES.find(t => t.value === char.type)
                    return (
                      <button
                        key={char.id}
                        onClick={() => handleAddCharacter(char.id)}
                        className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <span className="text-2xl mr-3">{typeInfo?.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{char.name}</p>
                          <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI生成分镜 Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={handleCloseGenerateModal}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-lg">🎬 AI生成分镜</h3>
              <button onClick={handleCloseGenerateModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Inputs */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">生成数量</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={generateCount}
                    onChange={e => setGenerateCount(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">风格</label>
                  <input
                    type="text"
                    value={generateStyle}
                    onChange={e => setGenerateStyle(e.target.value)}
                    placeholder="例如：科幻动作"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Error / Success */}
              {generateError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{generateError}</p>
              )}
              {generateSuccess && (
                <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{generateSuccess}</p>
              )}

              {/* Loading */}
              {generating && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
                  <span className="ml-3 text-gray-500 text-sm">AI正在生成分镜...</span>
                </div>
              )}

              {/* Preview shots */}
              {!generating && previewShots.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">预览分镜（可编辑）</p>
                  {previewShots.map((shot, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-2 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500">分镜 #{idx + 1}</p>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">描述</label>
                        <textarea
                          value={shot.description || ''}
                          onChange={e => handleUpdatePreviewShot(idx, 'description', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">镜头类型</label>
                          <input
                            type="text"
                            value={shot.shotType || ''}
                            onChange={e => handleUpdatePreviewShot(idx, 'shotType', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">运镜</label>
                          <input
                            type="text"
                            value={shot.cameraMovement || ''}
                            onChange={e => handleUpdatePreviewShot(idx, 'cameraMovement', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                onClick={handleCloseGenerateModal}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleGeneratePreview}
                  disabled={generating}
                  className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                >
                  生成预览
                </button>
                <button
                  onClick={handleConfirmGenerate}
                  disabled={generating || previewShots.length === 0}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  确认生成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
