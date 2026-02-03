import { useState, useEffect } from 'react'
import { 
  Download, Copy, Check, Settings, Play, Film, 
  ChevronDown, ChevronRight, Eye, RefreshCw, FileJson, FileText
} from 'lucide-react'
import useShotStore from '../stores/shotStore'
import useSceneStore from '../stores/sceneStore'
import useCharacterStore from '../stores/characterStore'

// ComfyUI 工作流模板
const WORKFLOW_TEMPLATES = {
  animatediff: {
    name: 'AnimateDiff',
    description: '基于 Stable Diffusion 的视频生成',
    nodes: [
      { type: 'KSampler', id: 1 },
      { type: 'CLIPTextEncode', id: 2 },
      { type: 'AnimateDiffLoader', id: 3 },
      { type: 'VAEDecode', id: 4 },
    ]
  },
  svd: {
    name: 'Stable Video Diffusion',
    description: '图像到视频生成',
    nodes: [
      { type: 'SVD_img2vid', id: 1 },
      { type: 'KSampler', id: 2 },
    ]
  },
  cogvideo: {
    name: 'CogVideoX',
    description: '文本到视频生成',
    nodes: [
      { type: 'CogVideoTextEncode', id: 1 },
      { type: 'CogVideoDecode', id: 2 },
    ]
  },
}

