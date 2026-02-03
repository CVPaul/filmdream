import { useState, useCallback, useEffect } from 'react'
import { 
  Upload, Grid, List, Filter, Search, Plus, Image as ImageIcon, 
  Check, X, Trash2, FolderOpen, MoreVertical, CheckSquare, Square
} from 'lucide-react'
import useImageStore, { IMAGE_CATEGORIES, IMAGE_STATUS } from '../stores/imageStore'
import ImageModal from '../components/ImageModal'

export default function Gallery() {
  const { 
    images, loading, filter, selectedImages,
    fetchImages, uploadImages, batchUpdate, deleteImage,
    setFilter, toggleSelect, toggleSelectAll, clearSelection 
  } = useImageStore()
  
  const [viewMode, setViewMode] = useState('grid')
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [showBatchMenu, setShowBatchMenu] = useState(false)

  useEffect(() => {
    fetchImages()
  }, [])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleFiles = async (files) => {
    // 过滤图片文件
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    setUploading(true)
    setUploadProgress(imageFiles.map(f => ({ name: f.name, status: 'uploading' })))

    try {
      await uploadImages(imageFiles)
      setUploadProgress(prev => prev.map(p => ({ ...p, status: 'done' })))
      setTimeout(() => setUploadProgress([]), 2000)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadProgress(prev => prev.map(p => ({ ...p, status: 'error' })))
    } finally {
      setUploading(false)
    }
  }

  const handleBatchAction = async (action, value) => {
    setShowBatchMenu(false)
    if (action === 'category') {
      await batchUpdate({ category: value })
    } else if (action === 'status') {
      await batchUpdate({ status: value })
    } else if (action === 'delete') {
      if (confirm(`确定要删除选中的 ${selectedImages.length} 张图片吗？`)) {
        for (const id of selectedImages) {
          await deleteImage(id)
        }
      }
    }
  }

  const getCategoryInfo = (value) => IMAGE_CATEGORIES.find(c => c.value === value) || IMAGE_CATEGORIES[5]
  const getStatusInfo = (value) => IMAGE_STATUS.find(s => s.value === value) || IMAGE_STATUS[0]

  // 根据搜索词过滤
  const filteredImages = images.filter(img => 
    filter.search === '' || 
    img.originalName?.toLowerCase().includes(filter.search.toLowerCase()) ||
    img.tags?.some(t => t.toLowerCase().includes(filter.search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* 搜索 */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索图片..."
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>
          
          {/* 分类筛选 */}
          <select
            value={filter.category}
            onChange={(e) => setFilter({ category: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部分类</option>
            {IMAGE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* 状态筛选 */}
          <select
            value={filter.status}
            onChange={(e) => setFilter({ status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部状态</option>
            {IMAGE_STATUS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {/* 视图切换 */}
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedImages.length > 0 && (
        <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center text-primary-700 hover:text-primary-800"
            >
              {selectedImages.length === images.length ? (
                <CheckSquare className="w-5 h-5 mr-2" />
              ) : (
                <Square className="w-5 h-5 mr-2" />
              )}
              已选 {selectedImages.length} 项
            </button>
            <button onClick={clearSelection} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {/* 批量分类 */}
            <div className="relative">
              <button 
                onClick={() => setShowBatchMenu(showBatchMenu === 'category' ? false : 'category')}
                className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                设置分类
              </button>
              {showBatchMenu === 'category' && (
                <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  {IMAGE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => handleBatchAction('category', cat.value)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                    >
                      <span className={`w-2 h-2 rounded-full ${cat.color} mr-2`}></span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 批量状态 */}
            <div className="relative">
              <button 
                onClick={() => setShowBatchMenu(showBatchMenu === 'status' ? false : 'status')}
                className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <Check className="w-4 h-4 mr-2" />
                设置状态
              </button>
              {showBatchMenu === 'status' && (
                <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  {IMAGE_STATUS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleBatchAction('status', s.value)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                    >
                      <span className={`w-2 h-2 rounded-full ${s.color} mr-2`}></span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 批量删除 */}
            <button
              onClick={() => handleBatchAction('delete')}
              className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </button>
          </div>
        </div>
      )}

      {/* 上传区域 */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
        <h3 className="text-base font-medium text-gray-900 mb-1">拖拽图片到此处上传</h3>
        <p className="text-sm text-gray-500 mb-3">支持 JPG, PNG, WebP, GIF 格式，单次最多20张</p>
        <label className="inline-flex items-center px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer text-sm">
          <Plus className="w-4 h-4 mr-2" />
          选择文件
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files))}
          />
        </label>
      </div>

      {/* 上传进度 */}
      {uploadProgress.length > 0 && (
        <div className="bg-white border rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">上传中...</p>
          {uploadProgress.map((file, idx) => (
            <div key={idx} className="flex items-center text-sm">
              <span className="flex-1 truncate text-gray-600">{file.name}</span>
              {file.status === 'uploading' && (
                <span className="text-primary-600">上传中...</span>
              )}
              {file.status === 'done' && (
                <Check className="w-4 h-4 text-green-500" />
              )}
              {file.status === 'error' && (
                <X className="w-4 h-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 图片统计 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>共 {filteredImages.length} 张图片</span>
        {filter.category !== 'all' || filter.status !== 'all' || filter.search ? (
          <button
            onClick={() => setFilter({ category: 'all', status: 'all', search: '' })}
            className="text-primary-600 hover:text-primary-700"
          >
            清除筛选
          </button>
        ) : null}
      </div>

      {/* 图片网格/列表 */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {images.length === 0 ? '还没有图片' : '没有匹配的图片'}
          </h3>
          <p className="text-gray-400">
            {images.length === 0 
              ? '上传一些AI生成的机甲或怪兽图片开始创作' 
              : '尝试调整筛选条件'
            }
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map((image) => {
            const category = getCategoryInfo(image.category)
            const status = getStatusInfo(image.status)
            const isSelected = selectedImages.includes(image.id)
            
            return (
              <div 
                key={image.id} 
                className={`bg-white rounded-lg border overflow-hidden group cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-200 hover:shadow-lg'
                }`}
              >
                {/* 图片 */}
                <div 
                  className="aspect-square bg-gray-100 relative"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={`/uploads/${image.filename}`}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* 选择框 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(image.id) }}
                    className={`absolute top-2 left-2 w-6 h-6 rounded flex items-center justify-center transition-opacity ${
                      isSelected 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-white/80 text-gray-600 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>

                  {/* 状态标签 */}
                  {image.status !== 'pending' && (
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs text-white ${status.color}`}>
                      {status.label}
                    </span>
                  )}

                  {/* 悬浮遮罩 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                </div>
                
                {/* 信息 */}
                <div className="p-2.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{image.originalName}</p>
                  <div className="flex items-center mt-1">
                    <span className={`w-2 h-2 rounded-full ${category.color} mr-1.5`}></span>
                    <span className="text-xs text-gray-500">{category.label}</span>
                    {image.viewType && (
                      <span className="text-xs text-gray-400 ml-2">· {image.viewType}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* 列表视图 */
        <div className="bg-white rounded-lg border border-gray-200 divide-y">
          {filteredImages.map((image) => {
            const category = getCategoryInfo(image.category)
            const status = getStatusInfo(image.status)
            const isSelected = selectedImages.includes(image.id)
            
            return (
              <div 
                key={image.id}
                className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-primary-50' : ''}`}
                onClick={() => setSelectedImage(image)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(image.id) }}
                  className={`w-5 h-5 mr-3 rounded flex items-center justify-center ${
                    isSelected ? 'bg-primary-500 text-white' : 'border border-gray-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 mr-3 flex-shrink-0">
                  <img
                    src={`/uploads/${image.filename}`}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{image.originalName}</p>
                  <div className="flex items-center mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${category.color} text-white mr-2`}>
                      {category.label}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${status.color} text-white`}>
                      {status.label}
                    </span>
                    {image.tags?.length > 0 && (
                      <span className="text-xs text-gray-400 ml-2">
                        {image.tags.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(image.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 图片详情弹窗 */}
      {selectedImage && (
        <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  )
}
