import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Trash2 } from 'lucide-react'

export default function ImageCompareModal({ images, onClose, onRemoveImage }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  // 缩放范围
  const minZoom = 0.5
  const maxZoom = 5

  // 缩放控制
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, maxZoom))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, minZoom))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.min(Math.max(prev + delta, minZoom), maxZoom))
  }, [])

  // 拖拽平移
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleMouseUp = () => setIsDragging(false)

  // 全屏切换
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 计算网格布局
  const getGridClass = () => {
    switch (images.length) {
      case 2: return 'grid-cols-2'
      case 3: return 'grid-cols-3'
      case 4: return 'grid-cols-2 grid-rows-2'
      default: return 'grid-cols-1'
    }
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
    >
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center space-x-2">
          <h3 className="text-white font-medium">图片对比</h3>
          <span className="text-gray-400 text-sm">({images.length} 张图片)</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* 缩放控制 */}
          <div className="flex items-center bg-white/10 rounded-lg">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= minZoom}
              className="p-2 text-white hover:bg-white/10 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="px-3 text-white text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= maxZoom}
              className="p-2 text-white hover:bg-white/10 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="放大"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* 重置按钮 */}
          <button
            onClick={handleReset}
            className="p-2 text-white hover:bg-white/10 rounded-lg"
            title="重置视图"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* 全屏按钮 */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-white hover:bg-white/10 rounded-lg"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/10 rounded-lg ml-4"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 对比区域 */}
      <div 
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className={`h-full grid ${getGridClass()} gap-1 p-1`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {images.map((image, index) => (
            <div 
              key={image.id} 
              className="relative bg-gray-900 flex items-center justify-center overflow-hidden group"
            >
              <img
                src={`/uploads/${image.filename}`}
                alt={image.originalName}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
              
              {/* 图片信息覆盖层 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium truncate">
                  {image.originalName}
                </p>
                {image.category && (
                  <p className="text-gray-300 text-xs mt-0.5">
                    {image.category}
                  </p>
                )}
              </div>

              {/* 图片序号 */}
              <div className="absolute top-2 left-2 w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {index + 1}
              </div>

              {/* 移除按钮 */}
              {onRemoveImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveImage(image.id)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="从对比中移除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="px-6 py-3 bg-black/50 backdrop-blur-sm border-t border-white/10 text-center">
        <p className="text-gray-400 text-sm">
          滚轮缩放 | 拖拽平移 | 所有图片同步操作
        </p>
      </div>
    </div>
  )
}
