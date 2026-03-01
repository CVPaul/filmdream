import { useState } from 'react'
import { X, Play, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import usePipelineStore from '../../stores/pipelineStore'

export default function PipelineTrigger({ onClose, onSuccess }) {
  const { startPipeline, error: storeError } = usePipelineStore()
  const [mode, setMode] = useState('concept')
  const [concept, setConcept] = useState('')
  const [brief, setBrief] = useState({ concept: '', characters: '', scenes: '', style: '' })
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const updateBrief = (field, value) => setBrief(b => ({ ...b, [field]: value }))

  const isValid = mode === 'concept'
    ? concept.trim().length >= 10
    : brief.concept.trim().length >= 10

  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    setSubmitError(null)
    try {
      let pipelineId
      if (mode === 'concept') {
        pipelineId = await startPipeline(concept.trim(), null)
      } else {
        pipelineId = await startPipeline(brief.concept.trim(), {
          characters: brief.characters.trim() || null,
          scenes: brief.scenes.trim() || null,
          style: brief.style.trim() || null,
        })
      }
      if (pipelineId) {
        onSuccess?.(pipelineId)
      } else {
        setSubmitError(storeError || '启动失败，请重试')
      }
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">新建流水线</h2>
            <p className="text-sm text-gray-500 mt-0.5">启动AI自动化电影制作流程</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {[
            { key: 'concept', label: '自由概念' },
            { key: 'structured', label: '结构化简报' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                mode === key
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mode === 'concept' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">电影概念</label>
              <textarea
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder="描述你的电影概念...（例如：太空站的AI觉醒故事，宇航员发现站内AI开始自我进化）"
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">{concept.length} 字符（至少10字）</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  故事概念 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={brief.concept}
                  onChange={e => updateBrief('concept', e.target.value)}
                  placeholder="描述核心故事概念..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  角色列表{' '}
                  <span className="text-gray-400 font-normal">可选</span>
                </label>
                <textarea
                  value={brief.characters}
                  onChange={e => updateBrief('characters', e.target.value)}
                  placeholder="描述主要角色（可选）..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  场景列表{' '}
                  <span className="text-gray-400 font-normal">可选</span>
                </label>
                <textarea
                  value={brief.scenes}
                  onChange={e => updateBrief('scenes', e.target.value)}
                  placeholder="描述主要场景（可选）..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  风格偏好{' '}
                  <span className="text-gray-400 font-normal">可选</span>
                </label>
                <input
                  type="text"
                  value={brief.style}
                  onChange={e => updateBrief('style', e.target.value)}
                  placeholder="例如：赛博朋克、硬科幻..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {submitError && (
            <p className="text-sm text-red-600 mb-3">启动失败: {submitError}</p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  启动流水线
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
