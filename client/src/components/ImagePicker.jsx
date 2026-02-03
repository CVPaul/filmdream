import { useState, useEffect } from 'react'
import { X, Check, Image as ImageIcon, Search } from 'lucide-react'
import useImageStore, { IMAGE_CATEGORIES } from '../stores/imageStore'

export default function ImagePicker({ title, selectedIds = [], onConfirm, onClose, multiple = true }) {
  const { images, fetchImages, loading } = useImageStore()
  const [selected, setSelected] = useState(new Set(selectedIds))
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    fetchImages()
  }, [])

  const toggleSelect = (id) => {
    if (multiple) {
      setSelected(prev => {
        const newSet = new Set(prev)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        return newSet
      })
    } else {
      setSelected(new Set([id]))
    }
  }

  const filteredImages = images.filter(img => {
    if (category !== 'all' && img.category !== category) return false
    if (search && !img.originalName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleConfirm = () => {
    onConfirm(Array.from(selected))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title || '选择图片'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center gap-3 px-6 py-3 border-b bg-gray-50">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索图片..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部分类</option>
            {IMAGE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* 图片网格 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <ImageIcon className="w-12 h-12 mb-2 text-gray-300" />
              <p>没有找到图片</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filteredImages.map(image => {
                const isSelected = selected.has(image.id)
                return (
                  <div
                    key={image.id}
                    onClick={() => toggleSelect(image.id)}
                    className={`aspect-square rounded-lg overflow-hidden cursor-pointer relative border-2 transition-all ${
                      isSelected 
                        ? 'border-primary-500 ring-2 ring-primary-200' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={`/uploads/${image.filename}`}
                      alt={image.originalName}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs truncate">{image.originalName}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <span className="text-sm text-gray-500">
            已选择 {selected.size} 张图片
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
