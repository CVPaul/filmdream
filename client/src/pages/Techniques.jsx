import { useState } from 'react'
import { Search, GraduationCap, Camera, Scissors, Sparkles, Building, Copy, Check, Eye } from 'lucide-react'
import techniquesData from '../data/techniques.json'

const categories = [
  { id: 'shotTypes', name: '镜头语言', icon: Camera, description: '基础拍摄技法' },
  { id: 'transitions', name: '转场技巧', icon: Scissors, description: '镜头间的衔接' },
  { id: 'scifiEffects', name: '科幻特效', icon: Sparkles, description: 'AI生成提示词' },
  { id: 'cityBattle', name: '城市战斗', icon: Building, description: '专属素材库' },
]

export default function Techniques() {
  const [activeCategory, setActiveCategory] = useState('shotTypes')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('foreground')

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const renderContent = () => {
    switch (activeCategory) {
      case 'shotTypes':
        return renderShotTypes()
      case 'transitions':
        return renderTransitions()
      case 'scifiEffects':
        return renderScifiEffects()
      case 'cityBattle':
        return renderCityBattle()
      default:
        return null
    }
  }

  const renderShotTypes = () => {
    const items = techniquesData.shotTypes.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
      <div className="grid grid-cols-2 gap-4">
        {items.map((tech) => (
          <div key={tech.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{tech.name}</h3>
              <span className="text-xs text-gray-400">{tech.nameEn}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{tech.description}</p>
            
            <div className="space-y-2 text-xs">
              <div className="flex">
                <span className="w-16 text-gray-500 flex-shrink-0">效果:</span>
                <span className="text-gray-700">{tech.effect}</span>
              </div>
              <div className="flex">
                <span className="w-16 text-gray-500 flex-shrink-0">适用:</span>
                <span className="text-gray-700">{tech.usage}</span>
              </div>
            </div>
            
            {tech.comfyuiHint && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                <code className="text-xs text-primary-600">{tech.comfyuiHint}</code>
                <button
                  onClick={() => copyToClipboard(tech.comfyuiHint, tech.id)}
                  className="p-1 text-gray-400 hover:text-primary-600"
                >
                  {copiedId === tech.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderTransitions = () => {
    const items = techniquesData.transitions.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
      <div className="grid grid-cols-2 gap-4">
        {items.map((tech) => (
          <div key={tech.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{tech.name}</h3>
              <span className="text-xs text-gray-400">{tech.nameEn}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{tech.description}</p>
            
            <div className="space-y-2 text-xs">
              <div className="flex">
                <span className="w-16 text-gray-500 flex-shrink-0">效果:</span>
                <span className="text-gray-700">{tech.effect}</span>
              </div>
              <div className="flex">
                <span className="w-16 text-gray-500 flex-shrink-0">适用:</span>
                <span className="text-gray-700">{tech.usage}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderScifiEffects = () => {
    const items = techniquesData.scifiEffects.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
      <div className="grid grid-cols-2 gap-4">
        {items.map((tech) => (
          <div key={tech.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-gray-900 mb-2">{tech.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{tech.description}</p>
            <p className="text-xs text-gray-500 mb-3">
              <span className="font-medium">推荐用于:</span> {tech.suggestedFor}
            </p>
            
            <div className="p-3 bg-gray-900 rounded-lg flex items-start justify-between">
              <code className="text-xs text-green-400 flex-1">{tech.comfyuiPrompt}</code>
              <button
                onClick={() => copyToClipboard(tech.comfyuiPrompt, tech.id)}
                className="ml-2 p-1 text-gray-400 hover:text-white flex-shrink-0"
              >
                {copiedId === tech.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderCityBattle = () => {
    const cityData = techniquesData.cityBattleElements
    const subTabs = [
      { id: 'foreground', name: '前景元素', data: cityData.foreground },
      { id: 'middleground', name: '中景元素', data: cityData.middleground },
      { id: 'background', name: '背景元素', data: cityData.background },
      { id: 'atmosphere', name: '氛围效果', data: cityData.atmosphere },
      { id: 'pov', name: '视角设置', data: null },
    ]

    const currentData = subTabs.find(t => t.id === activeSubTab)

    return (
      <div className="space-y-4">
        {/* 说明 */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-medium text-amber-900 mb-1">🏙️ 城市战斗场景素材库</h4>
          <p className="text-sm text-amber-700">
            专门针对"从写字楼窗户望向巨型机甲和怪兽战斗"这类经典科幻镜头设计的提示词素材。
            可直接复制使用或在镜头构图器中组合。
          </p>
        </div>

        {/* 子标签 */}
        <div className="flex gap-2">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* 内容 */}
        {activeSubTab === 'pov' ? (
          <div className="grid grid-cols-2 gap-6">
            {/* 高度选项 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                摄像机高度
              </h4>
              <div className="space-y-2">
                {cityData.povOptions.map(opt => (
                  <div key={opt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-900">{opt.label}</span>
                    <span className="text-xs text-gray-500">{opt.height}</span>
                    <button
                      onClick={() => copyToClipboard(`camera height: ${opt.height}, ${opt.label}`, opt.id)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                    >
                      {copiedId === opt.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 角度选项 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Camera className="w-4 h-4 mr-2" />
                拍摄角度
              </h4>
              <div className="space-y-2">
                {cityData.angleOptions.map(opt => (
                  <div key={opt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-900">{opt.label}</span>
                    <span className="text-xs text-gray-500">{opt.degree > 0 ? '+' : ''}{opt.degree}°</span>
                    <button
                      onClick={() => copyToClipboard(`camera angle: ${opt.label}, ${opt.degree} degrees`, opt.id)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                    >
                      {copiedId === opt.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {currentData?.data?.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between hover:border-primary-300 transition-colors"
              >
                <span className="text-sm text-gray-700">{item}</span>
                <button
                  onClick={() => copyToClipboard(item, `${activeSubTab}_${idx}`)}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                >
                  {copiedId === `${activeSubTab}_${idx}` ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 搜索 */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="搜索技巧..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* 分类标签 */}
      <div className="flex items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setSearchQuery('') }}
            className={`flex items-center px-4 py-2.5 rounded-lg transition-colors ${
              activeCategory === cat.id
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <cat.icon className="w-4 h-4 mr-2" />
            <span className="font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* 分类描述 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {categories.find(c => c.id === activeCategory)?.description}
        </p>
        {activeCategory !== 'cityBattle' && (
          <span className="text-sm text-gray-400">
            {activeCategory === 'shotTypes' && `${techniquesData.shotTypes.length} 个技巧`}
            {activeCategory === 'transitions' && `${techniquesData.transitions.length} 个技巧`}
            {activeCategory === 'scifiEffects' && `${techniquesData.scifiEffects.length} 个特效`}
          </span>
        )}
      </div>

      {/* 内容区 */}
      {renderContent()}

      {/* 空状态 */}
      {searchQuery && (
        ((activeCategory === 'shotTypes' && techniquesData.shotTypes.filter(t => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0) ||
        (activeCategory === 'transitions' && techniquesData.transitions.filter(t => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0) ||
        (activeCategory === 'scifiEffects' && techniquesData.scifiEffects.filter(t => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0))
      ) && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">未找到匹配的技巧</h3>
          <p className="text-gray-400">尝试其他搜索词或切换分类</p>
        </div>
      )}
    </div>
  )
}
