import { useState, useEffect } from 'react'
import { 
  Plus, Film, Play, GripVertical, Edit2, Trash2, 
  Clock, Camera, MoveRight, Wand2, Copy, Check,
  ChevronDown, ChevronRight, Settings
} from 'lucide-react'
import useShotStore, { SHOT_TYPES, CAMERA_MOVEMENTS } from '../stores/shotStore'
import useSceneStore from '../stores/sceneStore'
import useCharacterStore, { CHARACTER_TYPES } from '../stores/characterStore'

export default function Timeline() {
  const { 
    shots, loading, 
    fetchShots, createShot, updateShot, deleteShot, reorderShots, generatePrompt
  } = useShotStore()
  const { scenes, fetchScenes } = useSceneStore()
  const { characters, fetchCharacters } = useCharacterStore()
  
  const [selectedShot, setSelectedShot] = useState(null)
  const [editingShot, setEditingShot] = useState(null)
  const [showNewShotForm, setShowNewShotForm] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [copiedPrompt, setCopiedPrompt] = useState(null)

  useEffect(() => {
    fetchShots()
    fetchScenes()
    fetchCharacters()
  }, [])

  // 创建新镜头
  const handleCreateShot = async (data) => {
    await createShot(data)
    setShowNewShotForm(false)
  }

  // 删除镜头
  const handleDelete = async (shot) => {
    if (confirm('确定要删除这个镜头吗？')) {
      await deleteShot(shot.id)
      if (selectedShot?.id === shot.id) {
        setSelectedShot(null)
      }
    }
  }

  // 拖拽排序
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newShots = [...shots]
    const [draggedShot] = newShots.splice(draggedIndex, 1)
    newShots.splice(dropIndex, 0, draggedShot)

    const order = newShots.map((shot, idx) => ({
      id: shot.id,
      orderIndex: idx + 1
    }))

    await reorderShots(order)
    setDraggedIndex(null)
  }

  // 生成提示词
  const handleGeneratePrompt = async (shot) => {
    await generatePrompt(shot.id)
    // 刷新选中的镜头数据
    const updated = shots.find(s => s.id === shot.id)
    if (updated) setSelectedShot(updated)
  }

  // 复制提示词
  const handleCopyPrompt = (shot) => {
    if (shot.generatedPrompt) {
      navigator.clipboard.writeText(shot.generatedPrompt)
      setCopiedPrompt(shot.id)
      setTimeout(() => setCopiedPrompt(null), 2000)
    }
  }

  // 获取场景信息
  const getSceneInfo = (sceneId) => scenes.find(s => s.id === sceneId)

  // 计算总时长
  const totalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 0), 0)

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6">
      {/* 时间线主体 */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
        {/* 工具栏 */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button className="flex items-center px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Play className="w-4 h-4 mr-2" />
              预览
            </button>
            <span className="text-sm text-gray-500">
              {shots.length} 个镜头 · 总时长 {totalDuration}秒
            </span>
          </div>
          <button 
            onClick={() => setShowNewShotForm(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加镜头
          </button>
        </div>

        {/* 镜头列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto"></div>
            </div>
          ) : shots.length === 0 ? (
            <div className="text-center py-16">
              <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">还没有镜头</h3>
              <p className="text-gray-400 mb-4">创建分镜序列，规划你的视频时间线</p>
              <button 
                onClick={() => setShowNewShotForm(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加第一个镜头
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {shots.map((shot, index) => {
                const scene = getSceneInfo(shot.sceneId)
                const shotType = SHOT_TYPES.find(t => t.value === shot.shotType)
                const cameraMove = CAMERA_MOVEMENTS.find(m => m.value === shot.cameraMovement)
                const isSelected = selectedShot?.id === shot.id

                return (
                  <div
                    key={shot.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setSelectedShot(shot)}
                    className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-primary-50 border-primary-300 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    } ${draggedIndex === index ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className="w-5 h-5 text-gray-400 mr-3 cursor-grab" />
                    
                    {/* 序号 */}
                    <span className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white rounded text-sm font-medium mr-4">
                      {index + 1}
                    </span>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {shot.description || '未命名镜头'}
                        </h4>
                        {scene && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                            {scene.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {shot.duration}秒
                        </span>
                        {shotType && (
                          <span className="flex items-center">
                            <Camera className="w-3.5 h-3.5 mr-1" />
                            {shotType.label}
                          </span>
                        )}
                        {cameraMove && (
                          <span className="flex items-center">
                            <MoveRight className="w-3.5 h-3.5 mr-1" />
                            {cameraMove.label}
                          </span>
                        )}
                        {shot.characters?.length > 0 && (
                          <span className="text-primary-600">
                            {shot.characters.length} 个角色
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 操作 */}
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingShot(shot) }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(shot) }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：镜头详情/编辑面板 */}
      <div className="w-96 bg-gray-50 overflow-y-auto">
        {selectedShot ? (
          <ShotDetailPanel 
            shot={selectedShot}
            scenes={scenes}
            onUpdate={updateShot}
            onGeneratePrompt={handleGeneratePrompt}
            onCopyPrompt={handleCopyPrompt}
            copiedPrompt={copiedPrompt}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>选择一个镜头查看详情</p>
            </div>
          </div>
        )}
      </div>

      {/* 新建镜头表单 */}
      {showNewShotForm && (
        <NewShotModal
          scenes={scenes}
          onClose={() => setShowNewShotForm(false)}
          onCreate={handleCreateShot}
        />
      )}
    </div>
  )
}

// 镜头详情面板
function ShotDetailPanel({ shot, scenes, onUpdate, onGeneratePrompt, onCopyPrompt, copiedPrompt }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    setFormData({
      description: shot.description || '',
      duration: shot.duration || 3,
      sceneId: shot.sceneId || '',
      shotType: shot.shotType || '',
      cameraMovement: shot.cameraMovement || '',
      dialogue: shot.dialogue || '',
      notes: shot.notes || '',
    })
  }, [shot])

  const handleSave = async () => {
    await onUpdate(shot.id, formData)
    setIsEditing(false)
  }

  const scene = scenes.find(s => s.id === shot.sceneId)
  const shotType = SHOT_TYPES.find(t => t.value === shot.shotType)
  const cameraMove = CAMERA_MOVEMENTS.find(m => m.value === shot.cameraMovement)

  return (
    <div className="p-5 space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">镜头详情</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            isEditing 
              ? 'bg-gray-200 text-gray-700' 
              : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
          }`}
        >
          {isEditing ? '取消' : '编辑'}
        </button>
      </div>

      {isEditing ? (
        // 编辑模式
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">时长(秒)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 3 }))}
                min={1}
                max={60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">场景</label>
              <select
                value={formData.sceneId}
                onChange={(e) => setFormData(prev => ({ ...prev, sceneId: parseInt(e.target.value) || null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">选择场景</option>
                {scenes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">镜头类型</label>
            <select
              value={formData.shotType}
              onChange={(e) => setFormData(prev => ({ ...prev, shotType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">选择镜头类型</option>
              {SHOT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label} - {t.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">运镜方式</label>
            <select
              value={formData.cameraMovement}
              onChange={(e) => setFormData(prev => ({ ...prev, cameraMovement: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">选择运镜方式</option>
              {CAMERA_MOVEMENTS.map(m => (
                <option key={m.value} value={m.value}>{m.label} - {m.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">对白</label>
            <textarea
              value={formData.dialogue}
              onChange={(e) => setFormData(prev => ({ ...prev, dialogue: e.target.value }))}
              rows={2}
              placeholder="这个镜头中的对白..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="其他说明..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            保存修改
          </button>
        </div>
      ) : (
        // 查看模式
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">描述</p>
            <p className="text-gray-900">{shot.description || '暂无描述'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">时长</p>
              <p className="text-gray-900">{shot.duration} 秒</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">场景</p>
              <p className="text-gray-900">{scene?.name || '未设置'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">镜头类型</p>
              <p className="text-gray-900">{shotType?.label || '未设置'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">运镜</p>
              <p className="text-gray-900">{cameraMove?.label || '未设置'}</p>
            </div>
          </div>

          {shot.dialogue && (
            <div>
              <p className="text-sm text-gray-500 mb-1">对白</p>
              <p className="text-gray-900 italic">"{shot.dialogue}"</p>
            </div>
          )}

          {/* 角色列表 */}
          {shot.characters?.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">出场角色</p>
              <div className="space-y-2">
                {shot.characters.map(char => {
                  const typeInfo = CHARACTER_TYPES.find(t => t.value === char.type)
                  return (
                    <div key={char.id} className="flex items-center p-2 bg-white rounded-lg">
                      <span className="text-xl mr-2">{typeInfo?.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{char.name}</p>
                        {char.action && (
                          <p className="text-xs text-gray-500">{char.action}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 生成的提示词 */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">AI 提示词</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onGeneratePrompt(shot)}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  生成
                </button>
                {shot.generatedPrompt && (
                  <button
                    onClick={() => onCopyPrompt(shot)}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    {copiedPrompt === shot.id ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        复制
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            {shot.generatedPrompt ? (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-700 font-mono">{shot.generatedPrompt}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">点击"生成"按钮创建提示词</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 新建镜头弹窗
function NewShotModal({ scenes, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    description: '',
    duration: 3,
    sceneId: null,
    shotType: '',
    cameraMovement: '',
  })

  const handleSubmit = () => {
    if (!formData.description.trim()) return
    onCreate(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b">
          <h3 className="font-semibold text-lg">添加新镜头</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">镜头描述 *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="描述这个镜头的内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">时长(秒)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 3 }))}
                min={1}
                max={60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">关联场景</label>
              <select
                value={formData.sceneId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sceneId: parseInt(e.target.value) || null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">选择场景</option>
                {scenes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">镜头类型</label>
              <select
                value={formData.shotType}
                onChange={(e) => setFormData(prev => ({ ...prev, shotType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">选择类型</option>
                {SHOT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">运镜方式</label>
              <select
                value={formData.cameraMovement}
                onChange={(e) => setFormData(prev => ({ ...prev, cameraMovement: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">选择运镜</option>
                {CAMERA_MOVEMENTS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
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
            disabled={!formData.description.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            添加镜头
          </button>
        </div>
      </div>
    </div>
  )
}
