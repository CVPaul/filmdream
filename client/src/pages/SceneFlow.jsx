import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  GitBranch, ZoomIn, ZoomOut, Maximize2, Layout, 
  Plus, Trash2, Edit2, Link, X, ChevronRight,
  Map, Clock
} from 'lucide-react'
import useSceneFlowStore, { TRANSITION_TYPES, CONNECTION_CONDITIONS } from '../stores/sceneFlowStore'
import { ENVIRONMENTS, TIME_OF_DAY } from '../stores/sceneStore'

// 节点尺寸
const NODE_WIDTH = 180
const NODE_HEIGHT = 100

// 获取环境信息
const getEnvInfo = (value) => ENVIRONMENTS.find(e => e.value === value)
const getTimeInfo = (value) => TIME_OF_DAY.find(t => t.value === value)

// 计算贝塞尔曲线路径
function getEdgePath(x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const controlOffset = Math.min(Math.abs(dx) * 0.5, 100)
  
  // 从右侧出发到左侧
  const startX = x1 + NODE_WIDTH
  const startY = y1 + NODE_HEIGHT / 2
  const endX = x2
  const endY = y2 + NODE_HEIGHT / 2
  
  return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
}

// 计算箭头
function getArrowPoints(x2, y2) {
  const endX = x2
  const endY = y2 + NODE_HEIGHT / 2
  const arrowSize = 8
  
  return `${endX},${endY} ${endX - arrowSize},${endY - arrowSize/2} ${endX - arrowSize},${endY + arrowSize/2}`
}

