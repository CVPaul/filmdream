/**
 * MultiAngleGenerator - 多角度图像生成组件
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RotateCw,
  Camera,
  Play,
  Pause,
  Check,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  Download,
  Save,
  Grid3X3,
  Layers,
  RefreshCw
} from 'lucide-react'
import clsx from 'clsx'
import useMultiAngleStore from '../stores/multiAngleStore'

// 角度图标映射
const AZIMUTH_ICONS = {
  'front': '⬆️',
  'front-right': '↗️',
  'right': '➡️',
  'back-right': '↘️',
  'back': '⬇️',
  'back-left': '↙️',
  'left': '⬅️',
  'front-left': '↖️'
}

// 预设颜色映射
const PRESET_COLORS = {
  'product-basic': 'bg-blue-500',
  'product-full': 'bg-blue-600',
  'character-ortho': 'bg-purple-500',
  'character-full': 'bg-purple-600',
  'hero-shots': 'bg-red-500',
  'detail-closeups': 'bg-amber-500',
  'panoramic': 'bg-teal-500'
}

// 预设卡片
function PresetCard({ preset, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "p-4 rounded-xl border-2 cursor-pointer transition-all",
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-lg"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={clsx(
          "w-10 h-10 rounded-lg flex items-center justify-center text-white",
          PRESET_COLORS[preset.id] || 'bg-gray-500'
        )}>
          <Camera className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{preset.name}</h4>
          <p className="text-xs text-gray-500">{preset.angleCount} 个角度</p>
        </div>
        {isSelected && (
          <Check className="w-5 h-5 text-blue-500" />
        )}
      </div>
      <p className="text-sm text-gray-600">{preset.description}</p>
    </div>
  )
}

// 角度选择器
function AngleSelector({ config, selectedAngles, onChange }) {
  const [customMode, setCustomMode] = useState(false)
  
  const toggleAngle = (az, el, dist) => {
    const key = `${az}-${el}-${dist}`
    const exists = selectedAngles.some(
      a => a.azimuth === az && a.elevation === el && a.distance === dist
    )
    
    if (exists) {
      onChange(selectedAngles.filter(
        a => !(a.azimuth === az && a.elevation === el && a.distance === dist)
      ))
    } else {
      onChange([...selectedAngles, { azimuth: az, elevation: el, distance: dist }])
    }
  }
  
  const isSelected = (az, el, dist) => {
    return selectedAngles.some(
      a => a.azimuth === az && a.elevation === el && a.distance === dist
    )
  }
  
  if (!config) return null
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700">自定义角度</h4>
        <span className="text-sm text-gray-500">
          已选择 {selectedAngles.length} 个角度
        </span>
      </div>
      
      {/* 方位角选择器 - 圆形布局 */}
      <div className="relative w-48 h-48 mx-auto">
        <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
        <div className="absolute inset-8 rounded-full border border-gray-100" />
        <div className="absolute inset-16 rounded-full bg-gray-100" />
        
        {config.camera.azimuth.map((az, idx) => {
          const angle = (idx * 45 - 90) * (Math.PI / 180)
          const r = 80
          const x = 96 + r * Math.cos(angle) - 16
          const y = 96 + r * Math.sin(angle) - 16
          
          const selected = selectedAngles.some(a => a.azimuth === az.name)
          
          return (
            <button
              key={az.name}
              onClick={() => toggleAngle(az.name, 'eye', 'medium')}
              className={clsx(
                "absolute w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all",
                selected
                  ? "bg-blue-500 text-white shadow-lg scale-110"
                  : "bg-white border-2 border-gray-200 hover:border-blue-300"
              )}
              style={{ left: x, top: y }}
              title={az.label}
            >
              {AZIMUTH_ICONS[az.name]}
            </button>
          )
        })}
        
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-400">主体</span>
        </div>
      </div>
      
      {/* 仰角和距离 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">仰角</label>
          <div className="flex flex-wrap gap-2">
            {config.camera.elevation.map(el => (
              <button
                key={el.name}
                onClick={() => {
                  // 为所有选中的方位角添加此仰角
                  const newAngles = selectedAngles.map(a => ({
                    ...a,
                    elevation: el.name
                  }))
                  onChange(newAngles)
                }}
                className={clsx(
                  "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                  selectedAngles.some(a => a.elevation === el.name)
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-white border-gray-200 hover:border-gray-300"
                )}
              >
                {el.label} ({el.value}°)
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">距离</label>
          <div className="flex flex-wrap gap-2">
            {config.camera.distance.map(dist => (
              <button
                key={dist.name}
                onClick={() => {
                  const newAngles = selectedAngles.map(a => ({
                    ...a,
                    distance: dist.name
                  }))
                  onChange(newAngles)
                }}
                className={clsx(
                  "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                  selectedAngles.some(a => a.distance === dist.name)
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-white border-gray-200 hover:border-gray-300"
                )}
              >
                {dist.label} (×{dist.value})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 生成进度
function GenerationProgress({ job, onRefresh }) {
  if (!job) return null
  
  const completedCount = job.angles?.filter(a => a.status === 'ready').length || 0
  const totalCount = job.angles?.length || 0
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  
  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">生成进度</h4>
        <div className="flex items-center gap-2">
          <span className={clsx(
            "px-2 py-1 text-xs rounded-full",
            job.status === 'completed' ? "bg-green-100 text-green-700" :
            job.status === 'processing' || job.status === 'submitted' ? "bg-blue-100 text-blue-700" :
            job.status === 'failed' ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-700"
          )}>
            {job.status === 'completed' ? '完成' :
             job.status === 'processing' ? '处理中' :
             job.status === 'submitted' ? '已提交' :
             job.status === 'failed' ? '失败' : job.status}
          </span>
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 进度条 */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{completedCount} / {totalCount}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* 角度缩略图 */}
      <div className="grid grid-cols-4 gap-2">
        {job.angles?.map((angle, idx) => (
          <div
            key={idx}
            className={clsx(
              "aspect-square rounded-lg overflow-hidden border-2",
              angle.status === 'ready' ? "border-green-300" :
              angle.status === 'processing' || angle.status === 'submitted' ? "border-blue-300" :
              angle.status === 'failed' ? "border-red-300" :
              "border-gray-200"
            )}
          >
            {angle.status === 'ready' && angle.outputPath ? (
              <img
                src={`${angle.outputPath}`}
                alt={`${angle.azimuth} ${angle.elevation}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                {angle.status === 'processing' || angle.status === 'submitted' ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : angle.status === 'failed' ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Camera className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-xs text-gray-500 mt-1">
                  {AZIMUTH_ICONS[angle.azimuth]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 主组件
export default function MultiAngleGenerator({
  imageId,
  imageUrl,
  imageSrc,
  assetId,
  onComplete,
  onClose
}) {
  const {
    config,
    presets,
    currentJob,
    isLoading,
    error,
    loadConfig,
    loadPresets,
    startGeneration,
    loadJob,
    clearError
  } = useMultiAngleStore()
  
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [customAngles, setCustomAngles] = useState([])
  const [useCustom, setUseCustom] = useState(false)
  const [options, setOptions] = useState({
    loraStrength: 0.9,
    steps: 20,
    cfg: 7.0
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generatingJobId, setGeneratingJobId] = useState(null)
  
  // 加载配置
  useEffect(() => {
    loadConfig()
  }, [loadConfig])
  
  // 轮询任务状态
  useEffect(() => {
    if (!generatingJobId) return
    
    const interval = setInterval(() => {
      loadJob(generatingJobId)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [generatingJobId, loadJob])
  
  // 检查任务完成
  useEffect(() => {
    if (currentJob && (currentJob.status === 'completed' || currentJob.status === 'partial')) {
      onComplete?.(currentJob)
    }
  }, [currentJob, onComplete])
  
  // 开始生成
  const handleGenerate = async () => {
    const genOptions = {
      imageId,
      imageUrl,
      assetId,
      options
    }
    
    if (useCustom && customAngles.length > 0) {
      genOptions.angles = customAngles
    } else if (selectedPreset) {
      genOptions.presetId = selectedPreset
    } else {
      genOptions.presetId = 'product-basic'
    }
    
    const result = await startGeneration(genOptions)
    if (result) {
      setGeneratingJobId(result.jobId)
    }
  }
  
  return (
    <div className="bg-gray-50 rounded-xl p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <RotateCw className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">多角度生成</h3>
            <p className="text-sm text-gray-500">使用 Qwen Multi-Angle LoRA 生成多视角图像</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* 源图片预览 */}
      {imageSrc && (
        <div className="flex gap-4">
          <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
            <img src={imageSrc} alt="Source" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">从这张图片生成多个角度的视图</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                96 种姿态可选
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                8 方位角 × 4 仰角 × 3 距离
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
          <button onClick={clearError} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* 如果正在生成，显示进度 */}
      {generatingJobId && currentJob ? (
        <GenerationProgress
          job={currentJob}
          onRefresh={() => loadJob(generatingJobId)}
        />
      ) : (
        <>
          {/* 模式选择 */}
          <div className="flex gap-2">
            <button
              onClick={() => setUseCustom(false)}
              className={clsx(
                "flex-1 py-2 rounded-lg border-2 transition-colors",
                !useCustom
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <Grid3X3 className="w-4 h-4 inline mr-2" />
              使用预设
            </button>
            <button
              onClick={() => setUseCustom(true)}
              className={clsx(
                "flex-1 py-2 rounded-lg border-2 transition-colors",
                useCustom
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <Layers className="w-4 h-4 inline mr-2" />
              自定义角度
            </button>
          </div>
          
          {/* 预设选择 */}
          {!useCustom && (
            <div className="grid grid-cols-2 gap-3">
              {presets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                />
              ))}
            </div>
          )}
          
          {/* 自定义角度选择 */}
          {useCustom && config && (
            <AngleSelector
              config={config}
              selectedAngles={customAngles}
              onChange={setCustomAngles}
            />
          )}
          
          {/* 高级选项 */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              高级选项
            </button>
            
            {showAdvanced && (
              <div className="mt-3 p-4 bg-white rounded-lg border space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    LoRA 强度: {options.loraStrength}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={options.loraStrength}
                    onChange={(e) => setOptions(prev => ({ ...prev, loraStrength: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0.5 (微妙)</span>
                    <span>1.0 (强烈)</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">步数</label>
                    <input
                      type="number"
                      min="10"
                      max="50"
                      value={options.steps}
                      onChange={(e) => setOptions(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">CFG</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      step="0.5"
                      value={options.cfg}
                      onChange={(e) => setOptions(prev => ({ ...prev, cfg: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || (!selectedPreset && !useCustom) || (useCustom && customAngles.length === 0)}
            className={clsx(
              "w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors",
              isLoading || (!selectedPreset && !useCustom) || (useCustom && customAngles.length === 0)
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                开始生成 {useCustom ? `(${customAngles.length} 个角度)` : selectedPreset ? '' : ''}
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}