export default function ComfyExport() {
  const { shots, fetchShots, generatePrompt } = useShotStore()
  const { scenes, fetchScenes } = useSceneStore()
  const { characters, fetchCharacters } = useCharacterStore()
  
  const [copied, setCopied] = useState(false)
  const [exportFormat, setExportFormat] = useState('json')
  const [workflowTemplate, setWorkflowTemplate] = useState('animatediff')
  const [selectedShots, setSelectedShots] = useState([])
  const [generatedWorkflow, setGeneratedWorkflow] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  // 生成参数
  const [params, setParams] = useState({
    resolution: '1024x576',
    sampler: 'euler_ancestral',
    steps: 20,
    cfg: 7,
    frames: 16,
    fps: 8,
    motionScale: 1.0,
  })

  useEffect(() => {
    fetchShots()
    fetchScenes()
    fetchCharacters()
  }, [])

  // 自动选择所有镜头
  useEffect(() => {
    if (shots.length > 0 && selectedShots.length === 0) {
      setSelectedShots(shots.map(s => s.id))
    }
  }, [shots])

  // 切换镜头选择
  const toggleShot = (shotId) => {
    setSelectedShots(prev => 
      prev.includes(shotId) 
        ? prev.filter(id => id !== shotId)
        : [...prev, shotId]
    )
  }

  // 全选/取消全选
  const toggleAll = () => {
    if (selectedShots.length === shots.length) {
      setSelectedShots([])
    } else {
      setSelectedShots(shots.map(s => s.id))
    }
  }

  // 为所有选中的镜头生成提示词
  const generateAllPrompts = async () => {
    setGenerating(true)
    for (const shotId of selectedShots) {
      const shot = shots.find(s => s.id === shotId)
      if (shot && !shot.generatedPrompt) {
        await generatePrompt(shotId)
      }
    }
    await fetchShots()
    setGenerating(false)
  }

  // 生成工作流
  const generateWorkflow = () => {
    const selectedShotData = shots.filter(s => selectedShots.includes(s.id))
    const [width, height] = params.resolution.split('x').map(Number)
    
    const workflow = {
      version: '0.4',
      template: workflowTemplate,
      settings: {
        resolution: { width, height },
        sampler: params.sampler,
        steps: params.steps,
        cfg_scale: params.cfg,
        frames_per_shot: params.frames,
        fps: params.fps,
        motion_scale: params.motionScale,
      },
      shots: selectedShotData.map((shot, index) => {
        const scene = scenes.find(s => s.id === shot.sceneId)
        return {
          index: index + 1,
          id: shot.id,
          description: shot.description,
          duration: shot.duration,
          scene: scene?.name || null,
          prompt: shot.generatedPrompt || shot.description,
          negative_prompt: 'blurry, low quality, distorted, deformed',
          compositor_data: shot.compositorData || null,
        }
      }),
      total_duration: selectedShotData.reduce((sum, s) => sum + (s.duration || 0), 0),
      created_at: new Date().toISOString(),
    }
    
    setGeneratedWorkflow(workflow)
    return workflow
  }

  // 导出为不同格式
  const exportAs = (format) => {
    const workflow = generatedWorkflow || generateWorkflow()
    
    let content, filename, mimeType
    
    switch (format) {
      case 'json':
        content = JSON.stringify(workflow, null, 2)
        filename = 'filmdream_workflow.json'
        mimeType = 'application/json'
        break
      
      case 'prompts':
        content = workflow.shots.map((shot, idx) => 
          `# Shot ${idx + 1}: ${shot.description || 'Untitled'}\n` +
          `Duration: ${shot.duration}s\n` +
          `Scene: ${shot.scene || 'N/A'}\n` +
          `Prompt: ${shot.prompt}\n` +
          `Negative: ${shot.negative_prompt}\n`
        ).join('\n---\n\n')
        filename = 'filmdream_prompts.txt'
        mimeType = 'text/plain'
        break
      
      case 'markdown':
        content = `# FilmDream Studio - 分镜脚本\n\n` +
          `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n` +
          `总时长: ${workflow.total_duration} 秒\n\n` +
          `---\n\n` +
          workflow.shots.map((shot, idx) => 
            `## 镜头 ${idx + 1}\n\n` +
            `**描述**: ${shot.description || '未命名'}\n\n` +
            `**时长**: ${shot.duration} 秒\n\n` +
            `**场景**: ${shot.scene || '未设置'}\n\n` +
            `**提示词**:\n\`\`\`\n${shot.prompt}\n\`\`\`\n`
          ).join('\n---\n\n')
        filename = 'filmdream_storyboard.md'
        mimeType = 'text/markdown'
        break
      
      default:
        return
    }
    
    // 创建下载
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 复制到剪贴板
  const copyToClipboard = () => {
    const workflow = generatedWorkflow || generateWorkflow()
    navigator.clipboard.writeText(JSON.stringify(workflow, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 获取场景名称
  const getSceneName = (sceneId) => scenes.find(s => s.id === sceneId)?.name

  return (
    <div className="space-y-6">
      {/* 导出设置 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          导出设置
        </h3>
        
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">导出格式</label>
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="json">ComfyUI 工作流 (.json)</option>
              <option value="prompts">提示词列表 (.txt)</option>
              <option value="markdown">分镜脚本 (.md)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">工作流模板</label>
            <select 
              value={workflowTemplate}
              onChange={(e) => setWorkflowTemplate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">输出分辨率</label>
            <select 
              value={params.resolution}
              onChange={(e) => setParams(p => ({ ...p, resolution: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="512x512">512 x 512 (1:1)</option>
              <option value="768x768">768 x 768 (1:1)</option>
              <option value="1024x576">1024 x 576 (16:9)</option>
              <option value="576x1024">576 x 1024 (9:16)</option>
              <option value="1280x720">1280 x 720 (HD)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">每镜头帧数</label>
            <input 
              type="number" 
              value={params.frames}
              onChange={(e) => setParams(p => ({ ...p, frames: parseInt(e.target.value) || 16 }))}
              min={8}
              max={64}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
            />
          </div>
        </div>
      </div>

      {/* 生成参数 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">生成参数</h3>
        
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">采样器</label>
            <select 
              value={params.sampler}
              onChange={(e) => setParams(p => ({ ...p, sampler: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="euler_ancestral">Euler Ancestral</option>
              <option value="euler">Euler</option>
              <option value="dpm++_2m">DPM++ 2M</option>
              <option value="dpm++_sde">DPM++ SDE</option>
              <option value="ddim">DDIM</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">采样步数</label>
            <input 
              type="number" 
              value={params.steps}
              onChange={(e) => setParams(p => ({ ...p, steps: parseInt(e.target.value) || 20 }))}
              min={10}
              max={50}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">CFG Scale</label>
            <input 
              type="number" 
              value={params.cfg}
              onChange={(e) => setParams(p => ({ ...p, cfg: parseFloat(e.target.value) || 7 }))}
              step={0.5}
              min={1}
              max={20}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">FPS</label>
            <input 
              type="number" 
              value={params.fps}
              onChange={(e) => setParams(p => ({ ...p, fps: parseInt(e.target.value) || 8 }))}
              min={4}
              max={30}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">运动强度</label>
            <input 
              type="number" 
              value={params.motionScale}
              onChange={(e) => setParams(p => ({ ...p, motionScale: parseFloat(e.target.value) || 1 }))}
              step={0.1}
              min={0.1}
              max={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
            />
          </div>
        </div>
      </div>

      {/* 镜头列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-900">待导出镜头</h3>
            <button
              onClick={toggleAll}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {selectedShots.length === shots.length ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              已选 {selectedShots.length}/{shots.length} 个镜头
            </span>
            <button
              onClick={generateAllPrompts}
              disabled={generating || selectedShots.length === 0}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
              生成提示词
            </button>
          </div>
        </div>
        
        {shots.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>请先在分镜时间线中创建镜头</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {shots.map((shot, index) => (
              <div 
                key={shot.id}
                className={`flex items-center p-4 ${selectedShots.includes(shot.id) ? 'bg-primary-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedShots.includes(shot.id)}
                  onChange={() => toggleShot(shot.id)}
                  className="w-4 h-4 text-primary-600 rounded mr-4"
                />
                <span className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white rounded text-sm font-medium mr-4">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {shot.description || '未命名镜头'}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                    <span>{shot.duration}秒</span>
                    {shot.sceneId && <span>{getSceneName(shot.sceneId)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shot.generatedPrompt ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      已生成
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                      待生成
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 预览和导出 */}
      <div className="bg-gray-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center">
            <FileJson className="w-5 h-5 mr-2" />
            工作流预览
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={generateWorkflow}
              className="flex items-center px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </button>
            <button 
              onClick={copyToClipboard}
              className="flex items-center px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button 
              onClick={() => exportAs(exportFormat)}
              className="flex items-center px-4 py-2 bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <Download className="w-4 h-4 mr-2" />
              导出 {exportFormat.toUpperCase()}
            </button>
          </div>
        </div>
        
        <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto max-h-96">
          {generatedWorkflow 
            ? JSON.stringify(generatedWorkflow, null, 2)
            : `{
  // 点击"刷新"按钮生成工作流预览
  // 选择镜头后可导出为不同格式
}`}
        </pre>
      </div>
    </div>
  )
}
