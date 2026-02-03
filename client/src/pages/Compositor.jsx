import { useState, useEffect } from 'react'
import { 
  Layers, Plus, Eye, Trash2, Copy, Check, Wand2,
  Users, Building, Mountain, X, Save, ChevronDown
} from 'lucide-react'
import useCharacterStore, { CHARACTER_TYPES } from '../stores/characterStore'
import useShotStore from '../stores/shotStore'
import useSceneStore from '../stores/sceneStore'

// 预设前景元素
const FOREGROUND_PRESETS = [
  { id: 'window_frame', label: '窗框', icon: '🪟', prompt: 'window frame in foreground' },
  { id: 'office_desk', label: '办公桌', icon: '🖥️', prompt: 'office desk and chair silhouette' },
  { id: 'person_silhouette', label: '人物剪影', icon: '👤', prompt: 'person silhouette watching' },
  { id: 'debris', label: '碎片飞扬', icon: '💥', prompt: 'flying debris and broken glass' },
  { id: 'rain_drops', label: '雨滴', icon: '💧', prompt: 'rain drops on window' },
  { id: 'smoke', label: '烟雾', icon: '💨', prompt: 'smoke and dust particles' },
  { id: 'curtain', label: '窗帘飘动', icon: '🎐', prompt: 'flowing curtain' },
  { id: 'hand', label: '手/手臂', icon: '✋', prompt: 'human hand reaching' },
]

// 预设中景元素
const MIDDLEGROUND_PRESETS = [
  { id: 'city_street', label: '城市街道', icon: '🏙️', prompt: 'city street with cars and pedestrians fleeing' },
  { id: 'buildings', label: '建筑群', icon: '🏢', prompt: 'urban buildings and skyscrapers' },
  { id: 'collapsed', label: '倒塌建筑', icon: '🏚️', prompt: 'collapsed and damaged buildings' },
  { id: 'fire', label: '火焰爆炸', icon: '🔥', prompt: 'fire and explosions' },
  { id: 'military', label: '军事载具', icon: '🚁', prompt: 'military helicopters and tanks' },
  { id: 'evacuation', label: '撤离人群', icon: '🏃', prompt: 'crowd of people evacuating' },
  { id: 'bridge', label: '大桥', icon: '🌉', prompt: 'massive bridge structure' },
  { id: 'highway', label: '高架公路', icon: '🛣️', prompt: 'elevated highway' },
]

// 预设背景元素
const BACKGROUND_PRESETS = [
  { id: 'giant_mecha', label: '巨型机甲', icon: '🤖', prompt: 'giant mecha robot' },
  { id: 'giant_monster', label: '巨型怪兽', icon: '👾', prompt: 'giant kaiju monster' },
  { id: 'battle', label: '战斗场面', icon: '⚔️', prompt: 'epic battle between mecha and monster' },
  { id: 'beam', label: '能量光束', icon: '⚡', prompt: 'energy beam attack' },
  { id: 'city_skyline', label: '城市天际线', icon: '🌆', prompt: 'city skyline' },
  { id: 'storm_clouds', label: '风暴云', icon: '⛈️', prompt: 'dramatic storm clouds' },
  { id: 'sunset', label: '落日', icon: '🌅', prompt: 'dramatic sunset' },
  { id: 'mountains', label: '远山', icon: '⛰️', prompt: 'distant mountains' },
]