export default function SceneFlow() {
  const {
    nodes, edges, loading,
    selectedNodeId, selectedEdgeId,
    connectingFrom,
    zoom, panX, panY,
    fetchFlowData, createConnection, updateConnection, deleteConnection,
    updateNodePosition, autoLayout,
    selectNode, selectEdge, clearSelection,
    startConnecting, endConnecting, cancelConnecting,
    setZoom, setPan, resetView
  } = useSceneFlowStore()
  
  const canvasRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragNodeId, setDragNodeId] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const [editingEdge, setEditingEdge] = useState(null)
  
  useEffect(() => {
    fetchFlowData()
  }, [])
  
  // 获取画布坐标
  const getCanvasCoords = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom
    }
  }, [panX, panY, zoom])
  
  // 鼠标按下
  const handleMouseDown = (e, nodeId = null) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // 中键或 Alt+左键：平移
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
    } else if (nodeId && e.button === 0) {
      // 左键点击节点：拖拽
      const coords = getCanvasCoords(e.clientX, e.clientY)
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        setIsDragging(true)
        setDragNodeId(nodeId)
        setDragOffset({ x: coords.x - node.x, y: coords.y - node.y })
        selectNode(nodeId)
      }
    } else if (e.button === 0 && !nodeId) {
      // 点击空白区域
      clearSelection()
      cancelConnecting()
    }
  }
  
  // 鼠标移动
  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e.clientX, e.clientY)
    setMousePos(coords)
    
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y)
    } else if (isDragging && dragNodeId) {
      const newX = Math.max(0, coords.x - dragOffset.x)
      const newY = Math.max(0, coords.y - dragOffset.y)
      updateNodePosition(dragNodeId, newX, newY)
    }
  }
  
  // 鼠标松开
  const handleMouseUp = () => {
    setIsDragging(false)
    setDragNodeId(null)
    setIsPanning(false)
  }
  
  // 滚轮缩放
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(zoom + delta)
  }
  
  // 处理连接
  const handleNodeRightClick = (e, nodeId) => {
    e.preventDefault()
    if (connectingFrom) {
      endConnecting(nodeId)
    } else {
      startConnecting(nodeId)
    }
  }
  
  // 编辑连接
  const handleEditEdge = (edge) => {
    setEditingEdge(edge)
    setShowConnectionModal(true)
  }
  
  // 保存连接编辑
  const handleSaveEdge = async (updates) => {
    if (editingEdge) {
      await updateConnection(editingEdge.id, updates)
    }
    setShowConnectionModal(false)
    setEditingEdge(null)
  }
  
  // 获取选中的节点
  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const selectedEdge = edges.find(e => e.id === selectedEdgeId)
  
  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6">
      {/* 流程图画布 */}
      <div className="flex-1 relative bg-gray-100 overflow-hidden">
        {/* 工具栏 */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-white rounded-lg shadow-lg flex items-center">
            <button
              onClick={() => setZoom(zoom + 0.1)}
              className="p-2 hover:bg-gray-100 rounded-l-lg"
              title="放大"
            >
              <ZoomIn className="w-5 h-5 text-gray-600" />
            </button>
            <span className="px-2 text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(zoom - 0.1)}
              className="p-2 hover:bg-gray-100"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-px h-6 bg-gray-200" />
            <button
              onClick={resetView}
              className="p-2 hover:bg-gray-100"
              title="重置视图"
            >
              <Maximize2 className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={autoLayout}
              className="p-2 hover:bg-gray-100 rounded-r-lg"
              title="自动布局"
            >
              <Layout className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* 连接模式提示 */}
        {connectingFrom && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Link className="w-4 h-4" />
            <span>右键点击目标场景完成连接</span>
            <button
              onClick={cancelConnecting}
              className="ml-2 p-1 hover:bg-primary-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* 画布 */}
        <div
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg
            className="w-full h-full"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {/* 网格背景 */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="5000" height="5000" fill="url(#grid)" />
            
            {/* 连接线 */}
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.sourceId)
              const targetNode = nodes.find(n => n.id === edge.targetId)
              if (!sourceNode || !targetNode) return null
              
              const condition = CONNECTION_CONDITIONS.find(c => c.value === edge.condition)
              const isSelected = selectedEdgeId === edge.id
              
              return (
                <g key={edge.id} className="cursor-pointer" onClick={() => selectEdge(edge.id)}>
                  {/* 连接线 */}
                  <path
                    d={getEdgePath(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y)}
                    fill="none"
                    stroke={isSelected ? '#3B82F6' : (condition?.color || '#9CA3AF')}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all"
                  />
                  {/* 箭头 */}
                  <polygon
                    points={getArrowPoints(targetNode.x, targetNode.y)}
                    fill={isSelected ? '#3B82F6' : (condition?.color || '#9CA3AF')}
                  />
                  {/* 转场标签 */}
                  {edge.transitionType && (
                    <text
                      x={(sourceNode.x + NODE_WIDTH + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y + NODE_HEIGHT) / 2 - 8}
                      textAnchor="middle"
                      className="text-xs fill-gray-500"
                    >
                      {TRANSITION_TYPES.find(t => t.value === edge.transitionType)?.icon}
                      {TRANSITION_TYPES.find(t => t.value === edge.transitionType)?.label}
                    </text>
                  )}
                </g>
              )
            })}
            
            {/* 正在创建的连接线 */}
            {connectingFrom && (
              <line
                x1={nodes.find(n => n.id === connectingFrom)?.x + NODE_WIDTH || 0}
                y1={(nodes.find(n => n.id === connectingFrom)?.y || 0) + NODE_HEIGHT / 2}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#3B82F6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {/* 场景节点 */}
            {nodes.map(node => {
              const env = getEnvInfo(node.environment)
              const time = getTimeInfo(node.timeOfDay)
              const isSelected = selectedNodeId === node.id
              const isConnecting = connectingFrom === node.id
              
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-move"
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, node.id) }}
                  onContextMenu={(e) => handleNodeRightClick(e, node.id)}
                >
                  {/* 节点背景 */}
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="8"
                    fill="white"
                    stroke={isSelected ? '#3B82F6' : isConnecting ? '#10B981' : '#E5E7EB'}
                    strokeWidth={isSelected || isConnecting ? 3 : 1}
                    className="transition-all drop-shadow-md"
                  />
                  
                  {/* 环境图标 */}
                  <text x="12" y="28" className="text-lg">
                    {env?.icon || '🎬'}
                  </text>
                  
                  {/* 场景名称 */}
                  <text x="36" y="28" className="text-sm font-medium fill-gray-900">
                    {node.name?.length > 12 ? node.name.slice(0, 12) + '...' : node.name}
                  </text>
                  
                  {/* 时间和天气 */}
                  <text x="12" y="52" className="text-xs fill-gray-500">
                    {time?.icon} {time?.label}
                    {node.characterCount > 0 && ` · ${node.characterCount}角色`}
                  </text>
                  
                  {/* 连接点 - 左侧入口 */}
                  <circle
                    cx="0"
                    cy={NODE_HEIGHT / 2}
                    r="6"
                    fill="#fff"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    className="hover:stroke-primary-500"
                  />
                  
                  {/* 连接点 - 右侧出口 */}
                  <circle
                    cx={NODE_WIDTH}
                    cy={NODE_HEIGHT / 2}
                    r="6"
                    fill={isConnecting ? '#10B981' : '#fff'}
                    stroke={isConnecting ? '#10B981' : '#9CA3AF'}
                    strokeWidth="2"
                    className="hover:stroke-primary-500 hover:fill-primary-100"
                  />
                  
                  {/* 操作按钮 */}
                  {isSelected && (
                    <g transform={`translate(${NODE_WIDTH - 30}, 70)`}>
                      <rect width="24" height="24" rx="4" fill="#3B82F6" className="cursor-pointer" />
                      <text x="12" y="16" textAnchor="middle" className="text-xs fill-white">
                        →
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        
        {/* 空状态 */}
        {!loading && nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">还没有场景</p>
              <p className="text-sm mt-1">先在"场景规划"中创建场景，然后在这里规划场景流程</p>
            </div>
          </div>
        )}
        
        {/* 加载状态 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          </div>
        )}
      </div>
      
      {/* 右侧面板 */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <GitBranch className="w-5 h-5 mr-2 text-primary-600" />
            场景流程图
          </h2>
          <p className="text-xs text-gray-500 mt-1">右键连接场景，拖拽调整位置</p>
        </div>
        
        {/* 统计信息 */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-primary-600">{nodes.length}</p>
              <p className="text-xs text-gray-500">场景</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">{edges.length}</p>
              <p className="text-xs text-gray-500">连接</p>
            </div>
          </div>
        </div>
        
        {/* 选中的节点信息 */}
        {selectedNode && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Map className="w-4 h-4 mr-2" />
              {selectedNode.name}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <span className="w-16 text-gray-400">环境</span>
                <span>{getEnvInfo(selectedNode.environment)?.icon} {getEnvInfo(selectedNode.environment)?.label}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <span className="w-16 text-gray-400">时间</span>
                <span>{getTimeInfo(selectedNode.timeOfDay)?.icon} {getTimeInfo(selectedNode.timeOfDay)?.label}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <span className="w-16 text-gray-400">角色</span>
                <span>{selectedNode.characterCount || 0} 个</span>
              </div>
            </div>
            
            {/* 连接操作 */}
            <div className="mt-4">
              <button
                onClick={() => startConnecting(selectedNode.id)}
                className="w-full flex items-center justify-center px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100"
              >
                <Link className="w-4 h-4 mr-2" />
                从此场景开始连接
              </button>
            </div>
          </div>
        )}
        
        {/* 选中的边信息 */}
        {selectedEdge && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <ChevronRight className="w-4 h-4 mr-2" />
              连接详情
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center text-gray-600">
                <span className="w-16 text-gray-400">从</span>
                <span>{selectedEdge.sourceName}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <span className="w-16 text-gray-400">到</span>
                <span>{selectedEdge.targetName}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <span className="w-16 text-gray-400">转场</span>
                <span>
                  {TRANSITION_TYPES.find(t => t.value === selectedEdge.transitionType)?.icon}
                  {TRANSITION_TYPES.find(t => t.value === selectedEdge.transitionType)?.label}
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <span className="w-16 text-gray-400">类型</span>
                <span className="px-2 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: CONNECTION_CONDITIONS.find(c => c.value === selectedEdge.condition)?.color }}
                >
                  {CONNECTION_CONDITIONS.find(c => c.value === selectedEdge.condition)?.label}
                </span>
              </div>
              {selectedEdge.description && (
                <div className="text-gray-600">
                  <span className="text-gray-400">描述：</span>
                  {selectedEdge.description}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleEditEdge(selectedEdge)}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </button>
              <button
                onClick={() => deleteConnection(selectedEdge.id)}
                className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* 图例 */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="font-medium text-gray-900 mb-3">连接类型</h3>
          <div className="space-y-2">
            {CONNECTION_CONDITIONS.map(cond => (
              <div key={cond.value} className="flex items-center text-sm">
                <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: cond.color }} />
                <span className="text-gray-700">{cond.label}</span>
                <span className="text-gray-400 ml-2 text-xs">{cond.description}</span>
              </div>
            ))}
          </div>
          
          <h3 className="font-medium text-gray-900 mt-6 mb-3">转场效果</h3>
          <div className="grid grid-cols-2 gap-2">
            {TRANSITION_TYPES.map(trans => (
              <div key={trans.value} className="flex items-center text-sm text-gray-600">
                <span className="mr-1">{trans.icon}</span>
                <span>{trans.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 操作提示 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <p>• 右键场景：开始/完成连接</p>
          <p>• 拖拽节点：调整位置</p>
          <p>• Alt+拖拽：平移画布</p>
          <p>• 滚轮：缩放</p>
        </div>
      </div>
      
      {/* 连接编辑弹窗 */}
      {showConnectionModal && editingEdge && (
        <ConnectionEditModal
          edge={editingEdge}
          onSave={handleSaveEdge}
          onClose={() => { setShowConnectionModal(false); setEditingEdge(null) }}
        />
      )}
    </div>
  )
}

// 连接编辑弹窗组件
function ConnectionEditModal({ edge, onSave, onClose }) {
  const [transitionType, setTransitionType] = useState(edge.transitionType || 'cut')
  const [condition, setCondition] = useState(edge.condition || 'sequential')
  const [description, setDescription] = useState(edge.description || '')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ transitionType, condition, description })
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-medium text-gray-900">编辑连接</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 路径信息 */}
          <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <span className="font-medium">{edge.sourceName}</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="font-medium">{edge.targetName}</span>
          </div>
          
          {/* 转场类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">转场效果</label>
            <div className="grid grid-cols-4 gap-2">
              {TRANSITION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTransitionType(t.value)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    transitionType === t.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg block">{t.icon}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* 连接类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">连接类型</label>
            <div className="grid grid-cols-2 gap-2">
              {CONNECTION_CONDITIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(c.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    condition === c.value
                      ? 'border-2'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={condition === c.value ? { borderColor: c.color } : {}}
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: c.color }} />
                    <span className="font-medium">{c.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="描述这个场景转换的剧情意义..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
              rows={3}
            />
          </div>
          
          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
