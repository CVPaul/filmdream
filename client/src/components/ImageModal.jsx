import { useState, useEffect } from 'react'
import { X, Save, Trash2, Tag, FolderOpen, Eye, Check } from 'lucide-react'
import useImageStore, { IMAGE_CATEGORIES, VIEW_TYPES, IMAGE_STATUS } from '../stores/imageStore'

export default function ImageModal({ image, onClose }) {
  const { updateImage, deleteImage } = useImageStore()
  const [formData, setFormData] = useState({
    category: image?.category || 'uncategorized',
    viewType: image?.viewType || '',
    status: image?.status || 'pending',
    tags: image?.tags || [],
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (image) {
      setFormData({
        category: image.category || 'uncategorized',
        viewType: image.viewType || '',
        status: image.status || 'pending',
        tags: image.tags || [],
      })
    }
  }, [image])

  if (!image) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateImage(image.id, formData)
      onClose()
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('确定要删除这张图片吗？')) {
      await deleteImage(image.id)
      onClose()
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const removeTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    })
  }

  const getCategoryInfo = (value) => IMAGE_CATEGORIES.find(c => c.value === value) || IMAGE_CATEGORIES[5]
  const getStatusInfo = (value) => IMAGE_STATUS.find(s => s.value === value) || IMAGE_STATUS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex"
        onClick={e => e.stopPropagation()}
      >
        {/* 图片预览区 */}
        <div className="w-1/2 bg-gray-900 flex items-center justify-center p-4">
          <img
            src={`/uploads/${image.filename}`}
            alt={image.originalName}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>

        {/* 信息编辑区 */}
        <div className="w-1/2 flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900 truncate">{image.originalName}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* 分类 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FolderOpen className="w-4 h-4 mr-2" />
                分类
              </label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.category === cat.value
                        ? `${cat.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 视图类型 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Eye className="w-4 h-4 mr-2" />
                视图类型
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VIEW_TYPES.map(view => (
                  <button
                    key={view.value}
                    onClick={() => setFormData({ ...formData, viewType: view.value })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.viewType === view.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 状态 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Check className="w-4 h-4 mr-2" />
                状态
              </label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_STATUS.map(status => (
                  <button
                    key={status.value}
                    onClick={() => setFormData({ ...formData, status: status.value })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.status === status.value
                        ? `${status.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 标签 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 mr-2" />
                标签
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-primary-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="添加标签..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                >
                  添加
                </button>
              </div>
            </div>

            {/* 文件信息 */}
            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
              <p>文件名: {image.filename}</p>
              <p>上传时间: {new Date(image.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <button
              onClick={handleDelete}
              className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