// POV 选项
const POV_OPTIONS = {
  height: [
    { value: 'ground', label: '地面', prompt: 'ground level view' },
    { value: 'low', label: '低角度', prompt: 'low angle shot' },
    { value: 'eye', label: '眼平视角', prompt: 'eye level' },
    { value: 'floor10', label: '10层楼高', prompt: 'view from 10th floor window' },
    { value: 'floor30', label: '30层楼高', prompt: 'view from 30th floor window' },
    { value: 'floor50', label: '50层楼高', prompt: 'view from skyscraper window' },
    { value: 'aerial', label: '空中/鸟瞰', prompt: 'aerial view' },
  ],
  angle: [
    { value: 'level', label: '平视', prompt: '' },
    { value: 'tilt_down_15', label: '俯视 15°', prompt: 'slight downward angle' },
    { value: 'tilt_down_45', label: '俯视 45°', prompt: 'looking down' },
    { value: 'tilt_up_15', label: '仰视 15°', prompt: 'slight upward angle' },
    { value: 'tilt_up_45', label: '仰视 45°', prompt: 'dramatic low angle looking up' },
  ],
  location: [
    { value: 'outdoor', label: '室外', prompt: 'outdoor' },
    { value: 'window', label: '窗边', prompt: 'from inside, looking through window' },
    { value: 'indoor_deep', label: '室内深处', prompt: 'from deep inside building' },
    { value: 'car', label: '车内', prompt: 'from inside car' },
    { value: 'helicopter', label: '直升机内', prompt: 'from inside helicopter' },
  ],
  atmosphere: [
    { value: 'normal', label: '正常', prompt: '' },
    { value: 'apocalyptic', label: '末日感', prompt: 'apocalyptic atmosphere' },
    { value: 'tense', label: '紧张', prompt: 'tense atmosphere' },
    { value: 'epic', label: '史诗', prompt: 'epic cinematic' },
    { value: 'horror', label: '恐惧', prompt: 'horror atmosphere' },
    { value: 'hopeful', label: '希望', prompt: 'hopeful atmosphere' },
  ],
}

