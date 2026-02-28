import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Film, Play, Pause, Upload, Trash2, Settings, RefreshCw, X,
  Clock, CheckCircle, XCircle, AlertCircle, Loader2, Key,
  Image as ImageIcon, Type, ChevronDown, Video as VideoIcon
} from 'lucide-react'
import clsx from 'clsx'
import useVideoStore, { VIDEO_MODELS, RESOLUTIONS, DURATIONS } from '../stores/videoStore'

// 状态颜色配置
const STATUS_CONFIG = {
  starting: { label: '启动中', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { label: '生成中', color: 'bg-blue-100 text-blue-700', icon: Loader2, animate: true },
  succeeded: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: '失败', color: 'bg-red-100 text-red-700', icon: XCircle },
  canceled: { label: '已取消', color: 'bg-gray-100 text-gray-500', icon: X },
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.starting
  const Icon = config.icon
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium', config.color)}>
      <Icon className={clsx('w-3 h-3', config.animate && 'animate-spin')} />
      {config.label}
    </span>
  )
}

export default function Video() {
  const {
    tasks, currentModel, generating, error,
    loadModels, loadTasks, generateVideo, seedanceT2V, seedanceI2V,
    getTaskStatus, cancelTask, deleteTask, setApiKey, setModel, clearError
  } = useVideoStore()

  // 生成表单状态
  const [mode, setMode] = useState('t2v') // 't2v' | 'i2v'
  const [prompt, setPrompt] = useState('')
  const [imageData, setImageData] = useState(null) // base64
  const [imagePreview, setImagePreview] = useState(null)
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState('720p')
  const [seed, setSeed] = useState('')
  
  // UI 状态
  const [showApiKeyForm, setShowApiKeyForm] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [playingTaskId, setPlayingTaskId] = useState(null)

  const fileInputRef = useRef(null)
  const videoRefs = useRef({})
  const pollIntervalRef = useRef(null)

  // 初始化
  useEffect(() => {
    loadModels()
    loadTasks()
  }, [])

  // 轮询进行中的任务
  useEffect(() => {
    const pollActiveTasks = () => {
      const activeTasks = tasks.filter(t => 
        t.status !== 'succeeded' && t.status !== 'failed' && t.status !== 'canceled'
      )
      activeTasks.forEach(t => getTaskStatus(t.id))
    }

    if (tasks.some(t => t.status !== 'succeeded' && t.status !== 'failed' && t.status !== 'canceled')) {
      pollIntervalRef.current = setInterval(pollActiveTasks, 3000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [tasks])

  // 图片上传处理
  const handleImageUpload = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setImageData(e.target.result)
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleImageUpload(file)
  }, [handleImageUpload])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  // 提交生成
  const handleGenerate = async () => {
    if (mode === 't2v' && !prompt.trim()) return
    if (mode === 'i2v' && !imageData) return

    try {
      const isSeedance = currentModel === 'bytedance/seedance-1-lite'
      const seedVal = seed ? parseInt(seed) : undefined

      if (isSeedance && mode === 't2v') {
        await seedanceT2V({ prompt: prompt.trim(), duration, resolution, seed: seedVal })
      } else if (isSeedance && mode === 'i2v') {
        await seedanceI2V({ prompt: prompt.trim() || undefined, image: imageData, duration, resolution, seed: seedVal })
      } else {
        await generateVideo({
          model: currentModel,
          prompt: prompt.trim() || undefined,
          image: mode === 'i2v' ? imageData : undefined,
          duration,
          resolution,
          seed: seedVal
        })
      }
      // 成功后清空表单
      setPrompt('')
      setImageData(null)
      setImagePreview(null)
      setSeed('')
    } catch (err) {
      // error 已在 store 中设置
    }
  }

  // 保存 API Key
  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setApiKeySaving(true)
    const result = await setApiKey(apiKeyInput.trim())
    setApiKeySaving(false)
    if (result.success) {
      setShowApiKeyForm(false)
      setApiKeyInput('')
    }
  }

  // 视频播放控制
  const handlePlayPause = (taskId) => {
    const videoEl = videoRefs.current[taskId]
    if (!videoEl) return

    if (playingTaskId === taskId) {
      videoEl.pause()
      setPlayingTaskId(null)
    } else {
      // 暂停其他
      Object.values(videoRefs.current).forEach(v => v?.pause())
      videoEl.play()
      setPlayingTaskId(taskId)
    }
  }

  // 获取当前模型支持的能力
  const currentModelInfo = VIDEO_MODELS.find(m => m.id === currentModel) || VIDEO_MODELS[0]
  const supportsT2V = currentModelInfo.capabilities.includes('text-to-video')
  const supportsI2V = currentModelInfo.capabilities.includes('image-to-video')

  // 切换模型时检查模式兼容性
  useEffect(() => {
    if (mode === 't2v' && !supportsT2V && supportsI2V) setMode('i2v')
    if (mode === 'i2v' && !supportsI2V && supportsT2V) setMode('t2v')
  }, [currentModel])

  const canGenerate = mode === 't2v' 
    ? prompt.trim().length > 0 
    : !!imageData

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Film className="w-7 h-7 text-primary-600" />
            视频生成
          </h1>
          <p className="text-sm text-gray-500 mt-1">使用 AI 模型生成视频 · 支持文生视频和图生视频</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTasks()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新任务"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowApiKeyForm(!showApiKeyForm)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors',
              showApiKeyForm 
                ? 'bg-primary-50 text-primary-700' 
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Key className="w-4 h-4" />
            API Key
          </button>
        </div>
      </div>

      {/* API Key 配置 */}
      {showApiKeyForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">配置 Replicate API Key</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="输入 Replicate API Key..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
            />
            <button
              onClick={handleSaveApiKey}
              disabled={apiKeySaving || !apiKeyInput.trim()}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {apiKeySaving ? '验证中...' : '保存'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            前往 <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">replicate.com</a> 获取 API Key
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 主内容区：生成面板 + 任务列表 */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* 左侧：生成面板 */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">新建任务</h2>

            {/* 模型选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">模型</label>
              <select
                value={currentModel}
                onChange={e => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {VIDEO_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.description}</option>
                ))}
              </select>
            </div>

            {/* 模式切换 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">生成模式</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {supportsT2V && (
                  <button
                    onClick={() => setMode('t2v')}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                      mode === 't2v'
                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Type className="w-4 h-4" />
                    文生视频
                  </button>
                )}
                {supportsI2V && (
                  <button
                    onClick={() => setMode('i2v')}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                      mode === 'i2v'
                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <ImageIcon className="w-4 h-4" />
                    图生视频
                  </button>
                )}
              </div>
            </div>

            {/* 提示词 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                提示词 {mode === 'i2v' && <span className="text-gray-400 font-normal">(可选)</span>}
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={mode === 't2v' 
                  ? '描述你想生成的视频内容...' 
                  : '描述图片动态效果（可选）...'
                }
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* 图片上传 (I2V 模式) */}
            {mode === 'i2v' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">输入图片</label>
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200">
                    <img src={imagePreview} alt="预览" className="w-full h-48 object-cover" />
                    <button
                      onClick={() => { setImageData(null); setImagePreview(null) }}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">点击或拖拽上传图片</p>
                    <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleImageUpload(e.target.files[0])}
                />
              </div>
            )}

            {/* 参数设置 */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">时长</label>
                <select
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {DURATIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">分辨率</label>
                <select
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {RESOLUTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">种子</label>
                <input
                  type="number"
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  placeholder="随机"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  生成视频
                </>
              )}
            </button>
          </div>
        </div>

        {/* 右侧：任务列表 */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                生成任务
                {tasks.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">({tasks.length})</span>
                )}
              </h2>
            </div>

            {tasks.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <VideoIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">还没有视频生成任务</p>
                <p className="text-xs text-gray-300 mt-1">在左侧面板创建你的第一个视频</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.map(task => (
                  <div key={task.id} className="px-6 py-4">
                    {/* 任务头部 */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={task.status} />
                          <span className="text-xs text-gray-400">
                            {VIDEO_MODELS.find(m => m.id === task.model)?.name || task.model}
                          </span>
                          {task.type && (
                            <span className="text-xs text-gray-300">
                              {task.type === 'text-to-video' ? '文生视频' : task.type === 'image-to-video' ? '图生视频' : ''}
                            </span>
                          )}
                        </div>
                        {task.prompt && (
                          <p className="text-sm text-gray-600 truncate" title={task.prompt}>
                            {task.prompt}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(task.status === 'starting' || task.status === 'processing') && (
                          <button
                            onClick={() => cancelTask(task.id)}
                            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="取消"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 进度条 */}
                    {(task.status === 'starting' || task.status === 'processing') && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">进度</span>
                          <span className="text-xs text-gray-500">{task.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(task.progress || 0, 2)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {task.status === 'failed' && task.error && (
                      <div className="mb-2 p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600">{task.error}</p>
                      </div>
                    )}

                    {/* 视频播放器 */}
                    {task.status === 'succeeded' && task.output && (
                      <div className="mt-2 rounded-lg overflow-hidden bg-black">
                        <video
                          ref={el => { if (el) videoRefs.current[task.id] = el }}
                          src={typeof task.output === 'string' ? task.output : task.output?.[0]}
                          controls
                          className="w-full max-h-64"
                          onEnded={() => setPlayingTaskId(null)}
                        />
                      </div>
                    )}

                    {/* 时间戳 */}
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-300">
                        {new Date(task.createdAt).toLocaleString('zh-CN')}
                      </span>
                      {task.metrics?.predict_time && (
                        <span className="text-xs text-gray-300 ml-2">
                          耗时 {Math.round(task.metrics.predict_time)}秒
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
