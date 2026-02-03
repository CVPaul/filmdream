import { useState, useEffect } from 'react'
import { X, Save, Wand2, Plus, Trash2 } from 'lucide-react'
import useCharacterStore, { CHARACTER_TYPES } from '../stores/characterStore'

export default function CharacterForm({ character, onClose, onSaved }) {
  const { createCharacter, updateCharacter } = useCharacterStore()
  const isEditing = !!character

  const [formData, setFormData] = useState({
    name: '',
    type: 'mecha',
    height: '',
    abilities: [''],
    weaknesses: '',
    backstory: '',
    promptTemplate: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name || '',
        type: character.type || 'mecha',
        height: character.height || '',
        abilities: character.abilities?.length > 0 ? character.abilities : [''],
        weaknesses: character.weaknesses || '',
        backstory: character.backstory || '',
        promptTemplate: character.promptTemplate || '',
      })
    }
  }, [character])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleAbilityChange = (index, value) => {
    const newAbilities = [...formData.abilities]
    newAbilities[index] = value
    setFormData(prev => ({ ...prev, abilities: newAbilities }))
  }

  const addAbility = () => {
    setFormData(prev => ({ ...prev, abilities: [...prev.abilities, ''] }))
  }

  const removeAbility = (index) => {
    if (formData.abilities.length > 1) {
      setFormData(prev => ({
        ...prev,
        abilities: prev.abilities.filter((_, i) => i !== index)
      }))
    }
  }

  const generatePromptTemplate = () => {
    const typeInfo = CHARACTER_TYPES.find(t => t.value === formData.type)
    const typeName = typeInfo?.label || formData.type
    
    let template = `${formData.name}, ${typeName}`
    if (formData.height) {
      template += `, ${formData.height} tall`
    }
    if (formData.abilities.filter(a => a.trim()).length > 0) {
      template += `, with abilities: ${formData.abilities.filter(a => a.trim()).join(', ')}`
    }
    template += ', highly detailed, cinematic lighting, epic scene'
    
    setFormData(prev => ({ ...prev, promptTemplate: template }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = '请输入角色名称'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const data = {
        ...formData,
        abilities: formData.abilities.filter(a => a.trim()),
      }
      
      if (isEditing) {
        await updateCharacter(character.id, data)
      } else {
        await createCharacter(data)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? '编辑角色' : '创建新角色'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* 名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="例如：雷神机甲、深海巨兽"
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* 类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">角色类型</label>
              <div className="flex flex-wrap gap-2">
                {CHARACTER_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('type', type.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                      formData.type === type.value
                        ? `${type.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1.5">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 尺寸 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">体型/高度</label>
              <input
                type="text"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="例如：80米、比写字楼还高"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* 能力 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">特殊能力</label>
              <div className="space-y-2">
                {formData.abilities.map((ability, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={ability}
                      onChange={(e) => handleAbilityChange(index, e.target.value)}
                      placeholder={`能力 ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeAbility(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAbility}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加能力
                </button>
              </div>
            </div>

            {/* 弱点 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">弱点</label>
              <input
                type="text"
                value={formData.weaknesses}
                onChange={(e) => handleChange('weaknesses', e.target.value)}
                placeholder="例如：头部装甲薄弱"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* 背景故事 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">背景故事</label>
              <textarea
                value={formData.backstory}
                onChange={(e) => handleChange('backstory', e.target.value)}
                placeholder="描述这个角色的起源和背景..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* 提示词模板 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">提示词模板</label>
                <button
                  type="button"
                  onClick={generatePromptTemplate}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  自动生成
                </button>
              </div>
              <textarea
                value={formData.promptTemplate}
                onChange={(e) => handleChange('promptTemplate', e.target.value)}
                placeholder="用于AI生成时保持角色一致性的提示词..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                提示词将用于ComfyUI生成视频，确保角色外观一致
              </p>
            </div>
          </div>
        </form>

        {/* 底部操作 */}
        <div className="flex items-center justify-end px-6 py-4 border-t bg-gray-50 space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : (isEditing ? '保存修改' : '创建角色')}
          </button>
        </div>
      </div>
    </div>
  )
}