export default function Compositor() {
  const { characters, fetchCharacters } = useCharacterStore()
  const { shots, fetchShots, currentShot, setCurrentShot, updateShot } = useShotStore()
  const { scenes, fetchScenes } = useSceneStore()
  
  const [layers, setLayers] = useState({
    foreground: [],
    middleground: [],
    background: []
  })
  const [pov, setPov] = useState({
    height: 'floor30',
    angle: 'level',
    location: 'window',
    atmosphere: 'epic',
  })
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedShot, setSelectedShot] = useState(null)
  const [showPresets, setShowPresets] = useState(null) // 'foreground' | 'middleground' | 'background' | null

  useEffect(() => {
    fetchCharacters()
    fetchShots()
    fetchScenes()
  }, [])

  // 加载镜头的构图数据
  useEffect(() => {
    if (selectedShot?.compositorData) {
      const data = selectedShot.compositorData
      if (data.layers) setLayers(data.layers)
      if (data.pov) setPov(data.pov)
      if (data.prompt) setGeneratedPrompt(data.prompt)
    }
  }, [selectedShot])

  // 添加元素到图层
  const addToLayer = (layer, item) => {
    setLayers(prev => ({
      ...prev,
      [layer]: [...prev[layer], item]
    }))
    setShowPresets(null)
  }

  // 添加角色到图层
  const addCharacterToLayer = (layer, character) => {
    addToLayer(layer, {
      id: `char_${character.id}_${Date.now()}`,
      type: 'character',
      characterId: character.id,
      label: character.name,
      icon: CHARACTER_TYPES.find(t => t.value === character.type)?.icon || '👤',
      prompt: character.promptTemplate || character.name,
      action: '',
    })
  }

  // 从图层移除元素
  const removeFromLayer = (layer, itemId) => {
    setLayers(prev => ({
      ...prev,
      [layer]: prev[layer].filter(item => item.id !== itemId)
    }))
  }

  // 更新元素动作
  const updateItemAction = (layer, itemId, action) => {
    setLayers(prev => ({
      ...prev,
      [layer]: prev[layer].map(item => 
        item.id === itemId ? { ...item, action } : item
      )
    }))
  }

  // 生成提示词
  const generatePrompt = () => {
    const parts = []
    
    // POV 设置
    const povParts = []
    if (pov.height) {
      const h = POV_OPTIONS.height.find(o => o.value === pov.height)
      if (h?.prompt) povParts.push(h.prompt)
    }
    if (pov.location) {
      const l = POV_OPTIONS.location.find(o => o.value === pov.location)
      if (l?.prompt) povParts.push(l.prompt)
    }
    if (pov.angle) {
      const a = POV_OPTIONS.angle.find(o => o.value === pov.angle)
      if (a?.prompt) povParts.push(a.prompt)
    }
    if (povParts.length) parts.push(povParts.join(', '))
    
    // 前景
    if (layers.foreground.length) {
      const fgParts = layers.foreground.map(item => {
        let p = item.prompt
        if (item.action) p += ` ${item.action}`
        return p
      })
      parts.push(`foreground: ${fgParts.join(', ')}`)
    }
    
    // 中景
    if (layers.middleground.length) {
      const mgParts = layers.middleground.map(item => {
        let p = item.prompt
        if (item.action) p += ` ${item.action}`
        return p
      })
      parts.push(`middleground: ${mgParts.join(', ')}`)
    }
    
    // 背景
    if (layers.background.length) {
      const bgParts = layers.background.map(item => {
        let p = item.prompt
        if (item.action) p += ` ${item.action}`
        return p
      })
      parts.push(`background: ${bgParts.join(', ')}`)
    }
    
    // 氛围
    if (pov.atmosphere) {
      const atm = POV_OPTIONS.atmosphere.find(o => o.value === pov.atmosphere)
      if (atm?.prompt) parts.push(atm.prompt)
    }
    
    // 质量词
    parts.push('cinematic lighting, dramatic composition, high detail, 4K, masterpiece')
    
    const prompt = parts.join(', ')
    setGeneratedPrompt(prompt)
    return prompt
  }

  // 复制提示词
  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 保存到镜头
  const saveToShot = async () => {
    if (!selectedShot) return
    
    const compositorData = {
      layers,
      pov,
      prompt: generatedPrompt,
    }
    
    await updateShot(selectedShot.id, { compositorData })
  }

  // 渲染图层面板
  const renderLayerPanel = (layerName, title, description, presets, icon) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-gray-900 flex items-center">
            {icon}
            <span className="ml-2">{title}</span>
          </h4>
          <button 
            onClick={() => setShowPresets(showPresets === layerName ? null : layerName)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      
      {/* 预设选择器 */}
      {showPresets === layerName && (
        <div className="p-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-2">预设元素</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {presets.map(preset => (
              <button
                key={preset.id}
                onClick={() => addToLayer(layerName, { ...preset, action: '' })}
                className="flex items-center px-2 py-1.5 text-xs bg-white border border-gray-200 rounded hover:border-primary-300 hover:bg-primary-50"
              >
                <span className="mr-1.5">{preset.icon}</span>
                {preset.label}
              </button>
            ))}
          </div>
          
          {/* 添加角色 */}
          <p className="text-xs text-gray-500 mb-2">添加角色</p>
          <div className="grid grid-cols-2 gap-1.5">
            {characters.slice(0, 6).map(char => {
              const typeInfo = CHARACTER_TYPES.find(t => t.value === char.type)
              return (
                <button
                  key={char.id}
                  onClick={() => addCharacterToLayer(layerName, char)}
                  className="flex items-center px-2 py-1.5 text-xs bg-white border border-gray-200 rounded hover:border-primary-300 hover:bg-primary-50"
                >
                  <span className="mr-1.5">{typeInfo?.icon}</span>
                  {char.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      {/* 已添加的元素 */}
      <div className="p-3 min-h-[120px]">
        {layers[layerName].length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            点击 + 添加元素
          </div>
        ) : (
          <div className="space-y-2">
            {layers[layerName].map(item => (
              <div key={item.id} className="flex items-center p-2 bg-gray-50 rounded-lg group">
                <span className="text-lg mr-2">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                  <input
                    type="text"
                    value={item.action || ''}
                    onChange={(e) => updateItemAction(layerName, item.id, e.target.value)}
                    placeholder="动作/状态..."
                    className="w-full text-xs text-gray-500 bg-transparent border-none p-0 focus:ring-0"
                  />
                </div>
                <button
                  onClick={() => removeFromLayer(layerName, item.id)}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">镜头构图器</h3>
          
          {/* 选择关联镜头 */}
          <select
            value={selectedShot?.id || ''}
            onChange={(e) => {
              const shot = shots.find(s => s.id === parseInt(e.target.value))
              setSelectedShot(shot || null)
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">选择关联镜头</option>
            {shots.map(shot => (
              <option key={shot.id} value={shot.id}>
                #{shot.orderIndex}: {shot.description?.slice(0, 30) || '未命名'}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={generatePrompt}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            生成提示词
          </button>
          {selectedShot && (
            <button 
              onClick={saveToShot}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Save className="w-4 h-4 mr-2" />
              保存到镜头
            </button>
          )}
        </div>
      </div>

      {/* 城市战斗场景快速预设 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-amber-900">🏙️ 城市战斗场景快速设置</h4>
            <p className="text-sm text-amber-700 mt-1">从写字楼窗户望向巨型机甲和怪兽战斗的经典镜头</p>
          </div>
          <button
            onClick={() => {
              setLayers({
                foreground: [
                  { id: 'preset_window', label: '窗框', icon: '🪟', prompt: 'window frame in foreground', action: '' },
                  { id: 'preset_person', label: '人物剪影', icon: '👤', prompt: 'person silhouette watching in fear', action: '' },
                ],
                middleground: [
                  { id: 'preset_buildings', label: '城市建筑', icon: '🏢', prompt: 'urban buildings and skyscrapers', action: 'partially damaged' },
                  { id: 'preset_fire', label: '火焰爆炸', icon: '🔥', prompt: 'fire and explosions', action: '' },
                ],
                background: [
                  { id: 'preset_mecha', label: '巨型机甲', icon: '🤖', prompt: 'giant mecha robot', action: 'fighting' },
                  { id: 'preset_monster', label: '巨型怪兽', icon: '👾', prompt: 'giant kaiju monster', action: 'attacking' },
                ],
              })
              setPov({
                height: 'floor30',
                angle: 'level',
                location: 'window',
                atmosphere: 'epic',
              })
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            应用预设
          </button>
        </div>
      </div>

      {/* 三层构图面板 */}
      <div className="grid grid-cols-3 gap-4">
        {renderLayerPanel('foreground', '前景 (Foreground)', '最近的物体，如窗框、人物剪影', FOREGROUND_PRESETS, <Layers className="w-4 h-4 text-blue-500" />)}
        {renderLayerPanel('middleground', '中景 (Middleground)', '场景主体，如城市建筑、街道', MIDDLEGROUND_PRESETS, <Building className="w-4 h-4 text-green-500" />)}
        {renderLayerPanel('background', '背景 (Background)', '远景，如战斗的机甲和怪兽', BACKGROUND_PRESETS, <Mountain className="w-4 h-4 text-purple-500" />)}
      </div>

      {/* POV设置 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Eye className="w-4 h-4 mr-2" />
          视角设置 (POV)
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">摄像机高度</label>
            <select 
              value={pov.height}
              onChange={(e) => setPov(prev => ({ ...prev, height: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {POV_OPTIONS.height.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">拍摄角度</label>
            <select 
              value={pov.angle}
              onChange={(e) => setPov(prev => ({ ...prev, angle: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {POV_OPTIONS.angle.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">位置</label>
            <select 
              value={pov.location}
              onChange={(e) => setPov(prev => ({ ...prev, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {POV_OPTIONS.location.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">氛围</label>
            <select 
              value={pov.atmosphere}
              onChange={(e) => setPov(prev => ({ ...prev, atmosphere: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {POV_OPTIONS.atmosphere.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 生成的提示词预览 */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center">
            <Layers className="w-5 h-5 mr-2" />
            生成的提示词
          </h4>
          {generatedPrompt && (
            <button
              onClick={copyPrompt}
              className="flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" />
                  复制
                </>
              )}
            </button>
          )}
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          {generatedPrompt ? (
            <p className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{generatedPrompt}</p>
          ) : (
            <p className="text-sm text-gray-500">设置前景、中景、背景元素后，点击"生成提示词"</p>
          )}
        </div>
      </div>
    </div>
  )
}
