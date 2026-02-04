/**
 * Assets3D 页面 - 3D 资产管理
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Box, 
  Upload, 
  Image, 
  Trash2, 
  Edit3, 
  Eye,
  Grid3X3,
  List,
  Filter,
  Search,
  X,
  Plus,
  RefreshCw,
  Download,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Tag,
  Layers,
  RotateCw
} from 'lucide-react'
import clsx from 'clsx'
import useAssets3dStore from '../stores/assets3dStore'
import { ModelViewer } from '../components/ThreeViewer'
import MultiAngleGenerator from '../components/MultiAngleGenerator'

// 资产类型配置
const ASSET_TYPES = [
  { value: 'character', label: '角色', color: 'bg-purple-500' },
  { value: 'mecha', label: '机甲', color: 'bg-blue-500' },
  { value: 'monster', label: '怪兽', color: 'bg-red-500' },
  { value: 'vehicle', label: '载具', color: 'bg-green-500' },
  { value: 'prop', label: '道具', color: 'bg-yellow-500' },
  { value: 'environment', label: '环境', color: 'bg-teal-500' },
  { value: 'other', label: '其他', color: 'bg-gray-500' }
]

// 状态配置
const STATUS_CONFIG = {
  pending: { label: '待处理', color: 'text-yellow-500', bg: 'bg-yellow-100' },
  processing: { label: '生成中', color: 'text-blue-500', bg: 'bg-blue-100' },
  ready: { label: '就绪', color: 'text-green-500', bg: 'bg-green-100' },
  failed: { label: '失败', color: 'text-red-500', bg: 'bg-red-100' }
}

// 资产卡片组件
function AssetCard({ asset, isSelected, onClick, onDelete, viewMode }) {
  const typeConfig = ASSET_TYPES.find(t => t.value === asset.type) || ASSET_TYPES[6]
  const statusConfig = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending
  
  if (viewMode === 'list') {
    return (
      <div 
        className={clsx(
          "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all border",
          isSelected 
            ? "bg-blue-50 border-blue-300" 
            : "bg-white hover:bg-gray-50 border-gray-200"
        )}
        onClick={onClick}
      >
        {/* 缩略图 */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {asset.thumbnail ? (
            <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Box className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{asset.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx("text-xs px-2 py-0.5 rounded-full text-white", typeConfig.color)}>
              {typeConfig.label}
            </span>
            <span className={clsx("text-xs px-2 py-0.5 rounded-full", statusConfig.bg, statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </div>
        
        {/* 格式 */}
        <div className="text-sm text-gray-500 uppercase">
          {asset.format || 'GLB'}
        </div>
        
        {/* 操作 */}
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete?.(asset) }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )
  }
  
  // 网格视图
  return (
    <div 
      className={clsx(
        "group relative rounded-xl overflow-hidden cursor-pointer transition-all border-2",
        isSelected 
          ? "border-blue-500 shadow-lg shadow-blue-100" 
          : "border-transparent hover:border-gray-300"
      )}
      onClick={onClick}
    >
      {/* 缩略图 */}
      <div className="aspect-square bg-gray-100 relative">
        {asset.thumbnail ? (
          <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Box className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* 状态指示器 */}
        {asset.status === 'processing' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        {/* 悬浮操作 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform">
            <Eye className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>
      
      {/* 信息 */}
      <div className="p-3 bg-white">
        <h3 className="font-medium text-gray-900 truncate text-sm">{asset.name}</h3>
        <div className="flex items-center gap-1 mt-2">
          <span className={clsx("text-xs px-2 py-0.5 rounded-full text-white", typeConfig.color)}>
            {typeConfig.label}
          </span>
        </div>
      </div>
      
      {/* 删除按钮 */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete?.(asset) }}
        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
      >
        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
      </button>
    </div>
  )
}

// 上传模态框
function UploadModal({ isOpen, onClose, onUpload }) {
  const [file, setFile] = useState(null)
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    type: 'other',
    tags: []
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!metadata.name) {
        setMetadata(prev => ({ 
          ...prev, 
          name: selectedFile.name.replace(/\.[^/.]+$/, '') 
        }))
      }
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    
    setUploading(true)
    try {
      await onUpload(file, metadata)
      onClose()
      setFile(null)
      setMetadata({ name: '', description: '', type: 'other', tags: [] })
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">上传 3D 模型</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 文件选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模型文件</label>
            <div 
              className={clsx(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                file ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-gray-400"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".glb,.gltf,.obj,.fbx"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">点击或拖拽文件到此处</p>
                  <p className="text-xs text-gray-400 mt-1">支持 GLB, GLTF, OBJ, FBX</p>
                </>
              )}
            </div>
          </div>
          
          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">名称</label>
            <input
              type="text"
              value={metadata.name}
              onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入资产名称"
            />
          </div>
          
          {/* 类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
            <select
              value={metadata.type}
              onChange={(e) => setMetadata(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ASSET_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
            <textarea
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="输入资产描述"
            />
          </div>
          
          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className={clsx(
                "flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center gap-2",
                file && !uploading
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  上传中...
                </>
              ) : (
                '上传'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 从图片生成模态框
function GenerateModal({ isOpen, onClose, onGenerate }) {
  const [imageUrl, setImageUrl] = useState('')
  const [options, setOptions] = useState({
    name: '',
    type: 'other'
  })
  const [generating, setGenerating] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageUrl) return
    
    setGenerating(true)
    try {
      await onGenerate(imageUrl, options)
      onClose()
      setImageUrl('')
      setOptions({ name: '', type: 'other' })
    } catch (error) {
      console.error('Generate failed:', error)
    } finally {
      setGenerating(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">从图片生成 3D 模型</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 图片 URL 或 ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">图片 URL 或资产 ID</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入图片 URL 或图库资产 ID"
            />
            <p className="text-xs text-gray-400 mt-1">使用 InstantMesh 从单张图片生成 3D 模型</p>
          </div>
          
          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">名称</label>
            <input
              type="text"
              value={options.name}
              onChange={(e) => setOptions(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入资产名称（可选）"
            />
          </div>
          
          {/* 类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
            <select
              value={options.type}
              onChange={(e) => setOptions(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ASSET_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!imageUrl || generating}
              className={clsx(
                "flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center gap-2",
                imageUrl && !generating
                  ? "bg-purple-500 hover:bg-purple-600"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4" />
                  生成
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 详情面板
function DetailPanel({ asset, onClose, onUpdate, onDelete, onAddVariant, onGenerateMultiAngle }) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  
  useEffect(() => {
    if (asset) {
      setEditData({
        name: asset.name,
        description: asset.description || '',
        type: asset.type,
        tags: asset.tags || []
      })
    }
  }, [asset])
  
  const handleSave = async () => {
    await onUpdate(asset.id, editData)
    setEditing(false)
  }
  
  const handleScreenshot = (dataUrl) => {
    // 保存截图作为变体
    onAddVariant?.(asset.id, {
      type: 'screenshot',
      imageUrl: dataUrl,
      camera: { position: [5, 5, 5] }
    })
  }
  
  if (!asset) return null
  
  const typeConfig = ASSET_TYPES.find(t => t.value === asset.type) || ASSET_TYPES[6]
  const statusConfig = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending
  
  // 构建模型 URL
  const modelUrl = asset.filePath 
    ? `http://localhost:3001${asset.filePath}`
    : null
  
  return (
    <div className="h-full flex flex-col bg-white border-l">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold truncate">{asset.name}</h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setEditing(!editing)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
            title={editing ? '取消编辑' : '编辑'}
          >
            {editing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 3D 预览 */}
      <div className="h-64 flex-shrink-0">
        <ModelViewer 
          modelUrl={modelUrl}
          className="w-full h-full"
          onScreenshot={handleScreenshot}
        />
      </div>
      
      {/* 信息 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {editing ? (
          <>
            {/* 编辑模式 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">名称</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">类型</label>
              <select
                value={editData.type}
                onChange={(e) => setEditData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {ASSET_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">描述</label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={3}
              />
            </div>
            
            <button
              onClick={handleSave}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              保存
            </button>
          </>
        ) : (
          <>
            {/* 查看模式 */}
            <div className="flex items-center gap-2">
              <span className={clsx("text-xs px-2 py-1 rounded-full text-white", typeConfig.color)}>
                {typeConfig.label}
              </span>
              <span className={clsx("text-xs px-2 py-1 rounded-full", statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 uppercase">
                {asset.format || 'GLB'}
              </span>
            </div>
            
            {asset.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">描述</h4>
                <p className="text-sm text-gray-700">{asset.description}</p>
              </div>
            )}
            
            {/* 源信息 */}
            {asset.sourceImageId && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">源图片</h4>
                <p className="text-sm text-blue-500">{asset.sourceImageId}</p>
              </div>
            )}
            
            {/* 文件信息 */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">文件信息</h4>
              <div className="text-sm text-gray-500 space-y-1">
                <p>大小: {asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'}</p>
                <p>创建: {new Date(asset.createdAt).toLocaleString()}</p>
                <p>更新: {new Date(asset.updatedAt).toLocaleString()}</p>
              </div>
            </div>
            
            {/* 变体 */}
            {asset.variants && asset.variants.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">渲染变体 ({asset.variants.length})</h4>
                <div className="grid grid-cols-3 gap-2">
                  {asset.variants.map(variant => (
                    <div key={variant.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {variant.imageUrl && (
                        <img src={variant.imageUrl} alt="variant" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex flex-col gap-2 pt-2">
              {/* 多角度生成按钮 */}
              <button
                onClick={() => onGenerateMultiAngle?.(asset)}
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                生成多角度
              </button>
              
              <div className="flex gap-2">
                {modelUrl && (
                  <a
                    href={modelUrl}
                    download
                    className="flex-1 py-2 border rounded-lg text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </a>
                )}
                <button
                  onClick={() => onDelete(asset)}
                  className="flex-1 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 主页面组件
export default function Assets3D() {
  const {
    assets,
    currentAsset,
    isLoading,
    error,
    stats,
    filters,
    loadAssets,
    loadAsset,
    loadStats,
    uploadAsset,
    updateAsset,
    deleteAsset,
    generateFromImage,
    addVariant,
    setFilters,
    clearFilters,
    clearCurrentAsset,
    clearError
  } = useAssets3dStore()
  
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showMultiAngleModal, setShowMultiAngleModal] = useState(false)
  const [multiAngleAsset, setMultiAngleAsset] = useState(null)
  
  // 加载数据
  useEffect(() => {
    loadAssets()
    loadStats()
  }, [loadAssets, loadStats])
  
  // 过滤资产
  const filteredAssets = assets.filter(asset => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!asset.name.toLowerCase().includes(query) && 
          !asset.description?.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })
  
  // 处理上传
  const handleUpload = async (file, metadata) => {
    const result = await uploadAsset(file, metadata)
    if (result) {
      loadStats()
    }
  }
  
  // 处理生成
  const handleGenerate = async (imageUrl, options) => {
    const result = await generateFromImage(imageUrl, options)
    if (result) {
      loadStats()
    }
  }
  
  // 处理删除
  const handleDelete = async (asset) => {
    if (window.confirm(`确定要删除 "${asset.name}" 吗？`)) {
      await deleteAsset(asset.id)
      loadStats()
    }
  }
  
  // 选择资产
  const handleSelectAsset = (asset) => {
    loadAsset(asset.id)
  }
  
  // 打开多角度生成
  const handleOpenMultiAngle = (asset) => {
    setMultiAngleAsset(asset)
    setShowMultiAngleModal(true)
  }
  
  // 多角度生成完成
  const handleMultiAngleComplete = (job) => {
    // 刷新当前资产以获取新的变体
    if (multiAngleAsset) {
      loadAsset(multiAngleAsset.id)
    }
    // 可以选择关闭模态框或保持打开
  }
  
  return (
    <div className="h-full flex">
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">3D 资产库</h1>
            
            {/* 统计 */}
            {stats && (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Box className="w-4 h-4" />
                  {stats.total} 个资产
                </span>
                {stats.byStatus?.ready > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {stats.byStatus.ready} 就绪
                  </span>
                )}
                {stats.byStatus?.processing > 0 && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {stats.byStatus.processing} 生成中
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索资产..."
                className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* 筛选 */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "p-2 rounded-lg transition-colors",
                  showFilters || filters.type || filters.status
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-gray-100"
                )}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-lg shadow-lg z-10 p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">类型</label>
                    <select
                      value={filters.type || ''}
                      onChange={(e) => {
                        setFilters({ type: e.target.value || null })
                        loadAssets({ type: e.target.value || null })
                      }}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    >
                      <option value="">全部</option>
                      {ASSET_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">状态</label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => {
                        setFilters({ status: e.target.value || null })
                        loadAssets({ status: e.target.value || null })
                      }}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    >
                      <option value="">全部</option>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <option key={value} value={value}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {(filters.type || filters.status) && (
                    <button
                      onClick={() => {
                        clearFilters()
                        loadAssets()
                      }}
                      className="w-full py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* 视图切换 */}
            <div className="flex border rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "p-2 transition-colors",
                  viewMode === 'grid' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  "p-2 transition-colors",
                  viewMode === 'list' ? "bg-gray-100" : "hover:bg-gray-50"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            
            {/* 刷新 */}
            <button
              onClick={() => loadAssets()}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={clsx("w-5 h-5", isLoading && "animate-spin")} />
            </button>
            
            {/* 添加按钮 */}
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                上传模型
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Image className="w-4 h-4" />
                从图片生成
              </button>
            </div>
          </div>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={clearError} className="ml-auto p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* 资产列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && assets.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Box className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">暂无 3D 资产</p>
              <p className="text-sm mt-1">点击上方按钮上传或生成模型</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={currentAsset?.id === asset.id}
                  onClick={() => handleSelectAsset(asset)}
                  onDelete={handleDelete}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={currentAsset?.id === asset.id}
                  onClick={() => handleSelectAsset(asset)}
                  onDelete={handleDelete}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 详情面板 */}
      {currentAsset && (
        <div className="w-96 flex-shrink-0">
          <DetailPanel
            asset={currentAsset}
            onClose={clearCurrentAsset}
            onUpdate={updateAsset}
            onDelete={handleDelete}
            onAddVariant={addVariant}
            onGenerateMultiAngle={handleOpenMultiAngle}
          />
        </div>
      )}
      
      {/* 模态框 */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />
      
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
      />
      
      {/* 多角度生成模态框 */}
      {showMultiAngleModal && multiAngleAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <MultiAngleGenerator
              imageId={multiAngleAsset.sourceImageId}
              assetId={multiAngleAsset.id}
              imageSrc={multiAngleAsset.thumbnail}
              onComplete={handleMultiAngleComplete}
              onClose={() => {
                setShowMultiAngleModal(false)
                setMultiAngleAsset(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
