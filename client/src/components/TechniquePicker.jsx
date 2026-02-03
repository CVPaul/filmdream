import { useState, useEffect } from 'react'
import { 
  X, Search, Camera, Film, Sparkles, Zap, 
  ChevronRight, Check, Info, Copy 
} from 'lucide-react'
import techniques from '../data/techniques.json'

// 技巧分类配置
const TECHNIQUE_CATEGORIES = [
  { 
    id: 'shotTypes', 
    label: '镜头类型', 
    icon: Camera, 
    color: 'bg-blue-500',
    description: '不同景别和拍摄角度'
  },
  { 
    id: 'transitions', 
    label: '转场效果', 
    icon: Film, 
    color: 'bg-purple-500',
    description: '镜头之间的衔接方式'
  },
  { 
    id: 'scifiEffects', 
    label: '科幻特效', 
    icon: Sparkles, 
    color: 'bg-orange-500',
    description: '能量、爆炸、变形等效果'
  },
]

/**
 * TechniquePicker - 技巧选择器组件
 * 
 * @param {Object} props
 * @param {Function} props.onSelect - 选择技巧后的回调 (technique, category) => void
 * @param {Function} props.onClose - 关闭弹窗的回调
 * @param {string} props.mode - 'modal' | 'inline' | 'dropdown'
 * @param {Array} props.selectedTechniques - 已选择的技巧ID数组 [{id, category}]
 * @param {boolean} props.multiSelect - 是否支持多选
 * @param {string} props.filterCategory - 仅显示特定分类
 */
