import { useState, useEffect } from 'react'
import { X, Save, Image as ImageIcon, Wand2 } from 'lucide-react'
import useSceneStore, { ENVIRONMENTS, TIME_OF_DAY, WEATHER, ATMOSPHERES } from '../stores/sceneStore'
import ImagePicker from './ImagePicker'

export default function SceneForm({ scene, onClose, onSaved }) {
  const { createScene, updateScene } = useSceneStore()
  const isEditing = !!scene

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    environment: 'city',
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'epic',
    backgroundImageId: null,
  })
  const [saving, setSaving] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    if (scene) {
      setFormData({
        name: scene.name || '',
        description: scene.description || '',
        environment: scene.environment || 'city',
        timeOfDay: scene.timeOfDay || 'day',
        weather: scene.weather || 'clear',
        atmosphere: scene.atmosphere || 'epic',
        backgroundImageId: scene.backgroundImageId || null,
      })
      if (scene.backgroundImage) {
        setSelectedImage(scene.backgroundImage)
      }
    }
  }, [scene])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSelectImage = (imageIds) => {
    if (imageIds.length > 0) {
      handleChange('backgroundImageId', imageIds[0])
      // 从图片列表获取选中的图片信息
      fetch(`/api/images/${imageIds[0]}`)
        .then(res => res.json())
        .then(data => setSelectedImage(data))
        .catch(() => {})
    }
  }

  const generateDescription = () => {
    const env = ENVIRONMENTS.find(e => e.value === formData.environment)
    const time = TIME_OF_DAY.find(t => t.value === formData.timeOfDay)
    const weather = WEATHER.find(w => w.value === formData.weather)
    const atm = ATMOSPHERES.find(a => a.value === formData.atmosphere)
    
    let desc = `${time?.label || ''}的${env?.label || '城市'}场景`
    if (weather) desc += `，${weather.label}天气`
    if (atm) desc += `，${atm.label}的氛围`
    desc += '。巨型机甲与怪兽在此对峙，周围的建筑物在战斗中摇摇欲坠。'
    
    handleChange('description', desc)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      if (isEditing) {
        await updateScene(scene.id, formData)
      } else {
        await createScene(formData)
      }
      onSaved?.()
      onClose()
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? '编辑场景' : '创建新场景'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 内容 */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-5">
            {/* 场景名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                场景名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="例如：东京市中心决战"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* 背景图片 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">背景图片</label>
              <div 
                onClick={() => setShowImagePicker(true)}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-400 transition-colors"
              >
                {selectedImage ? (
                  <div className="flex items-center">
                    <img 
                      src={`/uploads/${selectedImage.filename}`} 
                      alt="" 
                      className="w-24 h-16 object-cover rounded mr-4"
                    />
                    <div>
                      <p className="text-sm text-gray-700">{selectedImage.originalName}</p>
                      <p className="text-xs text-gray-400">点击更换</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">点击选择背景图片</p>
                  </div>
                )}
              </div>
            </div>

            {/* 环境类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">环境类型</label>
              <div className="grid grid-cols-5 gap-2">
                {ENVIRONMENTS.map(env => (
                  <button
                    key={env.value}
                    type="button"
                    onClick={() => handleChange('environment', env.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      formData.environment === env.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="block text-lg mb-1">{env.icon}</span>
                    {env.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 时间和天气 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">时间</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_OF_DAY.map(time => (
                    <button
                      key={time.value}
                      type="button"
                      onClick={() => handleChange('timeOfDay', time.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-center ${
                        formData.timeOfDay === time.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1">{time.icon}</span>
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">天气</label>
                <div className="grid grid-cols-3 gap-2">
                  {WEATHER.map(w => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => handleChange('weather', w.value)}
                      className={`px-2 py-2 rounded-lg text-xs transition-all ${
                        formData.weather === w.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="block text-base mb-0.5">{w.icon}</span>
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 氛围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">氛围</label>
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERES.map(atm => (
                  <button
                    key={atm.value}
                    type="button"
                    onClick={() => handleChange('atmosphere', atm.value)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      formData.atmosphere === atm.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {atm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 场景描述 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">场景描述</label>
                <button
                  type="button"
                  onClick={generateDescription}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  自动生成
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="描述这个场景的细节..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50 space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name.trim()}
              className="flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : (isEditing ? '保存修改' : '创建场景')}
            </button>
          </div>
        </div>
      </div>

      {/* 图片选择器 */}
      {showImagePicker && (
        <ImagePicker
          title="选择背景图片"
          selectedIds={formData.backgroundImageId ? [formData.backgroundImageId] : []}
          onConfirm={handleSelectImage}
          onClose={() => setShowImagePicker(false)}
          multiple={false}
        />
      )}
    </>
  )
}