export default function TechniquePicker({ 
  onSelect, 
  onClose, 
  mode = 'modal',
  selectedTechniques = [],
  multiSelect = false,
  filterCategory = null
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(
    filterCategory || TECHNIQUE_CATEGORIES[0].id
  )
  const [hoveredTechnique, setHoveredTechnique] = useState(null)
  const [copiedHint, setCopiedHint] = useState(null)

  // 获取当前分类的技巧列表
  const getCurrentTechniques = () => {
    const list = techniques[activeCategory] || []
    if (!searchQuery) return list
    
    const query = searchQuery.toLowerCase()
    return list.filter(t => 
      t.name?.toLowerCase().includes(query) ||
      t.nameEn?.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.effect?.toLowerCase().includes(query)
    )
  }

  // 检查技巧是否已选中
  const isSelected = (techniqueId) => {
    return selectedTechniques.some(t => t.id === techniqueId && t.category === activeCategory)
  }

  // 处理技巧点击
  const handleTechniqueClick = (technique) => {
    onSelect(technique, activeCategory)
    if (!multiSelect && mode === 'modal') {
      onClose?.()
    }
  }

  // 复制 ComfyUI 提示词
  const handleCopyHint = (e, hint) => {
    e.stopPropagation()
    navigator.clipboard.writeText(hint)
    setCopiedHint(hint)
    setTimeout(() => setCopiedHint(null), 2000)
  }

  const currentTechniques = getCurrentTechniques()
  const CategoryIcon = TECHNIQUE_CATEGORIES.find(c => c.id === activeCategory)?.icon || Camera

  // 渲染内容
  const renderContent = () => (
    <div className="flex h-full">
      {/* 左侧分类导航 */}
      {!filterCategory && (
        <div className="w-48 bg-gray-50 border-r border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2 px-2">分类</p>
          <div className="space-y-1">
            {TECHNIQUE_CATEGORIES.map(cat => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-primary-600' : ''}`} />
                  {cat.label}
                  <span className="ml-auto text-xs text-gray-400">
                    {techniques[cat.id]?.length || 0}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 城市战斗元素快捷入口 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2 px-2">快捷预设</p>
            <button
              onClick={() => setActiveCategory('cityBattle')}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm ${
                activeCategory === 'cityBattle' 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Zap className="w-4 h-4 mr-2" />
              城市战斗场景
            </button>
          </div>
        </div>
      )}

      {/* 右侧技巧列表 */}
      <div className="flex-1 flex flex-col">
        {/* 搜索栏 */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索技巧..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 技巧网格 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeCategory === 'cityBattle' ? (
            // 城市战斗场景元素
            <CityBattleElements onSelect={onSelect} />
          ) : currentTechniques.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CategoryIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>没有找到匹配的技巧</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {currentTechniques.map(technique => {
                const selected = isSelected(technique.id)
                return (
                  <div
                    key={technique.id}
                    onClick={() => handleTechniqueClick(technique)}
                    onMouseEnter={() => setHoveredTechnique(technique.id)}
                    onMouseLeave={() => setHoveredTechnique(null)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selected 
                        ? 'bg-primary-50 border-primary-300 ring-1 ring-primary-300' 
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{technique.name}</h4>
                          {technique.nameEn && (
                            <span className="text-xs text-gray-400">{technique.nameEn}</span>
                          )}
                          {selected && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{technique.description}</p>
                        
                        {/* 效果说明 */}
                        {technique.effect && (
                          <p className="text-xs text-gray-500 mt-2">
                            <span className="font-medium">效果：</span>{technique.effect}
                          </p>
                        )}
                        
                        {/* 使用场景 */}
                        {technique.usage && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">适用：</span>{technique.usage}
                          </p>
                        )}

                        {/* ComfyUI 提示词 */}
                        {(technique.comfyuiHint || technique.comfyuiPrompt) && (
                          <div className="mt-3 flex items-center gap-2">
                            <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 truncate">
                              {technique.comfyuiHint || technique.comfyuiPrompt}
                            </code>
                            <button
                              onClick={(e) => handleCopyHint(e, technique.comfyuiHint || technique.comfyuiPrompt)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="复制提示词"
                            >
                              {copiedHint === (technique.comfyuiHint || technique.comfyuiPrompt) ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
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
    </div>
  )

  // Modal 模式
  if (mode === 'modal') {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">选择拍摄技巧</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                为镜头添加专业的拍摄和剪辑技巧
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    )
  }

  // Inline 模式
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {renderContent()}
    </div>
  )
}

// 城市战斗场景元素选择器
function CityBattleElements({ onSelect }) {
  const elements = techniques.cityBattleElements
  const [copiedText, setCopiedText] = useState(null)

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const sections = [
    { key: 'foreground', label: '前景元素', color: 'bg-green-100 text-green-800' },
    { key: 'middleground', label: '中景元素', color: 'bg-blue-100 text-blue-800' },
    { key: 'background', label: '背景元素', color: 'bg-purple-100 text-purple-800' },
    { key: 'atmosphere', label: '氛围效果', color: 'bg-orange-100 text-orange-800' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 mb-1">城市战斗场景构建</h4>
        <p className="text-sm text-amber-700">
          经典的"从写字楼望向巨型机甲和怪兽"镜头构图元素
        </p>
      </div>

      {sections.map(section => (
        <div key={section.key}>
          <h4 className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium mb-3 ${section.color}`}>
            {section.label}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {elements[section.key]?.map((element, idx) => (
              <button
                key={idx}
                onClick={() => {
                  handleCopy(element)
                  onSelect?.({ 
                    id: `${section.key}_${idx}`,
                    name: element,
                    category: 'cityBattle',
                    layer: section.key
                  }, 'cityBattle')
                }}
                className="flex items-center justify-between p-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50"
              >
                <span className="text-gray-700">{element}</span>
                {copiedText === element ? (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-300 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* 视角选项 */}
      <div>
        <h4 className="inline-flex items-center px-2 py-1 rounded text-sm font-medium mb-3 bg-gray-100 text-gray-800">
          观察视角
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {elements.povOptions?.map(pov => (
            <button
              key={pov.id}
              onClick={() => onSelect?.({ 
                id: pov.id,
                name: pov.label,
                height: pov.height,
                category: 'pov'
              }, 'pov')}
              className="p-2 text-center text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50"
            >
              <div className="font-medium text-gray-900">{pov.label}</div>
              <div className="text-xs text-gray-500">{pov.height}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// 导出分类常量供其他组件使用
export { TECHNIQUE_CATEGORIES }
